"""Control centre: automatic checks for errors, duplicate and suspicious payments.

Every check returns findings with a stable `key`. Findings live in the `findings` table, so a person can mark each one
«вирішено» or «ігнорувати» and it stays that way; a finding that stops being true closes itself. A payroll difference
that changes (different amount) gets a new key and therefore opens again.
"""
import json
import logging
from datetime import date, datetime, timedelta

from . import config, payroll
from .categorize import norm
from .db import account_balances, now_local

log = logging.getLogger("control")

SEV = {"high": "Високий", "mid": "Середній", "low": "Низький"}
KINDS = {"pay": "Виплати ЗП", "dup": "Дублі платежів", "susp": "Підозрілі платежі", "bal": "Залишки й синхронізація",
         "edit": "Зміни в обліку", "cat": "Категорії"}
SKIP_CATS = ("Зарплата", "Податки", "Кредит", "Комісія за обслуговування рахунку", "Виведення грошей з бізнесу")

BIG_UNCATEGORISED = 500000      # kopecks
BIG_NEW_COUNTERPARTY = 2000000
CASH_NO_COMMENT = 500000
BIG_DELETE = 500000
BIG_EDIT = 100          # every change of an amount from 1 UAH is shown to the owner


def _f(key, kind, sev, title, detail, link="", amount=0, tx_ids=()):
    return dict(key=key, kind=kind, sev=sev, title=title, detail=detail, link=link, amount=amount,
                tx_ids=",".join(map(str, tx_ids)))


def _m(k):
    return f"{k / 100:,.2f}".replace(",", " ").replace(".", ",") + " ₴"


def _d(s):
    return f"{s[8:10]}.{s[5:7]}.{s[:4]}"


def check_payroll(con, today):
    for x in payroll.control(con, today):
        sign = "виплачено більше" if x["diff"] < 0 else "виплачено менше"
        yield _f(f"pay:{x['month']}:{x['wave']}:{x['diff']}", "pay", "high" if abs(x["diff"]) > 500000 else "mid",
                 f"ЗП за {x['month']}: {x['wave']}",
                 f"За таблицею {_m(x['plan'])}, в обліку {_m(x['rec'])} — {sign} на {_m(abs(x['diff']))}.",
                 f"/payroll?month={x['month']}", abs(x["diff"]))


def check_duplicates(con):
    rows = con.execute(
        "SELECT t.id, t.parent_id, t.account_id, t.amount, t.occurred_at, t.description, t.counterparty, a.name acc "
        "FROM transactions t JOIN accounts a ON a.id=t.account_id "
        "WHERE t.deleted_at IS NULL AND t.kind='expense' AND t.amount>=50000 AND t.occurred_at>=? "
        "ORDER BY t.account_id, t.amount, t.occurred_at", (config.HISTORY_START,)).fetchall()
    for i, a in enumerate(rows):
        for b in rows[i + 1:]:
            if (b["account_id"], b["amount"]) != (a["account_id"], a["amount"]):
                break
            da, db_ = datetime.fromisoformat(a["occurred_at"]), datetime.fromisoformat(b["occurred_at"])
            if db_ - da > timedelta(days=3):
                break
            if a["parent_id"] == b["id"] or b["parent_id"] == a["id"] or (a["parent_id"] and a["parent_id"] == b["parent_id"]):
                continue                                          # parts of one split payment are not duplicates
            who_a, who_b = norm(a["counterparty"] or a["description"]), norm(b["counterparty"] or b["description"])
            if who_a != who_b or not who_a:
                continue
            if "податк" in who_a or "єсв" in who_a:
                continue
            yield _f(f"dup:{a['id']}-{b['id']}", "dup", "high" if a["amount"] >= 1000000 else "mid",
                     f"Можливий дубль: {_m(a['amount'])} · {a['acc']}",
                     f"Однакова сума й отримувач двічі: {_d(a['occurred_at'])} і {_d(b['occurred_at'])}. "
                     f"{(a['counterparty'] or a['description'])[:80]}",
                     f"/transactions/{a['id']}", a["amount"], (a["id"], b["id"]))


def check_suspicious(con):
    # large payment that nobody categorised
    for t in con.execute(
            "SELECT t.id,t.amount,t.occurred_at,t.description,t.counterparty,a.name acc FROM transactions t "
            "JOIN accounts a ON a.id=t.account_id LEFT JOIN categories c ON c.id=t.category_id "
            "WHERE t.deleted_at IS NULL AND t.kind='expense' AND t.amount>=? AND t.occurred_at>=? AND t.user_edited=0 "
            "AND (c.id IS NULL OR c.auto=1 OR c.name='Інші витрати')", (BIG_UNCATEGORISED, config.HISTORY_START)):
        yield _f(f"unc:{t['id']}", "cat", "mid", f"Велика витрата без категорії: {_m(t['amount'])}",
                 f"{_d(t['occurred_at'])} · {t['acc']} · {(t['counterparty'] or t['description'])[:90]}",
                 f"/transactions/{t['id']}", t["amount"], (t["id"],))
    # cash leaving the till with no explanation
    for t in con.execute(
            "SELECT t.id,t.amount,t.occurred_at,t.description,a.name acc FROM transactions t JOIN accounts a ON a.id=t.account_id "
            "WHERE t.deleted_at IS NULL AND t.kind='expense' AND a.kind='cash' AND t.amount>=? AND t.occurred_at>=? "
            "AND t.user_edited=0 AND (trim(t.description)='' OR lower(trim(t.description)) IN ('витрата з каси','видача з каси'))",
            (CASH_NO_COMMENT, config.HISTORY_START)):
        yield _f(f"cashnc:{t['id']}", "susp", "high" if t["amount"] >= 3000000 else "mid",
                 f"Готівка з каси без пояснення: {_m(t['amount'])}",
                 f"{_d(t['occurred_at'])} · {t['acc']} · коментар порожній. Уточніть призначення й виправте операцію.",
                 f"/transactions/{t['id']}", t["amount"], (t["id"],))
    # first payment to a counterparty, and a big one
    for t in con.execute(
            "SELECT t.id,t.amount,t.occurred_at,t.description,t.counterparty,a.name acc, c.name cname FROM transactions t "
            "JOIN accounts a ON a.id=t.account_id LEFT JOIN categories c ON c.id=t.category_id "
            "WHERE t.deleted_at IS NULL AND t.kind='expense' AND t.amount>=? AND t.occurred_at>=? AND t.counterparty!='' "
            "AND NOT EXISTS (SELECT 1 FROM transactions p WHERE p.deleted_at IS NULL AND p.counterparty=t.counterparty "
            "AND p.id!=t.id AND p.occurred_at<t.occurred_at)", (BIG_NEW_COUNTERPARTY, config.HISTORY_START)):
        if (t["cname"] or "") in SKIP_CATS:
            continue
        yield _f(f"newcp:{t['id']}", "susp", "mid", f"Нова велика виплата: {_m(t['amount'])}",
                 f"{_d(t['occurred_at'])} · {t['acc']} · {t['counterparty'][:70]} — раніше платежів цьому отримувачу не було.",
                 f"/transactions/{t['id']}", t["amount"], (t["id"],))


def check_audit(con, today):
    since = (today - timedelta(days=30)).isoformat()
    for a in con.execute(
            "SELECT a.*, u.name uname FROM audit a JOIN users u ON u.id=a.user_id "
            "WHERE a.at>=? AND a.action IN ('delete','update') ORDER BY a.id", (since,)):
        try:
            b, af = json.loads(a["before_json"] or "{}"), json.loads(a["after_json"] or "{}")
        except ValueError:
            continue
        if (b.get("occurred_at") or "") < config.HISTORY_START:
            continue
        if a["action"] == "delete" and (b.get("amount") or 0) >= BIG_DELETE:
            yield _f(f"del:{a['id']}", "edit", "mid", f"Видалено операцію {_m(b['amount'])}",
                     f"{a['uname']} · {a['at'][:16].replace('T', ' ')} · {(b.get('description') or '')[:70]} (можна відновити в «Операціях»).",
                     f"/transactions/{a['tx_id']}", b["amount"], (a["tx_id"],))
        elif a["action"] == "update" and abs((af.get("amount") or 0) - (b.get("amount") or 0)) >= BIG_EDIT:
            yield _f(f"amt:{a['id']}", "edit", "mid", f"Змінено суму: {_m(b['amount'])} → {_m(af['amount'])}",
                     f"{a['uname']} · {a['at'][:16].replace('T', ' ')} · {(a['note'] or '').replace('Причина: ', 'причина: ')[:140]}",
                     f"/transactions/{a['tx_id']}", abs(af["amount"] - b["amount"]), (a["tx_id"],))


def check_accounts(con):
    bal = account_balances(con)
    for a in con.execute("SELECT * FROM accounts WHERE active=1"):
        if a["kind"] == "credit":
            continue
        if a["bank_balance"] is not None and a["source"] == "privat" and abs(a["bank_balance"] - bal[a["id"]]) >= 100:
            yield _f(f"bal:{a['id']}:{a['bank_balance']}:{bal[a['id']]}", "bal", "high", f"{a['name']}: залишок не збігається з банком",
                     f"У банку {_m(a['bank_balance'])}, в обліку {_m(bal[a['id']])}. Можливо, є операції, яких ще немає в обліку.",
                     "/accounts", abs(a["bank_balance"] - bal[a["id"]]))
        if a["source"] != "manual" and a["last_sync_status"] not in (None, "", "ok"):
            yield _f(f"sync:{a['id']}:{a['last_sync_status'][:40]}", "bal", "high", f"{a['name']}: помилка оновлення",
                     a["last_sync_status"][:160], "/accounts")
        if a["kind"] in ("cash", "card") and bal[a["id"]] < 0:
            yield _f(f"neg:{a['id']}", "bal", "high", f"{a['name']}: від'ємний залишок",
                     f"Залишок {_m(bal[a['id']])} — готівки не може бути менше нуля; десь пропущено надходження.", "/accounts",
                     abs(bal[a["id"]]))


def detect(con, today=None):
    today = today or datetime.now(config.KYIV).date()
    out = []
    for fn in (lambda: check_payroll(con, today), lambda: check_duplicates(con), lambda: check_suspicious(con),
               lambda: check_audit(con, today), lambda: check_accounts(con)):
        try:
            out += list(fn())
        except Exception:
            log.exception("control check failed")
    return out


def run(con, today=None):
    """Syncs the findings table with what is true right now."""
    found = {f["key"]: f for f in detect(con, today)}
    now = now_local()
    have = {r["key"]: r for r in con.execute("SELECT * FROM findings")}
    for k, f in found.items():
        if k in have:
            con.execute("UPDATE findings SET last_seen=?, title=?, detail=?, link=?, amount=? WHERE key=?",
                        (now, f["title"], f["detail"], f["link"], f["amount"], k))
            if have[k]["status"] == "fixed":   # came back after it had cleared itself
                con.execute("UPDATE findings SET status='open', note='' WHERE key=?", (k,))
        else:
            con.execute("INSERT INTO findings(key,kind,sev,title,detail,link,amount,tx_ids,status,first_seen,last_seen) "
                        "VALUES(?,?,?,?,?,?,?,?, 'open',?,?)",
                        (k, f["kind"], f["sev"], f["title"], f["detail"], f["link"], f["amount"], f["tx_ids"], now, now))
    for k, r in have.items():   # no longer true: close it by itself
        if k not in found and r["status"] == "open":
            con.execute("UPDATE findings SET status='fixed', decided_at=?, decided_by='', note='Умова зникла сама' WHERE key=?", (now, k))
    con.commit()


def open_count(con) -> int:
    return con.execute("SELECT COUNT(*) FROM findings WHERE status='open'").fetchone()[0]

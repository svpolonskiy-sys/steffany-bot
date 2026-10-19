import logging
import re

import requests
from datetime import date, datetime, timedelta

from . import alteg, config, privat
from .categorize import categorize, get_or_create_category
from .db import (account_balances, get_setting, insert_tx, lock, now_local, set_setting, update_tx)
from .security import decrypt

log = logging.getLogger("sync")


def in_work_window(now: datetime | None = None) -> bool:
    now = now or datetime.now(config.KYIV)
    return config.SYNC_FROM_HOUR <= now.hour < config.SYNC_TO_HOUR


def _log(con, account_id, ok, message, added=0, updated=0):
    con.execute("INSERT INTO sync_log(at,account_id,ok,message,added,updated) VALUES(?,?,?,?,?,?)",
                (now_local(), account_id, 1 if ok else 0, message, added, updated))
    con.execute("UPDATE accounts SET last_sync_at=?, last_sync_status=? WHERE id=?",
                (now_local(), "ok" if ok else message[:200], account_id))
    con.commit()


def _window_start(acc, overlap_days=3) -> str:
    hist = config.CREDIT_HISTORY_START if acc["kind"] == "credit" else get_setting_start()
    if not acc["last_sync_at"] or acc["last_sync_status"] != "ok":
        return hist
    d = datetime.fromisoformat(acc["last_sync_at"]).date() - timedelta(days=overlap_days)
    return max(d.isoformat(), hist)


def get_setting_start() -> str:
    return config.HISTORY_START


def sync_privat(con, acc, session=None) -> tuple[int, int]:
    token = decrypt(acc["token_enc"])
    if not token or not acc["iban"]:
        raise privat.PrivatError("Не задано IBAN або токен Автоклієнта")
    session = session or requests
    start = date.fromisoformat(_window_start(acc))
    raw = privat.fetch_transactions(token, acc["iban"], start, date.today(), session=session)
    own = {r["iban"]: r["id"] for r in con.execute(
        "SELECT id, iban FROM accounts WHERE active=1 AND kind IN ('fop','card','cash') AND iban!='' AND id!=?",
        (acc["id"],))}
    added = 0
    for t in raw:
        m = privat.map_tx(t, acc["iban"])
        if not m:
            continue
        cntr, my_name = m.pop("cntr_acc"), m.pop("my_name")
        if con.execute("SELECT 1 FROM transactions WHERE external_id=?", (m["external_id"],)).fetchone():
            continue
        if cntr in own:  # money moved between own accounts: one transfer, booked from the sending side
            if m["kind"] == "income":
                continue
            m["kind"], m["to_account_id"] = "transfer", own[cntr]
            insert_tx(con, account_id=acc["id"], category_id=None, source="privat", **m)
            added += 1
            continue
        cat = categorize(con, m["kind"], m["description"], m["counterparty"], own_name=my_name)
        insert_tx(con, account_id=acc["id"], category_id=cat, source="privat", **m)
        added += 1
    bal = privat.fetch_balance(token, acc["iban"], session=session)
    if bal is not None:
        first = not acc["opening_auto"] and not acc["last_sync_at"]
        con.execute("UPDATE accounts SET bank_balance=?, bank_balance_at=? WHERE id=?", (bal, now_local(), acc["id"]))
        if first:
            computed = account_balances(con)[acc["id"]] - acc["opening_balance"]
            con.execute("UPDATE accounts SET opening_balance=?, opening_auto=1 WHERE id=?", (bal - computed, acc["id"]))
    con.commit()
    return added, 0


def discover_credits(con, parent, token, session) -> list[int]:
    """Credit lines ('L' accounts with debt or activity since HISTORY_START) found under the FOP's token."""
    known = {r["iban"] for r in con.execute("SELECT iban FROM accounts WHERE iban!=''")}
    start = date.fromisoformat(config.CREDIT_HISTORY_START)
    new = []
    for b in privat.fetch_all_balances(token, session=session):
        iban = b.get("acc") or ""
        if b.get("atp") != "L" or iban in known or b.get("currency", "UAH") != "UAH":
            continue
        active = privat.to_kop(b.get("balanceOut") or "0") != 0
        if not active:
            active = bool(privat.fetch_transactions(token, iban, start, date.today(), session=session))
        if not active:
            continue
        cur = con.execute(
            "INSERT INTO accounts(name,kind,source,iban,token_enc,sort) VALUES(?,?,?,?,?,(SELECT COALESCE(MAX(sort),0)+1 FROM accounts))",
            (f"Кредит …{iban[-6:]} ({parent['name']})", "credit", "privat", iban, parent["token_enc"]))
        new.append(cur.lastrowid)
        known.add(iban)
    con.commit()
    return new


def sync_credit(con, acc, session=None) -> tuple[int, int]:
    token = decrypt(acc["token_enc"])
    session = session or requests
    start = date.fromisoformat(_window_start(acc))
    added = 0
    for t in privat.fetch_transactions(token, acc["iban"], start, date.today(), session=session):
        uid = t.get("ID") or ((t.get("REF") or "") + (t.get("REFN") or ""))
        amount = privat.to_kop(t.get("SUM") or "0")
        if not uid or amount <= 0 or (t.get("CCY") or "UAH") != "UAH":
            continue
        cur = con.execute(
            "INSERT OR IGNORE INTO credit_ops(account_id,external_id,occurred_at,direction,amount,description) VALUES(?,?,?,?,?,?)",
            (acc["id"], f"privat:{acc['iban']}:{uid}", privat.parse_dt(t), "C" if t.get("TRANTYPE") == "C" else "D",
             amount, (t.get("OSND") or "").strip()))
        added += cur.rowcount
    bal = privat.fetch_balance(token, acc["iban"], session=session)
    if bal is not None:
        con.execute("UPDATE accounts SET bank_balance=?, bank_balance_at=? WHERE id=?", (bal, now_local(), acc["id"]))
    con.commit()
    return added, 0


def _contract(desc: str) -> str | None:
    m = re.search(r"КД-(\d+)", desc or "")
    return f"КД-{m.group(1)}" if m else None


def credit_summary(con) -> dict:
    """Credit lines for repayment control. Debt = negative bank balance. Contracts are rebuilt from the
    bank's own wording: disbursement = debit on the principal account, repayment = 'Погашення заборгованості',
    'Винос кредита на прострочення' is only a move between accounts."""
    from .categorize import norm
    rows, total = [], 0
    contracts: dict[str, dict] = {}
    for a in con.execute("SELECT * FROM accounts WHERE kind='credit' AND active=1 ORDER BY sort,id"):
        ops = con.execute("SELECT direction, amount, occurred_at, description FROM credit_ops WHERE account_id=? "
                          "ORDER BY occurred_at", (a["id"],)).fetchall()
        debt = max(-(a["bank_balance"] or 0), 0)
        total += debt
        cnt = {}
        repaid = charged = repaid_n = 0
        last = None
        for o in ops:
            cnt[_contract(o["description"])] = cnt.get(_contract(o["description"]), 0) + 1
            if o["direction"] == "C":
                repaid += o["amount"]; repaid_n += 1; last = o["occurred_at"]
            else:
                charged += o["amount"]
        main = max((k for k in cnt if k), key=lambda k: cnt[k], default=None)
        if main:
            c = contracts.setdefault(main, dict(contract=main, taken=0, repaid=0, interest_accrued=0,
                                                interest_paid=0, debt=0, first=None))
            c["debt"] += debt
            for o in ops:
                t = norm(o["description"])
                c["first"] = min(filter(None, [c["first"], o["occurred_at"]]))
                if "відсот" in t:
                    if o["direction"] == "D" and "нарахування" in t:
                        c["interest_accrued"] += o["amount"]
                    elif o["direction"] == "C" and "погашення" in t:
                        c["interest_paid"] += o["amount"]
                elif "винос кредита" in t:
                    continue
                elif o["direction"] == "D":
                    c["taken"] += o["amount"]
                elif o["direction"] == "C":
                    c["repaid"] += o["amount"]
        rows.append({"id": a["id"], "name": a["name"], "iban": a["iban"], "debt": debt,
                     "bank_balance": a["bank_balance"], "synced_at": a["bank_balance_at"],
                     "repaid": repaid, "repaid_n": repaid_n, "last_payment": last, "charged": charged,
                     "contract": main})
    cl = sorted(contracts.values(), key=lambda c: c["contract"])
    for c in cl:
        c["principal_debt"] = c["taken"] - c["repaid"]
    return {"credits": rows, "total_debt": total, "contracts": cl,
            "total_taken": sum(c["taken"] for c in cl), "total_repaid": sum(c["repaid"] for c in cl)}


def _safe_account_id(con):
    v = get_setting(con, "safe_account_id")
    if v:
        return int(v)
    r = con.execute("SELECT id FROM accounts WHERE lower(name) LIKE '%сейф%' ORDER BY id").fetchone()
    return r["id"] if r else None


def sync_alteg(con, acc, client=None) -> tuple[int, int]:
    client = client or alteg.AltegClient()
    start = _window_start(acc)
    end = (date.today() + timedelta(days=1)).isoformat()
    rows = client.cash_transactions(start, end)
    safe_id = _safe_account_id(con)
    seen, added, updated = set(), 0, 0
    for t in rows:
        m = alteg.map_tx(t)
        if not m:
            continue
        title = m.pop("alteg_title", "")
        raw = m.pop("raw", "")
        seen.add(m["external_id"])
        ex = con.execute("SELECT * FROM transactions WHERE external_id=?", (m["external_id"],)).fetchone()
        if m["kind"] == "transfer":
            if not safe_id:
                m["kind"], m["to_account_id"] = "expense", None
            else:
                m["to_account_id"] = safe_id
        if ex:
            if ex["user_edited"] or ex["deleted_at"]:
                continue
            ch = {k: m[k] for k in ("amount", "occurred_at", "kind") if ex[k] != m[k]}
            if m["description"] != ex["description"]:
                ch["description"] = m["description"]
            if ch:
                update_tx(con, ex["id"], None, note="зміна в Alteg", user_edit=False, **ch)
                updated += 1
            continue
        if m["kind"] == "income":
            cname = alteg.ALTEG_INCOME_CATEGORY.get(title.lower(), "Оплата послуг")
            cat = get_or_create_category(con, cname, "income")
        else:
            cat = categorize(con, m["kind"], raw, "")
        insert_tx(con, account_id=acc["id"], category_id=cat, source="alteg", **m)
        added += 1
    # operations removed in Alteg inside the re-fetched window
    for ex in con.execute("SELECT * FROM transactions WHERE account_id=? AND source='alteg' AND deleted_at IS NULL "
                          "AND user_edited=0 AND occurred_at>=?", (acc["id"], start)).fetchall():
        if ex["external_id"] not in seen:
            update_tx(con, ex["id"], None, note="видалено в Alteg", user_edit=False, deleted_at=now_local())
            updated += 1
    con.commit()
    try:  # analytics must never break the cash ledger
        sync_cashless_sales(con, client, start, end)
        set_setting(con, "pay_sync_error", "")
    except Exception as e:
        log.exception("alteg payments sync failed")
        con.rollback()
        set_setting(con, "pay_sync_error", f"{type(e).__name__}: {e}"[:300])
    con.commit()
    return added, updated


def sync_cashless_sales(con, client, start: str, end: str):
    """Alteg payments (cash desk + card) by sale day, with master / service / direction.
    Cash feeds the ledger separately; card payments here are ONLY for the daily takings and analytics: the
    money reaches the FOP account days later and is booked from the bank statement (no double counting)."""
    back = (date.fromisoformat(start) - timedelta(days=21)).isoformat()  # visits paid later than they happened
    recs = {r["id"]: r for r in client.records(back, end)}
    catalog = {x["id"]: x for x in client.services()}
    cats = {x["id"]: x["title"] for x in client.service_categories()}
    fetched: dict[int, dict | None] = {}
    rows = []
    for method, acc in (("cash", config.ALTEG_CASH_ACCOUNT), ("cashless", config.ALTEG_CASHLESS_ACCOUNT)):
        for t in client.cash_transactions(start, end, account_id=acc):
            kop = int(round(float(t.get("amount") or 0) * 100))
            if kop <= 0:
                continue
            rid = t.get("record_id") or 0
            rec = recs.get(rid)
            if rid and rec is None and len(fetched) < 400:
                if rid not in fetched:
                    fetched[rid] = client.record(rid)
                rec = fetched[rid]
            title = (t.get("expense") or {}).get("title") or ""
            itype = t.get("sold_item_type") or ""
            staff = (rec or {}).get("staff") or {}
            svc_title, cat_title = "", ""
            if itype == "service":
                sid = t.get("sold_item_id")
                svc = next((x for x in (rec or {}).get("services", []) if x.get("id") == sid), None)
                cat = catalog.get(sid) or {}
                svc_title = (svc or {}).get("title") or cat.get("title") or "Послуга"
                cat_title = cats.get(cat.get("category_id"), "Без напрямку")
            elif itype == "goods_transaction" or title.lower() == "product sales":
                svc_title, cat_title = "Продаж товарів", "Товари"
            elif title.lower() == "gift card sales":
                svc_title, cat_title = "Подарункові сертифікати", "Сертифікати"
            else:
                svc_title, cat_title = title or "Інше", "Інше"
            rows.append((f"alteg:{t['id']}", alteg.local_dt(t["date"]), kop, method, rid or None, staff.get("id"),
                         staff.get("name") or "", staff.get("specialization") or "", svc_title, cat_title, itype))
    con.execute("DELETE FROM alteg_pay WHERE occurred_at >= ?", (start + "T00:00:00",))
    con.execute("DELETE FROM alteg_sales WHERE occurred_at >= ?", (start + "T00:00:00",))
    for r in rows:
        con.execute("INSERT OR REPLACE INTO alteg_pay(external_id,occurred_at,amount,method,record_id,staff_id,staff_name,"
                    "staff_role,service_title,category_title,item_type) VALUES(?,?,?,?,?,?,?,?,?,?,?)", r)
        if r[3] == "cashless":
            con.execute("INSERT OR REPLACE INTO alteg_sales(external_id,occurred_at,amount,title) VALUES(?,?,?,?)",
                        (r[0], r[1], r[2], r[8]))


def sync_account(con, acc, **kw):
    try:
        if acc["kind"] == "credit":
            a, u = sync_credit(con, acc, **kw)
        elif acc["source"] == "privat":
            a, u = sync_privat(con, acc, **kw)
            if acc["kind"] == "fop":
                try:
                    sess = kw.get("session") or requests
                    for cid in discover_credits(con, acc, decrypt(acc["token_enc"]), sess):
                        sync_account(con, con.execute("SELECT * FROM accounts WHERE id=?", (cid,)).fetchone(), session=sess)
                except Exception:
                    log.exception("credit discovery failed")
        elif acc["source"] == "alteg":
            a, u = sync_alteg(con, acc, **kw)
        else:
            return None
        _log(con, acc["id"], True, "ok", a, u)
        return a, u
    except Exception as e:  # keep other accounts syncing
        log.exception("sync failed for %s", acc["name"])
        con.rollback()
        _log(con, acc["id"], False, f"{type(e).__name__}: {e}")
        return None


def sync_all(con, force=False):
    if not force and not in_work_window():
        return {"skipped": "поза робочим часом (21:00-08:00)"}
    res = {}
    with lock():
        for acc in con.execute("SELECT * FROM accounts WHERE active=1 AND source!='manual' "
                               "ORDER BY (kind='credit'), sort, id").fetchall():
            res[acc["name"]] = sync_account(con, acc)
        set_setting(con, "last_sync_all", now_local())
    return res

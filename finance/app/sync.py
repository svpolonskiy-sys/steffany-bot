import logging

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
    hist = get_setting_start()
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
    added = 0
    for t in raw:
        m = privat.map_tx(t, acc["iban"])
        if not m:
            continue
        if con.execute("SELECT 1 FROM transactions WHERE external_id=?", (m["external_id"],)).fetchone():
            continue
        cat = categorize(con, m["kind"], m["description"], m["counterparty"])
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
    start = date.fromisoformat(config.HISTORY_START)
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


def credit_summary(con) -> dict:
    """Credit lines for repayment control. Debt = negative bank balance."""
    rows, total = [], 0
    for a in con.execute("SELECT * FROM accounts WHERE kind='credit' AND active=1 ORDER BY sort,id"):
        ops = con.execute("SELECT direction, SUM(amount) s, COUNT(*) n, MAX(occurred_at) last FROM credit_ops "
                          "WHERE account_id=? GROUP BY direction", (a["id"],)).fetchall()
        d = {o["direction"]: o for o in ops}
        debt = max(-(a["bank_balance"] or 0), 0)
        total += debt
        rows.append({"id": a["id"], "name": a["name"], "iban": a["iban"], "debt": debt,
                     "bank_balance": a["bank_balance"], "synced_at": a["bank_balance_at"],
                     "repaid": d["C"]["s"] if "C" in d else 0, "repaid_n": d["C"]["n"] if "C" in d else 0,
                     "last_payment": d["C"]["last"] if "C" in d else None,
                     "charged": d["D"]["s"] if "D" in d else 0})
    return {"credits": rows, "total_debt": total}


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
    return added, updated


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

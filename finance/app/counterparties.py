"""Counterparty directory: the list people pick from, kept in step with the names used in transactions."""
from .db import now_local


def sync(con):
    """Adds every counterparty name that appears in the ledger but is not in the directory yet."""
    con.execute("INSERT OR IGNORE INTO counterparties(name, created_at) "
                "SELECT DISTINCT trim(counterparty), ? FROM transactions WHERE trim(counterparty)!=''", (now_local(),))


def ensure(con, name: str):
    name = (name or "").strip()
    if name:
        con.execute("INSERT OR IGNORE INTO counterparties(name, created_at) VALUES(?,?)", (name, now_local()))


def default_category(con, name: str, kind: str):
    """Category the directory prescribes for this counterparty (only if it matches the payment kind)."""
    r = con.execute("SELECT c.id FROM counterparties p JOIN categories c ON c.id=p.default_category_id "
                    "WHERE p.name=? AND p.active=1 AND c.kind=? AND c.archived=0", ((name or "").strip(), kind)).fetchone()
    return r["id"] if r else None

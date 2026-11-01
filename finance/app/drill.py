"""Breakdowns for reports: which taxes were paid (by type, with every payment) and the owner's withdrawals."""
import re
from datetime import date

from . import pl
from .categorize import norm

TAX_CATEGORY = "Податки"
OWNER_CATEGORY = "Виведення грошей з бізнесу"
UK_MONTHS = ["січень", "лютий", "березень", "квітень", "травень", "червень", "липень", "серпень", "вересень", "жовтень", "листопад", "грудень"]


def tax_type(description: str) -> tuple[str, str, int]:
    """-> (name, side, order). side: 'staff' = taxes on employees' pay, 'own' = the entrepreneur's own taxes."""
    t = norm(description)
    own = "для фоп" in t or "для ф о п" in t
    if re.search(r"\bєсв\b", t):
        return ("ЄСВ за себе (ФОП)", "own", 4) if own else ("ЄСВ за працівників (роботодавець)", "staff", 1)
    if "пдфо" in t:
        return "ПДФО з зарплат (утримується з працівників)", "staff", 2
    if "військов" in t or re.search(r"\bвз\b", t):
        return ("Військовий збір ФОП", "own", 5) if own else ("Військовий збір з зарплат (утримується з працівників)", "staff", 3)
    if "єдин" in t:
        return "Єдиний податок (ФОП)", "own", 6
    return "Інші податки", "own", 9


def _period_label(description: str, paid: date) -> str:
    d = pl.accrual_date(description, paid)
    return f"за {UK_MONTHS[d.month - 1]} {d.year}" if d != paid else ""


def _rows(con, cname, lo, hi):
    return con.execute(
        "SELECT t.id, t.occurred_at, t.amount, t.description, t.counterparty, a.name acc FROM transactions t "
        "JOIN accounts a ON a.id=t.account_id JOIN categories c ON c.id=t.category_id "
        "WHERE t.deleted_at IS NULL AND t.kind='expense' AND c.name=? AND t.occurred_at BETWEEN ? AND ? "
        "ORDER BY t.occurred_at, t.id", (cname, lo + "T00:00:00", hi + "T23:59:59")).fetchall()


def _item(r):
    paid = date.fromisoformat(r["occurred_at"][:10])
    return dict(id=r["id"], date=r["occurred_at"][:10], acc=r["acc"], amount=r["amount"],
                text=(r["description"] or r["counterparty"] or "")[:140], period=_period_label(r["description"] or "", paid))


def taxes(con, lo: str, hi: str) -> dict:
    groups: dict[str, dict] = {}
    for r in _rows(con, TAX_CATEGORY, lo, hi):
        name, side, order = tax_type(r["description"] or "")
        g = groups.setdefault(name, dict(name=name, side=side, order=order, total=0, rows=[]))
        it = _item(r)
        g["total"] += it["amount"]
        g["rows"].append(it)
    out = sorted(groups.values(), key=lambda g: g["order"])
    total = sum(g["total"] for g in out)
    return dict(total=total, groups=out, count=sum(len(g["rows"]) for g in out),
                staff=sum(g["total"] for g in out if g["side"] == "staff"), own=sum(g["total"] for g in out if g["side"] == "own"))


def owner_draws(con, lo: str, hi: str) -> dict:
    rows = [_item(r) for r in _rows(con, OWNER_CATEGORY, lo, hi)]
    by_month: dict[str, int] = {}
    for it in rows:
        by_month[it["date"][:7]] = by_month.get(it["date"][:7], 0) + it["amount"]
    return dict(total=sum(i["amount"] for i in rows), rows=rows, by_month=sorted(by_month.items()))

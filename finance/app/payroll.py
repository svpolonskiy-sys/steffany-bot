"""Payroll from the salon's monthly Google Sheet (actuals) + a rate-based estimate for months not filled yet.

Sheet rules (as in the sheet's own formulas): hairdressers, nail masters, podologist 40% of the month's till,
brow master 60%, cosmetologist 20% laser / 35% cosmetology / 50% injections (net of drug cost) , +10% of personal
retail sales; administrators = shift rate + share of sales; "other staff" fixed.
Cost of a person = Зарплата + Відпускні + Лікарняні - штрафи/списання.
"""
import io
import re
from datetime import date, timedelta

import requests
from openpyxl import load_workbook

from . import config
from .categorize import norm
from .db import get_setting, now_local, set_setting

SECTIONS = [("адміністратор", "Адміністратори"), ("перукар", "Перукарі"), ("майстри манікюр", "Майстри манікюру"),
            ("подолог", "Подолог"), ("бровіст", "Бровісти"), ("косметолог", "Косметолог"),
            ("інші працівник", "Інші працівники")]
SECTION_ORDER = [lbl for _, lbl in SECTIONS]
MONTHS = {"січ": 1, "лют": 2, "берез": 3, "квіт": 4, "трав": 5, "черв": 6, "лип": 7, "серп": 8, "верес": 9,
          "жовт": 10, "листоп": 11, "груд": 12}


class PayrollError(Exception):
    pass


def fetch(sheet_id: str, session=requests) -> bytes:
    r = session.get(f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=xlsx", timeout=90)
    if r.status_code != 200 or r.content[:2] != b"PK":
        raise PayrollError("Не вдалось завантажити таблицю зарплати (перевірте доступ за посиланням)")
    return r.content


def _month(title: str, default_year: int):
    t = norm(title)
    for stem, m in MONTHS.items():
        if stem in t:
            y = re.search(r"(20\d\d)", t)
            return f"{int(y.group(1)) if y else default_year}-{m:02d}"
    return None


def _num(v) -> int:
    try:
        return int(round(float(v) * 100))
    except (TypeError, ValueError):
        return 0


def parse(content: bytes, default_year: int | None = None) -> dict[str, list[dict]]:
    default_year = default_year or date.today().year
    wb = load_workbook(io.BytesIO(content), data_only=True)
    out: dict[str, list[dict]] = {}
    for ws in wb.worksheets:
        ym = _month(ws.title, default_year)
        if not ym:
            continue
        section, hdr, rows = None, None, []
        for row in ws.iter_rows(values_only=True):
            a = row[0] if row else None
            if isinstance(a, str) and a.strip():
                na = norm(a)
                if na.startswith("№"):
                    hdr = {norm(str(h).replace("\n", " ")): i for i, h in enumerate(row) if h}
                    continue
                if na.startswith("зведен"):
                    section = None
                    continue
                for key, label in SECTIONS:
                    if na.startswith(key):
                        section, hdr = label, None
                        break
                continue
            if not (section and hdr and isinstance(a, (int, float)) and len(row) > 1 and isinstance(row[1], str)):
                continue
            name = row[1].strip()
            if not name or norm(name) == "разом":
                continue
            get = lambda *keys: next((_num(row[hdr[k]]) for k in keys if k in hdr and hdr[k] < len(row)), 0)
            fines = next((_num(row[i]) for k, i in hdr.items() if k.startswith("штраф") and i < len(row)), 0)
            gross = get("зарплата", "зп")
            vac, sick = get("відпускні"), get("лікарняні")
            if gross or vac or sick:
                rows.append(dict(section=section, name=name, gross=gross, vacation=vac, sick=sick, fines=abs(fines),
                                 taxes=get("податки"), sales=get("каса за місяць")))
        if rows:
            out[ym] = rows
    return out


def sync(con, session=requests) -> list[str]:
    """Reload every month that has numbers; empty months never wipe stored data."""
    if not config.PAYROLL_SHEET_ID:
        raise PayrollError("Не задано PAYROLL_SHEET_ID")
    data = parse(fetch(config.PAYROLL_SHEET_ID, session))
    for ym, rows in data.items():
        con.execute("DELETE FROM payroll WHERE month=?", (ym,))
        for r in rows:
            con.execute("INSERT INTO payroll(month,section,name,gross,vacation,sick,fines,taxes,sales) VALUES(?,?,?,?,?,?,?,?,?)",
                        (ym, r["section"], r["name"], r["gross"], r["vacation"], r["sick"], r["fines"], r["taxes"], r["sales"]))
    set_setting(con, "payroll_synced_at", now_local())
    set_setting(con, "payroll_error", "")
    con.commit()
    return sorted(data)


def maybe_sync(con, every_hours: float = 3):
    if not config.PAYROLL_SHEET_ID:
        return
    last = get_setting(con, "payroll_synced_at")
    if last:
        from datetime import datetime
        if (datetime.fromisoformat(now_local()) - datetime.fromisoformat(last)).total_seconds() < every_hours * 3600:
            return
    try:
        sync(con)
    except Exception as e:
        set_setting(con, "payroll_error", f"{type(e).__name__}: {e}"[:250])


MASTER_SECTIONS = ("Перукарі", "Майстри манікюру")


def month_costs(con, ym: str) -> dict[str, int] | None:
    """Actual payroll of a month. A month counts as filled only when masters are in it (a half-filled current month
    with just a few advances must not be mistaken for the whole payroll)."""
    rows = con.execute("SELECT section, SUM(gross+vacation+sick-fines) c FROM payroll WHERE month=? GROUP BY section", (ym,)).fetchall()
    d = {r["section"]: r["c"] for r in rows}
    if sum(d.get(s, 0) for s in MASTER_SECTIONS) <= 0:
        return None
    return d


def covered_months(con) -> list[str]:
    return [r["month"] for r in con.execute("SELECT DISTINCT month FROM payroll ORDER BY month") if month_costs(con, r["month"])]


def _section_of_role(role: str) -> str:
    n = norm(role)
    if "brow" in n:
        return "Бровісти"
    if "косметолог" in n:
        return "Косметолог"
    if "нігт" in n:
        return "Майстри манікюру"
    if "подолог" in n:
        return "Подолог"
    if "перукар" in n:
        return "Перукарі"
    return "Інші працівники"


# cosmetologist effective shares of Alteg price (calibrated on the sheet: cosmetology 35% of net ~75%, injections
# 50% of net ~72% after drug cost, laser 20%)
COSM_RATE = {"Лазерна епіляція": 0.20, "Косметологія": 0.35 * 0.75, "Ін'єкційна косметологія": 0.50 * 0.72}


def estimate(con, lo: date, hi: date, ref_month: str | None) -> dict[str, int]:
    """Accrued payroll for a period not yet in the sheet: commissions from Alteg takings by master + fixed part
    (administrators, other staff) carried over from the latest filled month, pro-rated by days."""
    a, b = lo.isoformat() + "T00:00:00", hi.isoformat() + "T23:59:59"
    res: dict[str, float] = {}
    for r in con.execute("SELECT staff_role role, category_title cat, SUM(amount) s FROM alteg_pay "
                         "WHERE occurred_at BETWEEN ? AND ? AND staff_id IS NOT NULL AND category_title!='Сертифікати' "
                         "GROUP BY 1,2", (a, b)):
        sec = _section_of_role(r["role"])
        if norm(r["role"]).startswith("корпоративна"):
            continue
        if r["cat"] == "Товари":
            rate = 0.10
        elif sec == "Косметолог":
            rate = COSM_RATE.get(r["cat"], 0.30)
        elif sec == "Бровісти":
            rate = 0.60
        else:
            rate = 0.40
        res[sec] = res.get(sec, 0) + r["s"] * rate
    if ref_month:
        fixed = month_costs(con, ref_month) or {}
        dim = ((lo.replace(day=28) + timedelta(days=4)).replace(day=1) - lo.replace(day=1)).days  # days in the target month
        days = (hi - lo).days + 1
        for sec in ("Адміністратори", "Інші працівники"):
            if sec in fixed:
                res[sec] = res.get(sec, 0) + fixed[sec] * days / dim
    return {k: int(round(v)) for k, v in res.items() if v}


def for_period(con, lo: date, hi: date) -> tuple[dict[str, int], list[str]]:
    """Payroll accrued in [lo, hi] by section and the months that are estimates."""
    hist = date.fromisoformat(config.HISTORY_START)
    total: dict[str, int] = {}
    est: list[str] = []
    covered = covered_months(con)
    m = lo.replace(day=1)
    while m <= hi:
        nxt = (m.replace(day=28) + timedelta(days=4)).replace(day=1)
        a_, b_ = max(m, lo), min(nxt - timedelta(days=1), hi)
        ym = m.strftime("%Y-%m")
        if b_ >= hist:
            a_ = max(a_, hist)
            dim = (nxt - m).days
            costs = month_costs(con, ym)
            if costs:
                f = ((b_ - a_).days + 1) / dim
                for sec, v in costs.items():
                    total[sec] = total.get(sec, 0) + int(round(v * f))
            else:
                ref = max((c for c in covered if c < ym), default=None)
                for sec, v in estimate(con, a_, b_, ref).items():
                    total[sec] = total.get(sec, 0) + v
                if any(estimate(con, a_, b_, ref).values()):
                    est.append(ym)
        m = nxt
    return total, est

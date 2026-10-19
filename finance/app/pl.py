"""Profit & Loss (management P&L for a beauty salon).

Structure (top-down):
  Revenue            = Alteg sales (services by direction + retail goods)  [sale day, cash + card, no double count
                       with bank credits]  + other operating income (sub-rent, coffee, ...)  [ledger]
  - COGS             = consumables, disposables, retail stock                          -> Gross profit
  - Labour           = payroll + bonuses + leave/sick + payroll taxes (ЄСВ/ПДФО/ВЗ)    -> Contribution after labour
  - Operating costs  = rent, utilities & premises, marketing, admin/other, bank fees   -> EBITDA
  - Interest         = interest ACCRUED on credit lines (credit_ops)
  - Taxes            = single tax and other non-payroll taxes actually paid            -> Net profit
Not in P&L (memo): gift-card sales (deferred revenue), equipment (capex), credit principal in/out, deposit,
owner withdrawals.
Expenses can be taken by payment date or by the month named in the payment text ("за вересень 2026").
"""
import re
from datetime import date, datetime, timedelta

from . import config, payroll
from .categorize import norm

EXPENSE_GROUPS = [
    ("cogs", "Матеріали й товари (собівартість)"), ("labour", "Оплата праці"), ("rent", "Оренда"),
    ("utilities", "Комунальні та приміщення"), ("marketing", "Маркетинг і реклама"),
    ("admin", "Адміністративні та інші"), ("bank", "Банківські комісії"), ("tax", "Податки (єдиний та інші)"),
    ("capex", "Обладнання (капітальні витрати)"), ("nonpl", "Поза P&L (кредит, застава, вилучення власника)")]
INCOME_GROUPS = [("other_income", "Інші операційні доходи"), ("sales_dup", "Продажі (вже враховані з Alteg)"),
                 ("nonpl", "Поза P&L (кредит, інвестиції, застава)")]
GROUP_NAMES = dict(EXPENSE_GROUPS + INCOME_GROUPS)

DEFAULT_GROUP = {
    # expenses
    "Матеріал в роботу": "cogs", "Товари одноразового використання": "cogs", "Товар на вітрину": "cogs",
    "Реалізація товару": "cogs", "Продукти для клієнтів": "cogs",
    "Зарплата": "labour", "Витрати на персонал": "labour", "Премія": "labour", "Відпускні": "labour", "ЛІКАРНЯНІ": "labour",
    "Оренда": "rent", "Комунальні": "utilities", "Комунальні послуги": "utilities", "Витрати на приміщення": "utilities",
    "Реклама": "marketing", "Поліграфія": "marketing",
    "Комісія банку": "bank", "Комісія за обслуговування рахунку": "bank",
    "Податки": "tax", "Обладнання": "capex",
    "Кредит": "nonpl", "Застава": "nonpl", "Виведення грошей з бізнесу": "nonpl", "Інкасація": "nonpl",
    # income
    "Оплата послуг": "sales_dup", "Продаж товарів": "sales_dup", "Каса за день": "sales_dup",
    "Додаткові надходження": "sales_dup", "Суборенда": "other_income", "Каса кава": "other_income",
    "Інші доходи": "other_income", "Інвестиції": "nonpl",
}
PAYROLL_TAX = re.compile(r"(єсв|пдфо|вз/|військов\w* збір|єдин\w* соціальн)")
ESV = re.compile(r"(єсв|єдин\w* соціальн)")
MONTHS = {"січ": 1, "лют": 2, "берез": 3, "квіт": 4, "трав": 5, "черв": 6, "лип": 7, "серп": 8, "верес": 9,
          "жовт": 10, "листоп": 11, "груд": 12}
MONTH_RE = re.compile(r"\bза\s+(?:\w+\s+)?(" + "|".join(MONTHS) + r")\w*(?:\s+(\d{4}))?")


def group_of(name: str, kind: str, exclude: int, pl_group: str) -> str:
    if pl_group:
        return pl_group
    if exclude:
        return "nonpl"
    return DEFAULT_GROUP.get(name, "admin" if kind == "expense" else "other_income")


def accrual_date(description: str, paid: date) -> date:
    """'… за вересень 2026' paid in October -> September 2026 (mid-month, so whole-month periods catch it)."""
    m = MONTH_RE.search(norm(description))
    if not m:
        return paid
    month = next(v for k, v in MONTHS.items() if m.group(1) == k)
    year = int(m.group(2)) if m.group(2) else paid.year
    if not m.group(2):
        if month - paid.month > 6:
            year -= 1
        elif paid.month - month > 6:
            year += 1
    return date(year, month, 15)


def _group_sum(con, group: str, lo: date, hi: date) -> int:
    """Ledger expenses of a P&L group accrued (month named in the payment text) inside [lo, hi]."""
    q = ("SELECT t.amount, t.occurred_at, t.description, COALESCE(c.name,'') cname, COALESCE(c.exclude,0) ex, COALESCE(c.pl_group,'') pg "
         "FROM transactions t LEFT JOIN categories c ON c.id=t.category_id WHERE t.deleted_at IS NULL AND t.kind='expense' "
         "AND t.occurred_at BETWEEN ? AND ?")
    wide_lo, wide_hi = (lo - timedelta(days=75)).isoformat() + "T00:00:00", (hi + timedelta(days=75)).isoformat() + "T23:59:59"
    tot = 0
    for t in con.execute(q, (wide_lo, wide_hi)):
        if group_of(t["cname"] or "Інші витрати", "expense", t["ex"], t["pg"]) != group:
            continue
        if lo <= accrual_date(t["description"], date.fromisoformat(t["occurred_at"][:10])) <= hi:
            tot += t["amount"]
    return tot


def _esv_sum(con, lo: date, hi: date) -> int:
    """Employer social contribution (ЄСВ) accrued inside [lo, hi] by the month named in the payment text."""
    q = ("SELECT amount, occurred_at, description, counterparty FROM transactions WHERE deleted_at IS NULL AND kind='expense' "
         "AND occurred_at BETWEEN ? AND ?")
    wide_lo, wide_hi = (lo - timedelta(days=75)).isoformat() + "T00:00:00", (hi + timedelta(days=75)).isoformat() + "T23:59:59"
    tot = 0
    for t in con.execute(q, (wide_lo, wide_hi)):
        if not ESV.search(norm(t["description"] + " " + t["counterparty"])):
            continue
        if lo <= accrual_date(t["description"], date.fromisoformat(t["occurred_at"][:10])) <= hi:
            tot += t["amount"]
    return tot


def compute(con, lo: date, hi: date, accrual: bool = False) -> dict:
    a, b = lo.isoformat() + "T00:00:00", hi.isoformat() + "T23:59:59"
    # ---- revenue from Alteg sales
    services, goods, gift = {}, 0, 0
    n_pay = cash_rev = card_rev = 0
    for r in con.execute("SELECT category_title c, item_type t, method m, SUM(amount) s, COUNT(*) n FROM alteg_pay "
                         "WHERE occurred_at BETWEEN ? AND ? GROUP BY 1,2,3", (a, b)):
        if r["c"] == "Сертифікати":
            gift += r["s"]
            continue
        n_pay += r["n"]
        if r["m"] == "cash":
            cash_rev += r["s"]
        else:
            card_rev += r["s"]
        if r["c"] == "Товари":
            goods += r["s"]
        else:
            services[r["c"]] = services.get(r["c"], 0) + r["s"]
    # ---- ledger
    wide_lo, wide_hi = (lo - timedelta(days=75)).isoformat() + "T00:00:00", (hi + timedelta(days=75)).isoformat() + "T23:59:59"
    other_income, exp, nonpl = {}, {}, {}
    payroll_tax = 0
    pay, est_months, pay_by_month = payroll.for_period(con, lo, hi)
    pay_mode = sum(pay.values()) > 0   # payroll accrual replaces ledger salary payments (avoids double counting)
    esv = pit = paid_payroll = 0
    q = ("SELECT t.kind, t.amount, t.occurred_at, t.description, t.counterparty, c.name cname, COALESCE(c.exclude,0) ex, "
         "COALESCE(c.pl_group,'') pg FROM transactions t LEFT JOIN categories c ON c.id=t.category_id "
         "WHERE t.deleted_at IS NULL AND t.kind IN ('income','expense') AND t.occurred_at BETWEEN ? AND ?")
    for t in con.execute(q, (wide_lo, wide_hi)):
        paid = date.fromisoformat(t["occurred_at"][:10])
        is_ptax = t["kind"] == "expense" and bool(PAYROLL_TAX.search(norm(t["description"] + " " + t["counterparty"])))
        use_acc = (accrual and t["kind"] == "expense") or (pay_mode and is_ptax)
        eff = accrual_date(t["description"], paid) if use_acc else paid
        if not (lo <= eff <= hi):
            continue
        name = t["cname"] or ("Інші доходи" if t["kind"] == "income" else "Інші витрати")
        g = group_of(name, t["kind"], t["ex"], t["pg"])
        amt = t["amount"]
        if g == "nonpl":
            k = (t["kind"], name)
            nonpl[k] = nonpl.get(k, 0) + amt
        elif t["kind"] == "income":
            if g == "other_income":
                other_income[name] = other_income.get(name, 0) + amt
        elif g == "capex":
            exp.setdefault("capex", {})[name] = exp.setdefault("capex", {}).get(name, 0) + amt
        else:
            if pay_mode and g == "labour" and name in payroll.SHEET_CATEGORIES:
                paid_payroll += amt          # settlement of payroll accrued from the sheet: memo only
                continue                     # (other staff cost, e.g. cleaners, is NOT in the sheet and stays a cost)
            if g == "tax" and is_ptax:
                if pay_mode:
                    if ESV.search(norm(t["description"] + " " + t["counterparty"])):
                        esv += amt           # employer contribution: real extra cost
                    else:
                        pit += amt           # ПДФО/ВЗ are withheld from gross pay: already inside payroll
                else:
                    payroll_tax += amt
                continue
            d = exp.setdefault(g, {})
            d[name] = d.get(name, 0) + amt
    rent_est = 0
    if accrual:  # rent not yet invoiced/paid for a running month: accrue like last month, pro-rated by days
        hist = date.fromisoformat(config.HISTORY_START)
        m = lo.replace(day=1)
        while m <= hi:
            nxt = (m.replace(day=28) + timedelta(days=4)).replace(day=1)
            a_, b_ = max(m, lo, hist), min(nxt - timedelta(days=1), hi)
            pm = (m - timedelta(days=1)).replace(day=1)
            if b_ >= a_ and pm >= hist.replace(day=1) and _group_sum(con, "rent", a_, b_) == 0:
                prev_rent = _group_sum(con, "rent", pm, m - timedelta(days=1))
                rent_est += int(round(prev_rent * ((b_ - a_).days + 1) / (nxt - m).days))
            m = nxt
        if rent_est:
            exp.setdefault("rent", {})["Оренда (оцінка за минулим місяцем)"] = rent_est
    if pay_mode and est_months:
        # months not in the sheet yet: ЄСВ is paid in two parts (advance, settlement) -> accrue it at last month's rate
        covered = payroll.covered_months(con)
        for ym in est_months:
            y_, m_ = map(int, ym.split("-"))
            ms = date(y_, m_, 1)
            me = (ms.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
            a_, b_ = max(ms, lo), min(me, hi)
            ref = max((c for c in covered if c < ym), default=None)
            if not ref:
                continue
            ry, rm = map(int, ref.split("-"))
            rs = date(ry, rm, 1)
            re_ = (rs.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
            ref_pay = sum((payroll.month_costs(con, ref) or {}).values())
            ratio = _esv_sum(con, rs, re_) / ref_pay if ref_pay else 0
            est = int(round(ratio * sum(pay_by_month.get(ym, {}).values())))
            have = _esv_sum(con, a_, b_)
            if est > have:
                esv += est - have
    interest = 0
    for r in con.execute("SELECT amount, description FROM credit_ops WHERE direction='D' AND occurred_at BETWEEN ? AND ?", (a, b)):
        t = norm(r["description"])
        if "відсот" in t and "нарахування" in t:
            interest += r["amount"]
    tot = lambda g: sum(exp.get(g, {}).values())
    sales = sum(services.values()) + goods
    oi = sum(other_income.values())
    revenue = sales + oi
    cogs = tot("cogs")
    labour = (sum(pay.values()) + esv + tot("labour")) if pay_mode else (tot("labour") + payroll_tax)
    opex = sum(tot(g) for g in ("rent", "utilities", "marketing", "admin", "bank"))
    gross = revenue - cogs
    contribution = gross - labour
    ebitda = contribution - opex
    tax = tot("tax")
    net = ebitda - interest - tax
    days = (hi - lo).days + 1
    return dict(services=services, goods=goods, gift=gift, other_income=other_income, sales=sales, oi=oi, revenue=revenue,
                exp=exp, payroll_tax=payroll_tax, pay=pay, pay_mode=pay_mode, est_months=est_months, esv=esv, pit=pit,
                paid_payroll=paid_payroll, compensated=payroll.compensation(con, lo, hi), cogs=cogs, labour=labour, opex=opex, gross=gross,
                contribution=contribution, ebitda=ebitda, interest=interest, tax=tax, net=net, nonpl=nonpl,
                n_pay=n_pay, cash_rev=cash_rev, card_rev=card_rev, days=days, capex=tot("capex"))


def _months(lo: date, hi: date):
    m = lo.replace(day=1)
    while m <= hi:
        yield m.strftime("%Y-%m")
        m = (m.replace(day=28) + timedelta(days=4)).replace(day=1)


def close_months(con) -> list[str]:
    """Freeze the P&L of a month on the 8th of the next one (salary is paid on the 7th) once its payroll sheet is filled."""
    today = datetime.now(config.KYIV).date()
    hist = date.fromisoformat(config.HISTORY_START).replace(day=1)
    m, done = hist, []
    while True:
        nxt = (m.replace(day=28) + timedelta(days=4)).replace(day=1)
        if today < nxt + timedelta(days=7):
            break
        ym = m.strftime("%Y-%m")
        if not con.execute("SELECT 1 FROM pl_closed WHERE month=?", (ym,)).fetchone() and payroll.month_costs(con, ym):
            c = compute(con, m, nxt - timedelta(days=1), accrual=True)
            con.execute("INSERT INTO pl_closed(month,closed_at,revenue,cogs,gross,labour,opex,ebitda,interest,tax,net) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
                        (ym, today.isoformat(), c["revenue"], c["cogs"], c["gross"], c["labour"], c["opex"], c["ebitda"],
                         c["interest"], c["tax"], c["net"]))
            done.append(ym)
        m = nxt
    con.commit()
    return done


def _pct(x, base):
    return round(x * 100 / base, 1) if base and x is not None else None


def _delta(cur, prev):
    return round((cur - prev) * 100 / abs(prev), 1) if prev else None


def build(con, d_from: str, d_to: str, accrual: bool = False) -> dict:
    lo, hi = date.fromisoformat(d_from), date.fromisoformat(d_to)
    days = (hi - lo).days + 1
    plo, phi = lo - timedelta(days=days), lo - timedelta(days=1)
    cur, prev = compute(con, lo, hi, accrual), compute(con, plo, phi, accrual)
    prev_ok = plo >= date.fromisoformat(config.HISTORY_START)  # no ledger/Alteg data before that: nothing to compare
    rev = cur["revenue"]
    lines = []

    def add(label, key=None, amount=None, kind="item", indent=0, pamount=None, note=""):
        amount = cur[key] if key else amount
        pamount = prev[key] if (key and pamount is None) else pamount
        if not prev_ok:
            pamount = None
        lines.append(dict(label=label, amount=amount, prev=pamount, kind=kind, indent=indent, note=note,
                          pct=_pct(amount, rev), delta=_delta(amount, pamount or 0) if (pamount is not None and amount is not None) else None))

    def cats(d, pd_, sign_label=None, indent=1):
        for name in sorted(d, key=lambda n: -d[n]):
            add(name, amount=d[name], pamount=pd_.get(name, 0), indent=indent)

    add("ВИРУЧКА", kind="head")
    for name in sorted(cur["services"], key=lambda n: -cur["services"][n]):
        add(name, amount=cur["services"][name], pamount=prev["services"].get(name, 0), indent=1)
    add("Продаж товарів (роздріб)", "goods", indent=1)
    add("Виручка від продажів", "sales", kind="sub")
    cats(cur["other_income"], prev["other_income"])
    add("Загальна виручка", "revenue", kind="total")

    add("СОБІВАРТІСТЬ (матеріали й товари)", kind="head")
    cats(cur["exp"].get("cogs", {}), prev["exp"].get("cogs", {}))
    add("Разом собівартість", "cogs", kind="sub")
    add("ВАЛОВИЙ ПРИБУТОК", "gross", kind="total", note="маржа")

    add("ОПЛАТА ПРАЦІ", kind="head")
    if cur["pay_mode"]:
        est = bool(cur["est_months"])
        for sec in payroll.SECTION_ORDER:
            if cur["pay"].get(sec) or prev["pay"].get(sec):
                add(sec + (" (оцінка)" if est and cur["pay"].get(sec) else ""), amount=cur["pay"].get(sec, 0),
                    pamount=prev["pay"].get(sec, 0), indent=1)
        cats(cur["exp"].get("labour", {}), prev["exp"].get("labour", {}))   # staff outside the sheet (cleaners, etc.)
        add("ЄСВ роботодавця (за місяцем нарахування)", "esv", indent=1)
    else:
        cats(cur["exp"].get("labour", {}), prev["exp"].get("labour", {}))
        add("ЄСВ, ПДФО, військовий збір (податки на оплату праці)", "payroll_tax", indent=1)
    add("Разом оплата праці", "labour", kind="sub")
    add("ПРИБУТОК ПІСЛЯ ОПЛАТИ ПРАЦІ", "contribution", kind="total")

    add("ОПЕРАЦІЙНІ ВИТРАТИ", kind="head")
    for g, label in (("rent", "Оренда"), ("utilities", "Комунальні та приміщення"), ("marketing", "Маркетинг і реклама"),
                     ("admin", "Адміністративні та інші"), ("bank", "Банківські комісії")):
        s, ps = sum(cur["exp"].get(g, {}).values()), sum(prev["exp"].get(g, {}).values())
        if s or ps:
            add(label, amount=s, pamount=ps, kind="item", indent=1)
            cats(cur["exp"].get(g, {}), prev["exp"].get(g, {}), indent=2) if g in ("admin", "utilities", "marketing", "bank", "rent") else None
    add("Разом операційні витрати", "opex", kind="sub")
    add("EBITDA (операційний прибуток)", "ebitda", kind="total")

    add("Відсотки по кредитах (нараховані)", "interest")
    add("Податки (єдиний та інші, сплачені)", "tax")
    add("ЧИСТИЙ ПРИБУТОК", "net", kind="grand")

    memo = []
    if cur["gift"] or prev["gift"]:
        memo.append(("Продано подарункових сертифікатів (зобов'язання, не виручка)", cur["gift"]))
    if cur["pay_mode"]:
        memo.append(("Виплачено зарплати й авансів у обліку (банк + каса), для звірки з нарахованою", cur["paid_payroll"]))
        memo.append(("ПДФО та військовий збір, сплачені компанією до бюджету", cur["pit"]))
        memo.append(("…з них компенсовано майстрами (колонка «Податки» зарплатної таблиці)", cur["compensated"]))
    if cur["capex"]:
        memo.append(("Обладнання (капітальні витрати, не в P&L)", cur["capex"]))
    for (kind, name), v in sorted(cur["nonpl"].items(), key=lambda x: -x[1]):
        memo.append((f"{name} — {'надходження' if kind == 'income' else 'витрата'} (поза P&L)", v))
    nd = max(cur["days"], 1)
    var_share = (cur["cogs"] + cur["labour"]) / rev if rev else 0
    bep = round(cur["opex"] / (1 - var_share)) if rev and var_share < 1 else None
    kpis = dict(
        gross_margin=_pct(cur["gross"], rev), labour_pct=_pct(cur["labour"], rev), cogs_pct=_pct(cur["cogs"], rev),
        rent_pct=_pct(sum(cur["exp"].get("rent", {}).values()), rev), ebitda_margin=_pct(cur["ebitda"], rev),
        net_margin=_pct(cur["net"], rev), avg_check=(cur["sales"] // cur["n_pay"]) if cur["n_pay"] else 0,
        rev_per_day=rev // nd, bep=bep, bep_note="виручка, за якої EBITDA = 0, якщо матеріали й оплата праці лишаються пропорційними виручці")
    # "where each hryvnia goes"
    split = []
    if rev > 0:
        for label, v, color in (("Матеріали й товари", cur["cogs"], "#6aa7d8"), ("Оплата праці", cur["labour"], "#d9b44a"),
                                ("Оренда й приміщення", sum(sum(cur["exp"].get(g, {}).values()) for g in ("rent", "utilities")), "#a78bd6"),
                                ("Інші витрати", sum(sum(cur["exp"].get(g, {}).values()) for g in ("marketing", "admin", "bank")), "#9aa0a6"),
                                ("Відсотки й податки", cur["interest"] + cur["tax"], "#e07a8a"),
                                ("Чистий прибуток", max(cur["net"], 0), "#5fbf86")):
            split.append(dict(label=label, v=v, pct=round(v * 100 / rev, 1), color=color))
    # per-month dynamics
    months = []
    m = lo.replace(day=1)
    while m <= hi and len(months) < 14:
        nxt = (m.replace(day=28) + timedelta(days=4)).replace(day=1)
        a_, b_ = max(m, lo), min(nxt - timedelta(days=1), hi)
        c = compute(con, a_, b_, accrual)
        months.append(dict(label=m.strftime("%Y-%m"), **{k: c[k] for k in ("revenue", "cogs", "gross", "labour", "opex", "ebitda", "interest", "tax", "net")}))
        m = nxt
    today = datetime.now(config.KYIV).date()
    nxt = (hi.replace(day=28) + timedelta(days=4)).replace(day=1)
    month_end = hi == nxt - timedelta(days=1)
    months_cov = all(payroll.month_costs(con, m_) for m_ in _months(lo, hi))
    pay_day = nxt + timedelta(days=7)  # salary for the month is paid on the 7th of the next one -> report is final on the 8th
    status = "final" if (month_end and months_cov and today >= pay_day) else "preliminary"
    why = ("" if status == "final" else
           (f"зарплата за {hi.strftime('%m.%Y')} виплачується 7 числа, звіт стане остаточним {pay_day.strftime('%d.%m.%Y')}" if month_end and today < pay_day
            else "період не закінчився або зарплатну таблицю за місяць ще не заповнено: зарплата оцінена за ставками"))
    return dict(status=status, status_note=why, from_=d_from, to=d_to, prev_from=plo.isoformat(), prev_to=phi.isoformat(), lines=lines, memo=memo, kpis=kpis,
                split=split, months=months if len(months) > 1 else [], cur=cur, prev_net=prev["net"], prev_revenue=prev["revenue"],
                accrual=accrual, prev_ok=prev_ok, pay_mode=cur["pay_mode"], est_months=cur["est_months"], empty=(rev == 0 and cur["cogs"] == 0 and cur["labour"] == 0 and cur["opex"] == 0))

"""Monthly payroll accrual ("Нарахування ЗП").

Inputs   : Alteg sales per master (1st .. last day of the month), the accountant's Ф-1 bank payments (Excel upload or a
           Google Drive link: advance, salary, vacation, sick pay, taxes), cash advances paid out of the till, fines and
           the admins' hours/shifts.
Formulas : exactly those of the salon's payroll sheet (checked against the September tab):
           masters 40% of their till (brow master 60%), +10% of personal retail sales, +monthly extra (e.g. the head of the
           nail direction); cosmetologist 35% cosmetology / 50% injections / 20% laser; administrators = hourly rate x hours
           + 4% of the salon's services split by shifts + 10% of personal retail; the manager 1.5% of all services;
           other staff are fixed. Everything rounds to whole hryvnias, like the sheet.
Safety   : every run goes through several levels of automatic checks (data, inputs, calculation, cross-source, sanity,
           comparison with the sheet). A run with an error cannot be mistaken for a good one; every run is kept.
"""
import io
import json
import re
from datetime import date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP

import requests
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

from . import config, payroll
from .categorize import norm
from .db import get_setting, now_local, set_setting

SECTIONS = payroll.SECTION_ORDER          # Адміністратори, Перукарі, Майстри манікюру, Подолог, Бровісти, Косметолог, Інші працівники
KIND_LABEL = {"admin": "адміністратор", "master": "відсоток від каси", "cosm": "косметолог (35/50/20%)",
              "manager": "керівник (1,5% від послуг)", "fixed": "фіксована ставка"}
DEFAULT_KIND = {"Адміністратори": "admin", "Перукарі": "master", "Майстри манікюру": "master", "Подолог": "master",
                "Бровісти": "master", "Косметолог": "cosm", "Інші працівники": "fixed"}
COSM_CATS = {"Косметологія": 0.35, "Ін'єкційна косметологія": 0.50, "Лазерна епіляція": 0.20}
ADMIN_POOL = 0.04
RETAIL_PCT = 0.10
MANAGER_PCT = 0.015
HOURLY = 70                      # UAH per hour (700 per shift / 10), as in the sheet
TOL = 1.0                        # UAH: rounding noise that is not an error


class PayrunError(Exception):
    pass


def rnd(x) -> int:
    """Excel ROUND(x, 0): half away from zero."""
    return int(Decimal(str(round(float(x), 6))).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def month_bounds(ym: str) -> tuple[date, date]:
    y, m = map(int, ym.split("-"))
    lo = date(y, m, 1)
    return lo, (lo.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)


def month_label(ym: str) -> str:
    names = ["січень", "лютий", "березень", "квітень", "травень", "червень", "липень", "серпень", "вересень", "жовтень", "листопад", "грудень"]
    y, m = map(int, ym.split("-"))
    return f"{names[m - 1]} {y}"


def default_month() -> str:
    today = datetime.now(config.KYIV).date()
    return (today.replace(day=1) - timedelta(days=1)).strftime("%Y-%m")


# ------------------------------------------------------------------ people
def _tokens(name: str) -> list[str]:
    return [t for t in re.split(r"[^\w']+", norm(name)) if t]


def _surname_key(name: str) -> str:
    t = _tokens(name)
    return t[0][:6] if t else ""


def seed_people(con) -> int:
    """First start: the roster is taken from the newest filled month of the payroll sheet."""
    if con.execute("SELECT COUNT(*) FROM pay_people").fetchone()[0]:
        return 0
    covered = payroll.covered_months(con)
    if not covered:
        return 0
    best = next((m for m in reversed(covered) if not payroll.fill_status(con, m)["partial"]), covered[-1])   # newest fully filled month
    n = 0
    for r in con.execute("SELECT section, name, gross, rate FROM payroll WHERE month=? ORDER BY id", (best,)):
        kind = DEFAULT_KIND.get(r["section"], "master")
        pct = 0.6 if r["section"] == "Бровісти" else 0.4 if kind == "master" else None
        fixed = r["gross"] if kind == "fixed" else 0
        if kind == "fixed" and "банцер" in norm(r["name"]):
            kind, fixed = "manager", 0
        extra = 500000 if "нонік" in norm(r["name"]) else 0          # head of the nail direction, paid every month
        alias = ("михалюк ірина" if "буднік" in norm(r["name"]) else "рустем" if "сейдаметов" in norm(r["name"]) else "")   # how Alteg names them
        con.execute("INSERT OR IGNORE INTO pay_people(name,section,kind,pct,fixed,extra,rate,alias,note) VALUES(?,?,?,?,?,?,?,?,?)",
                    (r["name"].strip(), r["section"], kind, pct, fixed, extra, (r["rate"] or 0) if kind == "admin" else 0, alias,
                     "щомісячна доплата керівнику нейл-напряму" if extra else ""))
        n += 1
    con.commit()
    return n


def roster(con, active_only=True) -> list[dict]:
    seed_people(con)
    rows = con.execute("SELECT * FROM pay_people " + ("WHERE active=1 " if active_only else "") +
                       "ORDER BY id").fetchall()
    out = [dict(r) for r in rows]
    out.sort(key=lambda p: (SECTIONS.index(p["section"]) if p["section"] in SECTIONS else 99, p["id"]))
    return out


def match_name(name: str, people: list[dict], section: str | None = None) -> list[dict]:
    """People whose surname (or alias) matches a free-form name (Alteg / accountant's file / payment text)."""
    toks = set(_tokens(name))
    if not toks:
        return []
    hit = []
    for p in people:
        keys = {_surname_key(p["name"])}
        for al in filter(None, (a.strip() for a in (p.get("alias") or "").split("|"))):
            keys.add(_surname_key(al))
        if any(k and any(t[:6] == k or (len(k) >= 5 and t.startswith(k[:5])) for t in toks) for k in keys):
            # the given name must not contradict (two people with one surname)
            hit.append(p)
    if len(hit) > 1:   # same surname twice (rows of one person in two sections count as one)
        names = {p["name"] for p in hit}
        if len(names) > 1:
            first = [p for p in hit if any(t in toks for t in _tokens(p["name"])[1:])]
            hit = first or hit
    if section:
        hit = [p for p in hit if p["section"] == section] or hit
    return hit


# ------------------------------------------------------------------ Alteg data
def alteg_month(con, ym: str) -> dict:
    lo, hi = month_bounds(ym)
    a, b = lo.isoformat() + "T00:00:00", hi.isoformat() + "T23:59:59"
    staff: dict = {}
    total_svc = total_goods = cert = 0
    days = set()
    for r in con.execute("SELECT staff_id, staff_name, staff_role, category_title cat, SUM(amount) s, COUNT(*) n FROM alteg_pay "
                         "WHERE occurred_at BETWEEN ? AND ? GROUP BY 1,2,3,4", (a, b)):
        if r["cat"] == "Сертифікати":
            cert += r["s"]
            continue
        goods = r["cat"] == "Товари"
        total_goods += r["s"] if goods else 0
        total_svc += 0 if goods else r["s"]
        k = r["staff_id"] if r["staff_id"] is not None else "none"
        d = staff.setdefault(k, dict(staff_id=r["staff_id"], name=r["staff_name"], role=r["staff_role"], svc=0, goods=0, cats={}))
        if goods:
            d["goods"] += r["s"]
        else:
            d["svc"] += r["s"]
            d["cats"][r["cat"]] = d["cats"].get(r["cat"], 0) + r["s"]
    for r in con.execute("SELECT DISTINCT substr(occurred_at,1,10) d FROM alteg_pay WHERE occurred_at BETWEEN ? AND ?", (a, b)):
        days.add(r["d"])
    return dict(staff=staff, total_svc=total_svc, total_goods=total_goods, cert=cert, days=sorted(days))


def cash_advances(con, ym: str, people: list[dict]) -> dict:
    """Cash advances paid out of the till / safe in the month, matched to people by surname."""
    lo, hi = month_bounds(ym)
    per: dict[str, int] = {}
    unmatched = []
    total = 0
    q = ("SELECT t.id, t.amount, t.occurred_at, t.description FROM transactions t JOIN accounts a ON a.id=t.account_id "
         "JOIN categories c ON c.id=t.category_id WHERE t.deleted_at IS NULL AND t.kind='expense' AND a.kind='cash' "
         "AND c.name='Зарплата' AND t.occurred_at BETWEEN ? AND ?")
    for t in con.execute(q, (lo.isoformat() + "T00:00:00", hi.isoformat() + "T23:59:59")):
        if "аванс" not in norm(t["description"]):
            continue
        hit = match_name(t["description"], people)
        total += t["amount"]
        if len(hit) >= 1 and len({p["name"] for p in hit}) == 1:
            per[hit[0]["name"]] = per.get(hit[0]["name"], 0) + t["amount"]
        else:
            unmatched.append(dict(id=t["id"], date=t["occurred_at"][:10], amount=t["amount"], text=t["description"][:80]))
    return dict(per=per, total=total, unmatched=unmatched)


# ------------------------------------------------------------------ visit comments ("marks")
# The master's till is built from money paid. Some visits are paid not with money (certificate, points) or are redone
# free of charge by another master; the salon's rule then moves the percentage to the master who did the work.
# The administrator tells the program about it in the visit comment in Alteg:
#   #сертифікат 880   /  #бали 880      – paid by certificate / points: the amount counts to this master's till
#   #переробка Середнюк 900              – this master redid the work after Середнюк: 900 moves from Середнюк to him
#   #подарунок                           – free on purpose: nothing is added
#   Рикова25                             – the client has a 25% discount, the master is still paid from the full price
# A plain phrase "переробка після Середнюк, 900грн" is understood as well.
FREE_RATIO = 0.6          # a service paid below 60% of the list price without a mark is shown as "needs a comment"


def sync_visits(con, ym: str, client=None) -> int:
    """Loads the month's visits with their comments from Alteg (replaces what was stored for the month)."""
    from . import alteg
    lo, hi = month_bounds(ym)
    client = client or alteg.AltegClient()
    rows = client.visits(lo.isoformat(), hi.isoformat())
    stamp = now_local()
    con.execute("DELETE FROM alteg_visits WHERE day BETWEEN ? AND ?", (lo.isoformat(), hi.isoformat()))
    for r in rows:
        sv = r.get("services") or []
        first = sum(round((x.get("first_cost") or 0) * 100) for x in sv)
        paid = sum(round((x.get("cost_to_pay") or 0) * 100) for x in sv)
        zero = sum(round((x.get("first_cost") or 0) * 100) for x in sv if (x.get("first_cost") or 0) > 0 and not (x.get("cost_to_pay") or 0))
        con.execute("INSERT OR REPLACE INTO alteg_visits(record_id,day,staff_id,staff_name,attendance,comment,first_cost,paid,zero_cost,services,fetched_at) "
                    "VALUES(?,?,?,?,?,?,?,?,?,?,?)",
                    (r["id"], r["day"], (r.get("staff") or {}).get("id"), (r.get("staff") or {}).get("name") or "", r.get("attendance"),
                     r.get("comment") or "", first, paid, zero,
                     "; ".join(f"{x.get('title')} {x.get('first_cost')}→{x.get('cost_to_pay')}" for x in sv), stamp))
    con.commit()
    return len(rows)


def _find_person(text: str, people: list[dict]):
    for w in re.findall(r"[\w'’]+", text):
        if len(w) < 4 or w.isdigit():
            continue
        for cand in (w, w[:-1], w[:-2]):
            if len(cand) >= 4:
                hit = match_name(cand, people)
                if hit:
                    return hit[0]
    return None


def _mark_amount(text: str):
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*(?:грн|₴|uah)", text, re.I) or re.search(r"#\s*[\w'’]+[^\d\n#]{0,40}?(\d+(?:[.,]\d+)?)", text)
    return float(m.group(1).replace(",", ".")) if m else None


def parse_mark(comment: str, people: list[dict]):
    """-> dict(kind, amount|None, other|None) or None. Kinds: cert, points, rework, gift."""
    low = (comment or "").lower()
    if not low.strip():
        return None
    tags = re.findall(r"#\s*([\w'’]+)", low)
    kind = None
    for t in tags:
        kind = ("rework" if t.startswith("переробк") else "cert" if t.startswith("сертиф") else "points" if t.startswith("бал")
                else "gift" if t.startswith("подарун") else None) or kind
    if kind is None and re.search(r"переробк\w*\s+після", low):          # plain phrase, no '#'
        kind = "rework"
    if kind is None:
        d = re.search(r"рикова\s*[-_]?\s*(\d{1,2})\b", low)
        if d and 0 < int(d.group(1)) < 100:
            return dict(kind="discount", amount=None, other=None, pct=int(d.group(1)))
        return None
    other = None
    if kind == "rework":
        m = re.search(r"після\s+(.{0,40})", low) or re.search(r"#\s*переробк\w*(.{0,40})", low)
        other = _find_person(m.group(1), people) if m else None
    return dict(kind=kind, amount=_mark_amount(low), other=other)


MARK_LABEL = {"cert": "сертифікат", "points": "бали", "rework": "переробка", "gift": "подарунок", "discount": "знижка (ЗП з повної суми)"}


def visit_effects(con, ym: str, people: list[dict]) -> dict:
    """What the visit comments change in the masters' tills: per person (UAH), the lines for the report, visits that still need a comment."""
    lo, hi = month_bounds(ym)
    rows = con.execute("SELECT * FROM alteg_visits WHERE day BETWEEN ? AND ? AND attendance=1 ORDER BY day, record_id",
                       (lo.isoformat(), hi.isoformat())).fetchall()
    per: dict[str, float] = {}
    lines, pending, bad = [], [], []
    for v in rows:
        hit = match_name(v["staff_name"], people)
        who = hit[0]["name"] if hit else v["staff_name"]
        short = max(v["first_cost"] - v["paid"], 0) / 100
        m = parse_mark(v["comment"], people)
        base = dict(day=v["day"], staff=who, comment=v["comment"][:140].replace("\n", " "), services=v["services"])
        if m is None:
            if v["first_cost"] > 0 and v["paid"] < v["first_cost"] * FREE_RATIO and not (hit and hit[0]["kind"] == "cosm"):   # cosmetology has its own promo prices
                pending.append(dict(base, first=v["first_cost"] / 100, paid=v["paid"] / 100))
            continue
        if not hit:
            bad.append(dict(base, why="майстра немає у списку співробітників"))
            continue
        amt = m["amount"] if m["amount"] is not None else short
        if m["kind"] == "discount":
            pct = m["pct"]
            amt = round(v["paid"] / 100 * pct / (100 - pct), 2)       # what the client was not charged: the master is paid from the full price
            if amt:
                per[who] = per.get(who, 0) + amt
            lines.append(dict(base, kind="discount", amount=amt, other="", effect=(f"знижка {pct}%: +{amt:,.0f} до каси {who}, ЗП з повної суми" if amt else f"знижка {pct}%, але оплати немає")))
        elif m["kind"] == "gift":
            lines.append(dict(base, kind="gift", amount=0, other="", effect="без змін: подарунок"))
        elif m["kind"] in ("cert", "points"):
            per[who] = per.get(who, 0) + amt
            lines.append(dict(base, kind=m["kind"], amount=amt, other="", effect=f"+{amt:,.0f} до каси {who}"))
        else:
            if m["other"] is None:
                bad.append(dict(base, why="у переробці не вказано або не знайдено майстра, після якого переробляли"))
                continue
            src = m["other"]["name"]
            if amt:
                per[who] = per.get(who, 0) + amt
                per[src] = per.get(src, 0) - amt
            lines.append(dict(base, kind="rework", amount=amt, other=src,
                              effect=(f"{amt:,.0f} ₴ переходить від {src} до {who}" if amt else "клієнт оплатив майстру, переносу немає")))
    return dict(per=per, lines=lines, pending=pending, unresolved=bad, visits=len(rows))


def bank_waves(con, ym: str) -> dict:
    """Salary payments made through the bank for the month (ledger): advance and the Ф-1 settlement."""
    from .pl import accrual_date
    lo, hi = month_bounds(ym)
    adv = sal = 0
    q = ("SELECT t.amount, t.occurred_at, t.description FROM transactions t JOIN accounts a ON a.id=t.account_id "
         "JOIN categories c ON c.id=t.category_id WHERE t.deleted_at IS NULL AND t.kind='expense' AND a.kind='fop' AND c.name='Зарплата' "
         "AND t.occurred_at BETWEEN ? AND ?")
    for t in con.execute(q, ((lo - timedelta(days=10)).isoformat() + "T00:00:00", (hi + timedelta(days=15)).isoformat() + "T23:59:59")):
        paid = date.fromisoformat(t["occurred_at"][:10])
        if accrual_date(t["description"], paid).strftime("%Y-%m") != ym:
            continue
        if "аванс" in norm(t["description"]):
            adv += t["amount"]
        else:
            sal += t["amount"]
    return dict(adv=adv, sal=sal)


# ------------------------------------------------------------------ accountant's Ф-1 data
F1_COLS = [("adv_card", ("аванс",)), ("sal_card", ("зп 1", "ф-1", "ф1", "зарплат", "виплата")), ("taxes", ("податки", "пдфо")),
           ("vacation", ("відпускн",)), ("sick", ("лікарн",)), ("maternity", ("декрет",)),
           ("fines", ("штраф",)), ("extra", ("доплат",)), ("hours", ("годин",)), ("shifts", ("змін",)), ("retail", ("роздр", "сума продаж"))]


def _num(v) -> float:
    if isinstance(v, (int, float)):
        return float(v)
    try:
        return float(str(v).replace("\xa0", "").replace(" ", "").replace(",", "."))
    except (TypeError, ValueError):
        return 0.0


def parse_f1(content: bytes, ym: str) -> list[dict]:
    """Reads the accountant's table. Header row has a name column and some of: Аванс, ЗП Ф-1, Податки, Відпускні, Лікарняні.
    Understands a flat list or the salon's own multi-section payroll tab for the month."""
    wb = load_workbook(io.BytesIO(content), data_only=True)
    y, m = map(int, ym.split("-"))
    stems = {1: "січ", 2: "лют", 3: "берез", 4: "квіт", 5: "трав", 6: "черв", 7: "лип", 8: "серп", 9: "верес", 10: "жовт", 11: "листоп", 12: "груд"}
    ws = next((w for w in wb.worksheets if stems[m] in norm(w.title) and (str(y) in w.title or not re.search(r"20\d\d", w.title))), None) or wb.worksheets[0]
    out: list[dict] = []
    hdr = None
    for row in ws.iter_rows(values_only=True):
        cells = [("" if c is None else str(c).replace("\n", " ").strip()) for c in row]
        low = [norm(c) for c in cells]
        name_idx = next((i for i, c in enumerate(low) if c.startswith(("прізвище", "піб", "співробітник", "працівник", "прiзвище"))), None)
        if name_idx is not None and sum(1 for c in low if c) >= 3:
            hdr = {"name": name_idx}
            used = {name_idx}
            for key, stems_ in F1_COLS:
                for i, c in enumerate(low):
                    if i in used or key in hdr or not any(s in c for s in stems_):
                        continue
                    if key == "adv_card" and "готів" in c:
                        continue
                    if key == "sal_card" and ("готів" in c or "до виплати" in c or "аванс" in c):
                        continue
                    hdr[key] = i
                    used.add(i)
            continue
        if not hdr:
            continue
        nm = cells[hdr["name"]] if hdr["name"] < len(cells) else ""
        if not nm or norm(nm).startswith(("разом", "всього", "итого")) or nm.replace(".", "").replace(",", "").isdigit():
            continue
        rec = {"name": nm}
        for key, _ in F1_COLS:
            if key in hdr and hdr[key] < len(row):
                rec[key] = _num(row[hdr[key]])
        if any(v for k, v in rec.items() if k != "name"):
            out.append(rec)
    return out


def fetch_link(url: str) -> bytes:
    """Google Sheets / Drive link (the file must be open 'for everyone with the link')."""
    url = (url or "").strip()
    m = re.search(r"/spreadsheets/d/([\w-]+)", url)
    if m:
        target = f"https://docs.google.com/spreadsheets/d/{m.group(1)}/export?format=xlsx"
    else:
        m = re.search(r"/file/d/([\w-]+)", url) or re.search(r"[?&]id=([\w-]+)", url)
        if not m:
            raise PayrunError("Не схоже на посилання Google Диска або Google Таблиці")
        target = f"https://drive.google.com/uc?export=download&id={m.group(1)}"
    r = requests.get(target, timeout=90)
    if r.status_code != 200 or r.content[:2] != b"PK":
        raise PayrunError("Не вдалось завантажити файл за посиланням. Перевірте, що доступ відкрито «усім, хто має посилання», і що це Excel або Google Таблиця")
    return r.content


def load_inputs(con, ym: str) -> dict | None:
    r = con.execute("SELECT * FROM pay_inputs WHERE ym=?", (ym,)).fetchone()
    if not r:
        return None
    return dict(ym=ym, source=r["source"], src_name=r["src_name"], loaded_at=r["loaded_at"], loaded_by=r["loaded_by"],
                f1=json.loads(r["f1"] or "[]"), adj=json.loads(r["adj"] or "{}"))


def save_f1(con, ym: str, rows: list[dict], source: str, src_name: str, user: str):
    cur = con.execute("SELECT adj FROM pay_inputs WHERE ym=?", (ym,)).fetchone()
    adj = cur["adj"] if cur else "{}"
    con.execute("INSERT INTO pay_inputs(ym,source,src_name,loaded_at,loaded_by,f1,adj) VALUES(?,?,?,?,?,?,?) "
                "ON CONFLICT(ym) DO UPDATE SET source=excluded.source, src_name=excluded.src_name, loaded_at=excluded.loaded_at, "
                "loaded_by=excluded.loaded_by, f1=excluded.f1", (ym, source, src_name, now_local(), user, json.dumps(rows, ensure_ascii=False), adj))
    con.commit()


def save_adj(con, ym: str, adj: dict):
    if not con.execute("SELECT 1 FROM pay_inputs WHERE ym=?", (ym,)).fetchone():
        raise PayrunError("Спочатку завантажте дані від бухгалтера")
    con.execute("UPDATE pay_inputs SET adj=? WHERE ym=?", (json.dumps(adj, ensure_ascii=False), ym))
    con.commit()


def import_from_sheet_table(con, ym: str, user: str) -> int:
    """Takes the Ф-1 payments and the manual columns from the salon's payroll sheet (already synced into `payroll`)."""
    rows = con.execute("SELECT * FROM payroll WHERE month=? ORDER BY id", (ym,)).fetchall()
    if not rows:
        raise PayrunError("У зарплатній таблиці немає даних за цей місяць")
    f1, adj = [], {}
    for r in rows:
        key = f"{r['name'].strip()}|{r['section']}"
        f1.append(dict(name=r["name"].strip(), section=r["section"], adv_card=r["adv_card"] / 100, sal_card=r["sal_card"] / 100,
                       taxes=r["taxes"] / 100, vacation=r["vacation"] / 100, sick=r["sick"] / 100))
        a = {}
        if r["hours"]:
            a["hours"] = r["hours"]
        if r["shifts"]:
            a["shifts"] = r["shifts"]
        if r["retail"]:
            a["retail"] = r["retail"] / 100
        if r["fines"]:
            a["fines"] = r["fines"] / 100
            a["fines_note"] = "з таблиці"
        if r["adv_cash"]:
            a["adv_cash"] = r["adv_cash"] / 100
        if a:
            adj[key] = a
    con.execute("INSERT INTO pay_inputs(ym,source,src_name,loaded_at,loaded_by,f1,adj) VALUES(?,?,?,?,?,?,?) "
                "ON CONFLICT(ym) DO UPDATE SET source=excluded.source, src_name=excluded.src_name, loaded_at=excluded.loaded_at, "
                "loaded_by=excluded.loaded_by, f1=excluded.f1, adj=excluded.adj",
                (ym, "table", "зарплатна таблиця (Google)", now_local(), user, json.dumps(f1, ensure_ascii=False), json.dumps(adj, ensure_ascii=False)))
    con.commit()
    return len(f1)


# ------------------------------------------------------------------ calculation
def _adj(adj: dict, p: dict) -> dict:
    return adj.get(f"{p['name']}|{p['section']}") or adj.get(p["name"]) or {}


def compute(con, ym: str, people: list[dict], alteg: dict, f1: list[dict], adj: dict, advances: dict, marks: dict | None = None) -> dict:
    """The accrual itself. Amounts in whole UAH (as in the sheet)."""
    by_person_staff: dict[str, dict] = {}
    unmatched_staff = []
    excluded = []
    for k, st in alteg["staff"].items():
        if k == "none":
            continue
        if norm(st["role"]).startswith("корпоративна"):
            excluded.append(st)
            continue
        hit = match_name(st["name"], people)
        if not hit and (st["svc"] or st["goods"]):
            unmatched_staff.append(st)
            continue
        if hit:
            key = hit[0]["name"]
            cur = by_person_staff.setdefault(key, dict(svc=0, goods=0, cats={}, alteg=[]))
            cur["svc"] += st["svc"]
            cur["goods"] += st["goods"]
            for c, v in st["cats"].items():
                cur["cats"][c] = cur["cats"].get(c, 0) + v
            cur["alteg"].append(st["name"])
    f1_by: dict[str, dict] = {}
    f1_unknown, f1_dups = [], []
    for rec in f1:
        sec = rec.get("section")
        hit = match_name(rec["name"], people)
        if not hit:
            f1_unknown.append(rec["name"])
            continue
        own = [x for x in hit if sec and x["section"] == sec]
        p = own[0] if own else sorted(hit, key=lambda x: SECTIONS.index(x["section"]) if x["section"] in SECTIONS else 99)[0]
        key = f"{p['name']}|{p['section']}"
        if key in f1_by:
            f1_dups.append(rec["name"])
            for fld in ("adv_card", "sal_card", "taxes", "vacation", "sick", "maternity"):
                f1_by[key][fld] = f1_by[key].get(fld, 0) + rec.get(fld, 0)
        else:
            f1_by[key] = dict(rec)
    rows = []
    # pass 1: everybody paid from their own till
    for p in people:
        if p["kind"] not in ("master", "cosm"):
            continue
        sd = by_person_staff.get(p["name"], dict(svc=0, goods=0, cats={}, alteg=[]))
        ad = _adj(adj, p)
        row = dict(person=p, section=p["section"], name=p["name"], kind=p["kind"], alteg=sd["alteg"], notes=[])
        mk = (marks or {}).get("per", {}).get(p["name"], 0.0)
        row["marks"] = mk
        row["cash_note"] = ad.get("cash_adj_note", "") if ad.get("cash_adj") else ""
        retail = _num(ad["retail"]) if "retail" in ad else sd["goods"] / 100
        row["retail_base"] = retail
        row["retail"] = rnd(retail * RETAIL_PCT)
        extra = p["extra"] / 100 + _num(ad.get("extra", 0))
        row["extra"] = extra
        if p["kind"] == "master":
            cash = sd["svc"] / 100 + _num(ad.get("cash_adj", 0)) + mk
            pct = p["pct"] or 0.4
            row.update(cash=cash, pct=pct, accrual=rnd(cash * pct))
            row["gross"] = rnd(row["accrual"] + extra + row["retail"])
        else:
            cats = {c: sd["cats"].get(c, 0) / 100 for c in COSM_CATS}
            cats["Ін'єкційна косметологія"] -= _num(ad.get("inj_cost", 0))        # drugs are deducted from injections
            cats["Косметологія"] += _num(ad.get("cash_adj", 0)) + mk
            cash = sum(cats.values())
            accr = rnd(sum(cats[c] * COSM_CATS[c] for c in COSM_CATS))
            row.update(cash=cash, pct=None, accrual=accr, cats=cats)
            row["gross"] = rnd(accr + extra + row["retail"])
        rows.append(row)
    pool_base = sum(r["cash"] for r in rows)                          # "Загальна сума послуг по салону"
    # pass 2: administrators, manager, fixed
    admins = [p for p in people if p["kind"] == "admin"]
    total_shifts = sum(_num(_adj(adj, p).get("shifts", 0)) for p in admins)
    for p in people:
        if p["kind"] not in ("admin", "manager", "fixed"):
            continue
        ad = _adj(adj, p)
        row = dict(person=p, section=p["section"], name=p["name"], kind=p["kind"], alteg=[], notes=[])
        extra = p["extra"] / 100 + _num(ad.get("extra", 0))
        row["extra"] = extra
        if p["kind"] == "admin":
            hours, shifts = _num(ad.get("hours", 0)), _num(ad.get("shifts", 0))
            rate = (p["rate"] / 100) or HOURLY
            retail = _num(ad.get("retail", 0))
            share = rnd(pool_base * ADMIN_POOL * shifts / total_shifts) if total_shifts else 0
            row.update(hours=hours, shifts=shifts, rate=rate, base=rnd(rate * hours), pool_share=share,
                       retail_base=retail, retail=rnd(retail * RETAIL_PCT), cash=0, pct=None)
            row["accrual"] = row["base"] + share
            row["gross"] = rnd(rate * hours + share + extra + row["retail"])
        elif p["kind"] == "manager":
            row.update(cash=0, pct=MANAGER_PCT, accrual=rnd(pool_base * MANAGER_PCT), retail=0, retail_base=0)
            row["gross"] = rnd(row["accrual"] + extra)
        else:
            row.update(cash=0, pct=None, accrual=p["fixed"] / 100, retail=0, retail_base=0)
            row["gross"] = rnd(p["fixed"] / 100 + extra)
        rows.append(row)
    # payments, fines, to pay
    for r in rows:
        p, ad = r["person"], _adj(adj, r["person"])
        fb = f1_by.get(f"{p['name']}|{p['section']}", {})
        r["adv_card"], r["sal_card"] = fb.get("adv_card", 0), fb.get("sal_card", 0)
        r["taxes"] = fb.get("taxes", 0)
        r["vacation"], r["sick"], r["maternity"] = fb.get("vacation", 0), fb.get("sick", 0), fb.get("maternity", 0)
        for fld in ("vacation", "sick", "maternity"):
            if fld in ad:
                r[fld] = _num(ad[fld])
        r["fines"] = abs(_num(ad.get("fines", fb.get("fines", 0))))
        r["fines_note"] = ad.get("fines_note", "")
        auto_adv = sum(v for n, v in advances["per"].items() if n == p["name"]) / 100 if p["section"] == _primary_section(people, p["name"]) else 0
        r["adv_cash_auto"] = auto_adv
        r["adv_cash"] = _num(ad["adv_cash"]) if "adv_cash" in ad else auto_adv
        r["to_pay"] = rnd(r["gross"] - r["taxes"] - r["sal_card"] - r["adv_card"] - r["adv_cash"] - r["fines"])
        r["cost"] = r["gross"] + r["vacation"] + r["sick"] + r["maternity"] - r["fines"]
    return dict(rows=rows, pool_base=pool_base, total_shifts=total_shifts, unmatched_staff=unmatched_staff, excluded=excluded,
                f1_unknown=f1_unknown, f1_dups=f1_dups, f1_matched=len(f1_by))


def _primary_section(people, name):
    secs = [p["section"] for p in people if p["name"] == name]
    return sorted(secs, key=lambda s: SECTIONS.index(s) if s in SECTIONS else 99)[0] if secs else ""


# ------------------------------------------------------------------ checks
def _chk(level, code, title, status, detail="", items=None):
    return dict(level=level, code=code, title=title, status=status, detail=detail, lines=items or [])


def uah(v) -> str:
    return f"{v:,.2f}".replace(",", " ").replace(".", ",") + " ₴"


def run_checks(con, ym: str, people: list[dict], inputs: dict, alteg: dict, calc: dict, advances: dict, marks: dict | None = None) -> list[dict]:
    out = []
    lo, hi = month_bounds(ym)
    today = datetime.now(config.KYIV).date()
    rows = calc["rows"]
    # ---- A. data
    out.append(_chk("A", "A1", "Місяць завершено", "ok" if hi < today else "error",
                    f"Період {lo:%d.%m.%Y} — {hi:%d.%m.%Y}" + ("" if hi < today else ": нараховувати можна лише за завершений місяць")))
    out.append(_chk("A", "A2", "Дані від бухгалтера завантажено", "ok" if inputs and inputs["f1"] else "error",
                    f"{inputs['src_name']}, {len(inputs['f1'])} рядків, {inputs['loaded_at']}" if inputs and inputs["f1"] else "Немає даних про виплати Ф-1"))
    missing = [d for d in (lo + timedelta(days=i) for i in range((hi - lo).days + 1)) if d.isoformat() not in alteg["days"]]
    out.append(_chk("A", "A3", "Каса з Alteg: є продажі за кожен день місяця", "ok" if not missing else "warn",
                    f"Днів з даними: {len(alteg['days'])} із {(hi - lo).days + 1}" + (f"; без даних: {', '.join(d.strftime('%d.%m') for d in missing[:10])}" if missing else "")))
    err = get_setting(con, "pay_sync_error", "")
    out.append(_chk("A", "A4", "Остання синхронізація Alteg без помилок", "ok" if not err else "error", err or "Помилок немає"))
    # ---- B. inputs
    unk = calc["f1_unknown"]
    out.append(_chk("B", "B1", "Усі працівники з файлу бухгалтера є у списку", "ok" if not unk else "error",
                    "Невідомі прізвища: " + ", ".join(unk) if unk else f"Знайдено {calc['f1_matched']} працівників", unk))
    out.append(_chk("B", "B2", "У файлі бухгалтера немає дублів", "ok" if not calc["f1_dups"] else "warn",
                    "Прізвище повторюється (суми додано): " + ", ".join(calc["f1_dups"]) if calc["f1_dups"] else "Дублів немає"))
    bad = [f"{r['name']}: {fld}" for r in rows for fld in ("adv_card", "sal_card", "taxes", "vacation", "sick", "fines", "adv_cash") if r.get(fld, 0) < 0]
    out.append(_chk("B", "B3", "Немає від'ємних сум у вхідних даних", "ok" if not bad else "error", ", ".join(bad) or "Усе гаразд", bad))
    noh = [r["name"] for r in rows if r["kind"] == "admin" and (not r.get("hours") or not r.get("shifts"))]
    out.append(_chk("B", "B4", "У кожного адміністратора вказано години і зміни", "ok" if not noh else "error",
                    ("Не вказано: " + ", ".join(noh)) if noh else "Години й зміни вказано", noh))
    nof = [f"{r['name']} ({uah(r['fines'])})" for r in rows if r["fines"] and not r["fines_note"]]
    out.append(_chk("B", "B5", "Кожен штраф має пояснення", "ok" if not nof else "warn", ("Без пояснення: " + ", ".join(nof)) if nof else "Усе пояснено", nof))
    over = [f"{r['name']}: на карту {uah(r['adv_card'] + r['sal_card'])} > нараховано {uah(r['gross'])}" for r in rows
            if r["adv_card"] + r["sal_card"] + r["taxes"] > r["gross"] + TOL]
    out.append(_chk("B", "B6", "Виплата на карту і податки не перевищують нараховане", "ok" if not over else "error", "; ".join(over) or "Перевищень немає", over))
    # ---- C. calculation (independent recomputation)
    mism = []
    pool_services = sum(r["cash"] for r in rows if r["kind"] in ("master", "cosm"))
    for r in rows:
        if r["kind"] == "master":
            alt = rnd(rnd(r["cash"] * r["pct"]) + r["extra"] + rnd(r["retail_base"] * RETAIL_PCT))
        elif r["kind"] == "cosm":
            alt = rnd(rnd(sum(v * COSM_CATS[c] for c, v in r["cats"].items())) + r["extra"] + rnd(r["retail_base"] * RETAIL_PCT))
        elif r["kind"] == "admin":
            share = rnd(pool_services * ADMIN_POOL * r["shifts"] / calc["total_shifts"]) if calc["total_shifts"] else 0
            alt = rnd(r["rate"] * r["hours"] + share + r["extra"] + rnd(r["retail_base"] * RETAIL_PCT))
        elif r["kind"] == "manager":
            alt = rnd(rnd(pool_services * MANAGER_PCT) + r["extra"])
        else:
            alt = rnd(r["person"]["fixed"] / 100 + r["extra"])
        if abs(alt - r["gross"]) > 0:
            mism.append(f"{r['name']}: {r['gross']} ≠ {alt}")
    out.append(_chk("C", "C1", "Нарахування перераховано другим способом, суми збігаються", "ok" if not mism else "error", "; ".join(mism) or f"Перевірено {len(rows)} рядків", mism))
    bad_pay = [r["name"] for r in rows if abs(r["to_pay"] - rnd(r["gross"] - r["taxes"] - r["sal_card"] - r["adv_card"] - r["adv_cash"] - r["fines"])) > 0]
    out.append(_chk("C", "C2", "До виплати = нараховано − податки − картка − аванси − штрафи", "ok" if not bad_pay else "error", ", ".join(bad_pay) or "Для кожного рядка збігається"))
    sec_tot = {}
    for r in rows:
        sec_tot[r["section"]] = sec_tot.get(r["section"], 0) + r["gross"]
    out.append(_chk("C", "C3", "Підсумки розділів дорівнюють сумі рядків", "ok" if sum(sec_tot.values()) == sum(r["gross"] for r in rows) else "error",
                    f"Усього нараховано {uah(sum(sec_tot.values()))}"))
    admins = [r for r in rows if r["kind"] == "admin"]
    if admins and calc["total_shifts"]:
        diff = sum(r["pool_share"] for r in admins) - pool_services * ADMIN_POOL
        out.append(_chk("C", "C4", "Частки адміністраторів = 4% від послуг салону", "ok" if abs(diff) <= len(admins) else "error",
                        f"4% від {uah(pool_services)} = {uah(pool_services * ADMIN_POOL)}; роздано {uah(sum(r['pool_share'] for r in admins))} (різниця {uah(diff)} — заокруглення)"))
    neg = [f"{r['name']} ({r['to_pay']} ₴)" for r in rows if r["to_pay"] < 0]
    out.append(_chk("C", "C5", "Ніхто не має від'ємної виплати", "ok" if not neg else "warn", ("Від'ємна сума до виплати (переплата): " + ", ".join(neg)) if neg else "Усе гаразд", neg))
    # ---- D. cross-source
    attributed = sum(st["svc"] for k, st in alteg["staff"].items() if k != "none")
    unattr = alteg["total_svc"] - attributed
    excl = sum(st["svc"] for st in calc["excluded"])
    used = sum(r["cash"] for r in rows if r["kind"] in ("master", "cosm")) * 100
    mk_total = sum(r.get("marks", 0) for r in rows if r["kind"] in ("master", "cosm")) * 100
    adj_total = used - mk_total - (attributed - excl - sum(st["svc"] for st in calc["unmatched_staff"]))
    out.append(_chk("D", "D1", "Усі майстри з Alteg є у списку співробітників", "ok" if not calc["unmatched_staff"] else "error",
                    ("Немає у списку: " + ", ".join(f"{s['name']} ({uah(s['svc'] / 100)})" for s in calc["unmatched_staff"])) if calc["unmatched_staff"] else "Кожен майстер з продажами знайдений",
                    [s["name"] for s in calc["unmatched_staff"]]))
    out.append(_chk("D", "D2", "Каса Alteg розподілена між майстрами без втрат", "ok" if unattr <= 0.03 * max(alteg["total_svc"], 1) else "warn",
                    f"Послуги Alteg {uah(alteg['total_svc'] / 100)}: майстрам {uah(attributed / 100)}, корпоративні {uah(excl / 100)}, без майстра {uah(unattr / 100)}"))
    out.append(_chk("D", "D3", "Коригування каси (ручні) прозорі", "ok" if abs(adj_total) < 100 else "warn",
                    f"Різниця між Alteg і підставленою в розрахунок кассою: {uah(adj_total / 100)}" + ("" if abs(adj_total) < 100 else " (внесено вручну в «Додаткових даних»)")))
    marks = marks or dict(per={}, lines=[], pending=[], unresolved=[], visits=0)
    if not marks["visits"]:
        out.append(_chk("D", "D6", "Коментарі до візитів з Alteg завантажено", "warn",
                        "Візитів із Alteg за місяць немає: переробки та оплата сертифікатами/балами не враховані. Натисніть «Оновити коментарі з Alteg»."))
    else:
        applied = [f"{l['day'][8:10]}.{l['day'][5:7]} {l['staff']}: {MARK_LABEL[l['kind']]} — {l['effect']}" for l in marks["lines"]]
        out.append(_chk("D", "D6", "Мітки в коментарях Alteg враховані", "ok",
                        f"Перевірено {marks['visits']} візитів; міток: {len(marks['lines'])}" + (" (" + "; ".join(applied) + ")" if applied else ""), applied))
        if marks["unresolved"]:
            out.append(_chk("D", "D7", "Мітки зрозумілі програмі", "warn", "Не вдалося застосувати: " + "; ".join(f"{b['day']} {b['staff']} — {b['why']}" for b in marks["unresolved"]),
                            [f"{b['day']} {b['staff']}: {b['comment']}" for b in marks["unresolved"]]))
        pend = [f"{x['day'][8:10]}.{x['day'][5:7]} {x['staff']}: {x['services']} — оплачено {x['paid']:,.0f} із {x['first']:,.0f} ₴" + (f" («{x['comment']}»)" if x["comment"] else "") for x in marks["pending"]]
        out.append(_chk("D", "D8", "Візити без грошової оплати мають пояснення в коментарі", "ok" if not pend else "warn",
                        "Усі пояснені" if not pend else f"{len(pend)} візитів оплачено менш ніж на 60% від прайсу, але без мітки (#сертифікат, #бали, #переробка, #подарунок) — каса майстра може бути занижена, дописати коментар в Alteg і оновити коментарі", pend))
    bw = bank_waves(con, ym)
    f1_adv, f1_sal = sum(r["adv_card"] for r in rows), sum(r["sal_card"] for r in rows)
    d_adv, d_sal = f1_adv - bw["adv"] / 100, f1_sal - bw["sal"] / 100
    out.append(_chk("D", "D4", "Виплати Ф-1 у файлі збігаються з банківськими платежами", "ok" if abs(d_adv) <= TOL and abs(d_sal) <= TOL else "warn",
                    f"Аванс: файл {uah(f1_adv)}, банк {uah(bw['adv'] / 100)} (різниця {uah(d_adv)}); ЗП Ф-1: файл {uah(f1_sal)}, банк {uah(bw['sal'] / 100)} (різниця {uah(d_sal)})"))
    adv_cash_sum = sum(r["adv_cash"] for r in rows)
    out.append(_chk("D", "D5", "Готівкові аванси з каси враховані", "ok" if not advances["unmatched"] and abs(adv_cash_sum - advances["total"] / 100) <= TOL else "warn",
                    f"У касі виплачено авансів {uah(advances['total'] / 100)}, враховано у розрахунку {uah(adv_cash_sum)}" +
                    ("; не розпізнано працівника: " + "; ".join(f"{u['date']} {uah(u['amount'] / 100)} «{u['text']}»" for u in advances["unmatched"]) if advances["unmatched"] else ""),
                    [u["text"] for u in advances["unmatched"]]))
    # ---- E. sanity
    revenue = (alteg["total_svc"] + alteg["total_goods"]) / 100
    cost = sum(r["cost"] for r in rows)
    pct = cost * 100 / revenue if revenue else 0
    out.append(_chk("E", "E1", "Оплата праці у розумних межах від виручки", "ok" if 40 <= pct <= 70 else "warn",
                    f"Нараховано {uah(cost)} = {pct:.1f}% виручки {uah(revenue)} (звичайно 52–60%)"))
    prev = con.execute("SELECT name, section, gross FROM payroll WHERE month=?", ((lo - timedelta(days=1)).strftime("%Y-%m"),)).fetchall()
    jump = []
    pm = {(norm(p["name"]), p["section"]): p["gross"] / 100 for p in prev}
    for r in rows:
        old = pm.get((norm(r["name"]), r["section"]))
        if old and old > 3000 and r["gross"] and abs(r["gross"] - old) / old > 0.6:
            jump.append(f"{r['name']}: {old:,.0f} → {r['gross']:,.0f}")
    out.append(_chk("E", "E2", "Різких змін проти минулого місяця немає (±60%)", "ok" if not jump else "warn", "; ".join(jump) or "Різких змін немає", jump))
    # ---- F. comparison with the payroll sheet
    out.extend(compare_with_sheet(con, ym, rows))
    return out


def compare_with_sheet(con, ym: str, rows: list[dict]) -> list[dict]:
    sheet = con.execute("SELECT * FROM payroll WHERE month=?", (ym,)).fetchall()
    if not sheet or not payroll.month_costs(con, ym):
        return [_chk("F", "F1", "Порівняння з зарплатною таблицею", "ok", "Таблиця за цей місяць ще не заповнена — порівнювати нема з чим")]
    sh = {(norm(s["name"]), s["section"]): s for s in sheet}
    diffs, same = [], 0
    for r in rows:
        s = sh.get((norm(r["name"]), r["section"]))
        if not s:
            continue
        dg, dp = r["gross"] - s["gross"] / 100, r["to_pay"] - s["to_pay"] / 100
        if abs(dg) <= TOL and abs(dp) <= TOL:
            same += 1
        else:
            diffs.append(dict(name=r["name"], section=r["section"], gross=r["gross"], sheet_gross=s["gross"] / 100, to_pay=r["to_pay"], sheet_to_pay=s["to_pay"] / 100,
                              cash=r.get("cash", 0), sheet_cash=s["sales"] / 100))
    tot_a, tot_b = sum(r["gross"] for r in rows), sum(s["gross"] for s in sheet) / 100
    items = []
    for d in diffs:
        why = f"; каса: Alteg {d['cash']:,.0f}, таблиця {d['sheet_cash']:,.0f} (різниця {d['cash'] - d['sheet_cash']:+,.0f})" if d["cash"] and abs(d["cash"] - d["sheet_cash"]) > TOL else ""
        items.append(f"{d['name']}: нараховано {d['gross']:,.0f} (таблиця {d['sheet_gross']:,.0f}, різниця {d['gross'] - d['sheet_gross']:+,.0f}){why}")
    st = "ok" if not diffs else "warn"
    out = [_chk("F", "F1", "Порівняння з зарплатною таблицею на Google Диску", st,
                f"Збігається {same} із {same + len(diffs)} працівників; усього нараховано {uah(tot_a)} проти {uah(tot_b)} у таблиці (різниця {uah(tot_a - tot_b)})", items)]
    out.append(selftest(con, ym))
    return out


def selftest(con, ym: str) -> dict:
    """Formula check: feed the sheet's own inputs (till, retail, hours, shifts) into the engine and require its result."""
    sheet = con.execute("SELECT * FROM payroll WHERE month=? ORDER BY id", (ym,)).fetchall()
    people = {(norm(p["name"]), p["section"]): p for p in roster(con, False)}
    bad, n = [], 0
    pool = sum(s["sales"] for s in sheet if s["section"] in ("Перукарі", "Майстри манікюру", "Подолог", "Бровісти")) / 100
    pool += sum(s["gross"] for s in sheet if s["section"] == "Косметолог") and 0   # cosmetologist cash is not stored: skipped
    for s in sheet:
        if s["section"] in ("Перукарі", "Майстри манікюру", "Подолог", "Бровісти") and s["sales"]:
            p = people.get((norm(s["name"]), s["section"]))
            pct = (p["pct"] if p and p["pct"] else (0.6 if s["section"] == "Бровісти" else 0.4))
            exp = rnd(rnd(s["sales"] / 100 * pct) + rnd(s["retail"] / 100 * RETAIL_PCT))
            extra = s["gross"] / 100 - exp
            n += 1
            known = (p["extra"] / 100) if p else 0
            if abs(extra - known) > TOL:
                bad.append(f"{s['name']}: у таблиці {s['gross'] / 100:,.0f}, за формулою {exp:,.0f} (+доплата {known:,.0f})")
    return _chk("F", "F2", "Формули збігаються з формулами таблиці", "ok" if not bad else "error",
                f"Перевірено {n} майстрів: нарахування = 40%/60% від каси + 10% роздробу + доплата" if not bad else "; ".join(bad), bad)


def overall(checks: list[dict]) -> str:
    return "error" if any(c["status"] == "error" for c in checks) else "warn" if any(c["status"] == "warn" for c in checks) else "ok"


# ------------------------------------------------------------------ run + storage
def totals(rows: list[dict]) -> dict:
    keys = ("gross", "retail", "extra", "vacation", "sick", "maternity", "fines", "taxes", "adv_card", "sal_card", "adv_cash", "to_pay", "cost")
    t = {k: sum(r.get(k, 0) for r in rows) for k in keys}
    t["card"] = t["adv_card"] + t["sal_card"]
    t["cash"] = t["adv_cash"] + t["to_pay"]
    return t


def _plain(rows):
    out = []
    for r in rows:
        d = {k: v for k, v in r.items() if k != "person"}
        d["person_id"] = r["person"]["id"]
        out.append(d)
    return out


def create_run(con, ym: str, user: str) -> int:
    inputs = load_inputs(con, ym)
    if not inputs or not inputs["f1"]:
        raise PayrunError("Нарахування неможливе: спочатку завантажте дані про виплати Ф-1 від бухгалтера")
    lo, hi = month_bounds(ym)
    if hi >= datetime.now(config.KYIV).date():
        raise PayrunError("Нараховувати можна лише за завершений місяць")
    people = roster(con)
    alteg = alteg_month(con, ym)
    advances = cash_advances(con, ym, people)
    try:
        sync_visits(con, ym)
    except Exception:       # Alteg unavailable: use what was loaded last time (the check below says if nothing is there)
        pass
    marks = visit_effects(con, ym, people)
    calc = compute(con, ym, people, alteg, inputs["f1"], inputs["adj"], advances, marks)
    checks = run_checks(con, ym, people, inputs, alteg, calc, advances, marks)
    status = overall(checks)
    rows = calc["rows"]
    t = totals(rows)
    ver = (con.execute("SELECT COALESCE(MAX(version),0) FROM pay_runs WHERE ym=?", (ym,)).fetchone()[0]) + 1
    result = dict(rows=_plain(rows), totals=t, pool_base=calc["pool_base"], total_shifts=calc["total_shifts"],
                  alteg=dict(total_svc=alteg["total_svc"], total_goods=alteg["total_goods"], days=len(alteg["days"])),
                  bank=bank_waves(con, ym), advances=dict(total=advances["total"], unmatched=advances["unmatched"]),
                  compare=sheet_compare(con, ym, rows), marks=dict(lines=marks["lines"], pending=marks["pending"], unresolved=marks["unresolved"], visits=marks["visits"]))
    cur = con.execute("INSERT INTO pay_runs(ym,version,created_at,created_by,status,total_cost,result,checks,inputs) VALUES(?,?,?,?,?,?,?,?,?)",
                      (ym, ver, now_local(), user, status, int(round(t["cost"] * 100)), json.dumps(result, ensure_ascii=False),
                       json.dumps(checks, ensure_ascii=False), json.dumps(dict(source=inputs["source"], src_name=inputs["src_name"], loaded_at=inputs["loaded_at"],
                                                                                f1=inputs["f1"], adj=inputs["adj"]), ensure_ascii=False)))
    con.commit()
    return cur.lastrowid


def sheet_compare(con, ym: str, rows: list[dict]) -> list[dict]:
    sheet = {(norm(s["name"]), s["section"]): s for s in con.execute("SELECT * FROM payroll WHERE month=?", (ym,))}
    out = []
    for r in rows:
        s = sheet.get((norm(r["name"]), r["section"]))
        if s:
            out.append(dict(name=r["name"], section=r["section"], gross=r["gross"], sheet_gross=s["gross"] / 100, cash=r.get("cash", 0), sheet_cash=s["sales"] / 100,
                            to_pay=r["to_pay"], sheet_to_pay=s["to_pay"] / 100))
    return out


def get_run(con, rid: int) -> dict | None:
    r = con.execute("SELECT * FROM pay_runs WHERE id=?", (rid,)).fetchone()
    if not r:
        return None
    return dict(id=r["id"], ym=r["ym"], version=r["version"], created_at=r["created_at"], created_by=r["created_by"], status=r["status"],
                total_cost=r["total_cost"], result=json.loads(r["result"]), checks=json.loads(r["checks"]), inputs=json.loads(r["inputs"]))


def list_runs(con) -> list[dict]:
    return [dict(r) for r in con.execute("SELECT id, ym, version, created_at, created_by, status, total_cost FROM pay_runs ORDER BY ym DESC, version DESC")]


# ------------------------------------------------------------------ Excel
def export_xlsx(run: dict) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "Нарахування ЗП"
    res = run["result"]
    thin = Side(style="thin", color="DDDDDD")
    head_fill = PatternFill("solid", fgColor="6B2F6E")
    sec_fill = PatternFill("solid", fgColor="EDE6F5")
    ws.append([f"Нарахування заробітної плати за {month_label(run['ym'])}"])
    ws["A1"].font = Font(bold=True, size=15, color="6B2F6E")
    ws.append([f"Версія {run['version']} · сформовано {run['created_at']} · {run['created_by']} · статус перевірок: {({'ok': 'усе гаразд', 'warn': 'є попередження', 'error': 'є помилки'})[run['status']]}"])
    ws.append([])
    cols = [("Співробітник", "name"), ("Каса за місяць", "cash"), ("Нарахування", "accrual"), ("Доплати", "extra"), ("Роздріб 10%", "retail"),
            ("Нараховано (зарплата)", "gross"), ("Відпускні", "vacation"), ("Лікарняні", "sick"), ("Декретні", "maternity"), ("Штраф", "fines"),
            ("ПДФО+ВЗ", "taxes"), ("Аванс Ф-1 (карта)", "adv_card"), ("ЗП Ф-1 (карта)", "sal_card"), ("Аванс готівкою", "adv_cash"), ("До виплати готівкою", "to_pay")]
    ws.append([c[0] for c in cols])
    hr = ws.max_row
    for i in range(1, len(cols) + 1):
        c = ws.cell(hr, i)
        c.font, c.fill, c.alignment = Font(bold=True, color="FFFFFF"), head_fill, Alignment(wrap_text=True, horizontal="center", vertical="center")
    ws.row_dimensions[hr].height = 34
    for sec in SECTIONS:
        srows = [r for r in res["rows"] if r["section"] == sec]
        if not srows:
            continue
        ws.append([sec.upper()])
        for i in range(1, len(cols) + 1):
            ws.cell(ws.max_row, i).fill = sec_fill
        ws.cell(ws.max_row, 1).font = Font(bold=True)
        for r in srows:
            ws.append([r.get(k, "") if k != "name" else r["name"] for _, k in cols])
        first, last = ws.max_row - len(srows) + 1, ws.max_row
        ws.append(["Разом " + sec.lower()] + [f"=SUM({get_column_letter(i)}{first}:{get_column_letter(i)}{last})" for i in range(2, len(cols) + 1)])
        for i in range(1, len(cols) + 1):
            ws.cell(ws.max_row, i).font = Font(bold=True)
    t = res["totals"]
    ws.append([])
    ws.append(["ВСЬОГО", sum(r.get("cash", 0) for r in res["rows"]), sum(r.get("accrual", 0) for r in res["rows"]), t["extra"], t["retail"], t["gross"], t["vacation"], t["sick"],
               t["maternity"], t["fines"], t["taxes"], t["adv_card"], t["sal_card"], t["adv_cash"], t["to_pay"]])
    for i in range(1, len(cols) + 1):
        c = ws.cell(ws.max_row, i)
        c.font, c.fill = Font(bold=True, color="FFFFFF"), head_fill
    for row in ws.iter_rows(min_row=hr + 1, min_col=2, max_col=len(cols)):
        for c in row:
            c.number_format = '# ##0.00'
    ws.column_dimensions["A"].width = 30
    for i in range(2, len(cols) + 1):
        ws.column_dimensions[get_column_letter(i)].width = 15
    ws.freeze_panes = ws.cell(hr + 1, 2)
    s2 = wb.create_sheet("Зведення")
    s2.append(["Показник", "Сума, ₴"])
    for lbl, v in (("Нараховано зарплати", t["gross"]), ("Відпускні", t["vacation"]), ("Лікарняні", t["sick"]), ("Декретні", t["maternity"]), ("Штрафи", -t["fines"]),
                   ("Витрата компанії (без ЄСВ)", t["cost"]), ("ПДФО та військовий збір (утримано)", t["taxes"]), ("Виплата на карту (Ф-1)", t["card"]),
                   ("Готівкою: аванси", t["adv_cash"]), ("Готівкою: до виплати 7 числа", t["to_pay"]), ("Готівкою всього", t["cash"])):
        s2.append([lbl, v])
    s2.column_dimensions["A"].width = 44
    s2.column_dimensions["B"].width = 18
    for r in s2.iter_rows(min_row=2, min_col=2, max_col=2):
        r[0].number_format = '# ##0.00'
    s3 = wb.create_sheet("Перевірки")
    s3.append(["Рівень", "Код", "Перевірка", "Результат", "Деталі"])
    for c in run["checks"]:
        s3.append([c["level"], c["code"], c["title"], {"ok": "✓ ОК", "warn": "⚠ увага", "error": "✗ помилка"}[c["status"]], c["detail"]])
        s3.cell(s3.max_row, 4).font = Font(bold=True, color={"ok": "1F9A85", "warn": "B7791F", "error": "D0405F"}[c["status"]])
    for col, w in zip("ABCDE", (8, 7, 60, 14, 110)):
        s3.column_dimensions[col].width = w
    if res.get("compare"):
        s4 = wb.create_sheet("Порівняння з таблицею")
        s4.append(["Співробітник", "Розділ", "Нараховано (програма)", "Нараховано (таблиця)", "Різниця", "Каса (Alteg/програма)", "Каса (таблиця)", "До виплати (програма)", "До виплати (таблиця)"])
        for c in res["compare"]:
            s4.append([c["name"], c["section"], c["gross"], c["sheet_gross"], round(c["gross"] - c["sheet_gross"], 2), c["cash"], c["sheet_cash"], c["to_pay"], c["sheet_to_pay"]])
        s4.column_dimensions["A"].width = 28
        s4.column_dimensions["B"].width = 18
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()

"""Category assignment: user rules -> built-in hints -> auto-created category."""
import re

COMPANY_MARKERS = re.compile(r"\b(фоп|тов|пп|ат|пат|прат|тзов|фг|ооо|llc|ltd)\b", re.I)

# (direction, substring, category name) - checked after user rules
HINTS = [
    ("income", "торгової виручки", "Виручка (термінали)"),
    ("income", "еквайринг", "Виручка (термінали)"),
    ("income", "терміналу", "Виручка (термінали)"),
    ("income", "pos", "Виручка (термінали)"),
    ("expense", "комісія", "Банківські комісії"),
    ("expense", "комісію", "Банківські комісії"),
    ("expense", "єдиний податок", "Податки"),
    ("expense", "єсв", "Податки"),
    ("expense", "податок", "Податки"),
    ("expense", "оренд", "Оренда"),
    ("expense", "зп ", "Зарплата"),
    ("expense", "зарплат", "Зарплата"),
    ("expense", "заробітн", "Зарплата"),
]

FALLBACK = {"income": "Інші надходження", "expense": "Інші витрати"}


def get_or_create_category(con, name: str, kind: str, auto: bool = False) -> int:
    name = name.strip()
    r = con.execute("SELECT id FROM categories WHERE name=? AND kind=? COLLATE NOCASE", (name, kind)).fetchone()
    if r:
        con.execute("UPDATE categories SET archived=0 WHERE id=?", (r["id"],))
        return r["id"]
    return con.execute("INSERT INTO categories(name,kind,auto) VALUES(?,?,?)",
                       (name, kind, 1 if auto else 0)).lastrowid


def _clean(s: str) -> str:
    return re.sub(r"\s+", " ", s or "").strip()


def suggest_name(description: str, counterparty: str) -> str:
    """Auto-category name from a company counterparty (bank data). Free-text cash comments are
    not auto-named (too noisy): they go to rules or the fallback category."""
    cp = _clean(counterparty)
    if cp and COMPANY_MARKERS.search(cp):
        name = re.sub(r"[\"'«»“”]", "", cp)
        return name[:40]
    return ""


def categorize(con, kind: str, description: str, counterparty: str = "", create: bool = True):
    """Returns category_id (or None for transfers/unknown)."""
    if kind == "transfer":
        return None
    text = (_clean(description) + " " + _clean(counterparty)).lower()
    for r in con.execute(
            "SELECT r.* FROM rules r JOIN categories c ON c.id=r.category_id "
            "WHERE c.archived=0 AND r.direction IN ('any',?) ORDER BY r.priority DESC, length(r.pattern) DESC, r.id",
            (kind,)):
        if r["pattern"].lower() in text:
            return r["category_id"]
    for direction, sub, cat in HINTS:
        if direction == kind and sub in text:
            return get_or_create_category(con, cat, kind)
    if not create:
        return None
    if kind == "expense":
        name = suggest_name(description, counterparty)
        if name:
            return get_or_create_category(con, name, kind, auto=True)
    return get_or_create_category(con, FALLBACK[kind], kind)


def add_rule(con, category_id: int, pattern: str, direction: str = "any", priority: int = 10):
    pattern = _clean(pattern)
    if not pattern:
        return None
    ex = con.execute("SELECT id FROM rules WHERE category_id=? AND lower(pattern)=? AND direction=?",
                     (category_id, pattern.lower(), direction)).fetchone()
    if ex:
        return ex["id"]
    return con.execute("INSERT INTO rules(category_id,pattern,direction,priority) VALUES(?,?,?,?)",
                       (category_id, pattern, direction, priority)).lastrowid


def apply_rule_to_existing(con, category_id: int, pattern: str, kind: str | None, user_id=None) -> int:
    """Re-categorise matching transactions that are auto/fallback categorised (never touches
    transactions the user categorised explicitly)."""
    from .db import update_tx
    p = pattern.lower()
    n = 0
    rows = con.execute(
        "SELECT t.* FROM transactions t LEFT JOIN categories c ON c.id=t.category_id "
        "WHERE t.deleted_at IS NULL AND t.kind!='transfer' AND t.user_edited=0 "
        "AND (c.id IS NULL OR c.auto=1 OR c.name IN ('Інші надходження','Інші витрати'))").fetchall()
    for t in rows:
        if kind and t["kind"] != kind:
            continue
        if p in (t["description"] + " " + t["counterparty"]).lower() and t["category_id"] != category_id:
            update_tx(con, t["id"], user_id, note=f"правило «{pattern}»", user_edit=False, category_id=category_id)
            n += 1
    return n


def merge_category(con, src_id: int, dst_id: int, user_id=None) -> int:
    from .db import update_tx
    n = 0
    for t in con.execute("SELECT id FROM transactions WHERE category_id=? AND deleted_at IS NULL", (src_id,)).fetchall():
        update_tx(con, t["id"], user_id, note="об'єднання категорій", user_edit=False, category_id=dst_id)
        n += 1
    con.execute("UPDATE rules SET category_id=? WHERE category_id=?", (dst_id, src_id))
    con.execute("UPDATE categories SET archived=1 WHERE id=?", (src_id,))
    return n


SEED_INCOME = ["Послуги", "Продаж товарів", "Подарункові сертифікати", "Виручка (термінали)", "Інші надходження"]
SEED_EXPENSE = ["Зарплата", "Оренда", "Комунальні послуги", "Матеріали та косметика", "Реклама",
                "Податки", "Банківські комісії", "Господарські витрати", "Доставка", "Зв'язок та сервіси", "Інші витрати"]
SEED_RULES = [  # (kind, substring, category, priority)
    ("expense", "зп", "Зарплата", 3), ("expense", "зарплат", "Зарплата", 3), ("expense", "аванс", "Зарплата", 3),
    ("expense", "прибиральниц", "Зарплата", 3), ("expense", "премі", "Зарплата", 3),
    ("expense", "оренд", "Оренда", 2), ("expense", "світло", "Комунальні послуги", 2),
    ("expense", "вода", "Комунальні послуги", 1), ("expense", "комунал", "Комунальні послуги", 2),
    ("expense", "нова пошта", "Доставка", 2), ("expense", "нп ", "Доставка", 1), ("expense", "достав", "Доставка", 2),
    ("expense", "реклам", "Реклама", 2), ("expense", "таргет", "Реклама", 2),
    ("expense", "мобіл", "Зв'язок та сервіси", 2), ("expense", "київстар", "Зв'язок та сервіси", 2),
    ("expense", "моб ", "Зв'язок та сервіси", 1), ("expense", "інтернет", "Зв'язок та сервіси", 2),
    ("expense", "ютюб", "Зв'язок та сервіси", 2), ("expense", "смс", "Зв'язок та сервіси", 2),
    ("expense", "альтеджіо", "Зв'язок та сервіси", 2), ("expense", "alteg", "Зв'язок та сервіси", 2),
    ("expense", "молоко", "Господарські витрати", 1), ("expense", "цукерки", "Господарські витрати", 1),
    ("expense", "кава", "Господарські витрати", 1), ("expense", "чай", "Господарські витрати", 1),
    ("expense", "вершки", "Господарські витрати", 1), ("expense", "квіти", "Господарські витрати", 1),
    ("expense", "миюч", "Господарські витрати", 1), ("expense", "пакети", "Господарські витрати", 1),
    ("expense", "ремонт", "Господарські витрати", 1),
    ("expense", "фольга", "Матеріали та косметика", 1), ("expense", "віск", "Матеріали та косметика", 1),
    ("expense", "простирад", "Матеріали та косметика", 1), ("expense", "скраб", "Матеріали та косметика", 1),
    ("expense", "гель", "Матеріали та косметика", 1), ("expense", "фарб", "Матеріали та косметика", 1),
    ("expense", "ремувер", "Матеріали та косметика", 1), ("expense", "нейл", "Матеріали та косметика", 1),
    ("expense", "шамп", "Матеріали та косметика", 1), ("expense", "окисник", "Матеріали та косметика", 1),
    ("expense", "крем", "Матеріали та косметика", 1), ("expense", "препарат", "Матеріали та косметика", 1),
    ("expense", "оплата товару", "Матеріали та косметика", 1),
    ("expense", "комісі", "Банківські комісії", 1),
]


def seed(con):
    if con.execute("SELECT COUNT(*) FROM categories").fetchone()[0]:
        return
    for n in SEED_INCOME:
        get_or_create_category(con, n, "income")
    for n in SEED_EXPENSE:
        get_or_create_category(con, n, "expense")
    for kind, pat, cat, prio in SEED_RULES:
        cid = get_or_create_category(con, cat, kind)
        add_rule(con, cid, pat, kind, priority=prio)
    con.commit()

"""Category assignment: user rules -> built-in hints -> auto-created category."""
import re

COMPANY_MARKERS = re.compile(r"\b(фоп|тов|пп|ат|пат|прат|тзов|фг|ооо|llc|ltd)\b", re.I)

# (direction, substring, category name) - checked after user rules
HINTS = [
    ("income", "торгової виручки", "Оплата послуг"),
    ("income", "еквайринг", "Оплата послуг"),
    ("income", "терміналу", "Оплата послуг"),
    ("income", "кільк тр", "Оплата послуг"),
    ("income", "cmps", "Оплата послуг"),
    ("expense", "комісія", "Комісія банку"),
    ("expense", "комісію", "Комісія банку"),
    ("expense", "єдиний податок", "Податки"),
    ("expense", "єсв", "Податки"),
    ("expense", "податок", "Податки"),
    ("expense", "оренд", "Оренда"),
    ("expense", "зп ", "Зарплата"),
    ("expense", "зарплат", "Зарплата"),
    ("expense", "заробітн", "Зарплата"),
]

FALLBACK = {"income": "Інші доходи", "expense": "Інші витрати"}


def get_or_create_category(con, name: str, kind: str, auto: bool = False) -> int:
    name = name.strip()
    r = con.execute("SELECT id FROM categories WHERE name=? AND kind=? COLLATE NOCASE", (name, kind)).fetchone()
    if r:
        con.execute("UPDATE categories SET archived=0 WHERE id=?", (r["id"],))
        return r["id"]
    return con.execute("INSERT INTO categories(name,kind,auto) VALUES(?,?,?)",
                       (name, kind, 1 if auto else 0)).lastrowid


_LAT = str.maketrans({"i": "і", "I": "І"})


def _clean(s: str) -> str:
    return re.sub(r"\s+", " ", s or "").strip()


def norm(s: str) -> str:
    """Lower-case text for matching; banks write Ukrainian with a Latin 'i' ("Комiсiя")."""
    return _clean(s).translate(_LAT).lower()


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
    text = norm(description) + " " + norm(counterparty)
    for r in con.execute(
            "SELECT r.* FROM rules r JOIN categories c ON c.id=r.category_id "
            "WHERE c.archived=0 AND r.direction IN ('any',?) ORDER BY r.priority DESC, length(r.pattern) DESC, r.id",
            (kind,)):
        if norm(r["pattern"]) in text:
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
    p = norm(pattern)
    n = 0
    rows = con.execute(
        "SELECT t.* FROM transactions t LEFT JOIN categories c ON c.id=t.category_id "
        "WHERE t.deleted_at IS NULL AND t.kind!='transfer' AND t.user_edited=0 "
        "AND (c.id IS NULL OR c.auto=1 OR c.name IN ('Інші доходи','Інші витрати'))").fetchall()
    for t in rows:
        if kind and t["kind"] != kind:
            continue
        if p in norm(t["description"] + " " + t["counterparty"]) and t["category_id"] != category_id:
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


# Довідник Nomi компанії Steffany (назви збережено як у Nomi)
SEED_INCOME = ["Інвестиції", "Інші доходи", "Оплата послуг", "Каса за день", "Каса кава", "Суборенда",
               "Продаж товарів", "Додаткові надходження", "Кредит"]
SEED_EXPENSE = ["Youtube", "Інтернет", "Канцелярія", "Витрати на персонал", "Кредит", "Квіти", "Товар на вітрину",
                "Мобільний звязок", "Товари одноразового використання", "Інкасація", "Реалізація товару",
                "Оплата послуг іп телефоніі", "Обладнання", "Програмне забезпечення", "Навчання персоналу",
                "Податки", "Виведення грошей з бізнесу", "Зарплата", "Оренда", "Реклама", "Витрати на приміщення",
                "Матеріал в роботу", "Продукти для клієнтів", "Господарчі товари", "Доставка", "Комісія банку",
                "Комунальні", "Комісія за обслуговування рахунку", "Відпускні", "Комунальні послуги", "Поліграфія",
                "Повернення клієнтам", "ЛІКАРНЯНІ", "Інші витрати", "Премія"]
SEED_RULES = [  # (kind, substring, category, priority)
    ("expense", "зп", "Зарплата", 3), ("expense", "зарплат", "Зарплата", 3), ("expense", "аванс", "Зарплата", 3),
    ("expense", "прибиральниц", "Витрати на персонал", 3), ("expense", "премі", "Премія", 2), ("expense", "відпускн", "Відпускні", 4), ("expense", "лікарн", "ЛІКАРНЯНІ", 4),
    ("expense", "оренд", "Оренда", 2), ("expense", "світло", "Комунальні", 2),
    ("expense", "вода", "Комунальні", 1), ("expense", "комунал", "Комунальні", 2),
    ("expense", "нова пошта", "Доставка", 2), ("expense", "нп ", "Доставка", 1), ("expense", "достав", "Доставка", 2),
    ("expense", "реклам", "Реклама", 2), ("expense", "таргет", "Реклама", 2),
    ("expense", "мобіл", "Мобільний звязок", 2), ("expense", "київстар", "Мобільний звязок", 2),
    ("expense", "моб ", "Мобільний звязок", 1), ("expense", "інтернет", "Інтернет", 2),
    ("expense", "ютюб", "Youtube", 3), ("expense", "смс", "Мобільний звязок", 2),
    ("expense", "альтеджіо", "Мобільний звязок", 2), ("expense", "alteg", "Мобільний звязок", 2),
    ("expense", "молоко", "Продукти для клієнтів", 1), ("expense", "цукерки", "Продукти для клієнтів", 1),
    ("expense", "кава", "Продукти для клієнтів", 1), ("expense", "чай", "Продукти для клієнтів", 1),
    ("expense", "вершки", "Продукти для клієнтів", 1), ("expense", "квіти", "Квіти", 2),
    ("expense", "миюч", "Господарчі товари", 1), ("expense", "пакети", "Товари одноразового використання", 1),
    ("expense", "ремонт", "Витрати на приміщення", 1), ("expense", "канц", "Канцелярія", 2), ("expense", "кредит", "Кредит", 3),
    ("expense", "фольга", "Матеріал в роботу", 1), ("expense", "віск", "Матеріал в роботу", 1),
    ("expense", "простирад", "Матеріал в роботу", 1), ("expense", "скраб", "Матеріал в роботу", 1),
    ("expense", "гель", "Матеріал в роботу", 1), ("expense", "фарб", "Матеріал в роботу", 1),
    ("expense", "ремувер", "Матеріал в роботу", 1), ("expense", "нейл", "Матеріал в роботу", 1),
    ("expense", "шамп", "Матеріал в роботу", 1), ("expense", "окисник", "Матеріал в роботу", 1),
    ("expense", "крем", "Матеріал в роботу", 1), ("expense", "препарат", "Матеріал в роботу", 1),
    ("expense", "оплата товару", "Матеріал в роботу", 1),
    ("expense", "комісі", "Комісія банку", 1),
    ("expense", "обслуговування рахунку", "Комісія за обслуговування рахунку", 4),
    ("expense", "еквайринг", "Комісія банку", 3),
    ("expense", "заробітн", "Зарплата", 4), ("expense", "з/п", "Зарплата", 4),
    ("expense", "єсв", "Податки", 5), ("expense", "пдфо", "Податки", 5), ("expense", "вз/", "Податки", 5),
    ("expense", "податок", "Податки", 3), ("expense", "єдиний", "Податки", 3),
    ("expense", "кредитн", "Кредит", 4), ("expense", "компенсація комунал", "Комунальні", 4),
    ("expense", "комунально", "Комунальні", 3), ("expense", "абразив", "Матеріал в роботу", 2),
    ("expense", "ковпачк", "Матеріал в роботу", 2), ("expense", "гель", "Матеріал в роботу", 2),
    ("expense", "оплата за товар", "Матеріал в роботу", 2),
    ("expense", "лiцензiйна", "Програмне забезпечення", 3), ("expense", "ліцензійна", "Програмне забезпечення", 3),
    ("expense", "модерація сайту", "Реклама", 3), ("expense", "комунікаційні", "Мобільний звязок", 3),
    ("expense", "зв'язку", "Мобільний звязок", 3), ("expense", "звязку", "Мобільний звязок", 3),
    ("expense", "живлення", "Обладнання", 3), ("expense", "переказ власних коштів", "Виведення грошей з бізнесу", 3),
    ("expense", "абонен", "Інтернет", 3),
    ("income", "кредитним договором", "Кредит", 4),
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

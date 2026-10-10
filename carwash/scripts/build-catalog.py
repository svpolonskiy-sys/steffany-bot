"""Збирає data/catalog.json з прайсу та класифікації авто старого сайту info.vmu.ua.

Запуск: python3 scripts/build-catalog.py <index.html> <каталог з class-*.html> > data/catalog.json
Тривалості послуг (duration) на старому сайті відсутні - це робочі оцінки, їх можна змінити в CRM.
"""
import sys, re, json, html, os

index_html, cls_dir = sys.argv[1], sys.argv[2]
s = open(index_html, encoding="utf-8").read()
tbl = s[s.find('<div id="price">'):s.find('<div id="photos">')]
tbody = tbl[tbl.find("<tbody>"):tbl.find("</tbody>")]

TIERS = ["abc", "de", "sf", "k1", "k2", "k3", "m1", "m2"]

def clean(x):
    x = re.sub(r"<br\s*/?>", "\n", x)
    x = re.sub(r"<[^>]+>", "", x)
    return html.unescape(x).replace("\xa0", " ").strip()

PART = {  # до якої частини авто належить послуга
    "Мийка": "body", "Експрес-збивка": "body", "Збивка": "body", "Глибоке очищення кузову": "body",
    "Видалення бітуму": "body", "Антикальцій": "glass", "Антидощ": "glass",
    "Мийка двигуна": "engine", "Мийка та консервація двигуна": "engine",
    "Прибирання салону": "interior", "Прибирання багажнику": "trunk",
    "Чистка дисків": "wheels", "Хімчистка салону повна": "interior",
    "Розморожування дверних замків": "doors", "Обробка \"Антилід\" (дверні замки)": "doors",
    "Обробка дверних завісів": "doors", "Обробка дверних отворів силіконом": "doors",
}
DUR = {  # хвилини (оцінка)
    "Мийка": 30, "Експрес-збивка": 15, "Збивка": 20, "Мийка двигуна": 30, "Мийка та консервація двигуна": 60,
    "Прибирання салону": 20, "Прибирання багажнику": 10, "Чистка дисків": 30, "Видалення бітуму": 30,
    "Глибоке очищення кузову": 120, "Хімчистка салону повна": 240, "Антикальцій": 30, "Антидощ": 30,
    "Стандарт": 60, "Комплекс СТАНДАРТ": 150, "Комплекс ПРЕМІУМ": 180,
    "Натирання скла всередині салону": 20, "Натирання лобового скла": 10,
    "Пластик салону базовий": 15, "Пластик салону преміум": 25,
    "Кондиціонер шкіри базовий": 30, "Кондиціонер шкіри преміум": 40,
    "Холодний віск базовий": 15, "Холодний віск преміум": 20, "Полімерний віск": 45,
    "Базовий твердий віск": 90, "Преміум твердий віск": 120,
    "Зволоження гуми базове": 10, "Зволоження гуми преміум": 15, "Чистка килимів": 40,
}
DEFAULT_DUR = {"doors": 10, "clean": 30}

section = None
cats, services = [], []
n = 0
for tr in re.findall(r"<tr[^>]*>.*?</tr>", tbody, flags=re.S):
    cells = re.findall(r"<td([^>]*)>(.*?)</td>", tr, flags=re.S)
    if 'class="spacer"' in tr:
        section = clean(cells[0][1]); cats.append(section); continue
    name_raw = clean(cells[0][1])
    name, _, desc = name_raw.partition("\n")
    desc = desc.strip("() \n")
    name = name.strip()
    if name.startswith("- "): name = name[2:].strip().capitalize()
    name = name.replace("&quot", '"')
    flat_from = False
    if name.endswith(", від"): name = name[:-5]; flat_from = True
    name = re.sub(r"\s*\(за 1 [^)]*\)", "", name) if section == "Базові послуги" and "двер" in name.lower() or "замк" in name.lower() else name
    name = name.strip()
    if name == "Розморожування дверних замків": desc = "за 1 замок"
    if name.startswith("Обробка \"Антилід\""): name = "Обробка \"Антилід\" (дверні замки)"; desc = "за 1 замок"
    if name == "Обробка дверних завісів": desc = "за 1 завісу"
    if name == "Обробка дверних отворів силіконом": desc = "за 1 отвір"
    if name == "Чистка дисків": desc = "за 1 диск"
    if name == "Чистка килимів": desc = "за 1 кв.м"
    if name == "Комплекс СТАНДАРТ": pass
    if name == "Комплекс ПРЕМІУМ": pass
    name = name.replace("Комплекс ПРЕМІУМ", "Комплекс ПРЕМІУМ")
    # значення за класами
    prices = {}; notes = {}
    vals = []
    for attrs, raw in cells[1:]:
        span = re.search(r'colspan\s*=\s*"?(\d+)', attrs)
        vals += [clean(raw)] * (int(span.group(1)) if span else 1)
    for t, v in zip(TIERS, vals):
        if not v: continue
        nums = [int(x) for x in re.findall(r"\d+", re.sub(r"\(T4\)", "", v))]
        if not nums: continue
        multi = len(nums) > 1
        prices[t] = {"price": min(nums), "from": multi or flat_from}
        if multi: prices[t]["note"] = re.sub(r"\s*\n\s*", " · ", v.replace(",\n", "\n"))
    RENAME = {"1 стійка": "Стійка (1 шт.)", "1 сидіння переднє": "Сидіння переднє (1 шт.)", "заднє": "Заднє сидіння",
              "1 карта дверна": "Карта дверна (1 шт.)", "багажник": "Багажник (чистка)", "передня панель": "Передня панель"}
    name = RENAME.get(name, name)
    n += 1
    if "Комплекс ПРЕМІУМ" in name_raw: desc = "Koch-Chemie"
    sid = f"s{n:02d}"
    part = PART.get(name) or {"Окремі послуги чистки": "interior", "Чистка килимів": "interior",
        "Нанесення захисного покриття в салоні": "interior",
        "Нанесення захисного покриття на кузов автомобіля": "body", "Комплексні послуги": "combo"}[section]
    if name == "Багажник (чистка)": part = "trunk"
    if name in ("Зволоження гуми базове", "Зволоження гуми преміум"): part = "wheels"
    if name.startswith("Натирання"): part = "glass"
    dur = DUR.get(name) or DEFAULT_DUR["doors" if part == "doors" else "clean"]
    if section == "Окремі послуги чистки": dur = 30 if name not in ("підлога", "стеля", "передня панель") else 45
    services.append({"id": sid, "category": section, "part": part, "name": name[0].upper() + name[1:],
                     "description": desc, "duration": dur, "prices": prices, "active": True,
                     "unit": desc.startswith("за 1") or "(1 шт.)" in name})

# класифікація
def models(fn):
    t = open(os.path.join(cls_dir, fn), encoding="utf-8").read()
    t = re.sub(r"<[^>]+>", "|", t)
    t = html.unescape(t)
    return [m.strip() for m in re.split(r"\|", t) if m.strip()]

classes = []
def grab(fn, groups):
    raw = models(fn)
    out = {}
    cur = None
    for tok in raw:
        if tok in groups: cur = tok; out[cur] = []; continue
        if cur and "," not in tok and tok not in ("Легкові автівки", "Кросовери/позашляховики", "Мікроавтобуси"):
            out[cur].append(tok)
        elif cur and tok.strip() == ",": pass
    return out
for fn, groups in [("class-a,b,c.html", ["A", "B", "C"]), ("class-d,e.html", ["D", "E"]), ("class-s,f.html", ["F"]),
                   ("class-k1.html", ["K1"]), ("class-k2.html", ["K2"]), ("class-k3.html", ["K3"]),
                   ("class-m1.html", ["M1"]), ("class-m2.html", ["M2"])]:
    classes.append((fn, grab(fn, groups)))

tier_models = {}
for (fn, g), t in zip(classes, TIERS):
    allm = sorted({m for v in g.values() for m in v if len(m) > 1}, key=str.lower)
    tier_models[t] = allm

out = {
    "source": "https://info.vmu.ua/",
    "tiers": [
        {"id": "abc", "type": "car", "label": "A, B, C", "title": "Малі та компактні", "classes": "A, B, C"},
        {"id": "de", "type": "car", "label": "D, E", "title": "Середній та бізнес-клас", "classes": "D, E"},
        {"id": "sf", "type": "car", "label": "S, F", "title": "Преміум та представницькі", "classes": "S, F"},
        {"id": "k1", "type": "suv", "label": "K1", "title": "Компактні кросовери", "classes": "K1"},
        {"id": "k2", "type": "suv", "label": "K2", "title": "Середні позашляховики", "classes": "K2"},
        {"id": "k3", "type": "suv", "label": "K3", "title": "Великі позашляховики", "classes": "K3"},
        {"id": "m1", "type": "van", "label": "M1", "title": "Мікроавтобуси", "classes": "M1"},
        {"id": "m2", "type": "van", "label": "M2", "title": "Великі мікроавтобуси", "classes": "M2"},
    ],
    "models": tier_models,
    "categories": cats,
    "services": services,
    "legend": {
        "Експрес": "безконтактна мийка, протирання тільки скла",
        "Економ": "безконтактна мийка, очищення килимків, просушування елементів кузову стисненим повітрям",
        "Стандарт": "безконтактна мийка, очищення килимків, прибирання салону, просушування елементів кузову стисненим повітрям",
        "Преміум": "безконтактна мийка, очищення килимків, прибирання салону, прибирання багажнику, нанесення холодного воску, натирання пластикових деталей приборної панелі, очищення скла зсередини, чорніння гуми",
    },
}
json.dump(out, sys.stdout, ensure_ascii=False, indent=1)

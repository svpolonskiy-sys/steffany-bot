"""Збирає автономні HTML для показу замовнику: demo/site.html і demo/crm.html.
Стилі, скрипти, фото та демо-бекенд вбудовані — файли працюють без сервера (подвійний клік)."""
import base64, json, re, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rd = lambda p: open(os.path.join(root, p), encoding="utf-8").read()
cat = json.load(open(os.path.join(root, "data/catalog.json"), encoding="utf-8"))
cat["services"] = [{**s, "active": True} for s in cat["services"]]
catalog_js = "window.__CATALOG=" + json.dumps(cat, ensure_ascii=False) + ";"
backend = rd("scripts/demo-backend.js")

def uri(path):
    ext = path.rsplit(".", 1)[1]
    mime = {"webp": "image/webp", "svg": "image/svg+xml", "jpg": "image/jpeg", "png": "image/png"}[ext]
    return f"data:{mime};base64," + base64.b64encode(open(os.path.join(root, "public", path.lstrip("/")), "rb").read()).decode()

def inline_imgs(s):
    return re.sub(r'/img/[\w.-]+\.webp', lambda m: uri(m.group(0)), s)

def script(js):  # безпечне вбудовування у <script>
    return "<script>" + js.replace("</script", "<\\/script") + "</script>"

# ---- сайт ----
h = rd("public/index.html")
h = re.sub(r'<link rel="preload"[^>]*>\n?', "", h)
h = re.sub(r'<meta property="og:image"[^>]*>\n?', "", h)
h = h.replace('<link rel="icon" href="/favicon.svg" type="image/svg+xml">', f'<link rel="icon" href="{uri("favicon.svg")}">')
h = h.replace('<link rel="stylesheet" href="/css/site.css">', "<style>" + rd("public/css/site.css") + "</style>")
h = inline_imgs(h)
js = rd("public/js/site.js")
imgs = [uri(f"/img/moika_{i:02d}.webp") for i in range(12)]
old = "const imgs = Array.from({ length: 12 }, (_, i) => `/img/moika_${String(i).padStart(2, '0')}.webp`);"
assert old in js
js = js.replace(old, "const imgs = " + json.dumps(imgs) + ";")
h = h.replace('<script src="/js/site.js" defer></script>', script(catalog_js + backend) + script(js))
open(os.path.join(root, "demo/site.html"), "w", encoding="utf-8").write(h)

# ---- CRM ----
c = rd("public/crm/index.html")
c = c.replace('<link rel="icon" href="/favicon.svg" type="image/svg+xml">', f'<link rel="icon" href="{uri("favicon.svg")}">')
c = c.replace('<link rel="stylesheet" href="/crm/crm.css">', "<style>" + rd("public/crm/crm.css") + "</style>")
c = c.replace('<p>Вхід для менеджерів мийки</p>', '<p>Вхід для менеджерів мийки</p><p style="color:#ffb81c;font-size:.85rem">Демо: введіть будь-який пароль</p>')
c = c.replace('<a href="/" target="_blank" rel="noopener">Відкрити сайт ↗</a>', '<a href="site.html" target="_blank" rel="noopener">Відкрити сайт ↗</a>')
c = c.replace('<script src="/crm/crm.js" defer></script>', script(catalog_js + backend) + script(rd("public/crm/crm.js")))
open(os.path.join(root, "demo/crm.html"), "w", encoding="utf-8").write(c)
for f in ("site.html", "crm.html"):
    print(f, round(os.path.getsize(os.path.join(root, "demo", f)) / 1e6, 2), "MB")

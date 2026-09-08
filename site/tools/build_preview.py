#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Збирає весь сайт в один самодостатній HTML-файл для перегляду.

Навіщо: щоб показати сайт там, де немає локального сервера (панель перегляду,
месенджер, лист рецензенту). CSS, JS, шрифти та зображення інлайняться,
переходи між сторінками стають клієнтськими.

Це ТІЛЬКИ прев'ю. Продакшн — це окремі файли в site/.

Запуск: python3 tools/build_preview.py [шлях_виводу]
"""
import base64
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

PAGES = [
    ("index", "Головна"),
    ("apnea", "Маршрут апное"),
    ("evidence", "Доказова основа"),
    ("privacy", "Політика конфіденційності"),
    ("health-data-consent", "Згода на дані про здоров'я"),
    ("terms", "Умови використання"),
    ("offer", "Публічна оферта"),
    ("payment-refund", "Оплата й повернення"),
    ("medical-disclaimer", "Медичне застереження"),
    ("cookies", "Політика cookies"),
    ("data-request", "Запит щодо даних"),
    ("contacts", "Контакти"),
]


def read(path):
    with open(os.path.join(ROOT, path), encoding="utf-8") as f:
        return f.read()


def data_uri(path, mime):
    with open(os.path.join(ROOT, path), "rb") as f:
        return "data:%s;base64,%s" % (mime, base64.b64encode(f.read()).decode())


def inline_css():
    css = read("assets/css/styles.css")
    for name in ("manrope-cyrillic", "manrope-cyrillic-ext", "manrope-latin"):
        css = css.replace("url('../fonts/%s.woff2')" % name,
                          "url('%s')" % data_uri("assets/fonts/%s.woff2" % name, "font/woff2"))
    return css


def page_body(slug):
    """Вміст <body> сторінки з переписаними посиланнями та інлайновими зображеннями."""
    html = read(slug + ".html")
    body = re.search(r"<body[^>]*>(.*)</body>", html, re.S).group(1)

    # прибрати підключення зовнішніх скриптів і JSON-LD — у прев'ю свій рантайм
    body = re.sub(r'<script[^>]*src="[^"]*"[^>]*>\s*</script>', "", body)
    body = re.sub(r'<script type="application/ld\+json">.*?</script>', "", body, flags=re.S)

    # зображення
    body = body.replace('src="assets/img/logo.svg"', 'src="%s"' % LOGO)
    body = body.replace('src="assets/img/hero-placeholder.svg"', 'src="%s"' % HERO)

    # унікальні id для дубльованих службових якорів
    body = body.replace('id="main"', 'id="main-%s"' % slug)
    body = body.replace('href="#main"', 'href="#main-%s"' % slug)

    # переходи між сторінками -> клієнтський роутер
    def link(m):
        target, anchor = m.group(1), m.group(2) or ""
        return 'href="#/%s%s"' % (target, "/" + anchor.lstrip("#") if anchor else "")

    body = re.sub(r'href="([a-z0-9-]+)\.html(#[a-z0-9-]+)?"', link, body)
    body = body.replace('href="/"', 'href="#/index"')

    # у прев'ю контент завжди видимий
    body = body.replace('class="js-reveal"', 'class="js-reveal is-visible"')
    body = body.replace(' js-reveal"', ' js-reveal is-visible"')
    return body


LOGO = ""
HERO = ""

RUNTIME = """
<script>
(function () {
  var pages = Array.prototype.slice.call(document.querySelectorAll('.preview-page'));

  function show(slug, anchor) {
    var found = false;
    pages.forEach(function (p) {
      var match = p.getAttribute('data-slug') === slug;
      p.hidden = !match;
      if (match) found = true;
    });
    if (!found) { pages.forEach(function (p, i) { p.hidden = i !== 0; }); }
    var bar = document.getElementById('preview-bar-select');
    if (bar) bar.value = slug;
    if (anchor) {
      var el = document.getElementById(anchor);
      if (el) { el.scrollIntoView(); return; }
    }
    window.scrollTo(0, 0);
  }

  function route() {
    var m = /^#\\/([a-z0-9-]+)(?:\\/([a-z0-9-]+))?/.exec(location.hash || '');
    show(m ? m[1] : 'index', m && m[2]);
  }
  window.addEventListener('hashchange', route);

  // мобільне меню — на кожній сторінці свій екземпляр
  document.querySelectorAll('[data-nav-toggle]').forEach(function (toggle) {
    var nav = toggle.parentNode.querySelector('[data-nav]');
    if (!nav) return;
    toggle.addEventListener('click', function () {
      var open = nav.getAttribute('data-open') === 'true';
      nav.setAttribute('data-open', open ? 'false' : 'true');
      toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
    });
  });

  // cookie-банер: показуємо один раз, як на живому сайті
  var banners = document.querySelectorAll('[data-cookie-banner]');
  if (banners.length) {
    banners[0].hidden = false;
    banners.forEach(function (b) {
      b.addEventListener('click', function (e) {
        if (e.target.closest('[data-consent]')) { b.hidden = true; }
      });
    });
  }
  document.querySelectorAll('[data-cookie-reopen]').forEach(function (link) {
    link.addEventListener('click', function (e) { e.preventDefault(); banners[0].hidden = false; });
  });

  // липкий CTA після виходу з hero
  document.querySelectorAll('.preview-page').forEach(function (page) {
    var sticky = page.querySelector('[data-sticky-cta]');
    var hero = page.querySelector('[data-hero]');
    if (!sticky || !hero || !('IntersectionObserver' in window)) return;
    document.body.classList.add('has-sticky-cta');
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        sticky.setAttribute('data-visible', en.isIntersecting ? 'false' : 'true');
      });
    }, { rootMargin: '-120px 0px 0px 0px' }).observe(hero);
  });

  // перемикач сторінок у панелі прев'ю
  var select = document.getElementById('preview-bar-select');
  if (select) {
    select.addEventListener('change', function () { location.hash = '#/' + select.value; });
  }

  route();
})();
</script>
"""


def build(out_path, artifact=False):
    global LOGO, HERO
    LOGO = data_uri("assets/img/logo.svg", "image/svg+xml")
    HERO = data_uri("assets/img/hero-placeholder.svg", "image/svg+xml")

    options = "\n".join(
        '        <option value="%s">%s</option>' % (slug, title) for slug, title in PAGES
    )
    bodies = []
    for slug, _ in PAGES:
        bodies.append(
            '<div class="preview-page" data-slug="%s"%s>\n%s\n</div>'
            % (slug, "" if slug == "index" else " hidden", page_body(slug))
        )

    # У режимі artifact обгортка <html>/<head>/<body> додається хостом,
    # тому віддаємо лише вміст сторінки.
    open_tags = "" if artifact else """<!doctype html>
<html lang="uk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
"""
    close_tags = "" if artifact else "</body>\n</html>\n"
    mid_tags = "" if artifact else "</head>\n<body>"

    html = """%s<title>Dormeza</title>
<style>
%s

/* ---- лише для прев'ю: панель перемикання сторінок ---- */
.preview-bar {
  position: sticky; top: 0; z-index: 300;
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  background: #102A43; color: #CBD9E6;
  padding: 10px 20px; font-size: 14px;
}
.preview-bar strong { color: #fff; font-weight: 700; }
.preview-bar select {
  font: inherit; font-size: 14px; padding: 7px 10px; border-radius: 8px;
  border: 1px solid #3A5674; background: #1B3A57; color: #fff; min-height: 36px;
}
.preview-bar span { color: #8FA9C2; }
.preview-page > .header { top: 56px; }
@media (max-width: 640px) { .preview-page > .header { top: 88px; } }
</style>
%s
<div class="preview-bar">
  <strong>Прев'ю Dormeza</strong>
  <label for="preview-bar-select" class="visually-hidden">Сторінка</label>
  <select id="preview-bar-select">
%s
  </select>
  <span>Статичне прев'ю: переходи між сторінками працюють, посилання в Telegram — ні.</span>
</div>

%s

%s
%s""" % (open_tags, inline_css(), mid_tags, options, "\n\n".join(bodies), RUNTIME, close_tags)

    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)
    print("зібрано:", out_path, round(len(html.encode()) / 1024), "КБ")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a != "--artifact"]
    build(args[0] if args else os.path.join(ROOT, "dormeza-preview.html"),
          artifact="--artifact" in sys.argv)

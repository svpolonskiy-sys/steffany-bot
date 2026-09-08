/* =========================================================
   Dormeza — клієнтська логіка лендінгу.
   Принципи: мінімум JS, сторінка повністю читається без нього,
   жодних даних про здоров'я в URL, аналітиці чи логах.
   ========================================================= */
(function () {
  'use strict';

  var CFG = window.DORMEZA_CONFIG || {};
  document.documentElement.classList.add('js');

  /* ---------------------------------------------------------
     1. Згода на cookies (ТЗ, 10.3)
     До вибору користувача не вантажимо жодних необов'язкових
     трекерів. Кнопки «Прийняти» і «Відхилити» рівнозначні.
  --------------------------------------------------------- */
  var CONSENT_KEY = 'dz_consent';

  function readConsent() {
    try { return JSON.parse(localStorage.getItem(CONSENT_KEY) || 'null'); }
    catch (e) { return null; }
  }

  function writeConsent(value) {
    var record = {
      analytics: value,
      policyVersion: (CFG.legal && CFG.legal.version) || 'n/a',
      at: new Date().toISOString()
    };
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify(record)); } catch (e) {}
    return record;
  }

  function applyConsent(record) {
    if (record && record.analytics === true) {
      // Місце підключення аналітики. Жодних медичних даних у payload.
      // Завантажується лише після явної згоди.
      if (CFG.analytics) { CFG.analytics.enabled = true; }
    }
  }

  var banner = document.querySelector('[data-cookie-banner]');
  if (banner) {
    var stored = readConsent();
    if (!stored) {
      banner.hidden = false;
    } else {
      applyConsent(stored);
    }
    banner.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-consent]');
      if (!btn) return;
      applyConsent(writeConsent(btn.getAttribute('data-consent') === 'accept'));
      banner.hidden = true;
    });
  }

  // Постійне посилання у футері, щоб змінити вибір
  var reopen = document.querySelector('[data-cookie-reopen]');
  if (reopen && banner) {
    reopen.addEventListener('click', function (e) {
      e.preventDefault();
      banner.hidden = false;
      var first = banner.querySelector('button');
      if (first) first.focus();
    });
  }

  /* ---------------------------------------------------------
     2. Події аналітики
     Дозволені лише маркетингові події сторінки (ТЗ, 10.1).
     Жодних відповідей анкети, балів шкал чи причин недопуску.
  --------------------------------------------------------- */
  function track(name, payload) {
    var consent = readConsent();
    var data = Object.assign({ event: name }, payload || {});
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(data);
    if (!consent || consent.analytics !== true) return; // без згоди — лише локальна черга
    // TODO(release): відправлення в обрану first-party аналітику через сервер.
  }
  window.dormezaTrack = track;

  track('landing_view', { page: document.body.getAttribute('data-page') || 'index' });

  /* ---------------------------------------------------------
     3. Токен атрибуції та перехід у Telegram (ТЗ, 9)
  --------------------------------------------------------- */
  var attrCfg = (CFG.attribution || {});

  function randomToken(len) {
    var alphabet = 'abcdefghijkmnopqrstuvwxyz023456789';
    var out = '';
    var buf = new Uint8Array(len);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(buf);
      for (var i = 0; i < len; i++) { out += alphabet[buf[i] % alphabet.length]; }
    } else {
      for (var j = 0; j < len; j++) { out += alphabet[Math.floor(Math.random() * alphabet.length)]; }
    }
    return out;
  }

  function attributionToken() {
    var key = attrCfg.storageKey || 'dz_attr';
    var ttl = (attrCfg.ttlMinutes || 120) * 60 * 1000;
    try {
      var raw = JSON.parse(sessionStorage.getItem(key) || 'null');
      if (raw && raw.token && (Date.now() - raw.at) < ttl) return raw.token;
    } catch (e) {}
    var token = randomToken(attrCfg.tokenLength || 12);
    try { sessionStorage.setItem(key, JSON.stringify({ token: token, at: Date.now() })); } catch (e) {}
    // UTM-мітки зв'язуються з токеном на сервері, а не в URL Telegram.
    return token;
  }

  function telegramUrl() {
    var user = CFG.botUsername || 'DormezaSon6Bot';
    return 'https://t.me/' + user + '?start=' + attributionToken();
  }

  var ctas = document.querySelectorAll('[data-cta]');
  Array.prototype.forEach.call(ctas, function (el) {
    el.setAttribute('href', telegramUrl());
    el.addEventListener('click', function () {
      track('telegram_click', {
        cta_position: el.getAttribute('data-cta') || 'unknown',
        page: document.body.getAttribute('data-page') || 'index'
      });
    });
  });

  /* ---------------------------------------------------------
     4. Мобільне меню
  --------------------------------------------------------- */
  var toggle = document.querySelector('[data-nav-toggle]');
  var nav = document.querySelector('[data-nav]');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.getAttribute('data-open') === 'true';
      nav.setAttribute('data-open', open ? 'false' : 'true');
      toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        nav.setAttribute('data-open', 'false');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------------------------------------------------------
     5. Липкий CTA на мобільному після виходу з hero
  --------------------------------------------------------- */
  var sticky = document.querySelector('[data-sticky-cta]');
  var hero = document.querySelector('[data-hero]');
  if (sticky && hero && 'IntersectionObserver' in window) {
    document.body.classList.add('has-sticky-cta');
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        sticky.setAttribute('data-visible', entry.isIntersecting ? 'false' : 'true');
      });
    }, { rootMargin: '-120px 0px 0px 0px' }).observe(hero);
  }

  /* ---------------------------------------------------------
     6. Перегляди ключових секцій + FAQ (ТЗ, 10.1)
  --------------------------------------------------------- */
  var watched = document.querySelectorAll('[data-track-view]');
  if (watched.length && 'IntersectionObserver' in window) {
    var seen = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var name = entry.target.getAttribute('data-track-view');
        if (seen[name]) return;
        seen[name] = true;
        track(name);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.35 });
    Array.prototype.forEach.call(watched, function (el) { io.observe(el); });
  }

  var faqItems = document.querySelectorAll('.faq details');
  Array.prototype.forEach.call(faqItems, function (item) {
    item.addEventListener('toggle', function () {
      if (!item.open) return;
      var q = item.querySelector('summary');
      track('faq_open', { question: q ? q.textContent.trim().slice(0, 90) : '' });
    });
  });

  var legalLinks = document.querySelectorAll('[data-legal-link]');
  Array.prototype.forEach.call(legalLinks, function (link) {
    link.addEventListener('click', function () {
      track('legal_link_click', { document: link.getAttribute('data-legal-link') });
    });
  });

  /* ---------------------------------------------------------
     7. Стриманий scroll-reveal.
     Контент видимий, якщо JS не спрацював (клас .js додається зверху).
  --------------------------------------------------------- */
  var reveals = document.querySelectorAll('.js-reveal');
  if (reveals.length) {
    if ('IntersectionObserver' in window) {
      var ro = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          ro.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
      Array.prototype.forEach.call(reveals, function (el) { ro.observe(el); });
    } else {
      Array.prototype.forEach.call(reveals, function (el) { el.classList.add('is-visible'); });
    }
    // Страховка: за жодних обставин контент не має лишитися прихованим.
    window.setTimeout(function () {
      Array.prototype.forEach.call(reveals, function (el) { el.classList.add('is-visible'); });
    }, 3000);
  }

  /* ---------------------------------------------------------
     8. Синхронізація цін із конфігурації
  --------------------------------------------------------- */
  if (CFG.price) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-price="regular"]'), function (el) {
      el.textContent = CFG.price.regular;
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-price="current"]'), function (el) {
      el.textContent = CFG.price.current;
    });
  }
})();

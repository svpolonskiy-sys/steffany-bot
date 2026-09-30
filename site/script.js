(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const NS = 'http://www.w3.org/2000/svg';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };

  /* ---------- Hero diagram ---------- */
  (function hero() {
    const svg = $('#heroSvg');
    if (!svg) return;
    el('circle', { class: 'sun', cx: 600, cy: 260, r: 175, fill: '#ff3b00', opacity: .92 }, svg);
    const sources = ['CRM', 'ERP', 'Бухгалтерія', 'Дзвінки', 'Документи', 'Таблиці'];
    const outs = [['Бачить', 'Одна панель · відповіді'], ['Радить', 'Рішення з поясненням'], ['Робить', 'Дії — з погодженням']];
    const coreX = 470, coreY = 140, coreW = 260, coreH = 240;
    const paths = [];

    sources.forEach((s, i) => {
      const y = 30 + i * 78;
      const g = el('g', { class: 'node' }, svg);
      el('rect', { x: 40, y, width: 190, height: 50 }, g);
      const t = el('text', { x: 58, y: y + 30 }, g); t.textContent = s;
      el('rect', { x: 212, y: y + 20, width: 10, height: 10, fill: '#ff3b00', stroke: 'none' }, g);
      const d = `M230 ${y + 25} C 350 ${y + 25}, 360 260, ${coreX} 260`;
      el('path', { class: 'flow', d }, svg);
      paths.push(d);
    });

    const core = el('g', {}, svg);
    el('rect', { class: 'core-box', x: coreX, y: coreY, width: coreW, height: coreH }, core);
    el('rect', { x: coreX + 10, y: coreY + 10, width: coreW - 20, height: coreH - 20, fill: 'none', stroke: '#bcb9ae', 'stroke-dasharray': '3 4' }, core);
    let t = el('text', { class: 'core-t', x: coreX + 30, y: coreY + 70 }, core); t.textContent = 'SINAPTIC';
    t = el('text', { class: 'core-s', x: coreX + 30, y: coreY + 96 }, core); t.textContent = 'Захищене середовище';
    ['Ізоляція', 'Шифрування', 'Доступ за ролями'].forEach((s, i) => {
      el('rect', { class: 'sq', x: coreX + 30, y: coreY + 128 + i * 30, width: 9, height: 9, style: `animation-delay:${i * .5}s` }, core);
      const tt = el('text', { class: 'core-s', x: coreX + 50, y: coreY + 137 + i * 30, style: 'fill:#1d1d1b' }, core); tt.textContent = s;
    });

    outs.forEach((o, i) => {
      const y = 70 + i * 120;
      const d = `M${coreX + coreW} 260 C 830 260, 850 ${y + 45}, 900 ${y + 45}`;
      el('path', { class: 'flow out', d }, svg);
      paths.push(d);
      const g = el('g', { class: 'outbox' }, svg);
      el('rect', { x: 900, y, width: 260, height: 90 }, g);
      el('rect', { x: 900, y, width: 8, height: 90, fill: '#ff3b00' }, g);
      const h = el('text', { class: 'h', x: 926, y: y + 38 }, g); h.textContent = `${i + 1}. ${o[0]}`;
      const s = el('text', { class: 's', x: 926, y: y + 62 }, g); s.textContent = o[1];
    });

    // dimension line
    el('path', { class: 'dim', d: 'M40 490 H1160 M40 482 V498 M1160 482 V498' }, svg);
    const dt = el('text', { class: 'dim-t', x: 600, y: 480, 'text-anchor': 'middle' }, svg);
    dt.textContent = 'ВІД ДАНИХ — ДО ВИКОНАНОГО ЗАВДАННЯ';

    // travelling packets
    if (!reduce) paths.forEach((d, i) => {
      const c = el('rect', { class: 'pkt', width: 8, height: 8, x: -4, y: -4 }, svg);
      const m = el('animateMotion', { dur: `${3.2 + (i % 3) * .5}s`, repeatCount: 'indefinite', begin: `${i * .35}s`, path: d }, c);
    });

    // cursor readout
    const stage = $('.hero-stage'), chx = $('#chx'), chy = $('#chy'), co = $('#coords');
    stage.addEventListener('mousemove', e => {
      const r = stage.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      chx.style.top = y + 'px'; chy.style.left = x + 'px';
      co.innerHTML = `X: ${Math.round(x)} ПІКСЕЛІВ<br>Y: ${Math.round(y)} PX`;
    });
  })();

  /* ---------- Decorative art ---------- */
  (function art() {
    const tl = $('#towerLines'), tf = $('#towerFill');
    if (tl) {
      for (let i = 0; i < 22; i++) {
        const x = 130 + i * 16;
        el('line', { x1: x, y1: 120, x2: x, y2: 620 }, tl);
        if (i % 3 === 0) el('rect', { x, y: 140, width: 9, height: 300 + (i % 4) * 40 }, tf);
      }
      for (let j = 0; j < 12; j++) el('line', { x1: 120, y1: 150 + j * 42, x2: 480, y2: 150 + j * 42 }, tl);
      el('path', { d: 'M300 20 L560 120 M300 20 L40 120', stroke: '#1d1d1b' }, tl);
    }
    const ga = $('#gridArt');
    if (ga) {
      for (let i = 0; i <= 12; i++) {
        el('line', { x1: i * 50, y1: 0, x2: i * 50, y2: 700 }, ga);
        el('line', { x1: 0, y1: i * 58, x2: 600, y2: i * 58 }, ga);
      }
      el('rect', { x: 290, y: 290, width: 210, height: 210, fill: '#f4f2ec' }, ga);
    }
  })();

  /* ---------- Reveal, counters, progress ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .15 });
  $$('.reveal, .step, #timeline').forEach(n => io.observe(n));

  $$('[data-count]').forEach(n => {
    const target = +n.dataset.count;
    const co = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      co.disconnect();
      if (reduce) return;
      const t0 = performance.now(), dur = 1200;
      const tick = t => {
        const p = Math.min(1, (t - t0) / dur);
        n.textContent = Math.max(1, Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }), { threshold: .6 });
    co.observe(n);
  });

  const prog = $('#progress');
  addEventListener('scroll', () => {
    const h = document.documentElement;
    prog.style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight) * 100) + '%';
  }, { passive: true });

  /* ---------- Cursor square ---------- */
  const cur = $('#cursor');
  if (cur && matchMedia('(hover:hover)').matches) {
    let x = 0, y = 0, tx = 0, ty = 0;
    addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; });
    (function loop() {
      x += (tx - x) * .25; y += (ty - y) * .25;
      cur.style.transform = `translate(${x - 6}px,${y - 6}px)`;
      requestAnimationFrame(loop);
    })();
    document.addEventListener('mouseover', e => cur.classList.toggle('big', !!e.target.closest('a,button,.chip,.tab,input,textarea')));
  }

  /* ---------- Nav ---------- */
  const burger = $('#burger'), links = $('#navLinks');
  burger.addEventListener('click', () => {
    const o = links.classList.toggle('open');
    burger.setAttribute('aria-expanded', o);
  });
  links.addEventListener('click', e => {
    if (e.target.closest('a')) { links.classList.remove('open'); burger.setAttribute('aria-expanded', false); }
  });

  /* ---------- Accordions (one open at a time) ---------- */
  $$('.acc-list').forEach(list => {
    list.addEventListener('click', e => {
      const h = e.target.closest('.acc-h');
      if (!h) return;
      const item = h.parentElement, was = item.classList.contains('open');
      $$('.acc', list).forEach(a => a.classList.remove('open'));
      if (!was) item.classList.add('open');
    });
  });

  /* ---------- Dashboard approve ---------- */
  const tasks = $$('#tasks .task'), btn = $('#approveAll');
  tasks.forEach(t => t.addEventListener('click', () => { t.classList.toggle('done'); sync(); }));
  function sync() {
    const all = tasks.every(t => t.classList.contains('done'));
    btn.disabled = all;
    $('.btn-t', btn).textContent = all ? 'Усе передано в роботу' : 'Погодити й передати в роботу';
  }
  btn.addEventListener('click', () => {
    tasks.forEach((t, i) => setTimeout(() => { t.classList.add('done'); sync(); }, reduce ? 0 : i * 350));
  });

  /* ---------- Q&A demo (typing) ---------- */
  const QA = [
    { q: 'Як ідуть продажі в регіоні цього місяця?', a: 'Регіон виконує 87% плану — це на 6 п.п. нижче, ніж торік. Основна причина: дефіцит двох ключових товарів на складі. Пропоную перерозподілити запаси з сусіднього регіону.', s: 'Джерела: CRM · ERP · складський облік' },
    { q: 'Що обіцяли клієнту минулого разу?', a: 'На попередній зустрічі домовилися про оновлені умови поставки й окрему пропозицію для нових точок. Пропозиція ще не надіслана — це відкрите питання №1.', s: 'Джерела: листи · записи дзвінків · CRM' },
    { q: 'Де зависли замовлення?', a: 'Три замовлення заблоковані через помилки в маркуванні партій. Підготовлено виправлення — потрібне ваше погодження, щоб передати в роботу.', s: 'Джерела: ERP · документи відвантаження' }
  ];
  const qT = $('#qText'), aT = $('#aText'), sT = $('#aSrc');
  let typer = 0;
  function ask(i) {
    const { q, a, s } = QA[i];
    clearInterval(typer);
    $$('#chips .chip').forEach((c, k) => c.classList.toggle('active', k === i));
    qT.textContent = q; sT.textContent = ''; aT.textContent = '';
    if (reduce) { aT.textContent = a; sT.textContent = s; return; }
    let n = 0;
    typer = setInterval(() => {
      aT.textContent = a.slice(0, ++n);
      if (n >= a.length) { clearInterval(typer); sT.textContent = s; }
    }, 16);
  }
  $('#chips').addEventListener('click', e => { const c = e.target.closest('.chip'); if (c) ask(+c.dataset.q); });
  new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { ask(0); o.disconnect(); } }, { threshold: .4 }).observe($('#chips'));

  /* ---------- Dossier tabs ---------- */
  const DOS = [
    { n: 'Мережа магазинів «Приклад»', d: 'Sinaptic сам збирає інформацію про нього з відкритих джерел — ви приходите підготовленим.' },
    { n: 'Партнер, з яким уже працюємо', d: 'Історія, домовленості, пріоритети — усе в одному місці.' },
    { n: 'Ваш новий клієнт — від першого дня', d: 'Новий менеджер з першого дня отримує весь контекст, а не починає з нуля.' }
  ];
  const doc = $('.doc'), dd = $('#dDesc'), dh = $('h3', doc);
  function dossier(i) {
    $$('#dTabs .tab').forEach((t, k) => t.classList.toggle('active', k === i));
    doc.classList.add('swap');
    setTimeout(() => { dh.textContent = DOS[i].n; dd.textContent = DOS[i].d; doc.classList.remove('swap'); }, reduce ? 0 : 250);
  }
  dd.textContent = DOS[0].d;
  $('#dTabs').addEventListener('click', e => { const t = e.target.closest('.tab'); if (t) dossier(+t.dataset.d); });

  /* ---------- Industries ---------- */
  const IND = [
    { h: 'Мережа магазинів і закладів', m: 'Орієнтовно 6–10 тижнів для 3–10 точок, 2 систем і 3–5 типів відхилень',
      sc: ['Операційний контроль мережі', 'Контроль стандартів у точках', 'Запаси й доступність'],
      res: 'Центральна команда щоранку отримує короткий список проблем, їхній вплив, джерело та відповідального — замість десятків звітів.',
      ctl: 'Керівник визначає пріоритет. Платформа не змінює дані в робочих системах і не ставить задачі без погодженого правила.',
      kpi: ['Час огляду', 'Час до реакції', 'Закриті питання', 'Повторні відхилення', 'Точність сповіщень'] },
    { h: 'Сервісна мережа та філії', m: 'Орієнтовно 6–10 тижнів для 3–8 філій, 1–2 систем і одного процесу',
      sc: ['Єдиний контроль заявок', 'Контроль якості обслуговування', 'Помічник для працівників філій'],
      res: 'Керівники бачать прострочені, повторні та завислі звернення по всій мережі й розуміють, де саме процес втрачає час.',
      ctl: 'ШІ не закриває звернення й не змінює зобов’язання перед клієнтом без погодженого правила.',
      kpi: ['Час першої відповіді', 'Тривалість вирішення', 'Повторні звернення', 'Прострочені заявки', 'Навантаження філій'] },
    { h: 'Дистрибуція та виробництво', m: 'Орієнтовно 8–12 тижнів для одного процесу, 2–3 джерел і 20–40 правил',
      sc: ['Контроль поставок і відхилень', 'База корпоративних знань', 'Моніторинг законодавства й вимог', 'Управлінська звітність'],
      res: 'Команда швидше бачить затримки, неповні документи, суперечливі статуси й ризики для замовлень.',
      ctl: 'ШІ не змінює замовлення, графіки поставок або умови з контрагентами без рішення відповідального працівника.',
      kpi: ['Час огляду', 'Затримки', 'Повнота документів', 'Час до реакції', 'Закриті відхилення'] },
    { h: 'Послуги та консалтинг', m: 'Приклади: бухгалтерський консалтинг, б’юті-бізнес, HoReCa, будівництво й енергетика',
      sc: ['Підготовка до зустрічі з клієнтом', 'Корпоративна пам’ять команди', 'Контроль строків і домовленостей'],
      res: 'Менеджер приходить на кожну зустріч із досьє, а знання про клієнтів лишаються в компанії, коли змінюються люди.',
      ctl: 'Система діє лише в межах прав, які визначив власник, і з погодженням там, де воно потрібне.',
      kpi: ['Час підготовки', 'Виконання домовленостей', 'Час відповіді клієнту', 'Повторні звернення'] }
  ];
  const body = $('#iBody');
  function industry(i) {
    $$('#iTabs .tab').forEach((t, k) => t.classList.toggle('active', k === i));
    const x = IND[i];
    body.classList.add('swap');
    setTimeout(() => {
      body.innerHTML = `
        <h3>${x.h}</h3><div class="ind-meta mono">${x.m}</div>
        <div class="ind-cols">
          <div><span class="mono">СЦЕНАРІЇ</span><ul>${x.sc.map((s, k) => `<li${k === 0 ? ' class="rec"' : ''}>${s}</li>`).join('')}</ul></div>
          <div><span class="mono">ЩО ВИМІРЮЄМО</span><ul>${x.kpi.map(s => `<li>${s}</li>`).join('')}</ul></div>
        </div>
        <div class="ind-res"><span class="mono">РЕЗУЛЬТАТ</span>${x.res}</div>
        <div class="ind-res"><span class="mono">КОНТРОЛЬ</span>${x.ctl}</div>`;
      body.classList.remove('swap');
    }, reduce || !body.innerHTML ? 0 : 250);
  }
  $('#iTabs').addEventListener('click', e => { const t = e.target.closest('.tab'); if (t) industry(+t.dataset.t); });
  industry(0);

  /* ---------- Form (client-side demo) ---------- */
  const form = $('#form'), msg = $('#formMsg');
  form.addEventListener('submit', e => {
    e.preventDefault();
    let ok = true;
    $$('input[required]', form).forEach(i => { const bad = !i.value.trim(); i.classList.toggle('err', bad); if (bad) ok = false; });
    if (!ok) { msg.textContent = 'Заповніть ім’я та контакт.'; return; }
    msg.textContent = 'Дякуємо! Ми зв’яжемося з вами найближчим часом.';
    form.reset();
  });
})();

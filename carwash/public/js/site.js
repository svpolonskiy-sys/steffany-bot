'use strict';
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => new Intl.NumberFormat('uk-UA').format(n).replace(/ /g, ' ') + ' грн';
  const WD = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const WD_FULL = ['неділя', 'понеділок', 'вівторок', 'середа', 'четвер', "п'ятниця", 'субота'];
  const MON = ['січ', 'лют', 'бер', 'кві', 'тра', 'чер', 'лип', 'сер', 'вер', 'жов', 'лис', 'гру'];
  const MON_FULL = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
  const dparts = (iso) => { const [y, m, d] = iso.split('-').map(Number); return { y, m, d, wd: new Date(Date.UTC(y, m - 1, d)).getUTCDay() }; };
  const dateLong = (iso) => { const p = dparts(iso); return `${WD_FULL[p.wd]}, ${p.d} ${MON_FULL[p.m - 1]}`; };
  const dur = (min) => { const h = Math.floor(min / 60), m = min % 60; return (h ? `${h} год` : '') + (h && m ? ' ' : '') + (m ? `${m} хв` : ''); };
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* приватний режим */ } } };
  const api = async (url, opts) => {
    const r = await fetch(url, opts);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.error || 'Помилка запиту'); e.status = r.status; e.data = j; throw e; }
    return j;
  };
  let toastT;
  const toast = (msg) => { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2600); };

  const PARTS = [['all', 'Усе'], ['combo', 'Комплекси'], ['body', 'Кузов'], ['interior', 'Салон'], ['glass', 'Скло'], ['wheels', 'Колеса'], ['engine', 'Двигун'], ['trunk', 'Багажник'], ['doors', 'Двері та замки']];
  const TYPES = [
    ['car', 'Легкові', 'седан, хетчбек, універсал', 'i-car'],
    ['suv', 'Позашляховики', 'кросовер, паркетник, SUV', 'i-suv'],
    ['van', 'Мікроавтобуси', 'бус, мікроавтобус, автобус', 'i-van'],
  ];

  const S = { cat: null, tier: null, type: 'car', car: '', cart: new Map(), part: 'all', date: null, time: null, step: 1, days: [], slots: null, done: null };
  let cat;

  // ================= допоміжне =================
  const tierInfo = (id) => cat.tiers.find((t) => t.id === id);
  const svcById = (id) => cat.services.find((s) => s.id === id);
  const priceOf = (s, tier = S.tier) => (tier && s.prices[tier]) || null;
  function lines() {
    return [...S.cart].map(([id, qty]) => {
      const s = svcById(id); const p = priceOf(s); if (!p) return null;
      const q = s.unit ? qty : 1;
      return { s, qty: q, price: p.price * q, from: p.from, duration: s.duration * q };
    }).filter(Boolean);
  }
  function totals() {
    const l = lines(); const step = cat.settings.step;
    const raw = l.reduce((a, x) => a + x.duration, 0);
    return { total: l.reduce((a, x) => a + x.price, 0), from: l.some((x) => x.from), duration: raw ? Math.max(step, Math.ceil(raw / step) * step) : 0, count: l.length };
  }
  const servicesQuery = () => `services=${[...S.cart].map(([id, q]) => (svcById(id).unit ? `${id}x${q}` : id)).join(',')}&tier=${S.tier}`;
  const addMin = (hhmm, m) => { const [h, mm] = hhmm.split(':').map(Number); const t = h * 60 + mm + m; return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };

  // ================= крок 1: авто =================
  const allModels = () => Object.entries(cat.models).flatMap(([tier, list]) => list.map((name) => ({ name, tier })));
  const norm = (s) => s.toLowerCase().replace(/[^a-zа-яіїєґ0-9]+/gi, '');
  function renderTypes() {
    $('#types').innerHTML = TYPES.map(([id, label, sub, icon]) => `
      <button type="button" class="type" role="radio" aria-checked="${S.type === id}" data-type="${id}">
        <svg viewBox="0 0 64 28"><use href="#${icon}"/></svg><b>${label}</b><small>${sub}</small></button>`).join('');
    $('#tiers').innerHTML = cat.tiers.filter((t) => t.type === S.type).map((t) => {
      const ex = cat.models[t.id].slice(0, 4).join(', ');
      return `<button type="button" class="tier" role="radio" aria-checked="${S.tier === t.id}" data-tier="${t.id}">
        <span class="badge">${esc(t.label)}</span><span><b>${esc(t.title)}</b><small>${esc(ex)}…</small></span></button>`;
    }).join('');
  }
  function initFinder() {
    const input = $('#modelInput'); const list = $('#finderList'); let items = []; let idx = -1;
    const close = () => { list.hidden = true; idx = -1; };
    const pick = (it) => {
      S.tier = it.tier; S.type = tierInfo(it.tier).type; S.car = it.name; input.value = it.name; close();
      afterTierChange(); renderTypes(); sync();
    };
    const open = () => {
      const q = norm(input.value);
      if (!q) return close();
      items = allModels().filter((m) => norm(m.name).includes(q)).slice(0, 8);
      list.innerHTML = items.length
        ? items.map((m, i) => `<li role="option" data-i="${i}"><span>${esc(m.name)}</span><small>клас ${esc(tierInfo(m.tier).label)}</small></li>`).join('')
        : '<li class="none">Не знайшли в списку — оберіть клас нижче, а марку впишіть на останньому кроці</li>';
      list.hidden = false; idx = -1;
    };
    input.addEventListener('input', () => { S.car = input.value.trim(); open(); sync(); });
    input.addEventListener('keydown', (e) => {
      const lis = $$('li[data-i]', list);
      if (e.key === 'ArrowDown') { e.preventDefault(); idx = Math.min(lis.length - 1, idx + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); idx = Math.max(0, idx - 1); }
      else if (e.key === 'Enter' && idx >= 0) { e.preventDefault(); return pick(items[idx]); }
      else if (e.key === 'Escape') return close();
      else return;
      lis.forEach((li, i) => li.setAttribute('aria-selected', i === idx));
    });
    list.addEventListener('mousedown', (e) => { const li = e.target.closest('li[data-i]'); if (li) { e.preventDefault(); pick(items[+li.dataset.i]); } });
    input.addEventListener('blur', () => setTimeout(close, 120));
    $('#types').addEventListener('click', (e) => {
      const b = e.target.closest('[data-type]'); if (!b) return;
      S.type = b.dataset.type; if (S.tier && tierInfo(S.tier).type !== S.type) { S.tier = null; afterTierChange(); }
      renderTypes(); sync();
    });
    $('#tiers').addEventListener('click', (e) => {
      const b = e.target.closest('[data-tier]'); if (!b) return;
      S.tier = b.dataset.tier; afterTierChange(); renderTypes(); sync();
    });
  }
  function afterTierChange() {
    // послуги, недоступні для нового класу, прибираємо
    for (const id of [...S.cart.keys()]) if (!priceOf(svcById(id))) S.cart.delete(id);
    S.time = null; S.slots = null;
    renderPriceTiers(); renderPrice(); renderServices();
  }

  // ================= крок 2: послуги =================
  function renderParts() {
    const avail = cat.services.filter((s) => priceOf(s, S.tier || 'abc'));
    $('#parts').innerHTML = PARTS.map(([id, label]) => {
      const n = id === 'all' ? avail.length : avail.filter((s) => s.part === id).length;
      return n ? `<button type="button" class="part" role="tab" aria-selected="${S.part === id}" data-part="${id}">${label}<em>${n}</em></button>` : '';
    }).join('');
  }
  function priceHTML(s, qty = 1) {
    const p = priceOf(s); if (!p) return '<span class="na">—</span>';
    const total = p.price * qty;
    return `<b>${p.from ? 'від ' : ''}${money(total)}</b>${p.note ? `<small>${esc(p.note)}</small>` : ''}${s.unit && qty > 1 ? `<small>${money(p.price)} × ${qty}</small>` : ''}`;
  }
  function renderServices() {
    renderParts();
    const box = $('#svcList');
    if (!S.tier) { box.innerHTML = '<div class="empty-state">Спочатку оберіть клас автомобіля на кроці 1</div>'; return; }
    const list = cat.services.filter((s) => priceOf(s) && (S.part === 'all' || s.part === S.part));
    box.innerHTML = list.map((s) => {
      const on = S.cart.has(s.id); const qty = S.cart.get(s.id) || 1;
      return `<div class="svc ${on ? 'on' : ''}" data-id="${s.id}" role="checkbox" aria-checked="${on}" tabindex="0">
        <span class="tick"><svg><use href="#i-check"/></svg></span>
        <div><h4>${esc(s.name)}</h4>${s.description ? `<p>${esc(s.description)}</p>` : ''}
          <div class="meta"><span><svg class="ic"><use href="#i-clock"/></svg> ~${dur(s.duration * (s.unit ? qty : 1))}</span></div>
          ${s.unit && on ? `<div class="qty" data-qty="${s.id}"><button type="button" data-d="-1" aria-label="Менше"><svg class="ic"><use href="#i-minus"/></svg></button><span>${qty} шт.</span><button type="button" data-d="1" aria-label="Більше"><svg class="ic"><use href="#i-plus"/></svg></button></div>` : ''}
        </div>
        <div class="price">${priceHTML(s, s.unit ? qty : 1)}</div></div>`;
    }).join('') || '<div class="empty-state">Для цього класу немає послуг у розділі</div>';
  }
  function toggle(id, force) {
    const s = svcById(id);
    if (force === true || (force === undefined && !S.cart.has(id))) S.cart.set(id, S.cart.get(id) || 1); else S.cart.delete(id);
    S.time = null; S.slots = null;
    renderServices(); renderPrice(); sync();
    return S.cart.has(s.id);
  }
  function initServices() {
    $('#parts').addEventListener('click', (e) => { const b = e.target.closest('[data-part]'); if (b) { S.part = b.dataset.part; renderServices(); } });
    const box = $('#svcList');
    box.addEventListener('click', (e) => {
      const q = e.target.closest('[data-qty]');
      if (q) {
        const d = +e.target.closest('button')?.dataset.d; const id = q.dataset.qty;
        if (d) { S.cart.set(id, Math.max(1, Math.min(20, (S.cart.get(id) || 1) + d))); S.time = null; S.slots = null; renderServices(); sync(); }
        return;
      }
      const row = e.target.closest('.svc'); if (row) toggle(row.dataset.id);
    });
    box.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && e.target.classList.contains('svc')) { e.preventDefault(); toggle(e.target.dataset.id); } });
  }

  // ================= крок 3: час =================
  async function loadDays() {
    const box = $('#days'); box.innerHTML = Array.from({ length: 7 }, () => '<div class="skeleton" style="width:76px;height:84px;flex:none"></div>').join('');
    try { S.days = (await api(`/api/days?${servicesQuery()}`)).days; } catch (e) { box.innerHTML = `<div class="empty-state">${esc(e.message)}</div>`; return; }
    if (!S.date || !S.days.find((d) => d.date === S.date && d.open)) {
      const first = S.days.find((d) => d.free_slots); S.date = first ? first.date : null;
    }
    renderDays();
    await loadSlots();
  }
  function renderDays() {
    const today = S.days[0]?.date;
    $('#days').innerHTML = S.days.map((d) => {
      const p = dparts(d.date);
      const lbl = d.date === today ? 'сьогодні' : d.date === S.days[1]?.date ? 'завтра' : MON[p.m - 1];
      return `<button type="button" class="day ${d.level}" role="option" aria-selected="${S.date === d.date}" data-date="${d.date}" ${d.open ? '' : 'disabled'}>
        <small>${WD[p.wd]}</small><b>${p.d}</b><span>${d.open ? lbl : 'вихідний'}</span></button>`;
    }).join('');
    const sel = $('.day[aria-selected=true]'); if (sel) sel.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }
  async function loadSlots(silent) {
    const box = $('#slots'); if (!S.date) { box.innerHTML = '<div class="slots-empty">На найближчі дні вільних місць немає. Зателефонуйте нам — підкажемо варіанти.</div>'; return; }
    if (!silent) box.innerHTML = '<div class="slot-grid">' + '<div class="skeleton"></div>'.repeat(8) + '</div>';
    try { S.slots = await api(`/api/slots?date=${S.date}&${servicesQuery()}`); } catch (e) { box.innerHTML = `<div class="slots-empty">${esc(e.message)}</div>`; return; }
    if (S.time && !S.slots.slots.find((s) => s.time === S.time && s.available)) { S.time = null; if (silent) toast('Цей час щойно зайняли — оберіть інший'); }
    renderSlots(); sync();
  }
  function renderSlots() {
    const box = $('#slots'); const sl = S.slots;
    if (!sl.open || !sl.slots.length) { box.innerHTML = '<div class="slots-empty">На цей день запис закрито. Оберіть іншу дату.</div>'; return; }
    if (!sl.slots.some((s) => s.available)) { box.innerHTML = '<div class="slots-empty">На цей день усі місця зайняті. Оберіть іншу дату.</div>'; return; }
    const groups = [['Ранок', (m) => m < 720], ['День', (m) => m >= 720 && m < 1020], ['Вечір', (m) => m >= 1020]];
    let n = 0;
    box.innerHTML = groups.map(([title, test]) => {
      const part = sl.slots.filter((s) => !s.past && test(s.min)); if (!part.length) return '';
      return `<div class="slot-group"><h5>${title}</h5><div class="slot-grid">${part.map((s) => {
        const small = s.available ? `вільно ${s.free} з ${sl.posts}` : s.past ? 'минув' : 'зайнято';
        return `<button type="button" class="slot ${s.free === 1 ? 'few' : ''}" data-time="${s.time}" aria-pressed="${S.time === s.time}" ${s.available ? '' : 'disabled'} style="animation-delay:${Math.min(n++ * 18, 400)}ms"><b>${s.time}</b><small>${small}</small></button>`;
      }).join('')}</div></div>`;
    }).join('');
  }
  function initTime() {
    $('#days').addEventListener('click', (e) => {
      const b = e.target.closest('[data-date]'); if (!b || b.disabled) return;
      S.date = b.dataset.date; S.time = null; renderDays(); loadSlots(); sync();
    });
    $('#slots').addEventListener('click', (e) => {
      const b = e.target.closest('[data-time]'); if (!b || b.disabled) return;
      S.time = b.dataset.time; $$('.slot').forEach((x) => x.setAttribute('aria-pressed', x === b)); sync();
    });
    setInterval(() => { if (S.step === 3 && !document.hidden && S.date) loadSlots(true); }, 30000);
  }

  // ================= крок 4: контакти =================
  function maskPhone(v) {
    let d = v.replace(/\D/g, '');
    if (d.startsWith('380')) d = d.slice(2); else if (d.startsWith('38')) d = d.slice(2); else if (d.startsWith('8') && d.length > 1) d = d.slice(1);
    d = d.slice(0, 10);
    if (!d) return '';
    let o = '+38 (' + d.slice(0, 3);
    if (d.length >= 3) o += ') ' + d.slice(3, 6);
    if (d.length >= 6) o += '-' + d.slice(6, 8);
    if (d.length >= 8) o += '-' + d.slice(8, 10);
    return o;
  }
  function initForm() {
    const f = $('#form');
    f.phone.addEventListener('input', () => { f.phone.value = maskPhone(f.phone.value); });
    f.addEventListener('submit', (e) => { e.preventDefault(); submit(); });
    $$('input', f).forEach((i) => i.addEventListener('input', () => { i.classList.remove('bad'); const er = $(`[data-err=${i.name}]`); if (er) er.textContent = ''; }));
    f.name.value = store.get('vmu_name') || ''; f.phone.value = store.get('vmu_phone') || ''; f.car.value = store.get('vmu_car') || '';
  }
  function validate() {
    const f = $('#form'); const errs = {};
    if (f.name.value.trim().length < 2) errs.name = "Вкажіть ім'я";
    if (f.phone.value.replace(/\D/g, '').replace(/^38/, '').length !== 10) errs.phone = 'Вкажіть повний номер телефону';
    if (f.car.value.trim().length < 2) errs.car = 'Вкажіть марку авто';
    for (const k of ['name', 'phone', 'car']) { $(`[data-err=${k}]`).textContent = errs[k] || ''; f[k].classList.toggle('bad', !!errs[k]); }
    const first = Object.keys(errs)[0]; if (first) f[first].focus();
    return !Object.keys(errs).length;
  }
  async function submit() {
    if (!validate()) return;
    const f = $('#form'); const btn = $('#nextBtn'); const errBox = $('#formError');
    errBox.hidden = true; btn.disabled = true; const label = btn.innerHTML; btn.textContent = 'Відправляємо…';
    try {
      const r = await api('/api/bookings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: f.name.value, phone: f.phone.value, car: f.car.value, tier: S.tier, date: S.date, time: S.time, website: f.website.value,
          services: [...S.cart].map(([id, qty]) => ({ id, qty })),
        }),
      });
      store.set('vmu_name', f.name.value.trim()); store.set('vmu_phone', f.phone.value); store.set('vmu_car', f.car.value.trim());
      S.done = r.booking; showDone();
    } catch (e) {
      errBox.textContent = e.message; errBox.hidden = false;
      if (e.data?.code === 'slot_taken') { toast('Цей час щойно зайняли'); go(3); loadDays(); }
    } finally { btn.disabled = false; btn.innerHTML = label; sync(); }
  }
  function showDone() {
    const b = S.done;
    $$('.panel').forEach((p) => { p.hidden = p.dataset.panel !== '5'; });
    $('#wizNav').hidden = true; $('#stepper').hidden = true; $('.stepper-bar').hidden = true;
    $('#doneText').textContent = `${b.name}, ми чекаємо на вас ${dateLong(b.date)} о ${b.time}. Менеджер зателефонує за потреби підтвердити деталі.`;
    $('#ticket').innerHTML = `<div class="code">${esc(b.code)}</div><dl>
      <div><dt>Дата</dt><dd>${esc(dateLong(b.date))}</dd></div><div><dt>Час</dt><dd>${b.time}–${b.end}</dd></div>
      <div><dt>Авто</dt><dd>${esc(b.car)}</dd></div><div><dt>Телефон</dt><dd>${esc(b.phone)}</dd></div>
      <div><dt>Послуги</dt><dd>${b.services.map((s) => esc(s.name)).join(', ')}</dd></div>
      <div><dt>Разом</dt><dd>${b.total_from ? 'від ' : ''}${money(b.total)}</dd></div>
      <div><dt>Адреса</dt><dd>пр. Миру, 22а, Богунський міст</dd></div></dl>`;
    $('#wizard').classList.add('finished'); confetti(); $('#book').scrollIntoView({ behavior: 'smooth' });
  }
  function confetti() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const colors = ['#e8262e', '#ffb81c', '#2ecc8f', '#fff', '#4aa8ff'];
    for (let i = 0; i < 70; i++) {
      const c = document.createElement('i'); c.className = 'confetti';
      c.style.cssText = `left:${Math.random() * 100}vw;background:${colors[i % 5]};--dx:${(Math.random() - .5) * 300}px;--rot:${Math.random() * 900}deg;animation-duration:${1.8 + Math.random() * 1.8}s;animation-delay:${Math.random() * .4}s;border-radius:${Math.random() > .5 ? '50%' : '2px'}`;
      document.body.appendChild(c); setTimeout(() => c.remove(), 4500);
    }
  }
  function ics() {
    const b = S.done; const p = (d, t) => d.replace(/-/g, '') + 'T' + t.replace(':', '') + '00';
    const text = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//VMU Wash//UA', 'BEGIN:VEVENT', `UID:${b.code}@vmu-wash`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
      `DTSTART;TZID=Europe/Kyiv:${p(b.date, b.time)}`, `DTEND;TZID=Europe/Kyiv:${p(b.date, b.end)}`, 'SUMMARY:Мийка авто — VMU Wash&Wheel',
      `DESCRIPTION:${b.services.map((s) => s.name).join(', ')}. Код запису ${b.code}. Тел. (063) 200-77-66`, 'LOCATION:Житомир\\, пр. Миру\\, 22а', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/calendar' })); a.download = `vmu-${b.code}.ics`; a.click(); URL.revokeObjectURL(a.href);
  }

  // ================= навігація по кроках =================
  function valid(step) {
    if (step === 1) return !!S.tier;
    if (step === 2) return totals().count > 0;
    if (step === 3) return !!(S.date && S.time);
    return true;
  }
  function go(n) {
    S.step = n;
    $$('.panel').forEach((p) => { p.hidden = p.dataset.panel !== String(n); });
    if (n === 2) renderServices();
    if (n === 3) loadDays();
    if (n === 4) { const f = $('#form'); if (!f.car.value && S.car) f.car.value = S.car; }
    sync();
    const top = $('#stepper').getBoundingClientRect().top + scrollY - 90; if (scrollY > top + 200 || scrollY < top - 400) scrollTo({ top, behavior: 'smooth' });
  }
  function sync() {
    $$('#stepper li').forEach((li) => { const n = +li.dataset.step; li.classList.toggle('active', n === S.step); li.classList.toggle('done', n < S.step); });
    $('#stepBar').style.width = `${S.step * 25}%`;
    $('#backBtn').style.visibility = S.step === 1 ? 'hidden' : 'visible';
    const next = $('#nextBtn');
    next.disabled = !valid(S.step);
    if (!next.dataset.busy) next.innerHTML = S.step === 4 ? 'Підтвердити запис <svg class="ic"><use href="#i-check"/></svg>' : 'Далі <svg class="ic"><use href="#i-arrow"/></svg>';
    // підсумок
    const t = totals();
    $('#sumCar').textContent = S.tier ? `${S.car || tierInfo(S.tier).title} · ${tierInfo(S.tier).label}` : 'не обрано';
    $('#sumWhen').textContent = S.date && S.time ? `${dparts(S.date).d} ${MON[dparts(S.date).m - 1]}, ${S.time}–${addMin(S.time, t.duration)}` : 'не обрано';
    $('#sumList').innerHTML = t.count ? lines().map((l) => `<li><span>${esc(l.s.name)}${l.qty > 1 ? ` × ${l.qty}` : ''}</span><span>${l.from ? 'від ' : ''}${money(l.price)}</span></li>`).join('') : '<li class="empty">Додайте послуги на кроці 2</li>';
    $('#sumDur').textContent = t.duration ? '~' + dur(t.duration) : '—';
    const totEl = $('#sumTotal'); const txt = t.count ? `${t.from ? 'від ' : ''}${money(t.total)}` : '0 грн';
    if (totEl.textContent !== txt) { totEl.textContent = txt; totEl.classList.remove('bump'); void totEl.offsetWidth; totEl.classList.add('bump'); }
    $('#sumNote').hidden = !t.from;
    $('#durHint').textContent = t.duration ? `Ваш запис займе близько ${dur(t.duration)}. Показано лише ті вікна, де вистачає часу. Вільні місця оновлюються в реальному часі.` : '';
  }
  function initWizard() {
    $('#nextBtn').addEventListener('click', () => { if (!valid(S.step)) return; if (S.step === 4) $('#form').requestSubmit(); else go(S.step + 1); });
    $('#backBtn').addEventListener('click', () => go(S.step - 1));
    $('#stepper').addEventListener('click', (e) => { const li = e.target.closest('li'); if (li && +li.dataset.step < S.step) go(+li.dataset.step); });
    $('#icsBtn').addEventListener('click', ics);
    $('#callBtn').href = 'tel:+380632007766';
    $('#againBtn').addEventListener('click', () => {
      S.cart.clear(); S.date = null; S.time = null; S.slots = null; S.done = null; S.step = 1; S.part = 'all';
      $('#wizard').classList.remove('finished'); $('#wizNav').hidden = false; $('#stepper').hidden = false; $('.stepper-bar').hidden = false;
      renderServices(); renderPrice(); go(1);
    });
  }

  // ================= прайс =================
  function renderPriceTiers() {
    const cur = S.tier || S.priceTier || 'abc';
    $('#priceTiers').innerHTML = cat.tiers.map((t) => `<button type="button" class="ptier" role="tab" aria-selected="${cur === t.id}" data-tier="${t.id}" title="${esc(t.title)}">${esc(t.label)}<small>${esc(t.type === 'car' ? 'легкові' : t.type === 'suv' ? 'SUV' : 'буси')}</small></button>`).join('');
  }
  function renderPrice() {
    const tier = S.tier || S.priceTier || 'abc'; const q = norm($('#priceSearch').value || '');
    const groups = new Map();
    for (const s of cat.services) {
      if (q && !norm(s.name + s.description).includes(q)) continue;
      if (!groups.has(s.category)) groups.set(s.category, []);
      groups.get(s.category).push(s);
    }
    $('#priceGroups').innerHTML = [...groups].map(([name, list]) => `<div class="price-group"><h3>${esc(name)}</h3>${list.map((s) => {
      const p = s.prices[tier]; const on = S.cart.has(s.id);
      return `<div class="prow"><div class="nm"><b>${esc(s.name)}</b>${s.description ? `<small>${esc(s.description)}</small>` : ''}</div>
        <div class="pr">${p ? `${p.from ? 'від ' : ''}${money(p.price)}${p.note ? `<small>${esc(p.note)}</small>` : ''}` : '<span class="na">—</span>'}</div>
        ${p ? `<button type="button" class="add ${on ? 'on' : ''}" data-add="${s.id}" aria-label="${on ? 'Прибрати з запису' : 'Додати до запису'}: ${esc(s.name)}"><svg class="ic"><use href="#${on ? 'i-check' : 'i-plus'}"/></svg></button>` : '<span></span>'}</div>`;
    }).join('')}</div>`).join('') || '<div class="empty-state">Нічого не знайдено</div>';
  }
  function initPrice() {
    $('#priceTiers').addEventListener('click', (e) => {
      const b = e.target.closest('[data-tier]'); if (!b) return;
      if (S.tier) { S.tier = b.dataset.tier; S.type = tierInfo(S.tier).type; afterTierChange(); renderTypes(); sync(); } else { S.priceTier = b.dataset.tier; renderPriceTiers(); renderPrice(); }
    });
    $('#priceSearch').addEventListener('input', renderPrice);
    $('#priceGroups').addEventListener('click', (e) => {
      const b = e.target.closest('[data-add]'); if (!b) return;
      if (!S.tier) { S.tier = S.priceTier || 'abc'; S.type = tierInfo(S.tier).type; renderTypes(); renderPriceTiers(); }
      const on = toggle(b.dataset.add);
      toast(on ? 'Додано до запису ✓ — перейдіть до «Запис онлайн»' : 'Прибрано із запису');
      if (on && S.step === 1) { S.step = 2; go(2); }
    });
    $('#legendCards').innerHTML = Object.entries(cat.legend).map(([k, v]) => `<div><b>${esc(k)}</b><p>${esc(v)}</p></div>`).join('');
  }

  // ================= галерея =================
  function initGallery() {
    const imgs = Array.from({ length: 12 }, (_, i) => `/img/moika_${String(i).padStart(2, '0')}.webp`);
    $('#galleryGrid').innerHTML = imgs.map((src, i) => `<button type="button" class="g-item reveal" data-i="${i}" aria-label="Відкрити фото ${i + 1}"><img loading="lazy" src="${src}" alt="Фото автомиючого комплексу VMU, ${i + 1}"></button>`).join('');
    const lb = $('#lightbox'); const im = $('img', lb); let cur = 0;
    const show = (i) => { cur = (i + imgs.length) % imgs.length; im.src = imgs[cur]; };
    $('#galleryGrid').addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (!b) return; show(+b.dataset.i); lb.hidden = false; document.body.style.overflow = 'hidden'; });
    const close = () => { lb.hidden = true; document.body.style.overflow = ''; };
    lb.addEventListener('click', (e) => { if (e.target === lb || e.target.closest('.lb-close')) close(); if (e.target.closest('.prev')) show(cur - 1); if (e.target.closest('.next')) show(cur + 1); });
    addEventListener('keydown', (e) => { if (lb.hidden) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') show(cur - 1); if (e.key === 'ArrowRight') show(cur + 1); });
  }

  // ================= живий блок "найближчий час" =================
  async function initLive() {
    try {
      const { days } = await api('/api/days?duration=30');
      const day = days.find((d) => d.free_slots); if (!day) throw new Error('none');
      const sl = await api(`/api/slots?date=${day.date}&duration=30`);
      const first = sl.slots.find((s) => s.available);
      const when = day.date === days[0].date ? 'сьогодні' : day.date === days[1]?.date ? 'завтра' : dateLong(day.date);
      $('#liveNum').textContent = first.time;
      $('#liveSub').textContent = `найближчий вільний час — ${when}. Вільно ${first.free} з ${sl.posts} постів`;
      $('#livePosts').innerHTML = Array.from({ length: sl.posts }, (_, i) => `<i class="${i < first.free ? 'free' : 'busy'}"></i>`).join('');
    } catch {
      $('#liveNum').textContent = '—'; $('#liveSub').textContent = 'зателефонуйте нам: (063) 200-77-66';
    }
  }

  // ================= візуальні ефекти =================
  function effects() {
    const hdr = $('.site-header');
    const bg = $('[data-parallax]'); let ticking = false;
    const onScroll = () => {
      hdr.classList.toggle('scrolled', scrollY > 30);
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches && scrollY < innerHeight) bg.style.transform = `translate3d(0,${scrollY * 0.25}px,0)`;
      ticking = false;
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true }); onScroll();
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12, rootMargin: '0px 0px -40px' });
    const observe = () => $$('.reveal:not(.in)').forEach((el) => io.observe(el));
    observe(); setTimeout(observe, 300);
    const bub = $('#bubbles');
    for (let i = 0; i < 18; i++) {
      const b = document.createElement('i'); const s = 8 + Math.random() * 40;
      b.style.cssText = `left:${Math.random() * 100}%;width:${s}px;height:${s}px;animation-duration:${14 + Math.random() * 18}s;animation-delay:-${Math.random() * 20}s;--dx:${(Math.random() - .5) * 120}px;opacity:${.25 + Math.random() * .5}`;
      bub.appendChild(b);
    }
    const burger = $('#burger'); const nav = $('#nav');
    burger.addEventListener('click', () => { const o = nav.classList.toggle('open'); burger.setAttribute('aria-expanded', o); });
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) { nav.classList.remove('open'); burger.setAttribute('aria-expanded', false); } });
    const mb = $('#mobileBar'); const seen = new Set();
    const watch = (el, threshold) => new IntersectionObserver((es) => { es.forEach((e) => (e.isIntersecting ? seen.add(el.id) : seen.delete(el.id))); mb.classList.toggle('hide', seen.size > 0); }, { threshold }).observe(el);
    watch($('#book'), 0); watch($('#hero'), 0.4);
  }

  // ================= старт =================
  async function init() {
    initGallery(); effects();
    try { cat = await api('/api/catalog'); } catch { $('#book .wizard').innerHTML = '<div class="empty-state">Не вдалося завантажити дані. Зателефонуйте нам: (063) 200-77-66</div>'; return; }
    const names = [...new Set(cat.services.map((s) => s.name))];
    $('#marquee').innerHTML = [0, 1].map(() => names.map((n) => `<span>${esc(n)}</span>`).join('')).join('');
    $('#hours').textContent = `Онлайн-запис: щодня з ${cat.settings.open} до ${cat.settings.close}.`;
    renderTypes(); initFinder(); initServices(); initTime(); initForm(); initWizard(); renderPriceTiers(); renderPrice(); initPrice(); sync(); initLive();
    $$('.reveal:not(.in)').forEach((el) => { const r = el.getBoundingClientRect(); if (r.top < innerHeight) el.classList.add('in'); });
  }
  init();
})();

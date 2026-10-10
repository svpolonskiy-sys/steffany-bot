'use strict';
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => new Intl.NumberFormat('uk-UA').format(n).replace(/ /g, ' ') + ' грн';
  const WD = ['неділя', 'понеділок', 'вівторок', 'середа', 'четвер', "п'ятниця", 'субота'];
  const WD_S = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const MON = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
  const STATUS = { new: 'Нова', confirmed: 'Підтверджено', in_progress: 'В роботі', done: 'Виконано', cancelled: 'Скасовано', no_show: 'Не приїхав' };
  const NEXT = { new: ['confirmed', 'Підтвердити', 'blue'], confirmed: ['in_progress', 'В роботу', 'amber'], in_progress: ['done', 'Виконано', 'ok'] };
  const dp = (iso) => { const [y, m, d] = iso.split('-').map(Number); return { y, m, d, wd: new Date(Date.UTC(y, m - 1, d)).getUTCDay() }; };
  const addDays = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
  const dlong = (iso) => { const p = dp(iso); return `${WD[p.wd]}, ${p.d} ${MON[p.m - 1]}`; };
  const dur = (min) => { const h = Math.floor(min / 60), m = min % 60; return (h ? `${h} год` : '') + (h && m ? ' ' : '') + (m ? `${m} хв` : ''); };
  const hmToMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  const minToHm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* ігноруємо */ } } };

  let toastT;
  function toast(msg, err) { const t = $('#toast'); t.textContent = msg; t.className = 'toast' + (err ? ' err' : ''); t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 3000); }
  async function api(url, opts = {}) {
    const r = await fetch('/crm/api' + url, { ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) }, body: opts.body && typeof opts.body !== 'string' ? JSON.stringify(opts.body) : opts.body });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) { showLogin(); throw new Error('Потрібен вхід'); }
    if (!r.ok) { const e = new Error(j.error || 'Помилка'); e.data = j; throw e; }
    return j;
  }

  const S = { tab: 'today', range: 'today', now: null, settings: null, lastId: null, bookings: [], fresh: new Set(), services: null, tiers: null, boardDate: null, newCount: 0, timer: null };

  // ---------- вхід ----------
  function showLogin() { $('#app').hidden = true; $('#login').hidden = false; clearInterval(S.timer); setTimeout(() => $('#pw').focus(), 50); }
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault(); $('#loginErr').textContent = '';
    try { await fetch('/crm/api/login', { method: 'POST', body: JSON.stringify({ password: $('#pw').value }) }).then(async (r) => { if (!r.ok) throw new Error((await r.json()).error); }); $('#pw').value = ''; boot(); } catch (err) { $('#loginErr').textContent = err.message; }
  });
  $('#logout').addEventListener('click', async () => { await fetch('/crm/api/logout', { method: 'POST' }); showLogin(); });

  async function boot() {
    try {
      const me = await api('/me');
      S.now = me.now; S.settings = me.settings;
    } catch { return; }
    $('#login').hidden = true; $('#app').hidden = false;
    $('#soundOn').checked = store.get('crm_sound') === '1';
    S.boardDate = S.now.date;
    await switchTab(S.tab);
    clearInterval(S.timer); S.timer = setInterval(poll, 12000);
  }

  // ---------- вкладки ----------
  const TITLES = { today: 'Записи', board: 'Завантаження постів', clients: 'Клієнти', prices: 'Прайс і тривалість', settings: 'Налаштування' };
  async function switchTab(tab) {
    S.tab = tab;
    $$('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    $$('[data-view]').forEach((v) => { v.hidden = v.dataset.view !== tab; });
    $('#title').textContent = TITLES[tab];
    if (tab === 'today') await loadList();
    if (tab === 'board') await loadBoard();
    if (tab === 'clients') await loadClients();
    if (tab === 'prices') await loadPrices();
    if (tab === 'settings') renderSettings();
    scrollTo(0, 0);
  }
  $('#tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) switchTab(b.dataset.tab); });

  // ---------- опитування: нові записи ----------
  let audioCtx;
  function beep() {
    if (store.get('crm_sound') !== '1') return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      [660, 880].forEach((f, i) => { const o = audioCtx.createOscillator(); const g = audioCtx.createGain(); o.frequency.value = f; o.connect(g); g.connect(audioCtx.destination); g.gain.setValueAtTime(.15, audioCtx.currentTime + i * .18); g.gain.exponentialRampToValueAtTime(.001, audioCtx.currentTime + i * .18 + .16); o.start(audioCtx.currentTime + i * .18); o.stop(audioCtx.currentTime + i * .18 + .17); });
    } catch { /* без звуку */ }
  }
  $('#soundOn').addEventListener('change', (e) => { store.set('crm_sound', e.target.checked ? '1' : '0'); if (e.target.checked) beep(); });
  async function poll() {
    if (document.hidden && S.lastId !== null) { /* у фоні теж перевіряємо, але рідше навантажуємо */ }
    try {
      const s = await api('/summary'); S.now = s.now; $('#liveDot').classList.remove('off');
      setBadge(s.new_count);
      if (S.lastId !== null && s.last_id > S.lastId) {
        const fresh = await api('/bookings?from=' + s.now.date + '&status=new&order=desc&limit=20');
        fresh.bookings.filter((b) => b.id > S.lastId).forEach((b) => S.fresh.add(b.id));
        toast(`Новий запис! ${fresh.bookings[0] ? fresh.bookings[0].name + ' · ' + fresh.bookings[0].car : ''}`); beep();
      }
      const changed = S.lastId !== null && s.last_id !== S.lastId; S.lastId = s.last_id;
      if (S.tab === 'today') { renderStats(s); if (changed || !document.querySelector('dialog[open]')) loadList(true); }
      if (S.tab === 'board' && !document.querySelector('dialog[open]')) loadBoard(true);
    } catch { $('#liveDot').classList.add('off'); }
  }
  function setBadge(n) {
    S.newCount = n; const b = $('#newBadge'); b.hidden = !n; b.textContent = n;
    document.title = (n ? `(${n}) ` : '') + 'CRM · VMU Wash&Wheel';
  }

  // ---------- список записів ----------
  function rangeParams() {
    const t = S.now.date;
    switch (S.range) {
      case 'today': return `from=${t}&to=${t}`;
      case 'tomorrow': return `from=${addDays(t, 1)}&to=${addDays(t, 1)}`;
      case 'week': return `from=${t}&to=${addDays(t, 6)}`;
      case 'upcoming': return `from=${t}&status=new,confirmed,in_progress`;
      case 'past': return `to=${addDays(t, -1)}&order=desc`;
      default: return 'order=desc';
    }
  }
  function renderStats(s) {
    $('#stats').innerHTML = `
      <div class="stat ${s.new_count ? 'alert' : ''}"><small>Нові (чекають підтвердження)</small><b>${s.new_count}</b></div>
      <div class="stat"><small>Сьогодні записів</small><b>${s.today}</b></div>
      <div class="stat"><small>Виконано сьогодні</small><b>${s.today_done}</b></div>
      <div class="stat"><small>Сума на сьогодні</small><b>${money(s.today_revenue)}</b></div>
      <div class="stat"><small>Завтра</small><b>${s.tomorrow}</b></div>`;
  }
  async function loadList(quiet) {
    const q = $('#search').value.trim(); const st = $('#statusFilter').value;
    let params = rangeParams();
    if (st) params = params.replace(/&?status=[^&]*/, '') + '&status=' + st;
    if (q) params += '&q=' + encodeURIComponent(q);
    try {
      const [r, s] = await Promise.all([api('/bookings?' + params + '&limit=400'), api('/summary')]);
      S.bookings = r.bookings; S.now = s.now; if (S.lastId === null) S.lastId = s.last_id;
      renderStats(s); setBadge(s.new_count); renderList();
    } catch (e) { if (!quiet) toast(e.message, true); }
  }
  function bookingCard(b) {
    const next = NEXT[b.status];
    const svc = b.services.map((s) => esc(s.name) + (s.qty > 1 ? ` ×${s.qty}` : '')).join(', ');
    return `<article class="bk ${S.fresh.has(b.id) ? 'fresh' : ''}" data-id="${b.id}" data-st="${b.status}" tabindex="0">
      <div class="tm">${b.time}<small>до ${b.end} · ${dur(b.duration)}</small></div>
      <div>
        <h3>${esc(b.name)} <span class="car">· ${esc(b.car)}</span> <span class="src">${b.source === 'site' ? 'сайт' : 'менеджер'}</span></h3>
        <div class="svc">${svc}</div>
        <a class="phone" href="tel:${esc(b.phone)}" data-stop>📞 ${esc(b.phone)}</a>
      </div>
      <div class="side-r"><div><div class="sum">${b.total_from ? 'від ' : ''}${money(b.total)}</div><span class="pill">${STATUS[b.status]}</span></div>
        <div class="acts">${next ? `<button class="btn sm ${next[2]}" data-act="${next[0]}" data-stop>${next[1]}</button>` : ''}</div></div>
    </article>`;
  }
  function renderList() {
    const box = $('#list');
    if (!S.bookings.length) { box.innerHTML = '<div class="empty">Записів немає</div>'; return; }
    let html = ''; let cur = '';
    const showDays = !['today', 'tomorrow'].includes(S.range) || $('#search').value;
    for (const b of S.bookings) {
      if (showDays && b.date !== cur) { cur = b.date; html += `<div class="day-h">${b.date === S.now.date ? 'Сьогодні · ' : ''}${dlong(b.date)}</div>`; }
      html += bookingCard(b);
    }
    box.innerHTML = html;
    setTimeout(() => S.fresh.clear(), 2500);
  }
  $('#list').addEventListener('click', async (e) => {
    const card = e.target.closest('.bk'); if (!card) return;
    const id = +card.dataset.id;
    const act = e.target.closest('[data-act]');
    if (act) { e.stopPropagation(); try { await api('/bookings/' + id, { method: 'PATCH', body: { status: act.dataset.act } }); toast('Статус оновлено'); loadList(true); } catch (err) { toast(err.message, true); } return; }
    if (e.target.closest('[data-stop]')) return;
    openBooking(S.bookings.find((b) => b.id === id));
  });
  $('#list').addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.classList.contains('bk')) openBooking(S.bookings.find((b) => b.id === +e.target.dataset.id)); });
  $('#range').addEventListener('click', (e) => { const b = e.target.closest('[data-r]'); if (!b) return; S.range = b.dataset.r; $$('#range button').forEach((x) => x.classList.toggle('on', x === b)); loadList(); });
  $('#statusFilter').addEventListener('change', () => loadList());
  let st; $('#search').addEventListener('input', () => { clearTimeout(st); st = setTimeout(() => loadList(), 250); });
  $('#addBtn').addEventListener('click', () => openForm(null));

  // ---------- модалка запису: перегляд ----------
  const modal = $('#modal');
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });
  function openBooking(b) {
    if (!b) return;
    modal.innerHTML = `<div class="m-wrap" data-st="${b.status}">
      <div class="m-head"><div><h2>${esc(b.name)}</h2><span class="pill">${STATUS[b.status]}</span> <span class="src">${esc(b.code)}</span></div><button class="m-x" data-close aria-label="Закрити">×</button></div>
      <div class="m-body">
        <a class="big-call" href="tel:${esc(b.phone)}">📞 ${esc(b.phone)}</a>
        <dl class="kv">
          <dt>Коли</dt><dd>${dlong(b.date)}, ${b.time}–${b.end} (${dur(b.duration)})</dd>
          <dt>Авто</dt><dd>${esc(b.car)} · клас ${esc(b.tier.toUpperCase())}</dd>
          <dt>Послуги</dt><dd>${b.services.map((s) => `${esc(s.name)}${s.qty > 1 ? ` ×${s.qty}` : ''} — ${s.from ? 'від ' : ''}${money(s.price)}${s.note ? ` <small class="muted">(${esc(s.note)})</small>` : ''}`).join('<br>')}</dd>
          <dt>Разом</dt><dd>${b.total_from ? 'від ' : ''}${money(b.total)}</dd>
          <dt>Створено</dt><dd>${esc(b.created_at)} UTC · ${b.source === 'site' ? 'із сайту' : 'менеджером'}</dd>
        </dl>
        <label>Нотатка менеджера<textarea id="mNote" placeholder="Коментар, домовленості з клієнтом…">${esc(b.manager_note)}</textarea></label>
        <label>Статус<select id="mStatus">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${k === b.status ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      </div>
      <div class="m-foot"><div class="acts"><button class="btn danger sm" data-del>Видалити</button><button class="btn sm" data-edit>Змінити запис</button></div><button class="btn primary" data-save>Зберегти</button></div></div>`;
    modal.showModal();
    modal.onclick = async (e) => {
      if (e.target === modal || e.target.closest('[data-close]')) return modal.close();
      if (e.target.closest('[data-edit]')) return openForm(b);
      if (e.target.closest('[data-del]')) { if (!confirm('Видалити запис остаточно? Краще змінити статус на «Скасовано».')) return; try { await api('/bookings/' + b.id, { method: 'DELETE' }); modal.close(); toast('Видалено'); refresh(); } catch (err) { toast(err.message, true); } return; }
      if (e.target.closest('[data-save]')) {
        try { await api('/bookings/' + b.id, { method: 'PATCH', body: { status: $('#mStatus').value, manager_note: $('#mNote').value } }); modal.close(); toast('Збережено'); refresh(); } catch (err) { toast(err.message, true); }
      }
    };
  }
  const refresh = () => { if (S.tab === 'today') loadList(true); else if (S.tab === 'board') loadBoard(true); else if (S.tab === 'clients') loadClients(); };

  // ---------- модалка запису: створення / редагування ----------
  async function ensureServices() {
    if (!S.services) { const r = await api('/services'); S.services = r.services; S.tiers = r.tiers; }
  }
  async function openForm(b) {
    await ensureServices();
    const st = S.settings;
    const f = { name: b?.name || '', phone: b?.phone || '', car: b?.car || '', tier: b?.tier || 'abc', date: b?.date || S.now.date, time: b?.time || '', status: b?.status || 'confirmed' };
    const cart = new Map((b?.services || []).map((s) => [s.id, s.qty || 1]));
    const catGroups = [...new Set(S.services.map((s) => s.category))];
    modal.innerHTML = `<form class="m-wrap" id="bf" novalidate>
      <div class="m-head"><h2>${b ? 'Змінити запис' : 'Новий запис'}</h2><button type="button" class="m-x" data-close aria-label="Закрити">×</button></div>
      <div class="m-body">
        <div class="row3"><label>Ім'я<input name="name" value="${esc(f.name)}" required maxlength="60"></label>
          <label>Телефон<input name="phone" value="${esc(f.phone)}" inputmode="tel" placeholder="+380…" required></label>
          <label>Марка авто<input name="car" value="${esc(f.car)}" required maxlength="40"></label></div>
        <label>Клас авто<select name="tier">${S.tiers.map((t) => `<option value="${t.id}" ${t.id === f.tier ? 'selected' : ''}>${esc(t.label)} — ${esc(t.title)}</option>`).join('')}</select></label>
        <div><b>Послуги</b><div class="svc-pick" id="svcPick"></div></div>
        <div class="row2"><label>Дата<input type="date" name="date" value="${f.date}" required></label>
          <label>Статус<select name="status">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${k === f.status ? 'selected' : ''}>${v}</option>`).join('')}</select></label></div>
        <div><b>Час</b> <span class="muted" id="durInfo"></span><div class="slotpick" id="slotPick"></div></div>
        <label class="force" hidden style="display:flex;gap:8px;align-items:center;font-weight:500"><input type="checkbox" name="force"> Поставити всупереч зайнятості постів / поза робочим часом</label>
        <div class="warn" id="formWarn" hidden></div>
      </div>
      <div class="m-foot"><button type="button" class="btn" data-close>Скасувати</button><button type="submit" class="btn primary">${b ? 'Зберегти' : 'Створити запис'}</button></div></form>`;
    const form = $('#bf'); let time = f.time;
    const tier = () => form.tier.value;
    const renderPick = () => {
      let html = '';
      for (const c of catGroups) {
        const list = S.services.filter((s) => s.category === c && s.active && s.prices[tier()]);
        if (!list.length) continue;
        html += `<div class="cat">${esc(c)}</div>` + list.map((s) => `<label><input type="checkbox" data-id="${s.id}" ${cart.has(s.id) ? 'checked' : ''}><span>${esc(s.name)}${s.description ? ` <small class="muted">${esc(s.description)}</small>` : ''}</span>${s.unit ? `<input type="number" min="1" max="20" value="${cart.get(s.id) || 1}" data-qty="${s.id}" ${cart.has(s.id) ? '' : 'disabled'}>` : ''}<em>${s.prices[tier()].from ? 'від ' : ''}${money(s.prices[tier()].price)}</em></label>`).join('');
      }
      $('#svcPick').innerHTML = html;
    };
    const duration = () => {
      let raw = 0; for (const [id, q] of cart) { const s = S.services.find((x) => x.id === id); if (s) raw += s.duration * (s.unit ? q : 1); }
      return raw ? Math.max(st.step, Math.ceil(raw / st.step) * st.step) : 0;
    };
    const loadSlots = async () => {
      const d = duration(); $('#durInfo').textContent = d ? `· ~${dur(d)}` : '· оберіть послуги';
      if (!d || !form.date.value) { $('#slotPick').innerHTML = ''; return; }
      try {
        const r = await api(`/slots?date=${form.date.value}&duration=${d}&ignore=${b?.id || 0}`);
        $('#slotPick').innerHTML = r.slots.map((s) => `<button type="button" data-t="${s.time}" class="${s.time === time ? 'on' : ''}" ${s.free ? '' : 'disabled'} title="вільно ${s.free} з ${r.posts}">${s.time}${s.free && s.free < r.posts ? ` <small>(${s.free})</small>` : ''}</button>`).join('') || '<span class="muted">День недоступний</span>';
        $('.force', form).hidden = false;
      } catch (e) { $('#slotPick').innerHTML = `<span class="muted">${esc(e.message)}</span>`; }
    };
    renderPick(); loadSlots();
    form.tier.addEventListener('change', () => { for (const id of [...cart.keys()]) if (!S.services.find((s) => s.id === id)?.prices[tier()]) cart.delete(id); renderPick(); loadSlots(); });
    form.date.addEventListener('change', () => { time = ''; loadSlots(); });
    $('#svcPick').addEventListener('change', (e) => {
      const id = e.target.dataset.id; const q = e.target.dataset.qty;
      if (id) { if (e.target.checked) cart.set(id, +($(`[data-qty="${id}"]`)?.value) || 1); else cart.delete(id); const n = $(`[data-qty="${id}"]`); if (n) n.disabled = !e.target.checked; }
      if (q) cart.set(q, Math.max(1, Math.min(20, +e.target.value || 1)));
      time = ''; loadSlots();
    });
    $('#slotPick').addEventListener('click', (e) => { const t = e.target.closest('[data-t]'); if (!t) return; time = t.dataset.t; $$('#slotPick button').forEach((x) => x.classList.toggle('on', x === t)); });
    form.onclick = (e) => { if (e.target.closest('[data-close]')) modal.close(); };
    form.onsubmit = async (e) => {
      e.preventDefault(); const warn = $('#formWarn'); warn.hidden = true;
      const body = { name: form.name.value, phone: form.phone.value, car: form.car.value, tier: tier(), date: form.date.value, time, status: form.status.value, services: [...cart].map(([id, qty]) => ({ id, qty })), force: form.force.checked };
      if (!time) { warn.textContent = 'Оберіть час'; warn.hidden = false; return; }
      try {
        if (b) {
          const { status, ...rest } = body;
          await api('/bookings/' + b.id, { method: 'PATCH', body: { ...rest, status } });
        } else await api('/bookings', { method: 'POST', body });
        modal.close(); toast(b ? 'Запис змінено' : 'Запис створено'); refresh();
      } catch (err) { warn.textContent = err.message; warn.hidden = false; }
    };
    modal.showModal();
  }

  // ---------- дошка постів ----------
  async function loadBoard() {
    $('#boardDate').value = S.boardDate;
    const r = await api('/board?date=' + S.boardDate);
    const s = r.settings; const open = hmToMin(s.open); const close = hmToMin(s.close); const span = close - open;
    const pct = (m) => ((m - open) / span) * 100;
    const hours = []; for (let m = Math.ceil(open / 60) * 60; m <= close; m += 60) hours.push(m);
    const occ = r.bookings.filter((b) => b.post > 0);
    const lanes = Array.from({ length: s.posts }, (_, i) => i + 1);
    const hw = (60 / span) * 100;
    let html = `<div class="tl" style="--hw:${hw}%"><div class="tl-head"><div></div><div class="tl-hours">${hours.map((m) => `<span style="left:${pct(m)}%">${minToHm(m)}</span>`).join('')}</div></div>`;
    for (const p of lanes) {
      html += `<div class="tl-row"><div class="tl-label">Пост ${p}</div><div class="tl-lane" style="--hw:calc(${hw}% )">` +
        occ.filter((b) => b.post === p).map((b) => `<div class="tl-b" data-id="${b.id}" data-st="${b.status}" style="left:${pct(b.start_min)}%;width:${(b.duration / span) * 100}%" title="${esc(b.name)} · ${esc(b.car)}"><b>${b.time} ${esc(b.name)}</b><span>${esc(b.car)} · ${b.services.map((x) => esc(x.name)).join(', ')}</span></div>`).join('') + '</div></div>';
    }
    if (r.date === S.now.date && S.now.min >= open && S.now.min <= close) html += `<div class="tl-now" style="left:calc(70px + (100% - 70px) * ${pct(S.now.min) / 100})"></div>`;
    html += '</div>';
    const noPost = r.bookings.filter((b) => b.post === 0);
    if (noPost.length) html += `<h3 style="margin:18px 0 8px">Не займають пост (${noPost.length})</h3><div class="list">${noPost.map(bookingCard).join('')}</div>`;
    if (!r.bookings.length) html += '<div class="empty" style="margin-top:14px">На цей день записів немає</div>';
    $('#board').innerHTML = html;
    S.boardBookings = r.bookings;
  }
  $('#board').addEventListener('click', (e) => {
    const t = e.target.closest('[data-id]'); if (!t) return;
    if (e.target.closest('[data-act]')) return;
    openBooking(S.boardBookings.find((b) => b.id === +t.dataset.id));
  });
  const setBoardDate = (d) => { S.boardDate = d; loadBoard(); };
  $('#dPrev').addEventListener('click', () => setBoardDate(addDays(S.boardDate, -1)));
  $('#dNext').addEventListener('click', () => setBoardDate(addDays(S.boardDate, 1)));
  $('#dToday').addEventListener('click', () => setBoardDate(S.now.date));
  $('#boardDate').addEventListener('change', (e) => e.target.value && setBoardDate(e.target.value));

  // ---------- клієнти ----------
  let clients = [];
  async function loadClients() { clients = (await api('/clients')).clients; renderClients(); }
  function renderClients() {
    const q = $('#clientSearch').value.trim().toLowerCase(); const qd = q.replace(/\D/g, '');
    const list = clients.filter((c) => !q || c.name.toLowerCase().includes(q) || c.car.toLowerCase().includes(q) || (qd.length >= 3 && c.phone.includes(qd)));
    $('#clients').innerHTML = list.map((c) => `<div class="cl"><div><h3>${esc(c.name)} <span class="muted">· ${esc(c.car)}</span></h3>
      <div class="m"><a class="phone" href="tel:${esc(c.phone)}" style="color:var(--blue);font-weight:700">📞 ${esc(c.phone)}</a> · останній візит/запис: ${c.last_date ? dlong(c.last_date) : '—'}${c.next_date ? ` · <b>наступний: ${dlong(c.next_date)}</b>` : ''}</div></div>
      <div class="nums"><div><b>${c.bookings}</b><small>записів</small></div><div><b>${c.visits || 0}</b><small>візитів</small></div><div><b>${money(c.spent)}</b><small>оплачено</small></div>${c.no_shows ? `<div><b>${c.no_shows}</b><small>не з'явився</small></div>` : ''}</div>
      <div class="acts" style="grid-column:1/-1"><button class="btn sm" data-hist="${esc(c.phone)}">Історія записів</button><button class="btn sm primary" data-new="${esc(c.phone)}">Записати знову</button></div></div>`).join('') || '<div class="empty">Клієнтів не знайдено</div>';
  }
  $('#clientSearch').addEventListener('input', renderClients);
  $('#clients').addEventListener('click', async (e) => {
    const h = e.target.closest('[data-hist]'); const n = e.target.closest('[data-new]');
    if (h) { S.range = 'all'; $$('#range button').forEach((x) => x.classList.toggle('on', x.dataset.r === 'all')); $('#search').value = h.dataset.hist.replace('+380', '0'); await switchTab('today'); }
    if (n) { const c = clients.find((x) => x.phone === n.dataset.new); await openForm(null); const f = $('#bf'); f.name.value = c.name; f.phone.value = c.phone; f.car.value = c.car; }
  });

  // ---------- прайс ----------
  async function loadPrices() { const r = await api('/services'); S.services = r.services; S.tiers = r.tiers; renderPrices(); }
  function renderPrices() {
    const q = $('#priceSearch').value.trim().toLowerCase();
    const cats = [...new Set(S.services.map((s) => s.category))];
    $('#prices').innerHTML = cats.map((c) => {
      const list = S.services.filter((s) => s.category === c && (!q || s.name.toLowerCase().includes(q)));
      if (!list.length) return '';
      return `<div class="grp"><h3>${esc(c)}</h3>${list.map((s) => `<div class="pr-row ${s.active ? '' : 'off'}" data-sid="${s.id}">
        <div class="nm">${esc(s.name)}${s.description ? `<small>${esc(s.description)}</small>` : ''}<label style="text-align:left;display:flex;gap:6px;align-items:center;margin-top:4px"><input type="checkbox" data-f="active" ${s.active ? 'checked' : ''} style="width:auto"> показувати на сайті</label></div>
        <div><label>тривалість, хв</label><input type="number" min="5" max="600" step="5" value="${s.duration}" data-f="duration"></div>
        ${S.tiers.filter((t) => s.prices[t.id]).map((t) => `<div><label>${esc(t.label)}${s.prices[t.id].from ? ' (від)' : ''}</label><input type="number" min="0" step="10" value="${s.prices[t.id].price}" data-f="price" data-tier="${t.id}"></div>`).join('')}
      </div>`).join('')}</div>`;
    }).join('');
  }
  $('#priceSearch').addEventListener('input', renderPrices);
  $('#prices').addEventListener('change', async (e) => {
    const row = e.target.closest('[data-sid]'); if (!row) return;
    const body = {}; const f = e.target.dataset.f;
    if (f === 'active') body.active = e.target.checked;
    if (f === 'duration') body.duration = +e.target.value;
    if (f === 'price') body.prices = { [e.target.dataset.tier]: +e.target.value };
    try { await api('/services/' + row.dataset.sid, { method: 'PATCH', body }); toast('Збережено'); const s = S.services.find((x) => x.id === row.dataset.sid); if (f === 'active') { s.active = body.active; row.classList.toggle('off', !s.active); } if (f === 'duration') s.duration = body.duration; if (f === 'price') s.prices[e.target.dataset.tier].price = body.prices[e.target.dataset.tier]; } catch (err) { toast(err.message, true); loadPrices(); }
  });

  // ---------- налаштування ----------
  function renderSettings() {
    const s = S.settings;
    $('#settingsForm').innerHTML = `<h3>Робота мийки та онлайн-запис</h3>
      <label>Кількість постів<input type="number" name="posts" min="1" max="20" value="${s.posts}"></label>
      <label>Початок роботи<input type="time" name="open" value="${s.open}"></label>
      <label>Кінець роботи<input type="time" name="close" value="${s.close}"></label>
      <label>Крок запису<select name="step">${[15, 20, 30, 60].map((v) => `<option ${v === s.step ? 'selected' : ''} value="${v}">${v} хв</option>`).join('')}</select></label>
      <label>Мінімум до початку, хв<input type="number" name="lead_minutes" min="0" max="1440" value="${s.lead_minutes}"><small>клієнт не зможе записатись ближче ніж за цей час</small></label>
      <label>Запис відкритий на, днів<input type="number" name="horizon_days" min="1" max="60" value="${s.horizon_days}"></label>
      <label>Телефон на сайті<input name="phone" value="${esc(s.phone)}" maxlength="30"></label>
      <div class="full"><b>Вихідні дні тижня</b><div class="chips" style="margin-top:6px">${[1, 2, 3, 4, 5, 6, 0].map((d) => `<label><input type="checkbox" name="off" value="${d}" ${s.days_off.includes(d) ? 'checked' : ''}> ${WD_S[d]}</label>`).join('')}</div></div>
      <label class="full">Закриті дати (YYYY-MM-DD, через кому) — свята, технічні роботи<input name="blocked" value="${esc(s.blocked_dates.join(', '))}" placeholder="2026-12-25, 2027-01-01"></label>
      <div class="full"><button class="btn primary" type="submit">Зберегти налаштування</button></div>`;
  }
  $('#settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target;
    const body = { posts: +f.posts.value, open: f.open.value, close: f.close.value, step: +f.step.value, lead_minutes: +f.lead_minutes.value, horizon_days: +f.horizon_days.value, phone: f.phone.value,
      days_off: $$('[name=off]:checked', f).map((x) => +x.value), blocked_dates: f.blocked.value.split(/[,\s]+/).filter(Boolean) };
    try { const r = await api('/settings', { method: 'PUT', body }); S.settings = r.settings; toast('Налаштування збережено'); } catch (err) { toast(err.message, true); }
  });
  $('#pwForm').addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target;
    try { await api('/password', { method: 'POST', body: { current: f.current.value, next: f.next.value } }); f.reset(); toast('Пароль змінено'); } catch (err) { toast(err.message, true); }
  });

  boot();
})();

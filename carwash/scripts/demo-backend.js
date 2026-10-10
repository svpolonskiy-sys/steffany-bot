/* Демо-бекенд для автономних HTML (показ замовнику без сервера).
   Підміняє fetch для /api/* та /crm/api/*; дані зберігаються в localStorage браузера,
   тому запис із сайту одразу видно в CRM (якщо обидва файли відкриті в одному браузері). */
(() => {
  'use strict';
  const CAT = window.__CATALOG;
  const KEY = 'vmu_demo_v1';
  const OCC = ['new', 'confirmed', 'in_progress', 'done'];
  const STATUSES = ['new', 'confirmed', 'in_progress', 'done', 'cancelled', 'no_show'];
  let mem = null;
  const load = () => { try { const s = localStorage.getItem(KEY); if (s) return JSON.parse(s); } catch { /* пам'ять */ } return mem; };
  const save = () => { mem = D; try { localStorage.setItem(KEY, JSON.stringify(D)); } catch { /* пам'ять */ } };
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  const hm = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  const nowL = () => { const d = new Date(); return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, min: d.getHours() * 60 + d.getMinutes() }; };
  const addDays = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); const t = new Date(y, m - 1, d + n); return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`; };
  const wd = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d).getDay(); };
  class Err extends Error { constructor(s, m, x) { super(m); this.status = s; this.extra = x; } }

  let D = load();
  if (!D) {
    D = {
      next: 1, auth: false,
      settings: { posts: 4, open: '08:00', close: '20:00', step: 30, lead_minutes: 30, horizon_days: 14, days_off: [], blocked_dates: [], phone: '(063) 200-77-66' },
      services: CAT.services.map((s) => ({ ...s, active: true })), bookings: [],
    };
    const t = nowL().date;
    const seed = [
      [0, '09:00', 'Андрій', '+380501110001', 'Toyota Camry', 'de', ['s18'], 'done'],
      [0, '10:30', 'Марія', '+380501110002', 'Skoda Octavia', 'de', ['s01', 's06'], 'in_progress'],
      [0, '14:00', 'Олег', '+380501110003', 'BMW X5', 'k2', ['s20'], 'confirmed'],
      [0, '16:30', 'Ірина', '+380501110004', 'Renault Logan', 'abc', ['s01'], 'new'],
      [1, '09:30', 'Василь', '+380501110005', 'Toyota Land Cruiser', 'k3', ['s19'], 'new'],
      [1, '12:00', 'Наталя', '+380501110006', 'Kia Sportage', 'k1', ['s01', 's07', 's22'], 'confirmed'],
      [2, '11:00', 'Сергій', '+380501110007', 'Mercedes Sprinter', 'm2', ['s18'], 'new'],
    ];
    seed.forEach(([off, time, name, phone, car, tier, ids, status]) => {
      const items = resolve(ids, tier); const tt = totals(items);
      D.bookings.push({ id: D.next, code: 'DEMO' + D.next + 'X', name, phone, car, tier, services: items, total: tt.total, total_from: tt.from, duration: tt.duration,
        date: addDays(t, off), start_min: hm(time), status, source: off === 0 && time === '14:00' ? 'crm' : 'site', manager_note: '', created_at: new Date().toISOString().slice(0, 16).replace('T', ' '), updated_at: '' });
      D.next++;
    });
    save();
  }

  // ---- логіка (дзеркалить сервер) ----
  function resolve(input, tier) {
    if (!CAT.tiers.find((t) => t.id === tier)) throw new Err(400, 'Невідомий клас автомобіля');
    if (!Array.isArray(input) || !input.length) throw new Err(400, 'Оберіть хоча б одну послугу');
    const seen = new Set(); const out = [];
    for (const e of input) {
      const id = typeof e === 'object' && e ? e.id : e; const s = (D ? D.services : CAT.services).find((x) => x.id === id);
      if (!s || s.active === false) throw new Err(400, 'Послуга недоступна');
      if (seen.has(id)) continue; seen.add(id);
      const p = s.prices[tier]; if (!p) throw new Err(400, `Послуга «${s.name}» недоступна для цього класу авто`);
      const qty = s.unit ? Math.max(1, Math.min(20, Math.floor(+(e && e.qty) || 1))) : 1;
      out.push({ id, name: s.name, description: s.description, unit: s.unit, qty, unit_price: p.price, price: p.price * qty, from: !!p.from, note: p.note || '', duration: s.duration * qty });
    }
    return out;
  }
  function totals(items) {
    const st = D ? D.settings.step : 30; const raw = items.reduce((a, i) => a + i.duration, 0);
    return { total: items.reduce((a, i) => a + i.price, 0), from: items.some((i) => i.from) ? 1 : 0, duration: Math.max(st, Math.ceil(raw / st) * st) };
  }
  const occ = (date, ignore = 0) => D.bookings.filter((b) => b.date === date && b.id !== ignore && OCC.includes(b.status));
  function freePosts(rows, start, dur) {
    let max = 0;
    for (let t = start; t < start + dur; t += D.settings.step) { const c = rows.filter((b) => b.start_min <= t && t < b.start_min + b.duration).length; if (c > max) max = c; }
    return D.settings.posts - max;
  }
  function dayState(date, now) {
    const s = D.settings;
    if (date < now.date) return 'past';
    if (date > addDays(now.date, s.horizon_days - 1)) return 'too_far';
    if (s.days_off.includes(wd(date))) return 'day_off';
    if (s.blocked_dates.includes(date)) return 'blocked';
    return null;
  }
  function slots(date, dur, { ignore = 0, skipLead = false } = {}) {
    const now = nowL(); const s = D.settings; const reason = dayState(date, now);
    if (reason && !(skipLead && ['too_far', 'day_off', 'blocked'].includes(reason))) return { date, open: false, reason, slots: [] };
    const rows = occ(date, ignore); const out = [];
    for (let m = hm(s.open); m + dur <= hm(s.close); m += s.step) {
      const past = !skipLead && date === now.date && m < now.min + s.lead_minutes; const free = freePosts(rows, m, dur);
      out.push({ time: fmt(m), min: m, free: Math.max(0, free), available: !past && free > 0, past });
    }
    return { date, open: true, posts: s.posts, slots: out };
  }
  function daysList(dur) {
    const now = nowL();
    return Array.from({ length: D.settings.horizon_days }, (_, i) => {
      const date = addDays(now.date, i); const r = slots(date, dur); const free = r.slots.filter((x) => x.available).length;
      return { date, weekday: wd(date), open: r.open, reason: r.reason || null, free_slots: free, total_slots: r.slots.length,
        level: !r.open || !free ? 'full' : free / Math.max(1, r.slots.length) < 0.34 ? 'few' : 'many' };
    });
  }
  function assign(rows) {
    const ends = Array(D.settings.posts).fill(-1); const map = new Map();
    [...rows].sort((a, b) => a.start_min - b.start_min || a.id - b.id).forEach((b) => {
      let p = ends.findIndex((e) => e <= b.start_min); if (p < 0) p = ends.indexOf(Math.min(...ends));
      ends[p] = Math.max(ends[p], b.start_min + b.duration); map.set(b.id, p + 1);
    });
    return map;
  }
  function phone(raw) {
    let d = String(raw || '').replace(/\D/g, '');
    if (d.startsWith('380') && d.length === 12) d = d.slice(2); else if (d.length === 9) d = '0' + d;
    if (!/^0\d{9}$/.test(d)) throw new Err(400, 'Вкажіть коректний номер телефону');
    return '+38' + d;
  }
  const str = (v, a, b, l) => { v = String(v ?? '').replace(/\s+/g, ' ').trim(); if (v.length < a || v.length > b) throw new Err(400, `${l}: від ${a} до ${b} символів`); return v; };
  const view = (b) => ({ ...b, time: fmt(b.start_min), end: fmt(b.start_min + b.duration), total_from: !!b.total_from });
  function create(i, source, force) {
    const name = str(i.name, 2, 60, "Ім'я"), ph = phone(i.phone), car = str(i.car, 2, 40, 'Марка автомобіля');
    const items = resolve(i.services, i.tier); const t = totals(items); const start = hm(String(i.time || '')); const now = nowL(); const s = D.settings;
    if (!force) {
      if (dayState(i.date, now)) throw new Err(409, 'На цю дату запис недоступний');
      if (i.date === now.date && start < now.min + s.lead_minutes) throw new Err(409, 'Цей час уже минув або надто близько');
      if (start + t.duration > hm(s.close) || start < hm(s.open) || freePosts(occ(i.date), start, t.duration) < 1) throw new Err(409, 'Цей час щойно зайняли. Оберіть, будь ласка, інший.', { code: 'slot_taken' });
    }
    if (D.bookings.some((b) => b.phone === ph && b.date === i.date && b.start_min === start && OCC.includes(b.status))) throw new Err(409, 'Запис на цей час із цим номером уже існує');
    const code = Array.from({ length: 6 }, () => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 31)]).join('');
    const b = { id: D.next++, code, name, phone: ph, car, tier: i.tier, services: items, total: t.total, total_from: t.from, duration: t.duration, date: i.date, start_min: start,
      status: source === 'crm' && i.status === 'confirmed' ? 'confirmed' : 'new', source, manager_note: '', created_at: new Date().toISOString().slice(0, 16).replace('T', ' '), updated_at: '' };
    D.bookings.push(b); save(); return view(b);
  }
  function update(id, p) {
    const b = D.bookings.find((x) => x.id === id); if (!b) throw new Err(404, 'Запис не знайдено');
    const n = { ...b };
    if ('status' in p) { if (!STATUSES.includes(p.status)) throw new Err(400, 'Невідомий статус'); n.status = p.status; }
    if ('manager_note' in p) n.manager_note = String(p.manager_note || '').slice(0, 1000);
    if ('name' in p) n.name = str(p.name, 2, 60, "Ім'я"); if ('phone' in p) n.phone = phone(p.phone); if ('car' in p) n.car = str(p.car, 2, 40, 'Марка автомобіля');
    let recalc = false; if ('tier' in p && p.tier !== b.tier) { n.tier = p.tier; recalc = true; } if ('services' in p) recalc = true;
    if (recalc) { const it = resolve('services' in p ? p.services : b.services.map((s) => ({ id: s.id, qty: s.qty })), n.tier); const t = totals(it); Object.assign(n, { services: it, total: t.total, total_from: t.from, duration: t.duration }); }
    const moved = ('date' in p && p.date !== b.date) || ('time' in p && hm(p.time) !== b.start_min);
    if ('date' in p) n.date = p.date; if ('time' in p) n.start_min = hm(p.time);
    if ((moved || recalc || (!OCC.includes(b.status) && OCC.includes(n.status))) && OCC.includes(n.status) && !p.force) {
      if (n.start_min + n.duration > hm(D.settings.close) || n.start_min < hm(D.settings.open)) throw new Err(409, 'Запис виходить за робочі години');
      if (freePosts(occ(n.date, id), n.start_min, n.duration) < 1) throw new Err(409, 'На цей час усі пости зайняті', { code: 'slot_taken' });
    }
    n.updated_at = new Date().toISOString(); Object.assign(b, n); save(); return view(b);
  }

  function durFor(q) {
    const ids = String(q.get('services') || '').split(',').filter(Boolean).map((x) => { const [id, qty] = x.split('x'); return { id, qty: +qty || 1 }; });
    if (!ids.length) return Math.max(D.settings.step, +q.get('duration') || D.settings.step);
    return totals(resolve(ids, q.get('tier') || 'abc')).duration;
  }
  const pub = (r) => ({ code: r.code, name: r.name, phone: r.phone, car: r.car, date: r.date, time: r.time, end: r.end, total: r.total, total_from: r.total_from, duration: r.duration, services: r.services.map((s) => ({ name: s.name, price: s.price, from: s.from })) });

  function route(method, url, body) {
    const u = new URL(url, 'http://x'); const p = u.pathname; const q = u.searchParams; const s = D.settings; const now = nowL();
    if (p === '/api/catalog') return { tiers: CAT.tiers, models: CAT.models, legend: CAT.legend, services: D.services.filter((x) => x.active).map(({ id, category, part, name, description, duration, prices, unit }) => ({ id, category, part, name, description, duration, prices, unit })), settings: { posts: s.posts, open: s.open, close: s.close, step: s.step, horizon_days: s.horizon_days, phone: s.phone } };
    if (p === '/api/days') return { days: daysList(durFor(q)) };
    if (p === '/api/slots') return slots(q.get('date'), durFor(q));
    if (p === '/api/bookings' && method === 'POST') { if (body.website) return { ok: true }; return { ok: true, booking: pub(create(body, 'site', false)) }; }
    if (p === '/crm/api/login') { D.auth = true; save(); return { ok: true }; }
    if (p === '/crm/api/logout') { D.auth = false; save(); return { ok: true }; }
    if (!p.startsWith('/crm/api/')) throw new Err(404, 'Не знайдено');
    if (!D.auth) throw new Err(401, 'Потрібен вхід');
    const r = p.slice('/crm/api'.length);
    if (r === '/me') return { ok: true, now, settings: s };
    if (r === '/summary') {
      const c = (f) => D.bookings.filter(f).length;
      return { now, new_count: c((b) => b.status === 'new' && b.date >= now.date), today: c((b) => b.date === now.date && OCC.includes(b.status)), today_done: c((b) => b.date === now.date && b.status === 'done'),
        today_revenue: D.bookings.filter((b) => b.date === now.date && OCC.includes(b.status)).reduce((a, b) => a + b.total, 0), tomorrow: c((b) => b.date === addDays(now.date, 1) && ['new', 'confirmed', 'in_progress'].includes(b.status)),
        upcoming: c((b) => b.date >= now.date && ['new', 'confirmed'].includes(b.status)), last_id: D.next - 1 };
    }
    if (r === '/bookings' && method === 'GET') {
      let l = D.bookings.slice(); const from = q.get('from'), to = q.get('to');
      if (from) l = l.filter((b) => b.date >= from); if (to) l = l.filter((b) => b.date <= to);
      const st = (q.get('status') || '').split(',').filter(Boolean); if (st.length) l = l.filter((b) => st.includes(b.status));
      const t = (q.get('q') || '').trim().toLowerCase(), dg = t.replace(/\D/g, '');
      if (t) l = l.filter((b) => b.name.toLowerCase().includes(t) || b.car.toLowerCase().includes(t) || b.code.toLowerCase().includes(t) || (dg.length >= 3 && b.phone.includes(dg)));
      const k = q.get('order') === 'desc' ? -1 : 1; l.sort((a, b) => k * (a.date.localeCompare(b.date) || a.start_min - b.start_min));
      return { bookings: l.slice(0, +q.get('limit') || 300).map(view) };
    }
    if (r === '/bookings' && method === 'POST') return { ok: true, booking: create(body, 'crm', !!body.force) };
    let m;
    if ((m = r.match(/^\/bookings\/(\d+)$/))) {
      if (method === 'PATCH') return { ok: true, booking: update(+m[1], body) };
      if (method === 'DELETE') { D.bookings = D.bookings.filter((b) => b.id !== +m[1]); save(); return { ok: true }; }
    }
    if (r === '/board') {
      const date = q.get('date') || now.date; const rows = D.bookings.filter((b) => b.date === date && b.status !== 'cancelled').sort((a, b) => a.start_min - b.start_min);
      const pm = assign(rows.filter((b) => OCC.includes(b.status)));
      return { date, settings: { posts: s.posts, open: s.open, close: s.close, step: s.step }, bookings: rows.map((b) => ({ ...view(b), post: pm.get(b.id) || 0 })) };
    }
    if (r === '/slots') { const d = Math.max(s.step, Math.ceil((+q.get('duration') || s.step) / s.step) * s.step); return slots(q.get('date'), d, { ignore: +q.get('ignore') || 0, skipLead: true }); }
    if (r === '/clients') {
      const g = new Map(); [...D.bookings].sort((a, b) => a.id - b.id).forEach((b) => { const c = g.get(b.phone) || { phone: b.phone, bookings: 0, visits: 0, no_shows: 0, spent: 0, last_date: '', next_date: null }; c.name = b.name; c.car = b.car; c.bookings++;
        if (b.status === 'done') { c.visits++; c.spent += b.total; } if (b.status === 'no_show') c.no_shows++; if (b.date > c.last_date) c.last_date = b.date;
        if (b.date >= now.date && ['new', 'confirmed'].includes(b.status) && (!c.next_date || b.date < c.next_date)) c.next_date = b.date; g.set(b.phone, c); });
      return { clients: [...g.values()].reverse() };
    }
    if (r === '/services') return { services: D.services, tiers: CAT.tiers };
    if ((m = r.match(/^\/services\/(s\d+)$/)) && method === 'PATCH') {
      const x = D.services.find((v) => v.id === m[1]); if ('duration' in body) x.duration = body.duration; if ('active' in body) x.active = !!body.active;
      if (body.prices) for (const [t, v] of Object.entries(body.prices)) x.prices[t].price = v; save(); return { ok: true };
    }
    if (r === '/settings' && method === 'GET') return { settings: s };
    if (r === '/settings' && method === 'PUT') { Object.assign(D.settings, body); save(); return { ok: true, settings: D.settings }; }
    if (r === '/password') return { ok: true };
    throw new Err(404, 'Не знайдено');
  }

  const realFetch = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = async (url, opts = {}) => {
    const u = String(url);
    if (!/^\/(crm\/)?api\//.test(u)) return realFetch(url, opts);
    D = load() || D; // підхоплюємо зміни з іншої вкладки (сайт ↔ CRM)
    await new Promise((r) => setTimeout(r, 120));
    let status = 200; let data;
    try { data = route((opts.method || 'GET').toUpperCase(), u, opts.body ? JSON.parse(opts.body) : {}); }
    catch (e) { if (!(e instanceof Err)) throw e; status = e.status; data = { ok: false, error: e.message, ...(e.extra || {}) }; }
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
  };

  // CSV у демо — генерується в браузері
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href$="export.csv"]'); if (!a) return; e.preventDefault();
    const rows = [['Код', 'Дата', 'Початок', "Ім'я", 'Телефон', 'Авто', 'Послуги', 'Сума', 'Статус']].concat(D.bookings.map((b) => [b.code, b.date, fmt(b.start_min), b.name, b.phone, b.car, b.services.map((s) => s.name).join(', '), b.total, b.status]));
    const csv = '﻿' + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const l = document.createElement('a'); l.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); l.download = 'bookings.csv'; l.click();
  });
  if (location.protocol === 'file:' || true) {
    const bar = document.createElement('div');
    bar.textContent = 'ДЕМО-РЕЖИМ · дані зберігаються лише у вашому браузері';
    bar.style.cssText = 'position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:9999;background:#ffb81c;color:#201600;font:700 11px/1 system-ui,sans-serif;letter-spacing:.06em;padding:4px 14px;border-radius:0 0 10px 10px;pointer-events:none';
    document.addEventListener('DOMContentLoaded', () => document.body.appendChild(bar));
  }
})();

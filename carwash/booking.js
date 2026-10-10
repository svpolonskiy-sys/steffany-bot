'use strict';
// Уся логіка запису: ціни, тривалість, вільні місця на постах, створення/зміна записів.
const crypto = require('node:crypto');
const { getSettings, getServices, catalog } = require('./db');

const TZ = 'Europe/Kyiv';
const OCCUPYING = ['new', 'confirmed', 'in_progress', 'done']; // скасовані та "не приїхав" місце не займають
const STATUSES = ['new', 'confirmed', 'in_progress', 'done', 'cancelled', 'no_show'];
const TIER_IDS = catalog.tiers.map((t) => t.id);

class HttpError extends Error {
  constructor(status, message, extra) { super(message); this.status = status; this.extra = extra; }
}

// ---------- час ----------
function nowKyiv(now = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(now).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, min: +p.hour * 60 + +p.minute };
}
const hm = (s) => { const [h, m] = String(s).split(':').map(Number); return h * 60 + m; };
const fmt = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z'));
const addDays = (date, n) => new Date(Date.parse(date + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const weekday = (date) => new Date(date + 'T00:00:00Z').getUTCDay();

// ---------- ціни ----------
function priceFor(service, tier) {
  const p = service.prices[tier];
  return p ? { price: p.price, from: !!p.from, note: p.note || '' } : null;
}

function resolveServices(db, input, tier) {
  if (!TIER_IDS.includes(tier)) throw new HttpError(400, 'Невідомий клас автомобіля');
  if (!Array.isArray(input) || !input.length) throw new HttpError(400, 'Оберіть хоча б одну послугу');
  if (input.length > 25) throw new HttpError(400, 'Забагато послуг');
  const all = new Map(getServices(db).map((s) => [s.id, s]));
  const seen = new Set();
  const items = [];
  for (const e of input) {
    const id = typeof e === 'object' && e ? e.id : e;
    const s = all.get(id);
    if (!s || !s.active) throw new HttpError(400, 'Послуга недоступна: ' + id);
    if (seen.has(id)) continue;
    seen.add(id);
    const qty = s.unit ? Math.max(1, Math.min(20, Math.floor(+(e && e.qty) || 1))) : 1;
    const pr = priceFor(s, tier);
    if (!pr) throw new HttpError(400, `Послуга «${s.name}» недоступна для цього класу авто`);
    items.push({
      id: s.id, name: s.name, description: s.description, unit: s.unit, qty, unit_price: pr.price,
      price: pr.price * qty, from: pr.from, note: pr.note, duration: s.duration * qty,
    });
  }
  return items;
}

function totals(items, step) {
  const total = items.reduce((a, i) => a + i.price, 0);
  const raw = items.reduce((a, i) => a + i.duration, 0);
  return {
    total,
    total_from: items.some((i) => i.from) ? 1 : 0,
    duration: Math.max(step, Math.ceil(raw / step) * step),
  };
}

// ---------- місткість ----------
function dayBookings(db, date, ignoreId = 0) {
  return db.prepare(
    `SELECT id, start_min, duration FROM bookings WHERE date = ? AND id != ? AND status IN (${OCCUPYING.map(() => '?').join(',')})`,
  ).all(date, ignoreId, ...OCCUPYING);
}

function dayState(settings, date, now) {
  if (!isDate(date)) return { open: false, reason: 'bad_date' };
  if (date < now.date) return { open: false, reason: 'past' };
  if (date > addDays(now.date, settings.horizon_days - 1)) return { open: false, reason: 'too_far' };
  if (settings.days_off.includes(weekday(date))) return { open: false, reason: 'day_off' };
  if (settings.blocked_dates.includes(date)) return { open: false, reason: 'blocked' };
  return { open: true };
}

// скільки постів вільні протягом [start, start+duration) (мінімум по кроках)
function freePosts(rows, settings, start, duration) {
  let max = 0;
  for (let t = start; t < start + duration; t += settings.step) {
    let c = 0;
    for (const b of rows) if (b.start_min <= t && t < b.start_min + b.duration) c++;
    if (c > max) max = c;
  }
  return settings.posts - max;
}

function slots(db, date, duration, { ignoreId = 0, skipLead = false, now = nowKyiv() } = {}) {
  const st = getSettings(db);
  const state = dayState(st, date, now);
  const overridable = skipLead && ['too_far', 'day_off', 'blocked'].includes(state.reason); // CRM може поставити запис і на вихідний
  if (!state.open && !overridable) return { date, open: false, reason: state.reason, slots: [] };
  const open = hm(st.open); const close = hm(st.close);
  const rows = dayBookings(db, date, ignoreId);
  const out = [];
  for (let s = open; s + duration <= close; s += st.step) {
    const tooSoon = !skipLead && date === now.date && s < now.min + st.lead_minutes;
    const free = freePosts(rows, st, s, duration);
    out.push({ time: fmt(s), min: s, free: Math.max(0, free), available: !tooSoon && free > 0, past: tooSoon });
  }
  return { date, open: true, posts: st.posts, slots: out };
}

function days(db, duration, now = nowKyiv()) {
  const st = getSettings(db);
  const list = [];
  for (let i = 0; i < st.horizon_days; i++) {
    const date = addDays(now.date, i);
    const s = slots(db, date, duration, { now });
    const free = s.slots.filter((x) => x.available);
    list.push({
      date, weekday: weekday(date), open: s.open, reason: s.reason || null,
      free_slots: free.length, total_slots: s.slots.length,
      level: !s.open || !free.length ? 'full' : free.length / Math.max(1, s.slots.length) < 0.34 ? 'few' : 'many',
    });
  }
  return list;
}

// розкладка записів дня по постах (жадібно за часом початку - оптимально для інтервалів)
function assignPosts(rows, posts) {
  const sorted = [...rows].sort((a, b) => a.start_min - b.start_min || a.id - b.id);
  const ends = Array(posts).fill(-1);
  const map = new Map();
  for (const b of sorted) {
    let p = ends.findIndex((e) => e <= b.start_min);
    if (p < 0) p = ends.indexOf(Math.min(...ends)); // перебронь (ручний запис) - лишаємо на найближчому
    ends[p] = Math.max(ends[p], b.start_min + b.duration);
    map.set(b.id, p + 1);
  }
  return map;
}

// ---------- валідація ----------
function normPhone(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('380') && d.length === 12) d = d.slice(2);
  else if (d.startsWith('80') && d.length === 11) d = d.slice(1);
  else if (d.length === 9) d = '0' + d;
  if (!/^0\d{9}$/.test(d)) throw new HttpError(400, 'Вкажіть коректний номер телефону, наприклад +38 (063) 123-45-67');
  return '+38' + d;
}
const clean = (s, min, max, label) => {
  const v = String(s ?? '').replace(/\s+/g, ' ').trim();
  if (v.length < min || v.length > max) throw new HttpError(400, `${label}: від ${min} до ${max} символів`);
  return v;
};

function newCode(db) {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  for (;;) {
    const code = Array.from(crypto.randomBytes(6), (b) => alphabet[b % alphabet.length]).join('');
    if (!db.prepare('SELECT 1 FROM bookings WHERE code = ?').get(code)) return code;
  }
}

function inTx(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
}

function view(r) {
  return {
    id: r.id, code: r.code, name: r.name, phone: r.phone, car: r.car, tier: r.tier,
    services: JSON.parse(r.services), total: r.total, total_from: !!r.total_from, duration: r.duration,
    date: r.date, time: fmt(r.start_min), end: fmt(r.start_min + r.duration), start_min: r.start_min,
    status: r.status, source: r.source, manager_note: r.manager_note, created_at: r.created_at, updated_at: r.updated_at,
  };
}

// ---------- створення ----------
function create(db, input, { source = 'site', force = false, now = nowKyiv() } = {}) {
  const st = getSettings(db);
  const name = clean(input.name, 2, 60, "Ім'я");
  const phone = normPhone(input.phone);
  const car = clean(input.car, 2, 40, 'Марка автомобіля');
  const items = resolveServices(db, input.services, input.tier);
  const t = totals(items, st.step);
  const date = String(input.date || '');
  const start = hm(input.time);
  if (!/^\d{1,2}:\d{2}$/.test(String(input.time || ''))) throw new HttpError(400, 'Оберіть час');

  return inTx(db, () => {
    const state = dayState(st, date, now);
    if (!state.open && !force) throw new HttpError(409, 'На цю дату запис недоступний');
    if (!force) {
      if (start < hm(st.open) || start + t.duration > hm(st.close) || (start - hm(st.open)) % st.step)
        throw new HttpError(409, 'Цей час недоступний');
      if (date === now.date && start < now.min + st.lead_minutes) throw new HttpError(409, 'Цей час уже минув або надто близько');
      if (freePosts(dayBookings(db, date), st, start, t.duration) < 1)
        throw new HttpError(409, 'Цей час щойно зайняли. Оберіть, будь ласка, інший.', { code: 'slot_taken' });
    }
    const dup = db.prepare(
      `SELECT 1 FROM bookings WHERE phone = ? AND date = ? AND start_min = ? AND status IN (${OCCUPYING.map(() => '?').join(',')})`,
    ).get(phone, date, start, ...OCCUPYING);
    if (dup) throw new HttpError(409, 'Запис на цей час із цим номером уже існує');
    const code = newCode(db);
    const info = db.prepare(
      `INSERT INTO bookings (code, name, phone, car, tier, services, total, total_from, duration, date, start_min, status, source)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).run(code, name, phone, car, input.tier, JSON.stringify(items), t.total, t.total_from, t.duration, date, start,
      source === 'crm' && input.status === 'confirmed' ? 'confirmed' : 'new', source);
    return view(db.prepare('SELECT * FROM bookings WHERE id = ?').get(info.lastInsertRowid));
  });
}

// ---------- зміна (CRM) ----------
function update(db, id, patch, { now = nowKyiv() } = {}) {
  const st = getSettings(db);
  return inTx(db, () => {
    const cur = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    if (!cur) throw new HttpError(404, 'Запис не знайдено');
    const next = { ...cur };
    if ('status' in patch) {
      if (!STATUSES.includes(patch.status)) throw new HttpError(400, 'Невідомий статус');
      next.status = patch.status;
    }
    if ('manager_note' in patch) next.manager_note = String(patch.manager_note || '').slice(0, 1000);
    if ('name' in patch) next.name = clean(patch.name, 2, 60, "Ім'я");
    if ('phone' in patch) next.phone = normPhone(patch.phone);
    if ('car' in patch) next.car = clean(patch.car, 2, 40, 'Марка автомобіля');
    let recalc = false;
    if ('tier' in patch && patch.tier !== cur.tier) { next.tier = patch.tier; recalc = true; }
    if ('services' in patch) recalc = true;
    if (recalc) {
      const src = 'services' in patch ? patch.services : JSON.parse(cur.services).map((s) => ({ id: s.id, qty: s.qty }));
      const items = resolveServices(db, src, next.tier);
      const t = totals(items, st.step);
      Object.assign(next, { services: JSON.stringify(items), total: t.total, total_from: t.total_from, duration: t.duration });
    }
    const moved = ('date' in patch && patch.date !== cur.date) || ('time' in patch && hm(patch.time) !== cur.start_min);
    if ('date' in patch) { if (!isDate(patch.date)) throw new HttpError(400, 'Невірна дата'); next.date = patch.date; }
    if ('time' in patch) next.start_min = hm(patch.time);
    const wasOcc = OCCUPYING.includes(cur.status); const isOcc = OCCUPYING.includes(next.status);
    if ((moved || recalc || (!wasOcc && isOcc)) && isOcc && !patch.force) {
      if (next.start_min + next.duration > hm(st.close) || next.start_min < hm(st.open))
        throw new HttpError(409, 'Запис виходить за робочі години');
      if (freePosts(dayBookings(db, next.date, id), st, next.start_min, next.duration) < 1)
        throw new HttpError(409, 'На цей час усі пости зайняті', { code: 'slot_taken' });
    }
    db.prepare(
      `UPDATE bookings SET name=?, phone=?, car=?, tier=?, services=?, total=?, total_from=?, duration=?, date=?, start_min=?,
       status=?, manager_note=?, updated_at=datetime('now') WHERE id=?`,
    ).run(next.name, next.phone, next.car, next.tier, next.services, next.total, next.total_from, next.duration,
      next.date, next.start_min, next.status, next.manager_note, id);
    return view(db.prepare('SELECT * FROM bookings WHERE id = ?').get(id));
  });
}

function remove(db, id) {
  if (!db.prepare('DELETE FROM bookings WHERE id = ?').run(id).changes) throw new HttpError(404, 'Запис не знайдено');
}

module.exports = {
  HttpError, STATUSES, OCCUPYING, nowKyiv, hm, fmt, isDate, addDays, weekday,
  priceFor, resolveServices, totals, slots, days, assignPosts, normPhone,
  create, update, remove, view, freePosts, dayBookings,
};

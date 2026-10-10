'use strict';
// Сайт запису на мийку VMU Wash&Wheel + CRM. Без зовнішніх залежностей (Node >= 22.13).
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const dbm = require('./db');
const B = require('./booking');

const PUBLIC = path.join(__dirname, 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8',
};

// ---------- пароль CRM ----------
function hashPass(pw, salt = crypto.randomBytes(16).toString('hex')) {
  return `${salt}:${crypto.scryptSync(pw, salt, 32).toString('hex')}`;
}
function checkPass(pw, stored) {
  const [salt, hash] = String(stored).split(':');
  const a = Buffer.from(hash, 'hex'); const b = crypto.scryptSync(String(pw), salt, 32);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function createApp({ db = dbm.open(), crmPassword = process.env.CRM_PASSWORD, log = console.log } = {}) {
  // пароль: з env, інакше збережений, інакше згенерований при першому запуску
  const getStored = () => db.prepare("SELECT value FROM settings WHERE key = '_crm_pass'").get()?.value;
  const putStored = (h) => db.prepare("INSERT INTO settings (key, value) VALUES ('_crm_pass', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(h);
  if (crmPassword) putStored(hashPass(crmPassword));
  else if (!getStored()) {
    const pw = crypto.randomBytes(6).toString('base64url');
    putStored(hashPass(pw));
    log(`\n  Пароль CRM згенеровано (змініть у розділі «Налаштування»): ${pw}\n`);
  }

  // ---------- обмеження частоти ----------
  const hits = new Map();
  function limited(key, max, windowMs) {
    const now = Date.now();
    const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (arr.length >= max) { hits.set(key, arr); return true; }
    arr.push(now); hits.set(key, arr); return false;
  }
  const gc = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (!v.some((t) => now - t < 3600e3)) hits.delete(k);
    db.prepare('DELETE FROM sessions WHERE expires < ?').run(now);
  }, 600e3);
  gc.unref();

  const ipOf = (req) => (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';

  // ---------- сесії ----------
  const cookieOf = (req, name) => {
    for (const part of String(req.headers.cookie || '').split(';')) {
      const [k, ...v] = part.trim().split('=');
      if (k === name) return decodeURIComponent(v.join('='));
    }
  };
  const authed = (req) => {
    const t = cookieOf(req, 'vmu_sid');
    if (!t) return false;
    const r = db.prepare('SELECT expires FROM sessions WHERE token = ?').get(t);
    return !!r && r.expires > Date.now();
  };

  // ---------- допоміжне ----------
  function send(res, status, body, headers = {}) {
    const isObj = body !== null && typeof body === 'object' && !Buffer.isBuffer(body);
    const data = isObj ? JSON.stringify(body) : body ?? '';
    res.writeHead(status, {
      'Content-Type': isObj ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers,
    });
    res.end(data);
  }
  function readJson(req) {
    return new Promise((resolve, reject) => {
      let size = 0; const chunks = [];
      req.on('data', (c) => { size += c.length; if (size > 64 * 1024) { reject(new B.HttpError(413, 'Забагато даних')); req.destroy(); } else chunks.push(c); });
      req.on('end', () => {
        if (!chunks.length) return resolve({});
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new B.HttpError(400, 'Невірний JSON')); }
      });
      req.on('error', reject);
    });
  }
  const need = (cond, msg = 'Невірні дані') => { if (!cond) throw new B.HttpError(400, msg); };

  // ---------- публічне API ----------
  function publicCatalog() {
    const st = dbm.getSettings(db);
    return {
      tiers: dbm.catalog.tiers,
      models: dbm.catalog.models,
      legend: dbm.catalog.legend,
      services: dbm.getServices(db, { onlyActive: true }).map((s) => ({
        id: s.id, category: s.category, part: s.part, name: s.name, description: s.description, duration: s.duration, prices: s.prices, unit: s.unit,
      })),
      settings: { posts: st.posts, open: st.open, close: st.close, step: st.step, horizon_days: st.horizon_days, phone: st.phone },
    };
  }

  function durationFor(db_, query) {
    const st = dbm.getSettings(db_);
    const ids = String(query.get('services') || '').split(',').filter(Boolean).map((x) => { const [id, qty] = x.split('x'); return { id, qty: +qty || 1 }; });
    const tier = query.get('tier') || 'abc';
    if (!ids.length) return Math.max(st.step, +query.get('duration') || st.step);
    return B.totals(B.resolveServices(db_, ids, tier), st.step).duration;
  }

  async function api(req, res, url) {
    const m = req.method; const p = url.pathname; const q = url.searchParams;

    if (m === 'GET' && p === '/api/catalog') return send(res, 200, publicCatalog(), { 'Cache-Control': 'public, max-age=60' });

    if (m === 'GET' && p === '/api/days') return send(res, 200, { days: B.days(db, durationFor(db, q)) });

    if (m === 'GET' && p === '/api/slots') {
      const date = q.get('date');
      need(B.isDate(date), 'Невірна дата');
      return send(res, 200, B.slots(db, date, durationFor(db, q)));
    }

    if (m === 'POST' && p === '/api/bookings') {
      if (limited('book:' + ipOf(req), 8, 3600e3)) throw new B.HttpError(429, 'Забагато спроб. Зателефонуйте нам, будь ласка.');
      const b = await readJson(req);
      if (b.website) return send(res, 200, { ok: true }); // honeypot для ботів
      const r = B.create(db, b, { source: 'site' });
      return send(res, 201, { ok: true, booking: publicBooking(r) });
    }

    // ---------- вхід в CRM ----------
    if (m === 'POST' && p === '/crm/api/login') {
      if (limited('login:' + ipOf(req), 6, 600e3)) throw new B.HttpError(429, 'Забагато спроб входу. Спробуйте за 10 хвилин.');
      const b = await readJson(req);
      if (!checkPass(b.password || '', getStored())) throw new B.HttpError(401, 'Невірний пароль');
      const token = crypto.randomBytes(32).toString('hex');
      db.prepare('INSERT INTO sessions (token, expires) VALUES (?, ?)').run(token, Date.now() + 30 * 864e5);
      const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
      return send(res, 200, { ok: true }, { 'Set-Cookie': `vmu_sid=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${30 * 86400}${secure}` });
    }
    if (m === 'POST' && p === '/crm/api/logout') {
      const t = cookieOf(req, 'vmu_sid');
      if (t) db.prepare('DELETE FROM sessions WHERE token = ?').run(t);
      return send(res, 200, { ok: true }, { 'Set-Cookie': 'vmu_sid=; Path=/; HttpOnly; Max-Age=0' });
    }

    if (p.startsWith('/crm/api/')) {
      if (!authed(req)) throw new B.HttpError(401, 'Потрібен вхід');
      // захист від CSRF: змінюючі запити лише з того ж походження
      if (m !== 'GET') {
        const origin = req.headers.origin;
        if (origin && new URL(origin).host !== req.headers.host) throw new B.HttpError(403, 'Заборонено');
      }
      return crm(req, res, url);
    }
    throw new B.HttpError(404, 'Не знайдено');
  }

  const publicBooking = (r) => ({
    code: r.code, name: r.name, phone: r.phone, car: r.car, date: r.date, time: r.time, end: r.end,
    total: r.total, total_from: r.total_from, duration: r.duration, services: r.services.map((s) => ({ name: s.name, price: s.price, from: s.from })),
  });

  // ---------- CRM API ----------
  async function crm(req, res, url) {
    const m = req.method; const p = url.pathname.slice('/crm/api'.length); const q = url.searchParams;
    const st = dbm.getSettings(db);
    const now = B.nowKyiv();

    if (m === 'GET' && p === '/me') return send(res, 200, { ok: true, now, settings: st });

    if (m === 'GET' && p === '/summary') {
      const c = (sql, ...a) => db.prepare(sql).get(...a).n;
      return send(res, 200, {
        now,
        new_count: c("SELECT COUNT(*) n FROM bookings WHERE status = 'new' AND date >= ?", now.date),
        today: c("SELECT COUNT(*) n FROM bookings WHERE date = ? AND status IN ('new','confirmed','in_progress','done')", now.date),
        today_done: c("SELECT COUNT(*) n FROM bookings WHERE date = ? AND status = 'done'", now.date),
        today_revenue: c("SELECT COALESCE(SUM(total),0) n FROM bookings WHERE date = ? AND status IN ('new','confirmed','in_progress','done')", now.date),
        tomorrow: c("SELECT COUNT(*) n FROM bookings WHERE date = ? AND status IN ('new','confirmed','in_progress')", B.addDays(now.date, 1)),
        upcoming: c("SELECT COUNT(*) n FROM bookings WHERE date >= ? AND status IN ('new','confirmed')", now.date),
        last_id: c('SELECT COALESCE(MAX(id),0) n FROM bookings'),
      });
    }

    if (m === 'GET' && p === '/bookings') {
      const where = []; const args = [];
      const from = q.get('from'); const to = q.get('to');
      if (from) { need(B.isDate(from)); where.push('date >= ?'); args.push(from); }
      if (to) { need(B.isDate(to)); where.push('date <= ?'); args.push(to); }
      const status = (q.get('status') || '').split(',').filter((s) => B.STATUSES.includes(s));
      if (status.length) { where.push(`status IN (${status.map(() => '?').join(',')})`); args.push(...status); }
      const text = (q.get('q') || '').trim();
      if (text) {
        const like = `%${text.replace(/[%_\\]/g, (c) => '\\' + c)}%`;
        const digits = text.replace(/\D/g, '');
        where.push("(name LIKE ? ESCAPE '\\' OR car LIKE ? ESCAPE '\\' OR code LIKE ? ESCAPE '\\'" + (digits.length >= 3 ? ' OR phone LIKE ?' : '') + ')');
        args.push(like, like, like); if (digits.length >= 3) args.push(`%${digits}%`);
      }
      const limit = Math.min(+q.get('limit') || 300, 1000);
      const rows = db.prepare(`SELECT * FROM bookings ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        ORDER BY date ${q.get('order') === 'desc' ? 'DESC' : 'ASC'}, start_min ${q.get('order') === 'desc' ? 'DESC' : 'ASC'} LIMIT ${limit}`).all(...args);
      return send(res, 200, { bookings: rows.map(B.view) });
    }

    if (m === 'GET' && p === '/board') {
      const date = q.get('date') || now.date;
      need(B.isDate(date));
      const rows = db.prepare('SELECT * FROM bookings WHERE date = ? AND status != ? ORDER BY start_min, id').all(date, 'cancelled');
      const occ = rows.filter((r) => B.OCCUPYING.includes(r.status));
      const posts = B.assignPosts(occ, st.posts);
      return send(res, 200, {
        date, settings: { posts: st.posts, open: st.open, close: st.close, step: st.step },
        bookings: rows.map((r) => ({ ...B.view(r), post: posts.get(r.id) || 0 })),
      });
    }

    if (m === 'GET' && p === '/slots') {
      const date = q.get('date'); need(B.isDate(date));
      const dur = Math.max(st.step, Math.ceil((+q.get('duration') || st.step) / st.step) * st.step);
      return send(res, 200, B.slots(db, date, dur, { ignoreId: +q.get('ignore') || 0, skipLead: true }));
    }

    if (m === 'POST' && p === '/bookings') {
      const b = await readJson(req);
      return send(res, 201, { ok: true, booking: B.create(db, b, { source: 'crm', force: !!b.force }) });
    }

    let mm;
    if ((mm = p.match(/^\/bookings\/(\d+)$/))) {
      const id = +mm[1];
      if (m === 'PATCH') return send(res, 200, { ok: true, booking: B.update(db, id, await readJson(req)) });
      if (m === 'DELETE') { B.remove(db, id); return send(res, 200, { ok: true }); }
    }

    if (m === 'GET' && p === '/clients') {
      const rows = db.prepare(`
        SELECT phone,
               (SELECT name FROM bookings b2 WHERE b2.phone = b.phone ORDER BY id DESC LIMIT 1) AS name,
               (SELECT car FROM bookings b2 WHERE b2.phone = b.phone ORDER BY id DESC LIMIT 1) AS car,
               COUNT(*) AS bookings,
               SUM(status = 'done') AS visits,
               SUM(status = 'no_show') AS no_shows,
               COALESCE(SUM(CASE WHEN status = 'done' THEN total END), 0) AS spent,
               MAX(date) AS last_date,
               MIN(CASE WHEN date >= ? AND status IN ('new','confirmed') THEN date END) AS next_date
        FROM bookings b GROUP BY phone ORDER BY MAX(id) DESC LIMIT 1000`).all(now.date);
      return send(res, 200, { clients: rows });
    }

    if (m === 'GET' && p === '/export.csv') {
      const rows = db.prepare('SELECT * FROM bookings ORDER BY date DESC, start_min DESC').all().map(B.view);
      const cell = (v) => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };
      const head = ['Код', 'Дата', 'Початок', 'Кінець', "Ім'я", 'Телефон', 'Авто', 'Клас', 'Послуги', 'Сума, грн', 'Статус', 'Джерело', 'Нотатка', 'Створено'];
      const lines = [head.map(cell).join(';')].concat(rows.map((r) => [
        r.code, r.date, r.time, r.end, r.name, r.phone, r.car, r.tier.toUpperCase(), r.services.map((s) => s.name).join(', '),
        r.total + (r.total_from ? '+' : ''), r.status, r.source, r.manager_note, r.created_at].map(cell).join(';')));
      return send(res, 200, '﻿' + lines.join('\r\n'), { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="bookings.csv"' });
    }

    if (m === 'GET' && p === '/services') return send(res, 200, { services: dbm.getServices(db), tiers: dbm.catalog.tiers });
    if ((mm = p.match(/^\/services\/(s\d+)$/)) && m === 'PATCH') {
      const b = await readJson(req);
      const cur = dbm.getServices(db).find((s) => s.id === mm[1]);
      need(cur, 'Послугу не знайдено');
      if ('duration' in b) { need(Number.isInteger(b.duration) && b.duration >= 5 && b.duration <= 600, 'Тривалість: 5–600 хв'); }
      if ('prices' in b) {
        for (const [t, v] of Object.entries(b.prices)) {
          need(cur.prices[t], 'Невірний клас');
          need(Number.isInteger(v) && v >= 0 && v <= 100000, 'Невірна ціна');
          cur.prices[t].price = v;
        }
      }
      db.prepare('UPDATE services SET duration = ?, prices = ?, active = ? WHERE id = ?').run(
        'duration' in b ? b.duration : cur.duration, JSON.stringify(cur.prices), 'active' in b ? (b.active ? 1 : 0) : (cur.active ? 1 : 0), cur.id);
      return send(res, 200, { ok: true });
    }

    if (m === 'GET' && p === '/settings') return send(res, 200, { settings: st });
    if (m === 'PUT' && p === '/settings') {
      const b = await readJson(req);
      const patch = {};
      if ('posts' in b) { need(Number.isInteger(b.posts) && b.posts >= 1 && b.posts <= 20, 'Постів: 1–20'); patch.posts = b.posts; }
      if ('step' in b) { need([15, 20, 30, 60].includes(b.step), 'Крок: 15, 20, 30 або 60 хв'); patch.step = b.step; }
      for (const k of ['open', 'close']) if (k in b) { need(/^([01]\d|2[0-3]):[0-5]\d$/.test(b[k]), 'Невірний час'); patch[k] = b[k]; }
      if ('lead_minutes' in b) { need(Number.isInteger(b.lead_minutes) && b.lead_minutes >= 0 && b.lead_minutes <= 1440); patch.lead_minutes = b.lead_minutes; }
      if ('horizon_days' in b) { need(Number.isInteger(b.horizon_days) && b.horizon_days >= 1 && b.horizon_days <= 60, 'Горизонт: 1–60 днів'); patch.horizon_days = b.horizon_days; }
      if ('days_off' in b) { need(Array.isArray(b.days_off) && b.days_off.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)); patch.days_off = b.days_off; }
      if ('blocked_dates' in b) { need(Array.isArray(b.blocked_dates) && b.blocked_dates.every(B.isDate)); patch.blocked_dates = [...new Set(b.blocked_dates)].sort(); }
      if ('phone' in b) { need(typeof b.phone === 'string' && b.phone.length <= 30); patch.phone = b.phone.trim(); }
      const merged = { ...st, ...patch };
      need(B.hm(merged.open) < B.hm(merged.close), 'Початок роботи має бути раніше за кінець');
      dbm.setSettings(db, patch);
      return send(res, 200, { ok: true, settings: dbm.getSettings(db) });
    }
    if (m === 'POST' && p === '/password') {
      const b = await readJson(req);
      need(checkPass(b.current || '', getStored()), 'Поточний пароль невірний');
      need(typeof b.next === 'string' && b.next.length >= 8 && b.next.length <= 100, 'Новий пароль: мінімум 8 символів');
      putStored(hashPass(b.next));
      return send(res, 200, { ok: true });
    }
    throw new B.HttpError(404, 'Не знайдено');
  }

  // ---------- статичні файли ----------
  function serveStatic(req, res, url) {
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/crm' || rel === '/crm/') rel = '/crm/index.html';
    if (rel === '/') rel = '/index.html';
    const file = path.normalize(path.join(PUBLIC, rel));
    if (!file.startsWith(PUBLIC + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, 'Не знайдено');
    const ext = path.extname(file);
    const immutable = ['.webp', '.jpg', '.png', '.svg'].includes(ext);
    const headers = {
      'Content-Type': MIME[ext] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff',
      'Cache-Control': immutable ? 'public, max-age=604800' : 'no-cache',
      'Referrer-Policy': 'same-origin',
    };
    if (ext === '.html') headers['Content-Security-Policy'] = "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'self'";
    res.writeHead(200, headers);
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://x');
      if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/crm/api/')) return await api(req, res, url);
      if (req.method !== 'GET' && req.method !== 'HEAD') throw new B.HttpError(405, 'Метод не підтримується');
      return serveStatic(req, res, url);
    } catch (e) {
      if (e instanceof B.HttpError) return send(res, e.status, { ok: false, error: e.message, ...(e.extra || {}) });
      log('Помилка:', e);
      send(res, 500, { ok: false, error: 'Внутрішня помилка сервера' });
    }
  });
  return { server, db, close: () => { clearInterval(gc); server.close(); db.close(); } };
}

module.exports = { createApp };

if (require.main === module) {
  const port = +process.env.PORT || 3000;
  const app = createApp();
  app.server.listen(port, () => console.log(`VMU Wash — сайт: http://localhost:${port}  CRM: http://localhost:${port}/crm`));
}

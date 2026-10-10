'use strict';
// Сховище на вбудованому node:sqlite (без зовнішніх залежностей).
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'catalog.json'), 'utf8'));

const DEFAULT_SETTINGS = {
  posts: 4,               // 4-постова автомийка
  open: '08:00',          // робочі години - редагуються в CRM
  close: '20:00',
  step: 30,               // крок запису, хв
  lead_minutes: 30,       // мінімум до початку запису
  horizon_days: 14,       // на скільки днів уперед відкритий запис
  days_off: [],           // дні тижня-вихідні: 0 = неділя ... 6 = субота
  blocked_dates: [],      // окремі закриті дати YYYY-MM-DD
  phone: '(063) 200-77-66',
};

function open(file = path.join(DATA_DIR, 'carwash.db')) {
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY, sort INTEGER NOT NULL, category TEXT NOT NULL, part TEXT NOT NULL,
      name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', duration INTEGER NOT NULL,
      prices TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, unit INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      car TEXT NOT NULL,
      tier TEXT NOT NULL,
      services TEXT NOT NULL,          -- знімок: [{id,name,price,from,note,duration}]
      total INTEGER NOT NULL,
      total_from INTEGER NOT NULL DEFAULT 0,
      duration INTEGER NOT NULL,       -- хвилини, що займає пост
      date TEXT NOT NULL,              -- YYYY-MM-DD (Київ)
      start_min INTEGER NOT NULL,      -- хвилини від 00:00
      status TEXT NOT NULL DEFAULT 'new',
      source TEXT NOT NULL DEFAULT 'site',
      manager_note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date, start_min);
    CREATE INDEX IF NOT EXISTS idx_bookings_phone ON bookings(phone);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, expires INTEGER NOT NULL);
  `);

  // налаштування за замовчуванням
  const hasSetting = db.prepare('SELECT 1 FROM settings WHERE key = ?');
  const putSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
    if (!hasSetting.get(k)) putSetting.run(k, JSON.stringify(v));
  }

  // послуги з прайсу старого сайту (лише при першому запуску)
  const count = db.prepare('SELECT COUNT(*) AS n FROM services').get().n;
  if (!count) {
    const ins = db.prepare(
      'INSERT INTO services (id, sort, category, part, name, description, duration, prices, active, unit) VALUES (?,?,?,?,?,?,?,?,1,?)');
    catalog.services.forEach((s, i) =>
      ins.run(s.id, i, s.category, s.part, s.name, s.description || '', s.duration, JSON.stringify(s.prices), s.unit ? 1 : 0));
  }
  return db;
}

function getSettings(db) {
  const out = {};
  for (const r of db.prepare("SELECT key, value FROM settings WHERE key NOT LIKE '\\_%' ESCAPE '\\'").all()) out[r.key] = JSON.parse(r.value);
  return out;
}

function setSettings(db, patch) {
  const up = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  for (const [k, v] of Object.entries(patch)) if (k in DEFAULT_SETTINGS) up.run(k, JSON.stringify(v));
}

function getServices(db, { onlyActive = false } = {}) {
  const rows = db.prepare('SELECT * FROM services ORDER BY sort').all();
  return rows
    .filter((r) => !onlyActive || r.active)
    .map((r) => ({ ...r, prices: JSON.parse(r.prices), active: !!r.active, unit: !!r.unit }));
}

module.exports = { open, getSettings, setSettings, getServices, catalog, DATA_DIR, DEFAULT_SETTINGS };

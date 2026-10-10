'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../server');
const dbm = require('../db');
const B = require('../booking');

function setup() {
  const db = dbm.open(':memory:');
  const app = createApp({ db, crmPassword: 'secret-pass-1', log() {} });
  return { db, app };
}
const FIXED = { date: '2026-10-12', min: 8 * 60 }; // понеділок, 08:00
const payload = (o = {}) => ({ name: 'Іван', phone: '063 123 45 67', car: 'Audi A4', tier: 'de', services: ['s01'], date: '2026-10-13', time: '10:00', ...o });

test('телефон нормалізується', () => {
  assert.equal(B.normPhone('0631234567'), '+380631234567');
  assert.equal(B.normPhone('+38 (063) 123-45-67'), '+380631234567');
  assert.throws(() => B.normPhone('123'));
});

test('ціна та тривалість рахуються на сервері', () => {
  const { db } = setup();
  const r = B.create(db, payload({ services: ['s01', 's06'], price: 1 }), { now: FIXED });
  assert.equal(r.total, 350 + 230); // D,E: мийка + салон
  assert.equal(r.duration, 60);     // 30+20 -> 60 (крок 30)
  assert.equal(r.status, 'new');
});

test('пости не можна переповнити (4 поста)', () => {
  const { db } = setup();
  for (let i = 0; i < 4; i++) B.create(db, payload({ phone: `06312345${60 + i}`, name: 'Клієнт' + i }), { now: FIXED });
  assert.throws(() => B.create(db, payload({ phone: '0671112233' }), { now: FIXED }), /зайняли/);
  const s = B.slots(db, '2026-10-13', 30, { now: FIXED }).slots.find((x) => x.time === '10:00');
  assert.equal(s.free, 0); assert.equal(s.available, false);
  assert.equal(B.slots(db, '2026-10-13', 30, { now: FIXED }).slots.find((x) => x.time === '10:30').free, 4);
});

test('довгий запис блокує пост на всю тривалість; скасований звільняє', () => {
  const { db } = setup();
  const r = B.create(db, payload({ services: ['s15'] }), { now: FIXED }); // хімчистка 240 хв
  assert.equal(r.duration, 240);
  const at = (t) => B.slots(db, '2026-10-13', 30, { now: FIXED }).slots.find((x) => x.time === t).free;
  assert.equal(at('13:30'), 3); assert.equal(at('14:00'), 4);
  B.update(db, r.id, { status: 'cancelled' }, { now: FIXED });
  assert.equal(at('13:30'), 4);
});

test('минулий час, вихідні та горизонт', () => {
  const { db } = setup();
  assert.throws(() => B.create(db, payload({ date: '2026-10-12', time: '08:00' }), { now: FIXED }), /минув/);
  assert.throws(() => B.create(db, payload({ date: '2027-01-01' }), { now: FIXED }), /недоступний/);
  dbm.setSettings(db, { days_off: [2] }); // вівторок
  assert.throws(() => B.create(db, payload({ date: '2026-10-13' }), { now: FIXED }), /недоступний/);
  assert.equal(B.days(db, 30, FIXED)[1].open, false);
});

test('розкладка по постах', () => {
  const rows = [{ id: 1, start_min: 600, duration: 60 }, { id: 2, start_min: 600, duration: 30 }, { id: 3, start_min: 630, duration: 30 }];
  const m = B.assignPosts(rows, 4);
  assert.deepEqual([m.get(1), m.get(2), m.get(3)], [1, 2, 2]);
});

async function withServer(fn) {
  const { app } = setup();
  await new Promise((r) => app.server.listen(0, r));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  try { await fn(base); } finally { app.close(); }
}

test('HTTP: публічний запис, CRM потребує входу', async () => {
  await withServer(async (base) => {
    const cat = await (await fetch(base + '/api/catalog')).json();
    assert.equal(cat.tiers.length, 8); assert.ok(cat.services.length > 30);
    assert.equal((await fetch(base + '/crm/api/bookings')).status, 401);
    const days = await (await fetch(base + '/api/days?services=s01&tier=abc')).json();
    const day = days.days.find((d) => d.open && d.free_slots);
    const { slots } = await (await fetch(`${base}/api/slots?date=${day.date}&services=s01&tier=abc`)).json();
    const slot = slots.find((s) => s.available);
    const res = await fetch(base + '/api/bookings', { method: 'POST', body: JSON.stringify(payload({ tier: 'abc', date: day.date, time: slot.time })) });
    assert.equal(res.status, 201);
    const { booking } = await res.json();
    assert.equal(booking.total, 300); assert.equal(booking.email, undefined);

    assert.equal((await fetch(base + '/crm/api/login', { method: 'POST', body: JSON.stringify({ password: 'bad' }) })).status, 401);
    const login = await fetch(base + '/crm/api/login', { method: 'POST', body: JSON.stringify({ password: 'secret-pass-1' }) });
    assert.equal(login.status, 200);
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const list = await (await fetch(base + '/crm/api/bookings', { headers: { cookie } })).json();
    assert.equal(list.bookings.length, 1); assert.equal(list.bookings[0].phone, '+380631234567');
    const upd = await fetch(`${base}/crm/api/bookings/${list.bookings[0].id}`, { method: 'PATCH', headers: { cookie }, body: JSON.stringify({ status: 'confirmed' }) });
    assert.equal((await upd.json()).booking.status, 'confirmed');
    const sum = await (await fetch(base + '/crm/api/summary', { headers: { cookie } })).json();
    assert.equal(sum.new_count, 0);
    const csv = await (await fetch(base + '/crm/api/export.csv', { headers: { cookie } })).text();
    assert.match(csv, /Audi A4/);
    assert.equal((await fetch(base + '/crm/api/settings', { headers: { cookie } }).then((r) => r.json())).settings._crm_pass, undefined);
  });
});

test('HTTP: статика не віддає файли поза public', async () => {
  await withServer(async (base) => {
    assert.equal((await fetch(base + '/')).status, 200);
    assert.equal((await fetch(base + '/..%2fserver.js')).status, 404);
    assert.equal((await fetch(base + '/../db.js')).status, 404);
  });
});

test('послуги "за 1 шт." враховують кількість', () => {
  const { db } = setup();
  const r = B.create(db, payload({ services: [{ id: 's08', qty: 4 }, { id: 's01', qty: 9 }] }), { now: FIXED });
  assert.equal(r.total, 4 * 500 + 350); // qty ігнорується для не-штучних послуг
  assert.equal(r.duration, 150);        // 4*30 + 30
  assert.equal(r.services[0].qty, 4);
});

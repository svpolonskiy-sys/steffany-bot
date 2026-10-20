import json
import os
import sqlite3
import threading
from datetime import datetime

from . import config

SCHEMA = """
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('owner','accountant','admin')),
  pw_hash TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL DEFAULT '', perms TEXT NOT NULL DEFAULT '', must_change INTEGER NOT NULL DEFAULT 0,
  last_login TEXT, last_ip TEXT, sess_ver INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS accounts(
  id INTEGER PRIMARY KEY, name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('fop','cash','card','credit')),
  source TEXT NOT NULL CHECK(source IN ('privat','alteg','manual')),
  iban TEXT DEFAULT '', token_enc TEXT DEFAULT '',
  opening_balance INTEGER NOT NULL DEFAULT 0, opening_auto INTEGER NOT NULL DEFAULT 0,
  bank_balance INTEGER, bank_balance_at TEXT,
  sort INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1,
  last_sync_at TEXT, last_sync_status TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS categories(
  id INTEGER PRIMARY KEY, name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('income','expense')),
  auto INTEGER NOT NULL DEFAULT 0, archived INTEGER NOT NULL DEFAULT 0,
  exclude INTEGER NOT NULL DEFAULT 0, pl_group TEXT NOT NULL DEFAULT '',
  UNIQUE(name, kind));
CREATE TABLE IF NOT EXISTS rules(
  id INTEGER PRIMARY KEY, category_id INTEGER NOT NULL REFERENCES categories(id),
  pattern TEXT NOT NULL, direction TEXT NOT NULL DEFAULT 'any',
  priority INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS transactions(
  id INTEGER PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  to_account_id INTEGER REFERENCES accounts(id),
  kind TEXT NOT NULL CHECK(kind IN ('income','expense','transfer')),
  amount INTEGER NOT NULL CHECK(amount > 0),
  occurred_at TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '', counterparty TEXT NOT NULL DEFAULT '',
  category_id INTEGER REFERENCES categories(id),
  source TEXT NOT NULL DEFAULT 'manual', external_id TEXT UNIQUE,
  user_edited INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER REFERENCES users(id), created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  deleted_at TEXT);
CREATE INDEX IF NOT EXISTS ix_tx_date ON transactions(occurred_at);
CREATE INDEX IF NOT EXISTS ix_tx_acc ON transactions(account_id);
CREATE TABLE IF NOT EXISTS audit(
  id INTEGER PRIMARY KEY, tx_id INTEGER, action TEXT NOT NULL, user_id INTEGER,
  at TEXT NOT NULL, before_json TEXT, after_json TEXT, note TEXT DEFAULT '');
CREATE INDEX IF NOT EXISTS ix_audit_tx ON audit(tx_id);
CREATE TABLE IF NOT EXISTS credit_ops(
  id INTEGER PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id),
  external_id TEXT UNIQUE NOT NULL, occurred_at TEXT NOT NULL,
  direction TEXT NOT NULL CHECK(direction IN ('C','D')), amount INTEGER NOT NULL,
  description TEXT NOT NULL DEFAULT '');
CREATE INDEX IF NOT EXISTS ix_credit_acc ON credit_ops(account_id, occurred_at);
CREATE TABLE IF NOT EXISTS alteg_sales(
  id INTEGER PRIMARY KEY, external_id TEXT UNIQUE NOT NULL, occurred_at TEXT NOT NULL,
  amount INTEGER NOT NULL, title TEXT NOT NULL DEFAULT '');
CREATE INDEX IF NOT EXISTS ix_sales_date ON alteg_sales(occurred_at);
CREATE TABLE IF NOT EXISTS alteg_pay(
  id INTEGER PRIMARY KEY, external_id TEXT UNIQUE NOT NULL, occurred_at TEXT NOT NULL,
  amount INTEGER NOT NULL, method TEXT NOT NULL CHECK(method IN ('cash','cashless')),
  record_id INTEGER, staff_id INTEGER, staff_name TEXT NOT NULL DEFAULT '', staff_role TEXT NOT NULL DEFAULT '',
  service_title TEXT NOT NULL DEFAULT '', category_title TEXT NOT NULL DEFAULT '', item_type TEXT NOT NULL DEFAULT '');
CREATE INDEX IF NOT EXISTS ix_pay_date ON alteg_pay(occurred_at);
CREATE TABLE IF NOT EXISTS payroll(
  id INTEGER PRIMARY KEY, month TEXT NOT NULL, section TEXT NOT NULL, name TEXT NOT NULL,
  gross INTEGER NOT NULL DEFAULT 0, vacation INTEGER NOT NULL DEFAULT 0, sick INTEGER NOT NULL DEFAULT 0,
  fines INTEGER NOT NULL DEFAULT 0, taxes INTEGER NOT NULL DEFAULT 0, sales INTEGER NOT NULL DEFAULT 0,
  hours REAL NOT NULL DEFAULT 0, shifts REAL NOT NULL DEFAULT 0, rate INTEGER NOT NULL DEFAULT 0, retail INTEGER NOT NULL DEFAULT 0,
  adv_card INTEGER NOT NULL DEFAULT 0, sal_card INTEGER NOT NULL DEFAULT 0, adv_cash INTEGER NOT NULL DEFAULT 0, to_pay INTEGER NOT NULL DEFAULT 0,
  UNIQUE(month, section, name));
CREATE TABLE IF NOT EXISTS pl_closed(
  month TEXT PRIMARY KEY, closed_at TEXT NOT NULL, revenue INTEGER, cogs INTEGER, gross INTEGER, labour INTEGER,
  opex INTEGER, ebitda INTEGER, interest INTEGER, tax INTEGER, net INTEGER);
CREATE TABLE IF NOT EXISTS activity(
  id INTEGER PRIMARY KEY, at TEXT NOT NULL, user_id INTEGER, user_name TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL, details TEXT NOT NULL DEFAULT '', ip TEXT NOT NULL DEFAULT '');
CREATE INDEX IF NOT EXISTS ix_activity_at ON activity(at);
CREATE TABLE IF NOT EXISTS findings(
  id INTEGER PRIMARY KEY, key TEXT UNIQUE NOT NULL, kind TEXT NOT NULL, sev TEXT NOT NULL DEFAULT 'mid',
  title TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '', link TEXT NOT NULL DEFAULT '', amount INTEGER NOT NULL DEFAULT 0,
  tx_ids TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','ignored','resolved','fixed')),
  first_seen TEXT NOT NULL, last_seen TEXT NOT NULL, decided_at TEXT, decided_by TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS sync_log(
  id INTEGER PRIMARY KEY, at TEXT NOT NULL, account_id INTEGER, ok INTEGER NOT NULL,
  message TEXT NOT NULL DEFAULT '', added INTEGER NOT NULL DEFAULT 0, updated INTEGER NOT NULL DEFAULT 0);
"""

_lock = threading.RLock()


def now_local() -> str:
    return datetime.now(config.KYIV).strftime("%Y-%m-%dT%H:%M:%S")


def connect(path: str | None = None) -> sqlite3.Connection:
    path = path or config.DB_PATH
    if path != ":memory:":
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    con = sqlite3.connect(path, check_same_thread=False, timeout=30)
    con.row_factory = sqlite3.Row
    con.create_function("lower", 1, lambda v: v.lower() if isinstance(v, str) else v)  # SQLite lower() is ASCII-only
    con.execute("PRAGMA foreign_keys=ON")
    if path != ":memory:":
        con.execute("PRAGMA journal_mode=WAL")
    con.executescript(SCHEMA)
    cols = {r[1] for r in con.execute("PRAGMA table_info(categories)")}
    if "exclude" not in cols:  # DBs created before the flag existed
        con.execute("ALTER TABLE categories ADD COLUMN exclude INTEGER NOT NULL DEFAULT 0")
    ucols = {r[1] for r in con.execute("PRAGMA table_info(users)")}
    for c_, d_ in (("title", "TEXT NOT NULL DEFAULT ''"), ("perms", "TEXT NOT NULL DEFAULT ''"), ("must_change", "INTEGER NOT NULL DEFAULT 0"),
                   ("last_login", "TEXT"), ("last_ip", "TEXT"), ("sess_ver", "INTEGER NOT NULL DEFAULT 0")):
        if c_ not in ucols:
            con.execute(f"ALTER TABLE users ADD COLUMN {c_} {d_}")
    pcols = {r[1] for r in con.execute("PRAGMA table_info(payroll)")}
    for c_, t_ in (("hours", "REAL"), ("shifts", "REAL"), ("rate", "INTEGER"), ("retail", "INTEGER"), ("adv_card", "INTEGER"),
                   ("sal_card", "INTEGER"), ("adv_cash", "INTEGER"), ("to_pay", "INTEGER")):
        if c_ not in pcols:
            con.execute(f"ALTER TABLE payroll ADD COLUMN {c_} {t_} NOT NULL DEFAULT 0")
    if "pl_group" not in cols:
        con.execute("ALTER TABLE categories ADD COLUMN pl_group TEXT NOT NULL DEFAULT ''")
    return con


def lock():
    return _lock


def get_setting(con, key, default=None):
    r = con.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
    return r["value"] if r else default


def set_setting(con, key, value):
    con.execute("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                (key, value))
    con.commit()


TX_FIELDS = ("account_id", "to_account_id", "kind", "amount", "occurred_at", "description",
             "counterparty", "category_id", "deleted_at")


def tx_snapshot(row) -> dict:
    return {k: row[k] for k in TX_FIELDS}


def add_audit(con, tx_id, action, user_id, before=None, after=None, note=""):
    con.execute("INSERT INTO audit(tx_id,action,user_id,at,before_json,after_json,note) VALUES(?,?,?,?,?,?,?)",
                (tx_id, action, user_id, now_local(),
                 json.dumps(before, ensure_ascii=False) if before is not None else None,
                 json.dumps(after, ensure_ascii=False) if after is not None else None, note))


def insert_tx(con, *, account_id, kind, amount, occurred_at, description="", counterparty="",
              category_id=None, to_account_id=None, source="manual", external_id=None,
              user_id=None, note="") -> int:
    ts = now_local()
    cur = con.execute(
        "INSERT INTO transactions(account_id,to_account_id,kind,amount,occurred_at,description,counterparty,"
        "category_id,source,external_id,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
        (account_id, to_account_id, kind, amount, occurred_at, description, counterparty, category_id,
         source, external_id, user_id, ts, ts))
    tid = cur.lastrowid
    add_audit(con, tid, "create", user_id, None, tx_snapshot(con.execute(
        "SELECT * FROM transactions WHERE id=?", (tid,)).fetchone()), note)
    return tid


def update_tx(con, tid, user_id, note="", user_edit=True, **fields):
    before = con.execute("SELECT * FROM transactions WHERE id=?", (tid,)).fetchone()
    sets = {k: v for k, v in fields.items() if k in TX_FIELDS}
    sets["updated_at"] = now_local()
    if user_edit:
        sets["user_edited"] = 1
    con.execute(f"UPDATE transactions SET {','.join(k + '=?' for k in sets)} WHERE id=?",
                (*sets.values(), tid))
    after = con.execute("SELECT * FROM transactions WHERE id=?", (tid,)).fetchone()
    b, a = tx_snapshot(before), tx_snapshot(after)
    if b != a:
        action = "delete" if (a["deleted_at"] and not b["deleted_at"]) else \
            "restore" if (b["deleted_at"] and not a["deleted_at"]) else "update"
        add_audit(con, tid, action, user_id, b, a, note)


def account_balances(con) -> dict[int, int]:
    """Balance per account in kopecks: opening + income - expense - transfers out + transfers in."""
    bal = {r["id"]: r["opening_balance"] for r in con.execute("SELECT id,opening_balance FROM accounts")}
    for r in con.execute(
            "SELECT account_id, to_account_id, kind, SUM(amount) s FROM transactions "
            "WHERE deleted_at IS NULL GROUP BY account_id, to_account_id, kind"):
        if r["kind"] == "income":
            bal[r["account_id"]] += r["s"]
        elif r["kind"] == "expense":
            bal[r["account_id"]] -= r["s"]
        else:
            bal[r["account_id"]] -= r["s"]
            if r["to_account_id"] in bal:
                bal[r["to_account_id"]] += r["s"]
    return bal

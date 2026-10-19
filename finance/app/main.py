import asyncio
import csv
import io
import logging
import re
import time
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta
from urllib.parse import urlparse

from fastapi import Depends, FastAPI, Form, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware

from . import categorize as cat, config, privat, reports, sync
from .db import (account_balances, add_audit, connect, get_setting, insert_tx, lock, now_local, set_setting,
                 update_tx)
from .security import encrypt, hash_password, verify_password

log = logging.getLogger("app")
BASE_DIR = __file__.rsplit("/", 1)[0]
ROLES = {"owner": "Власник", "accountant": "Бухгалтер", "admin": "Адміністратор"}
KINDS = {"income": "Надходження", "expense": "Витрата", "transfer": "Переказ"}
ACC_KINDS = {"fop": "Рахунок ФОП", "cash": "Готівкова каса", "card": "Приватна картка", "credit": "Кредитна лінія"}
SRC = {"manual": "вручну", "privat": "Приватбанк", "alteg": "Alteg"}

con = None  # set in create_app / lifespan


def get_con():
    global con
    if con is None:
        con = connect()
    return con


def bootstrap(c):
    if not c.execute("SELECT 1 FROM users").fetchone() and config.OWNER_EMAIL and config.OWNER_PASSWORD:
        c.execute("INSERT INTO users(email,name,role,pw_hash) VALUES(?,?,?,?)",
                  (config.OWNER_EMAIL.lower(), "Власник", "owner", hash_password(config.OWNER_PASSWORD)))
    if not c.execute("SELECT 1 FROM accounts").fetchone():
        rows = [("ФОП 1", "fop", "privat"), ("ФОП 2", "fop", "privat"), ("Каса салон", "cash", "alteg"),
                ("Сейф", "cash", "manual"), ("Робочі гроші", "card", "manual")]
        for i, (n, k, s) in enumerate(rows):
            c.execute("INSERT INTO accounts(name,kind,source,sort) VALUES(?,?,?,?)", (n, k, s, i))
        sid = c.execute("SELECT id FROM accounts WHERE name='Сейф'").fetchone()["id"]
        set_setting(c, "safe_account_id", str(sid))
    cat.seed(c)
    c.commit()


async def scheduler():
    while True:
        await asyncio.sleep(60)
        try:
            c = get_con()
            last = get_setting(c, "last_sync_all")
            due = not last or (datetime.now(config.KYIV).replace(tzinfo=None)
                               - datetime.fromisoformat(last)).total_seconds() >= config.SYNC_INTERVAL_SEC
            if due and sync.in_work_window():
                await asyncio.to_thread(sync.sync_all, c)
        except Exception:
            log.exception("scheduler error")


@asynccontextmanager
async def lifespan(app):
    bootstrap(get_con())
    task = asyncio.create_task(scheduler()) if config.SCHEDULER_ENABLED else None
    yield
    if task:
        task.cancel()


app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
app.add_middleware(SessionMiddleware, secret_key=config.SECRET_KEY, max_age=60 * 60 * 24 * 30,
                   same_site="lax", https_only=config.COOKIE_SECURE, session_cookie="sf_session")
app.mount("/static", StaticFiles(directory=f"{BASE_DIR}/static"), name="static")
tpl = Jinja2Templates(directory=f"{BASE_DIR}/templates")


def money(k, sign=False):
    if k is None:
        return "—"
    s = f"{abs(k) / 100:,.2f}".replace(",", " ").replace(".", ",")
    pre = "-" if k < 0 else ("+" if sign and k > 0 else "")
    return f"{pre}{s} ₴"


tpl.env.filters["money"] = money
tpl.env.filters["dt"] = lambda s: (s or "").replace("T", " ")[:16]
tpl.env.globals.update(ROLES=ROLES, KINDS=KINDS, ACC_KINDS=ACC_KINDS, SRC=SRC)


class Redirect(Exception):
    def __init__(self, url):
        self.url = url


@app.exception_handler(Redirect)
async def _redir(request, exc):
    return RedirectResponse(exc.url, status_code=303)


@app.middleware("http")
async def csrf_origin(request: Request, call_next):
    if request.method == "POST":
        o = request.headers.get("origin") or request.headers.get("referer")
        if o and urlparse(o).netloc != request.headers.get("host"):
            return Response("Forbidden", status_code=403)
    return await call_next(request)


def current_user(request: Request):
    uid = request.session.get("uid")
    u = get_con().execute("SELECT * FROM users WHERE id=? AND active=1", (uid,)).fetchone() if uid else None
    if not u:
        raise Redirect("/login")
    return u


def owner_only(u=Depends(current_user)):
    if u["role"] != "owner":
        raise HTTPException(403, "Лише для власника")
    return u


def staff_cat(u=Depends(current_user)):
    if u["role"] not in ("owner", "accountant"):
        raise HTTPException(403, "Лише для власника та бухгалтера")
    return u


def api_user(request: Request):
    tok = request.headers.get("x-api-token", "")
    if config.API_TOKEN and tok and tok == config.API_TOKEN:
        return True
    return current_user(request)


def render(request, name, user=None, **ctx):
    flash = request.session.pop("flash", None)
    return tpl.TemplateResponse(request, name, {"user": user, "flash": flash, "now": now_local(), **ctx})


def flash(request, msg):
    request.session["flash"] = msg


def parse_amount(s: str) -> int:
    s = re.sub(r"[\s ₴грнUAH]", "", s or "", flags=re.I).replace(",", ".")
    try:
        v = round(float(s) * 100)
    except ValueError:
        raise HTTPException(400, "Некоректна сума")
    if v <= 0:
        raise HTTPException(400, "Сума має бути більшою за нуль")
    return v


def parse_dt(s: str) -> str:
    try:
        return datetime.fromisoformat(s).strftime("%Y-%m-%dT%H:%M:%S")
    except ValueError:
        raise HTTPException(400, "Некоректна дата")


# ---------- auth ----------
_fail: dict[str, list[float]] = {}


@app.get("/login", response_class=HTMLResponse)
def login_page(request: Request):
    return render(request, "login.html")


@app.post("/login")
def login(request: Request, email: str = Form(...), password: str = Form(...)):
    ip = request.client.host if request.client else "?"
    recent = [t for t in _fail.get(ip, []) if time.time() - t < 600]
    if len(recent) >= 8:
        flash(request, "Забагато спроб. Спробуйте за кілька хвилин.")
        return RedirectResponse("/login", status_code=303)
    u = get_con().execute("SELECT * FROM users WHERE email=? AND active=1", (email.strip().lower(),)).fetchone()
    if not u or not verify_password(password, u["pw_hash"]):
        _fail[ip] = recent + [time.time()]
        flash(request, "Невірний email або пароль")
        return RedirectResponse("/login", status_code=303)
    request.session.clear()
    request.session["uid"] = u["id"]
    return RedirectResponse("/", status_code=303)


@app.post("/logout")
def logout(request: Request):
    request.session.clear()
    return RedirectResponse("/login", status_code=303)


@app.get("/health")
def health():
    return {"ok": True}


# ---------- dashboard ----------
@app.get("/", response_class=HTMLResponse)
def dashboard(request: Request, u=Depends(current_user)):
    c = get_con()
    b = reports.balances(c)
    today = datetime.now(config.KYIV).date()
    day = reports.build(c, today.isoformat(), today.isoformat())
    month = reports.build(c, today.replace(day=1).isoformat(), today.isoformat())
    recent = c.execute(
        "SELECT t.*, a.name acc, a2.name acc2, c.name cat FROM transactions t JOIN accounts a ON a.id=t.account_id "
        "LEFT JOIN accounts a2 ON a2.id=t.to_account_id LEFT JOIN categories c ON c.id=t.category_id "
        "WHERE t.deleted_at IS NULL ORDER BY t.occurred_at DESC, t.id DESC LIMIT 12").fetchall()
    uncategorised = c.execute(
        "SELECT COUNT(*) FROM transactions t JOIN categories c ON c.id=t.category_id WHERE t.deleted_at IS NULL "
        "AND t.user_edited=0 AND (c.auto=1 OR c.name IN ('Інші доходи','Інші витрати'))").fetchone()[0]
    return render(request, "dashboard.html", u, bal=b, day=day, month=month, recent=recent,
                  credit=sync.credit_summary(c), last_sync=get_setting(c, "last_sync_all"), review=uncategorised,
                  in_window=sync.in_work_window())


@app.post("/sync")
def sync_now(request: Request, u=Depends(current_user)):
    res = sync.sync_all(get_con(), force=True)
    bad = [k for k, v in res.items() if v is None]
    flash(request, "Оновлено" if not bad else "Помилка оновлення: " + ", ".join(bad) + " (див. «Рахунки»)")
    return RedirectResponse(request.headers.get("referer", "/"), status_code=303)


# ---------- transactions ----------
def tx_query(p: dict):
    where, args = ["1=1"], []
    if p.get("show") != "deleted":
        where.append("t.deleted_at IS NULL")
    else:
        where.append("t.deleted_at IS NOT NULL")
    if p.get("date_from"):
        where.append("t.occurred_at >= ?"); args.append(p["date_from"] + "T00:00:00")
    if p.get("date_to"):
        where.append("t.occurred_at <= ?"); args.append(p["date_to"] + "T23:59:59")
    if p.get("account"):
        where.append("(t.account_id=? OR t.to_account_id=?)"); args += [int(p["account"])] * 2
    if p.get("category"):
        where.append("t.category_id=?"); args.append(int(p["category"]))
    if p.get("kind") in KINDS:
        where.append("t.kind=?"); args.append(p["kind"])
    if p.get("q"):
        where.append("(lower(t.description) LIKE ? OR lower(t.counterparty) LIKE ?)")
        args += [f"%{p['q'].lower()}%"] * 2
    sql = ("SELECT t.*, a.name acc, a2.name acc2, c.name cat, u.name author FROM transactions t "
           "JOIN accounts a ON a.id=t.account_id LEFT JOIN accounts a2 ON a2.id=t.to_account_id "
           "LEFT JOIN categories c ON c.id=t.category_id LEFT JOIN users u ON u.id=t.created_by "
           "WHERE " + " AND ".join(where) + " ORDER BY t.occurred_at DESC, t.id DESC")
    return sql, args


def lists(c):
    return dict(accounts=c.execute("SELECT * FROM accounts WHERE active=1 AND kind!='credit' ORDER BY sort,id").fetchall(),
                categories=c.execute("SELECT * FROM categories WHERE archived=0 ORDER BY kind DESC, name").fetchall())


@app.get("/transactions", response_class=HTMLResponse)
def tx_list(request: Request, u=Depends(current_user)):
    p = dict(request.query_params)
    c = get_con()
    sql, args = tx_query(p)
    page = max(int(p.get("page", 1) or 1), 1)
    total = c.execute(f"SELECT COUNT(*) FROM ({sql})", args).fetchone()[0]
    rows = c.execute(sql + " LIMIT 100 OFFSET ?", (*args, (page - 1) * 100)).fetchall()
    sums = c.execute(f"SELECT kind, SUM(amount) s FROM ({sql}) GROUP BY kind", args).fetchall()
    qs = "&".join(f"{k}={v}" for k, v in p.items() if k != "page" and v)
    return render(request, "transactions.html", u, rows=rows, p=p, page=page, total=total, qs=qs,
                  sums={r["kind"]: r["s"] for r in sums}, **lists(c))


@app.get("/transactions/export.csv")
def tx_csv(request: Request, u=Depends(current_user)):
    sql, args = tx_query(dict(request.query_params))
    out = io.StringIO()
    w = csv.writer(out, delimiter=";")
    w.writerow(["Дата", "Рахунок", "Тип", "Категорія", "Сума", "Контрагент", "Опис", "Джерело"])
    for t in get_con().execute(sql, args):
        w.writerow([t["occurred_at"].replace("T", " "), t["acc"] + (f" → {t['acc2']}" if t["acc2"] else ""),
                    KINDS[t["kind"]], t["cat"] or "", f"{t['amount'] / 100:.2f}".replace(".", ","),
                    t["counterparty"], t["description"], SRC.get(t["source"], t["source"])])
    return Response("﻿" + out.getvalue(), media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": "attachment; filename=transactions.csv"})


def _tx_form_data(kind, account_id, to_account_id, amount, occurred_at, description, counterparty, category_id):
    if kind not in KINDS:
        raise HTTPException(400, "Невірний тип")
    d = dict(kind=kind, account_id=account_id, amount=parse_amount(amount), occurred_at=parse_dt(occurred_at),
             description=description.strip(), counterparty=counterparty.strip())
    if kind == "transfer":
        if not to_account_id or to_account_id == account_id:
            raise HTTPException(400, "Оберіть інший рахунок призначення")
        d.update(to_account_id=to_account_id, category_id=None)
    else:
        d.update(to_account_id=None, category_id=category_id or cat.categorize(
            get_con(), kind, description, counterparty))
    return d


@app.get("/transactions/new", response_class=HTMLResponse)
def tx_new(request: Request, kind: str = "expense", u=Depends(current_user)):
    c = get_con()
    return render(request, "tx_form.html", u, t=None, kind=kind, history=[],
                  default_dt=datetime.now(config.KYIV).strftime("%Y-%m-%dT%H:%M"), **lists(c))


@app.post("/transactions/new")
def tx_create(request: Request, kind: str = Form(...), account_id: int = Form(...),
              to_account_id: int | None = Form(None), amount: str = Form(...), occurred_at: str = Form(...),
              description: str = Form(""), counterparty: str = Form(""), category_id: int | None = Form(None),
              u=Depends(current_user)):
    c = get_con()
    d = _tx_form_data(kind, account_id, to_account_id, amount, occurred_at, description, counterparty, category_id)
    with lock():
        insert_tx(c, user_id=u["id"], source="manual", **d)
        c.commit()
    flash(request, "Операцію додано")
    return RedirectResponse("/transactions", status_code=303)


@app.get("/transactions/{tid}", response_class=HTMLResponse)
def tx_edit_page(request: Request, tid: int, u=Depends(current_user)):
    c = get_con()
    t = c.execute("SELECT * FROM transactions WHERE id=?", (tid,)).fetchone()
    if not t:
        raise HTTPException(404)
    hist = c.execute("SELECT a.*, u.name uname FROM audit a LEFT JOIN users u ON u.id=a.user_id "
                     "WHERE a.tx_id=? ORDER BY a.id DESC", (tid,)).fetchall()
    return render(request, "tx_form.html", u, t=t, kind=t["kind"], history=hist,
                  default_dt=t["occurred_at"][:16], **lists(c))


@app.post("/transactions/{tid}")
def tx_update(request: Request, tid: int, kind: str = Form(...), account_id: int = Form(...),
              to_account_id: int | None = Form(None), amount: str = Form(...), occurred_at: str = Form(...),
              description: str = Form(""), counterparty: str = Form(""), category_id: int | None = Form(None),
              make_rule: str = Form(""), rule_text: str = Form(""), u=Depends(current_user)):
    c = get_con()
    if not c.execute("SELECT 1 FROM transactions WHERE id=?", (tid,)).fetchone():
        raise HTTPException(404)
    d = _tx_form_data(kind, account_id, to_account_id, amount, occurred_at, description, counterparty, category_id)
    with lock():
        update_tx(c, tid, u["id"], **d)
        extra = ""
        if make_rule and rule_text.strip() and d.get("category_id"):
            cat.add_rule(c, d["category_id"], rule_text, kind if kind != "transfer" else "any", priority=10)
            n = cat.apply_rule_to_existing(c, d["category_id"], rule_text, kind, u["id"])
            extra = f" Правило «{rule_text.strip()}» створено, перерозподілено операцій: {n}."
        c.commit()
    flash(request, "Збережено." + extra)
    return RedirectResponse("/transactions", status_code=303)


@app.post("/transactions/{tid}/delete")
def tx_delete(request: Request, tid: int, u=Depends(current_user)):
    with lock():
        update_tx(get_con(), tid, u["id"], deleted_at=now_local())
        get_con().commit()
    flash(request, "Видалено (історію збережено, можна відновити)")
    return RedirectResponse("/transactions", status_code=303)


@app.post("/transactions/{tid}/restore")
def tx_restore(request: Request, tid: int, u=Depends(current_user)):
    with lock():
        update_tx(get_con(), tid, u["id"], deleted_at=None)
        get_con().commit()
    flash(request, "Відновлено")
    return RedirectResponse(f"/transactions/{tid}", status_code=303)


# ---------- credits ----------
@app.get("/credits", response_class=HTMLResponse)
def credits_page(request: Request, u=Depends(current_user)):
    c = get_con()
    ops = c.execute("SELECT o.*, a.name aname FROM credit_ops o JOIN accounts a ON a.id=o.account_id "
                    "ORDER BY o.occurred_at DESC, o.id DESC LIMIT 300").fetchall()
    repay = c.execute(
        "SELECT t.*, a.name acc FROM transactions t JOIN accounts a ON a.id=t.account_id JOIN categories k ON k.id=t.category_id "
        "WHERE t.deleted_at IS NULL AND k.name='Кредит' AND t.kind='expense' ORDER BY t.occurred_at DESC LIMIT 100").fetchall()
    return render(request, "credits.html", u, credit=sync.credit_summary(c), ops=ops, repay=repay)


# ---------- reports ----------
def _period(request):
    today = datetime.now(config.KYIV).date()
    q = request.query_params
    pr = q.get("preset")
    if pr in reports.presets(today):
        a, b = reports.presets(today)[pr]
        return a.isoformat(), b.isoformat(), pr
    a = q.get("date_from") or today.replace(day=1).isoformat()
    b = q.get("date_to") or today.isoformat()
    for s in (a, b):
        try:
            date.fromisoformat(s)
        except ValueError:
            raise HTTPException(400, "Некоректна дата")
    return a, b, ""


@app.get("/reports", response_class=HTMLResponse)
def reports_page(request: Request, u=Depends(current_user)):
    a, b, pr = _period(request)
    acc = int(request.query_params.get("account") or 0) or None
    c = get_con()
    return render(request, "reports.html", u, rep=reports.build(c, a, b, acc), d_from=a, d_to=b, preset=pr,
                  acc=acc, **lists(c))


@app.get("/reports/export.xlsx")
def reports_xlsx(request: Request, u=Depends(current_user)):
    a, b, _ = _period(request)
    acc = int(request.query_params.get("account") or 0) or None
    c = get_con()
    data = reports.to_xlsx(reports.build(c, a, b, acc), reports.balances(c))
    return Response(data, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    headers={"Content-Disposition": f"attachment; filename=report_{a}_{b}.xlsx"})


# ---------- categories ----------
@app.get("/categories", response_class=HTMLResponse)
def categories_page(request: Request, u=Depends(current_user)):
    c = get_con()
    cats = c.execute("SELECT c.*, (SELECT COUNT(*) FROM transactions t WHERE t.category_id=c.id AND t.deleted_at IS NULL) n "
                     "FROM categories c WHERE archived=0 ORDER BY kind DESC, auto DESC, name").fetchall()
    rules = c.execute("SELECT r.*, c.name cname FROM rules r JOIN categories c ON c.id=r.category_id "
                      "ORDER BY c.name, r.pattern").fetchall()
    return render(request, "categories.html", u, cats=cats, rules=rules, can_edit=u["role"] in ("owner", "accountant"))


@app.post("/categories")
def category_add(request: Request, name: str = Form(...), kind: str = Form(...), u=Depends(staff_cat)):
    if kind not in ("income", "expense") or not name.strip():
        raise HTTPException(400)
    cat.get_or_create_category(get_con(), name, kind)
    get_con().commit()
    flash(request, "Категорію додано")
    return RedirectResponse("/categories", status_code=303)


@app.post("/categories/{cid}")
def category_edit(request: Request, cid: int, name: str = Form(""), merge_into: int | None = Form(None),
                  u=Depends(staff_cat)):
    c = get_con()
    with lock():
        if merge_into and merge_into != cid:
            n = cat.merge_category(c, cid, merge_into, u["id"])
            flash(request, f"Об'єднано, перенесено операцій: {n}")
        elif name.strip():
            c.execute("UPDATE categories SET name=?, auto=0 WHERE id=?", (name.strip(), cid))
            flash(request, "Збережено")
        c.commit()
    return RedirectResponse("/categories", status_code=303)


@app.post("/rules")
def rule_add(request: Request, pattern: str = Form(...), category_id: int = Form(...), direction: str = Form("any"),
             apply: str = Form(""), u=Depends(staff_cat)):
    c = get_con()
    if direction not in ("any", "income", "expense"):
        raise HTTPException(400)
    with lock():
        cat.add_rule(c, category_id, pattern, direction, priority=10)
        n = cat.apply_rule_to_existing(c, category_id, pattern, None if direction == "any" else direction,
                                       u["id"]) if apply else 0
        c.commit()
    flash(request, f"Правило додано. Перерозподілено операцій: {n}")
    return RedirectResponse("/categories", status_code=303)


@app.post("/rules/{rid}/delete")
def rule_del(request: Request, rid: int, u=Depends(staff_cat)):
    get_con().execute("DELETE FROM rules WHERE id=?", (rid,))
    get_con().commit()
    return RedirectResponse("/categories", status_code=303)


# ---------- accounts (owner) ----------
@app.get("/accounts", response_class=HTMLResponse)
def accounts_page(request: Request, u=Depends(current_user)):
    c = get_con()
    bal = account_balances(c)
    accs = c.execute("SELECT * FROM accounts ORDER BY active DESC, sort, id").fetchall()
    logs = c.execute("SELECT l.*, a.name aname FROM sync_log l LEFT JOIN accounts a ON a.id=l.account_id "
                     "ORDER BY l.id DESC LIMIT 15").fetchall()
    return render(request, "accounts.html", u, accs=accs, bal=bal, logs=logs, is_owner=u["role"] == "owner",
                  last_sync=get_setting(c, "last_sync_all"))


@app.post("/accounts")
def account_save(request: Request, id: int | None = Form(None), name: str = Form(...), kind: str = Form(...),
                 source: str = Form(...), iban: str = Form(""), token: str = Form(""), opening: str = Form(""),
                 current: str = Form(""),
                 active: str = Form("1"), u=Depends(owner_only)):
    if kind not in ACC_KINDS or source not in SRC:
        raise HTTPException(400)
    c = get_con()
    def money_in(v):
        try:
            return round(float(v.replace(" ", "").replace("\u00a0", "").replace(",", ".")) * 100)
        except ValueError:
            raise HTTPException(400, "Некоректна сума залишку")

    op = money_in(opening) if opening.strip() else None
    cur_target = money_in(current) if current.strip() else None
    with lock():
        if id:
            c.execute("UPDATE accounts SET name=?,kind=?,source=?,iban=?,active=? WHERE id=?",
                      (name.strip(), kind, source, iban.strip().replace(" ", ""), int(active), id))
            if token.strip():
                c.execute("UPDATE accounts SET token_enc=? WHERE id=?", (encrypt(token.strip()), id))
            if op is not None:
                c.execute("UPDATE accounts SET opening_balance=?, opening_auto=1 WHERE id=?", (op, id))
            if cur_target is not None:  # balance as of now: opening = target - everything booked so far
                booked = account_balances(c)[id] - c.execute("SELECT opening_balance FROM accounts WHERE id=?", (id,)).fetchone()[0]
                c.execute("UPDATE accounts SET opening_balance=?, opening_auto=1 WHERE id=?", (cur_target - booked, id))
        else:
            c.execute("INSERT INTO accounts(name,kind,source,iban,token_enc,opening_balance,sort) "
                      "VALUES(?,?,?,?,?,?,(SELECT COALESCE(MAX(sort),0)+1 FROM accounts))",
                      (name.strip(), kind, source, iban.strip().replace(" ", ""),
                       encrypt(token.strip()), cur_target if cur_target is not None else (op or 0)))
        c.commit()
    flash(request, "Рахунок збережено")
    return RedirectResponse("/accounts", status_code=303)


@app.post("/accounts/{aid}/test")
def account_test(request: Request, aid: int, u=Depends(owner_only)):
    from .security import decrypt
    a = get_con().execute("SELECT * FROM accounts WHERE id=?", (aid,)).fetchone()
    try:
        if a["source"] != "privat":
            raise privat.PrivatError("Перевірка лише для рахунків Приватбанку")
        bal = privat.fetch_balance(decrypt(a["token_enc"]), a["iban"])
        flash(request, f"З'єднання з банком працює. Залишок: {money(bal)}")
    except Exception as e:
        flash(request, f"Помилка: {e}")
    return RedirectResponse("/accounts", status_code=303)


# ---------- users (owner) ----------
@app.get("/users", response_class=HTMLResponse)
def users_page(request: Request, u=Depends(owner_only)):
    return render(request, "users.html", u, users=get_con().execute("SELECT * FROM users ORDER BY id").fetchall())


@app.post("/users")
def user_save(request: Request, email: str = Form(...), name: str = Form(...), role: str = Form(...),
              password: str = Form(...), u=Depends(owner_only)):
    if role not in ROLES or len(password) < 8:
        raise HTTPException(400, "Пароль мінімум 8 символів")
    c = get_con()
    try:
        c.execute("INSERT INTO users(email,name,role,pw_hash) VALUES(?,?,?,?)",
                  (email.strip().lower(), name.strip(), role, hash_password(password)))
        c.commit()
        flash(request, "Користувача додано")
    except Exception:
        flash(request, "Такий email вже існує")
    return RedirectResponse("/users", status_code=303)


@app.post("/users/{uid}")
def user_update(request: Request, uid: int, role: str = Form(...), active: str = Form("1"),
                password: str = Form(""), u=Depends(owner_only)):
    if role not in ROLES:
        raise HTTPException(400)
    c = get_con()
    if uid == u["id"] and (role != "owner" or active != "1"):
        flash(request, "Не можна позбавити себе доступу власника")
        return RedirectResponse("/users", status_code=303)
    c.execute("UPDATE users SET role=?, active=? WHERE id=?", (role, int(active), uid))
    if password:
        if len(password) < 8:
            raise HTTPException(400, "Пароль мінімум 8 символів")
        c.execute("UPDATE users SET pw_hash=? WHERE id=?", (hash_password(password), uid))
    c.commit()
    flash(request, "Збережено")
    return RedirectResponse("/users", status_code=303)


@app.post("/password")
def change_password(request: Request, old: str = Form(...), new: str = Form(...), u=Depends(current_user)):
    if not verify_password(old, u["pw_hash"]) or len(new) < 8:
        flash(request, "Невірний поточний пароль або новий занадто короткий")
    else:
        get_con().execute("UPDATE users SET pw_hash=? WHERE id=?", (hash_password(new), u["id"]))
        get_con().commit()
        flash(request, "Пароль змінено")
    return RedirectResponse("/", status_code=303)


# ---------- JSON API (session or X-API-Token) ----------
@app.get("/api/balances")
def api_balances(_=Depends(api_user)):
    return {**reports.balances(get_con()), **sync.credit_summary(get_con())}


@app.get("/api/report")
def api_report(request: Request, _=Depends(api_user)):
    a, b, _p = _period(request)
    acc = int(request.query_params.get("account") or 0) or None
    r = reports.build(get_con(), a, b, acc)
    r["transactions"] = [dict(kind=t["kind"], at=t["occurred_at"], account=t["acc"], to=t["acc2"],
                              category=t["cat"], amount=t["amount"] / 100, counterparty=t["counterparty"],
                              description=t["description"], source=t["source"])
                         for t in r["transactions"]] if request.query_params.get("details") else []
    return JSONResponse(r)

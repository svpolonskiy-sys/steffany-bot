import json
from datetime import date, datetime

import pytest
from fastapi.testclient import TestClient

from app import alteg, categorize as cat, config, main, privat, reports, sync
from app.db import account_balances, connect
from app.security import encrypt


@pytest.fixture()
def client():
    main.con = connect(":memory:")
    c = TestClient(main.app, base_url="http://testserver")
    with c:
        pass
    main.bootstrap(main.con)
    r = c.post("/login", data={"email": "owner@x.ua", "password": "ownerpass1"}, follow_redirects=False)
    assert r.status_code == 303
    return c


def accid(name):
    return main.con.execute("SELECT id FROM accounts WHERE name=?", (name,)).fetchone()["id"]


def test_login_required():
    c = TestClient(main.app)
    main.con = connect(":memory:")
    main.bootstrap(main.con)
    r = c.get("/", follow_redirects=False)
    assert r.status_code == 303 and r.headers["location"] == "/login"


def test_manual_tx_balance_and_transfer(client):
    cash, safe = accid("Каса салон"), accid("Сейф")
    client.post("/accounts", data={"id": cash, "name": "Каса салон", "kind": "cash", "source": "alteg",
                                   "opening": "1000", "active": "1"})
    client.post("/transactions/new", data={"kind": "income", "account_id": cash, "amount": "500,50",
                                           "occurred_at": "2026-10-19T10:00", "description": "Послуга"})
    client.post("/transactions/new", data={"kind": "expense", "account_id": cash, "amount": "100",
                                           "occurred_at": "2026-10-19T11:00", "description": "молоко"})
    client.post("/transactions/new", data={"kind": "transfer", "account_id": cash, "to_account_id": safe,
                                           "amount": "300", "occurred_at": "2026-10-19T19:00", "description": "інкасація"})
    b = account_balances(main.con)
    assert b[cash] == 100000 + 50050 - 10000 - 30000 and b[safe] == 30000
    r = client.get("/").text
    assert "1 100,50 ₴" in r or "1 100,50" in r
    exp = main.con.execute("SELECT c.name FROM transactions t JOIN categories c ON c.id=t.category_id WHERE t.description='молоко'").fetchone()
    assert exp["name"] == "Продукти для клієнтів"


def test_edit_delete_keeps_history(client):
    a = accid("Робочі гроші")
    client.post("/transactions/new", data={"kind": "expense", "account_id": a, "amount": "50",
                                           "occurred_at": "2026-10-19T10:00", "description": "кава"})
    tid = main.con.execute("SELECT id FROM transactions").fetchone()["id"]
    client.post(f"/transactions/{tid}", data={"kind": "expense", "account_id": a, "amount": "70",
                                              "occurred_at": "2026-10-19T10:00", "description": "кава"})
    client.post(f"/transactions/{tid}/delete")
    assert account_balances(main.con)[a] == 0
    acts = [r["action"] for r in main.con.execute("SELECT action FROM audit WHERE tx_id=? ORDER BY id", (tid,))]
    assert acts == ["create", "update", "delete"]
    client.post(f"/transactions/{tid}/restore")
    assert account_balances(main.con)[a] == -7000
    assert client.get(f"/transactions/{tid}").status_code == 200


def test_rule_applies_to_existing_auto(client):
    a = accid("ФОП 1")
    cid = cat.get_or_create_category(main.con, "Косметика ТОВ Ромашка", "expense", auto=True)
    from app.db import insert_tx
    insert_tx(main.con, account_id=a, kind="expense", amount=1000, occurred_at="2026-10-01T10:00:00",
              description="Оплата за товар", counterparty="ТОВ Ромашка", category_id=cid, source="privat",
              external_id="p1")
    main.con.commit()
    mat = cat.get_or_create_category(main.con, "Матеріал в роботу", "expense")
    client.post("/rules", data={"pattern": "ромашка", "category_id": mat, "direction": "expense", "apply": "1"})
    assert main.con.execute("SELECT category_id FROM transactions").fetchone()[0] == mat


def test_auto_category_creation():
    con = connect(":memory:")
    cat.seed(con)
    c1 = cat.categorize(con, "expense", "Оплата за послуги", "ТОВ \"Ромашка\"")
    assert con.execute("SELECT name,auto FROM categories WHERE id=?", (c1,)).fetchone()["name"] == "ТОВ Ромашка"
    c2 = cat.categorize(con, "income", "Зарахування торгової виручки по терміналу 123", "")
    assert con.execute("SELECT name FROM categories WHERE id=?", (c2,)).fetchone()["name"] == "Оплата послуг"
    c3 = cat.categorize(con, "income", "Переказ від Іванов", "Іванов Іван")
    assert con.execute("SELECT name FROM categories WHERE id=?", (c3,)).fetchone()["name"] == "Інші доходи"


PRIVAT_TX = [
    {"ID": "1", "TRANTYPE": "C", "SUM": "1500.50", "CCY": "UAH", "OSND": "Зарахування торгової виручки по терміналу 777",
     "AUT_CNTR_NAM": "АТ КБ ПРИВАТБАНК", "DATE_TIME_DAT_OD_TIM_P": "15.09.2026 13:05:00"},
    {"ID": "2", "TRANTYPE": "D", "SUM": "200.00", "CCY": "UAH", "OSND": "Комісія за переказ", "AUT_CNTR_NAM": "",
     "DAT_OD": "16.09.2026", "TIM_P": "10:00"},
    {"ID": "3", "TRANTYPE": "D", "SUM": "5.00", "CCY": "USD", "OSND": "x", "DAT_OD": "16.09.2026", "TIM_P": "10:00"},
]


class FakeResp:
    def __init__(self, data, code=200):
        self.content = json.dumps(data, ensure_ascii=False).encode()
        self.status_code = code


class FakePrivat:
    def get(self, url, **kw):
        if url.endswith("/balance"):
            return FakeResp({"status": "SUCCESS", "balances": [{"acc": "UA1", "balanceOut": "1300.50"}]})
        return FakeResp({"status": "SUCCESS", "transactions": PRIVAT_TX, "exist_next_page": False})


def test_privat_sync_idempotent_and_opening(client):
    a = main.con.execute("SELECT * FROM accounts WHERE name='ФОП 1'").fetchone()
    main.con.execute("UPDATE accounts SET iban='UA1', token_enc=? WHERE id=?", (encrypt("tok"), a["id"]))
    main.con.commit()
    a = main.con.execute("SELECT * FROM accounts WHERE id=?", (a["id"],)).fetchone()
    assert sync.sync_privat(main.con, a, session=FakePrivat()) == (2, 0)
    a = main.con.execute("SELECT * FROM accounts WHERE id=?", (a["id"],)).fetchone()
    assert account_balances(main.con)[a["id"]] == 130050  # equals bank balance
    main.con.execute("UPDATE accounts SET last_sync_at='2026-10-19T09:00:00', last_sync_status='ok' WHERE id=?", (a["id"],))
    a = main.con.execute("SELECT * FROM accounts WHERE id=?", (a["id"],)).fetchone()
    assert sync.sync_privat(main.con, a, session=FakePrivat()) == (0, 0)


ALTEG_ROWS = [
    {"id": 1, "date": "2026-10-19T15:30:00+0400", "amount": 600, "comment": "", "expense": {"title": "Services rendered"}},
    {"id": 2, "date": "2026-10-19T14:18:00+0400", "amount": 284, "comment": "Соловко", "expense": {"title": "Product sales"}},
    {"id": 3, "date": "2026-10-18T19:05:47+0400", "amount": -3360, "comment": "Зп прибиральниці", "expense": {"title": ""}},
    {"id": 4, "date": "2026-10-15T16:38:24+0400", "amount": -61000, "comment": "інкасація", "expense": {"title": ""}},
]


class FakeAlteg:
    def __init__(self, rows):
        self.rows = rows

    def cash_transactions(self, s, e, account_id=None):
        if account_id == config.ALTEG_CASHLESS_ACCOUNT:
            return [{"id": 900, "date": "2026-10-19T12:00:00+0400", "amount": 16250, "record_id": 70,
                     "sold_item_type": "service", "sold_item_id": 5, "expense": {"title": "Services rendered"}}]
        return self.rows

    def records(self, s, e):
        return [{"id": 70, "staff": {"id": 9, "name": "Майстер Тест", "specialization": "Перукар"},
                 "services": [{"id": 5, "title": "Стрижка"}]}]

    def record(self, rid):
        return None

    def services(self):
        return [{"id": 5, "title": "Стрижка", "category_id": 1}]

    def service_categories(self):
        return [{"id": 1, "title": "Перукарня"}]


def test_alteg_sync_mapping_and_removal(client):
    acc = main.con.execute("SELECT * FROM accounts WHERE name='Каса салон'").fetchone()
    assert sync.sync_alteg(main.con, acc, client=FakeAlteg(ALTEG_ROWS)) == (4, 0)
    safe = accid("Сейф")
    b = account_balances(main.con)
    assert b[acc["id"]] == 60000 + 28400 - 336000 - 6100000 and b[safe] == 6100000
    cats = {r["description"]: r["name"] for r in main.con.execute(
        "SELECT t.description, c.name FROM transactions t LEFT JOIN categories c ON c.id=t.category_id")}
    assert cats["Соловко"] == "Продаж товарів" and cats["Зп прибиральниці"] == "Витрати на персонал"
    acc = main.con.execute("SELECT * FROM accounts WHERE id=?", (acc["id"],)).fetchone()
    # second run: a row vanished in Alteg, one amount changed
    rows = [dict(ALTEG_ROWS[0], amount=650)] + ALTEG_ROWS[2:]
    main.con.execute("UPDATE accounts SET last_sync_at='2026-10-19T09:00:00', last_sync_status='ok'")
    acc = main.con.execute("SELECT * FROM accounts WHERE id=?", (acc["id"],)).fetchone()
    a, u = sync.sync_alteg(main.con, acc, client=FakeAlteg(rows))
    assert a == 0 and u == 2
    assert account_balances(main.con)[acc["id"]] == 65000 - 336000 - 6100000


def test_alteg_cashless_sales_feed_daily_takings(client):
    acc = main.con.execute("SELECT * FROM accounts WHERE name='Каса салон'").fetchone()
    sync.sync_alteg(main.con, acc, client=FakeAlteg(ALTEG_ROWS))
    d = {x["date"]: x for x in reports.daily_cash(main.con, "2026-10-19", "2026-10-19")["days"]}["2026-10-19"]
    assert d["cashless"] == 1625000 and d["cash"] == 88400 and d["total"] == 1713400
    assert main.con.execute("SELECT COUNT(*) FROM transactions WHERE amount=1625000").fetchone()[0] == 0  # not in ledger
    det = reports.takings_detail(main.con, "2026-10-19", "2026-10-19")
    m = {x["name"]: x for x in det["masters"]}
    assert m["Майстер Тест"]["total"] == 1625000 and det["categories"][0]["title"] in ("Перукарня", "Оплата послуг", "Без напрямку", "Інше")
    assert det["total"] == det["cash"] + det["cashless"] == 1713400
    assert client.get("/cash/detail").status_code == 200 and "Майстер Тест" in client.get("/cash/detail?date_from=2026-10-19&date_to=2026-10-19").text
    assert client.get("/cash/detail?preset=30").status_code == 200


def test_window_and_reports(client):
    assert sync.in_work_window(datetime(2026, 10, 19, 12, tzinfo=config.KYIV))
    assert not sync.in_work_window(datetime(2026, 10, 19, 21, 0, tzinfo=config.KYIV))
    assert not sync.in_work_window(datetime(2026, 10, 19, 7, 59, tzinfo=config.KYIV))
    cash = accid("Каса салон")
    client.post("/transactions/new", data={"kind": "income", "account_id": cash, "amount": "1000",
                                           "occurred_at": "2026-10-19T10:00", "description": "x"})
    for u in ("/reports?preset=month", "/reports?date_from=2026-10-01&date_to=2026-10-31", "/transactions",
              "/categories", "/accounts", "/users", "/transactions/new", "/transactions/export.csv"):
        assert client.get(u).status_code == 200, u
    x = client.get("/reports/export.xlsx?date_from=2026-10-01&date_to=2026-10-31")
    assert x.status_code == 200 and x.content[:2] == b"PK"
    r = client.get("/api/report?date_from=2026-10-19&date_to=2026-10-19").json()
    assert r["income"] == 100000
    anon = TestClient(main.app)
    assert anon.get("/api/balances", headers={"x-api-token": "tok123"}).status_code == 200
    assert anon.get("/api/balances", follow_redirects=False).status_code == 303


def _login(email, pw):
    c = TestClient(main.app, base_url="http://testserver")
    r = c.post("/login", data={"email": email, "password": pw}, follow_redirects=False)
    assert r.status_code == 303
    return c


def test_roles_permissions_and_audit(client):
    # owner creates an administrator with a temporary password
    r = client.post("/users", data={"email": "adm@x.ua", "name": "Адмін Оля", "role": "admin", "title": "Адміністратор", "password": "temp-pass-1"}, follow_redirects=True)
    assert r.status_code == 200 and "temp-pass-1" in r.text and "Доступ для" in r.text      # shown once
    assert "temp-pass-1" not in client.get("/users").text                                     # ...and only once
    adm = _login("adm@x.ua", "temp-pass-1")
    assert adm.get("/transactions", follow_redirects=False).headers["location"] == "/password"   # must choose own password first
    assert adm.post("/password", data={"old": "temp-pass-1", "new": "temp-pass-1"}, follow_redirects=False).status_code == 400  # same password refused
    assert adm.post("/password", data={"old": "temp-pass-1", "new": "my-own-pass-2"}, follow_redirects=False).headers["location"] == "/"
    assert adm.get("/transactions").status_code == 200
    # administrator: operational pages yes, owner/analytics pages no
    for u in ("/users", "/activity", "/pl", "/payroll", "/credits", "/pl/export.xlsx"):
        assert adm.get(u, follow_redirects=False).status_code == 403, u
    assert adm.post("/accounts", data={"name": "x", "kind": "cash", "source": "manual"}).status_code == 403
    assert adm.post("/categories", data={"name": "x", "kind": "expense"}).status_code == 403
    assert adm.get("/transactions/new").status_code == 200 and adm.get("/cash").status_code == 200
    assert "P&amp;L" not in adm.get("/").text and "Користувачі" not in adm.get("/").text   # menu hides what is not allowed
    # what the administrator does is attributed to them
    cash = accid("Каса салон")
    adm.post("/transactions/new", data={"kind": "expense", "account_id": cash, "amount": "123", "occurred_at": "2026-10-19T10:00", "description": "кава"})
    tid = main.con.execute("SELECT id FROM transactions ORDER BY id DESC LIMIT 1").fetchone()["id"]
    adm.post(f"/transactions/{tid}", data={"kind": "expense", "account_id": cash, "amount": "150", "occurred_at": "2026-10-19T10:00", "description": "кава"})
    adm.post(f"/transactions/{tid}/delete")
    act = client.get("/activity?date_from=2026-01-01&date_to=2099-01-01").text
    assert "Адмін Оля" in act and "додав операцію" in act and "змінив операцію" in act and "видалив операцію" in act
    assert "сума: 123,00 ₴ → 150,00 ₴" in act                                                  # before -> after
    assert "вхід" in client.get("/activity?kind=login&date_from=2026-01-01&date_to=2099-01-01").text
    # author is visible in the list and can be filtered
    assert "Адмін Оля" in client.get("/transactions?show=deleted").text
    uid = main.con.execute("SELECT id FROM users WHERE email='adm@x.ua'").fetchone()["id"]
    assert "Знайдено операцій" in client.get(f"/transactions?author={uid}&author=system").text
    # owner grants analytics -> rights apply at next login (old session is closed)
    client.post(f"/users/{uid}", data={"role": "admin", "active": "1", "title": "Керівник салону", "perm": "analytics"})
    assert adm.get("/pl", follow_redirects=False).headers["location"] == "/login"
    adm2 = _login("adm@x.ua", "my-own-pass-2")
    assert adm2.get("/pl").status_code == 200 and adm2.get("/payroll").status_code == 200 and adm2.get("/users", follow_redirects=False).status_code == 403
    assert adm2.post("/categories", data={"name": "x", "kind": "expense"}).status_code == 403   # no 'categories' right granted
    # 'log out everywhere' and password reset
    client.post(f"/users/{uid}/logout-all")
    assert adm2.get("/transactions", follow_redirects=False).headers["location"] == "/login"
    r = client.post(f"/users/{uid}/reset", follow_redirects=True)
    assert "Тимчасовий пароль" in r.text
    # a deactivated user cannot log in
    client.post(f"/users/{uid}", data={"role": "admin", "active": "0", "title": "", "perm": ""})
    assert TestClient(main.app).post("/login", data={"email": "adm@x.ua", "password": "my-own-pass-2"}, follow_redirects=False).headers["location"] == "/login"
    assert client.post("/logout", headers={"origin": "http://evil.example"}).status_code == 403



def test_short_patterns_are_whole_words():
    con = connect(":memory:")
    cat.seed(con)
    name = lambda i: con.execute("SELECT name FROM categories WHERE id=?", (i,)).fetchone()["name"]
    assert name(cat.categorize(con, "expense", "Оплата грошові кошти забезпечення зг рах", "")) == "Інші витрати"
    assert name(cat.categorize(con, "expense", "зп на карту Іванова", "")) == "Зарплата"
    assert name(cat.categorize(con, "expense", "Комiсiя по еквайрингу за вересень", "")) == "Комісія банку"


class FakeBank:
    def get(self, url, **kw):
        if url.endswith("/balance"):
            b = [{"acc": "UA1", "currency": "UAH", "atp": "T", "balanceOut": "1000.00"},
                 {"acc": "UA9", "currency": "UAH", "atp": "L", "balanceOut": "-5000.00"},
                 {"acc": "UA8", "currency": "UAH", "atp": "L", "balanceOut": "0.00"}]
            if kw.get("params", {}).get("acc"):
                b = [x for x in b if x["acc"] == kw["params"]["acc"]]
            return FakeResp({"status": "SUCCESS", "balances": b})
        acc = kw["params"]["acc"]
        tx = [{"ID": "k1", "TRANTYPE": "C", "SUM": "700.00", "CCY": "UAH", "OSND": "Погашення",
               "DATE_TIME_DAT_OD_TIM_P": "10.10.2026 10:00:00"}] if acc == "UA9" else []
        return FakeResp({"status": "SUCCESS", "transactions": tx})


def test_credit_lines_separate_from_cash(client):
    a = main.con.execute("SELECT * FROM accounts WHERE name='ФОП 1'").fetchone()
    main.con.execute("UPDATE accounts SET iban='UA1', token_enc=? WHERE id=?", (encrypt("tok"), a["id"]))
    main.con.commit()
    a = main.con.execute("SELECT * FROM accounts WHERE id=?", (a["id"],)).fetchone()
    assert sync.sync_account(main.con, a, session=FakeBank()) is not None
    cs = sync.credit_summary(main.con)
    assert cs["total_debt"] == 500000 and len(cs["credits"]) == 1  # UA8 has no debt/activity -> not created
    assert cs["credits"][0]["repaid"] == 70000
    assert reports.balances(main.con)["total"] == 100000  # credit not in cash total
    assert client.get("/credits").status_code == 200 and "5 000,00" in client.get("/credits").text
    assert "Кредити — контроль погашення" not in client.get("/").text


def test_transfer_between_own_fops_counted_once(client):
    ids = {}
    for name, iban in (("ФОП 1", "UAA"), ("ФОП 2", "UAB")):
        main.con.execute("UPDATE accounts SET iban=?, token_enc=? WHERE name=?", (iban, encrypt("t"), name))
    main.con.commit()

    class Bank:
        def get(self, url, **kw):
            acc = kw["params"].get("acc")
            if url.endswith("/balance"):
                return FakeResp({"status": "SUCCESS", "balances": [{"acc": acc, "balanceOut": "0.00"}] if acc else []})
            base = {"CCY": "UAH", "SUM": "100.00", "OSND": "Оплата за товар", "AUT_MY_NAM": "X",
                    "DATE_TIME_DAT_OD_TIM_P": "10.10.2026 10:00:00"}
            if acc == "UAA":
                return FakeResp({"status": "SUCCESS", "transactions": [dict(base, ID="1", TRANTYPE="D", AUT_CNTR_ACC="UAB")]})
            return FakeResp({"status": "SUCCESS", "transactions": [dict(base, ID="2", TRANTYPE="C", AUT_CNTR_ACC="UAA")]})

    for name in ("ФОП 1", "ФОП 2"):
        a = main.con.execute("SELECT * FROM accounts WHERE name=?", (name,)).fetchone()
        sync.sync_account(main.con, a, session=Bank())
    rows = main.con.execute("SELECT kind FROM transactions").fetchall()
    assert [r["kind"] for r in rows] == ["transfer"]
    assert reports.build(main.con, "2026-10-01", "2026-10-31")["income"] == 0


def test_set_current_balance(client):
    cash = accid("Каса салон")
    client.post("/transactions/new", data={"kind": "income", "account_id": cash, "amount": "266,27",
                                           "occurred_at": "2026-10-19T10:00", "description": "x"})
    client.post("/accounts", data={"id": cash, "name": "Каса салон", "kind": "cash", "source": "alteg",
                                   "current": "28 227,03", "active": "1"})
    assert account_balances(main.con)[cash] == 2822703
    client.post("/transactions/new", data={"kind": "expense", "account_id": cash, "amount": "27,03",
                                           "occurred_at": "2026-10-19T11:00", "description": "молоко"})
    assert account_balances(main.con)[cash] == 2820000


def test_excluded_categories_and_contract_summary(client):
    cash = accid("Каса салон")
    cid = cat.get_or_create_category(main.con, "Кредит", "income")
    client.post("/transactions/new", data={"kind": "income", "account_id": cash, "amount": "1000",
                                           "occurred_at": "2026-10-19T10:00", "category_id": cid})
    client.post("/transactions/new", data={"kind": "income", "account_id": cash, "amount": "500",
                                           "occurred_at": "2026-10-19T10:00", "description": "послуга"})
    r = reports.build(main.con, "2026-10-01", "2026-10-31")
    assert r["income"] == 50000 and r["excluded"][0]["sum"] == 100000
    assert account_balances(main.con)[cash] == 150000  # still in the cash balance
    # contract summary: principal acct + overdue acct + interest acct
    ids = {}
    for iban, bal in (("P", -10000), ("V", 0), ("I", -100)):
        ids[iban] = main.con.execute(
            "INSERT INTO accounts(name,kind,source,iban,bank_balance) VALUES(?,?,?,?,?)",
            (iban, "credit", "privat", iban, bal)).lastrowid
    ops = [("P", "D", 20000, "Перерахування коштiв згiдно з кредитним договором КД-2"),
           ("P", "C", 5000, "Винос кредита на прострочення по договору КД-2"),
           ("V", "D", 5000, "Винос кредита на прострочення по договору КД-2"),
           ("V", "C", 5000, "Погашення заборгованостi за кредитним договором КД-2"),
           ("P", "C", 5000, "Погашення заборгованостi за кред.договором КД-2"),
           ("I", "D", 300, "Нарахування вiдсоткiв згiдно кредитного договору КД-2"),
           ("I", "C", 200, "Погашення вiдсоткiв по кредитному договору КД-2")]
    for i, (a, d, amt, desc) in enumerate(ops):
        main.con.execute("INSERT INTO credit_ops(account_id,external_id,occurred_at,direction,amount,description) VALUES(?,?,?,?,?,?)",
                         (ids[a], f"e{i}", "2026-10-0%dT10:00:00" % (i + 1), d, amt, desc))
    main.con.commit()
    c = sync.credit_summary(main.con)["contracts"][0]
    assert (c["taken"], c["repaid"], c["principal_debt"]) == (20000, 10000, 10000)
    assert (c["interest_accrued"], c["interest_paid"], c["debt"]) == (300, 200, 10100)


def test_search_is_case_insensitive_for_cyrillic(client):
    a = accid("Робочі гроші")
    client.post("/transactions/new", data={"kind": "expense", "account_id": a, "amount": "50",
                                           "occurred_at": "2026-10-19T10:00", "description": "Зняття готівки в банкоматі"})
    assert "<mark>готівки</mark>" in client.get("/transactions?q=ГОТІВКИ").text


def test_inline_category_change_creates_rule_for_future(client):
    a = accid("Каса салон")
    for d in ("альфа смс поповнення", "альфа смс поповнення картки"):
        client.post("/transactions/new", data={"kind": "expense", "account_id": a, "amount": "100",
                                               "occurred_at": "2026-10-19T10:00", "description": d})
    ids = [r["id"] for r in main.con.execute("SELECT id FROM transactions ORDER BY id")]
    target = cat.get_or_create_category(main.con, "Інтернет", "expense")
    assert cat.suggest_pattern("альфа смс поповнення картки 123", "") == "альфа смс поповнення картки"
    r = client.post(f"/transactions/{ids[0]}/category", data={"category_id": target, "rule_text": "альфа смс"})
    assert r.json() == {"ok": True, "similar": 1}
    got = [r["category_id"] for r in main.con.execute("SELECT category_id FROM transactions ORDER BY id")]
    assert got == [target, target]
    # future import with the same words follows the user's choice
    assert cat.categorize(main.con, "expense", "Альфа СМС оплата", "") == target
    # wrong kind is rejected
    inc = cat.get_or_create_category(main.con, "Оплата послуг", "income")
    assert client.post(f"/transactions/{ids[0]}/category", data={"category_id": inc}).status_code == 400
    assert "catsel" in client.get("/transactions").text


def test_transfer_button_and_presets(client):
    assert "⇄ Переказ" in client.get("/").text
    page = client.get("/transactions/new?kind=transfer").text
    assert "Інкасація: каса → сейф" in page
    cash, safe = accid("Каса салон"), accid("Сейф")
    page = client.get(f"/transactions/new?kind=transfer&from_acc={cash}&to_acc={safe}&desc=Інкасація").text
    assert f'<option value="{cash}" selected>' in page and f'<option value="{safe}" selected>' in page


def test_cash_by_day(client):
    cash, safe, fop = accid("Каса салон"), accid("Сейф"), accid("ФОП 1")
    client.post("/accounts", data={"id": cash, "name": "Каса салон", "kind": "cash", "source": "alteg", "current": "1000", "active": "1"})
    post = lambda **kw: client.post("/transactions/new", data=kw)
    post(kind="income", account_id=cash, amount="500", occurred_at="2026-10-18T10:00", description="a")
    post(kind="income", account_id=fop, amount="700", occurred_at="2026-10-18T12:00", description="b")
    main.con.execute("INSERT INTO alteg_sales(external_id,occurred_at,amount,title) VALUES('s1','2026-10-18T13:00:00',30000,'x')")
    main.con.commit()
    post(kind="expense", account_id=cash, amount="100", occurred_at="2026-10-19T10:00", description="молоко")
    post(kind="transfer", account_id=cash, to_account_id=safe, amount="300", occurred_at="2026-10-19T19:00", description="Інкасація")
    r = reports.daily_cash(main.con, "2026-10-17", "2026-10-19")
    d = {x["date"]: x for x in r["days"]}
    assert d["2026-10-18"]["cash"] == 50000 and d["2026-10-18"]["cashless"] == 30000 and d["2026-10-18"]["total"] == 80000 and d["2026-10-18"]["bank"] == 70000
    assert d["2026-10-19"]["expense"] == 10000 and d["2026-10-19"]["incasso"] == 30000
    assert r["closing"] == 110000 and d["2026-10-18"]["closing"] == 110000 + 10000 + 30000
    assert d["2026-10-17"]["closing"] == d["2026-10-18"]["closing"] - 50000
    assert client.get("/cash").status_code == 200 and client.get("/cash?preset=7").status_code == 200
    t = client.get("/cash?preset=today").text
    assert "Сьогодні" in t and "Вчора" in t and client.get("/cash?preset=yesterday").status_code == 200
    assert client.get("/cash/export.xlsx?date_from=2026-10-01&date_to=2026-10-19").content[:2] == b"PK"
    assert client.get("/cash?date_from=2026-10-19&date_to=2026-10-01").status_code == 400


def test_alteg_client_retries_dropped_connections(monkeypatch):
    import requests as rq
    monkeypatch.setattr("app.alteg.time.sleep", lambda s: None)
    calls = {"n": 0}

    class Sess:
        def get(self, url, **kw):
            calls["n"] += 1
            if calls["n"] < 3:
                raise rq.ConnectionError("Connection aborted")
            class R:
                status_code = 200

                def json(self):
                    return {"success": True, "data": []}
            return R()

    c = alteg.AltegClient(session=Sess())
    c.user_token = "x"
    assert c.records("2026-10-01", "2026-10-02") == [] and calls["n"] == 3


def test_pl_formulas(client):
    from app import pl
    cash = accid("Каса салон")
    fop = accid("ФОП 1")
    cc = lambda n, k: cat.get_or_create_category(main.con, n, k)
    main.con.executemany("INSERT INTO alteg_pay(external_id,occurred_at,amount,method,service_title,category_title,item_type) VALUES(?,?,?,?,?,?,?)", [
        ("a1", "2026-10-05T10:00:00", 1000000, "cash", "Стрижка", "Перукарські послуги", "service"),
        ("a2", "2026-10-05T11:00:00", 500000, "cashless", "Манікюр", "Манікюр та педикюр", "service"),
        ("a3", "2026-10-06T11:00:00", 100000, "cash", "Товар", "Товари", "goods_transaction"),
        ("a4", "2026-10-06T12:00:00", 50000, "cash", "Сертифікат", "Сертифікати", "")])
    post = lambda **kw: client.post("/transactions/new", data=kw)
    post(kind="expense", account_id=cash, amount="2000", occurred_at="2026-10-07T10:00", category_id=cc("Матеріал в роботу", "expense"), description="гель")
    post(kind="expense", account_id=fop, amount="5000", occurred_at="2026-10-08T10:00", category_id=cc("Зарплата", "expense"), description="Заробітна плата за вересень 2026")
    post(kind="expense", account_id=fop, amount="1000", occurred_at="2026-10-08T10:00", category_id=cc("Податки", "expense"), description="101 ЄСВ / з/п за вересень")
    post(kind="expense", account_id=fop, amount="500", occurred_at="2026-10-09T10:00", category_id=cc("Податки", "expense"), description="Єдиний податок")
    post(kind="expense", account_id=fop, amount="3000", occurred_at="2026-10-09T10:00", category_id=cc("Оренда", "expense"), description="орендна плата за жовтень")
    post(kind="expense", account_id=fop, amount="400", occurred_at="2026-10-09T10:00", category_id=cc("Кредит", "expense"), description="Погашення")
    post(kind="income", account_id=fop, amount="999", occurred_at="2026-10-09T10:00", category_id=cc("Оплата послуг", "income"), description="термінал (вже в Alteg)")
    post(kind="income", account_id=fop, amount="300", occurred_at="2026-10-09T10:00", category_id=cc("Суборенда", "income"), description="суборенда")
    main.con.execute("INSERT INTO credit_ops(account_id,external_id,occurred_at,direction,amount,description) VALUES(?,?,?,?,?,?)",
                     (main.con.execute("INSERT INTO accounts(name,kind,source) VALUES('кр','credit','privat')").lastrowid, "i1", "2026-10-10T03:00:00", "D", 4000, "Нарахування відсотків КД-1"))
    main.con.commit()
    c = pl.compute(main.con, __import__("datetime").date(2026, 10, 1), __import__("datetime").date(2026, 10, 31))
    assert c["sales"] == 1600000 and c["goods"] == 100000 and c["gift"] == 50000        # gift card is not revenue
    assert c["oi"] == 30000 and c["revenue"] == 1630000                                    # bank terminal credit not double counted
    assert c["cogs"] == 200000 and c["gross"] == 1430000
    assert c["labour"] == 500000 + 100000 and c["contribution"] == 830000                  # ЄСВ counted as labour
    assert c["opex"] == 300000 and c["ebitda"] == 530000
    assert c["interest"] == 4000 and c["tax"] == 50000 and c["net"] == 530000 - 4000 - 50000
    assert ("expense", "Кредит") in c["nonpl"]
    # accrual: salary "за вересень" moves to September
    sep = pl.compute(main.con, __import__("datetime").date(2026, 9, 1), __import__("datetime").date(2026, 9, 30), accrual=True)
    assert sep["labour"] == 500000 + 100000
    rep = pl.build(main.con, "2026-10-01", "2026-10-31")
    assert rep["lines"][-1]["label"] == "ЧИСТИЙ ПРИБУТОК" and rep["lines"][-1]["amount"] == c["net"]
    for u in ("/pl", "/pl?preset=prev_month&accrual=1", "/pl?date_from=2026-09-01&date_to=2026-10-31", "/categories"):
        assert client.get(u).status_code == 200, u
    assert client.get("/pl/export.xlsx").content[:2] == b"PK"
    assert client.get("/api/pl?date_from=2026-10-01&date_to=2026-10-31", headers={"x-api-token": "tok123"}).json()["lines"]


def _fake_sheet(path, rows_by_sheet):
    from openpyxl import Workbook
    wb = Workbook()
    wb.remove(wb.active)
    for title, secs in rows_by_sheet.items():
        ws = wb.create_sheet(title)
        ws.append(["Салон краси Steffany -"])
        ws.append(["Місяць:", None, title])
        for sec, hdr, people in secs:
            ws.append([sec])
            ws.append(["№", "Прізвище, ім'я"] + hdr)
            for i, (name, *vals) in enumerate(people, 1):
                ws.append([float(i), name] + list(vals))
            ws.append([None, "РАЗОМ"])
        ws.append(["ЗВЕДЕНІ ПОКАЗНИКИ"])
    wb.save(path)


def test_payroll_import_and_pl_uses_it(client, tmp_path):
    import datetime
    from app import payroll, pl
    f = tmp_path / "zp.xlsx"
    hdr = ["Відпрац.\nзмін", "Сума\nпродажів", "Каса\nза місяць", "Нарахув.\n%", "Зарплата", "Податки", "Відпускні", "Лікарняні", "Штраф/списання"]
    _fake_sheet(f, {"Вересень 2026": [
        ("ПЕРУКАРІ", hdr, [("Майстер А", 10, 0, 100000, 40000, 40000, 2000, 0, 0, 1000)]),
        ("ІНШІ ПРАЦІВНИКИ", ["ЗП", "Аванс", "До виплати"], [("Завгосп", 8000, 0, 8000)])],
        "жовтень2026": [("ІНШІ ПРАЦІВНИКИ", ["ЗП", "Аванс", "До виплати"], [("Завгосп", 8000, 8000, 0)])]})
    data = payroll.parse(f.read_bytes(), 2026)
    assert sorted(data) == ["2026-09", "2026-10"]
    p = data["2026-09"][0]
    assert (p["section"], p["gross"], p["fines"]) == ("Перукарі", 4000000, 100000)
    main.con.executemany("INSERT INTO payroll(month,section,name,gross,vacation,sick,fines,taxes,sales) VALUES(?,?,?,?,?,?,?,?,?)",
                         [("2026-09", r["section"], r["name"], r["gross"], r["vacation"], r["sick"], r["fines"], r["taxes"], r["sales"]) for r in data["2026-09"]] +
                         [("2026-10", r["section"], r["name"], r["gross"], r["vacation"], r["sick"], r["fines"], r["taxes"], r["sales"]) for r in data["2026-10"]])
    assert payroll.covered_months(main.con) == ["2026-09"]          # half-filled October is NOT a filled month
    d = datetime.date
    # ledger: salary payment (cash settlement), ЄСВ for September paid in October, ПДФО
    fop = accid("ФОП 1")
    cc = lambda n, k: cat.get_or_create_category(main.con, n, k)
    post = lambda **kw: client.post("/transactions/new", data=kw)
    post(kind="expense", account_id=fop, amount="30000", occurred_at="2026-10-03T10:00", category_id=cc("Зарплата", "expense"), description="Заробітна плата за вересень")
    post(kind="expense", account_id=fop, amount="2000", occurred_at="2026-10-03T10:00", category_id=cc("Податки", "expense"), description="101 ЄСВ / з/п за вересень")
    post(kind="expense", account_id=fop, amount="1000", occurred_at="2026-10-03T10:00", category_id=cc("Податки", "expense"), description="101 ПДФО/ з/п за вересень")
    c = pl.compute(main.con, d(2026, 9, 1), d(2026, 9, 30))
    assert c["pay_mode"] and c["pay"]["Перукарі"] == 3900000 and c["pay"]["Інші працівники"] == 800000
    assert c["esv"] == 200000 and c["pit"] == 100000 and c["paid_payroll"] == 0  # salary was paid on 3 Oct
    assert c["labour"] == 3900000 + 800000 + 200000                  # payroll + ЄСВ; salary payment and ПДФО not added again
    # October is estimated from Alteg takings (40%) + fixed part carried over from September
    main.con.execute("INSERT INTO alteg_pay(external_id,occurred_at,amount,method,staff_id,staff_name,staff_role,service_title,category_title,item_type) VALUES('p1','2026-10-05T10:00:00',1000000,'cash',1,'Майстер А','Перукар','Стрижка','Перукарські послуги','service')")
    main.con.commit()
    o = pl.compute(main.con, d(2026, 10, 1), d(2026, 10, 31))
    assert o["est_months"] == ["2026-10"] and o["pay"]["Перукарі"] == 400000 and o["pay"]["Інші працівники"] == 800000
    assert o["paid_payroll"] == 3000000 and o["esv"] == 51064   # ЄСВ accrued at last month rate (2000 / 47000)


def test_rent_is_accrued_for_running_month(client):
    from app import pl
    d = __import__("datetime").date
    fop = accid("ФОП 1")
    rent = cat.get_or_create_category(main.con, "Оренда", "expense")
    client.post("/transactions/new", data=dict(kind="expense", account_id=fop, amount="31000", occurred_at="2026-09-05T10:00",
                                               category_id=rent, description="орендна плата за вересень"))
    a = pl.compute(main.con, d(2026, 10, 1), d(2026, 10, 15), accrual=True)
    assert sum(a["exp"]["rent"].values()) == 3100000 * 15 // 30 or abs(sum(a["exp"]["rent"].values()) - 3100000 * 15 / 31) < 2
    b = pl.compute(main.con, d(2026, 10, 1), d(2026, 10, 15), accrual=False)
    assert "rent" not in b["exp"]                     # no estimate when costs are shown by payment date
    c = pl.compute(main.con, d(2026, 9, 1), d(2026, 9, 30), accrual=True)
    assert sum(c["exp"]["rent"].values()) == 3100000  # real payment, no estimate on top


def test_admin_and_manager_rules_estimate(client):
    from app import payroll
    d = __import__("datetime").date
    ins = lambda sec, name, **kw: main.con.execute(
        "INSERT INTO payroll(month,section,name,gross,hours,shifts,rate,retail,sales) VALUES('2026-09',?,?,?,?,?,?,?,?)",
        (sec, name, kw.get("gross", 0), kw.get("hours", 0), kw.get("shifts", 0), kw.get("rate", 0), kw.get("retail", 0), kw.get("sales", 0)))
    ins("Перукарі", "М1", gross=40000000, sales=100000000)              # needed so the month counts as filled
    ins("Адміністратори", "А1", gross=1, hours=300, shifts=30, rate=7000, retail=1000000)
    ins("Адміністратори", "А2", gross=1, hours=300, shifts=30, rate=7000)
    ins("Інші працівники", "Банцер Мирослава", gross=1500000)
    ins("Інші працівники", "Стельмах Юлія", gross=3300000)
    main.con.execute("INSERT INTO alteg_pay(external_id,occurred_at,amount,method,staff_id,staff_name,staff_role,category_title,item_type) "
                     "VALUES('x1','2026-10-05T10:00:00',100000000,'cash',1,'М1','Перукар','Перукарські послуги','service')")
    main.con.commit()
    e = payroll.estimate(main.con, d(2026, 10, 1), d(2026, 10, 31), "2026-09")
    assert e["Перукарі"] == 40000000                                      # 40% of the master's till
    assert e["Інші працівники"] == 1500000 + 3300000 * 31 // 31 or abs(e["Інші працівники"] - (1500000 + 3300000)) < 3   # 1.5% of services + fixed
    # admins: 7000 коп/год x (600h/30d) x 31d + 4% of services + 10% of retail ratio
    hourly = 7000 * (600 / 30) * 31
    pool = 0.04 * 100000000
    retail = (1000000 * 0.10 / 100000000) * 100000000
    assert abs(e["Адміністратори"] - (hourly + pool + retail)) < 5


def test_payroll_waves_tied_to_month_worked(client):
    from app import payroll
    ins = lambda sec, name, **kw: main.con.execute(
        "INSERT INTO payroll(month,section,name,gross,adv_card,sal_card,adv_cash,to_pay) VALUES('2026-09',?,?,?,?,?,?,?)",
        (sec, name, kw.get("gross", 0), kw.get("adv_card", 0), kw.get("sal_card", 0), kw.get("adv_cash", 0), kw.get("to_pay", 0)))
    ins("Перукарі", "М1", gross=10000000, adv_card=1000000, sal_card=2000000, adv_cash=500000, to_pay=6500000)
    main.con.commit()
    fop, cash, safe = accid("ФОП 1"), accid("Каса салон"), accid("Сейф")
    zp = cat.get_or_create_category(main.con, "Зарплата", "expense")
    post = lambda **kw: client.post("/transactions/new", data=dict(category_id=zp, **kw))
    post(kind="expense", account_id=fop, amount="5000", occurred_at="2026-09-01T10:00", description="Заробітна плата за серпень 2026")   # August: not September's
    post(kind="expense", account_id=fop, amount="10000", occurred_at="2026-09-16T10:00", description="Аванс заробітної плати за вересень 2026")
    post(kind="expense", account_id=fop, amount="20000", occurred_at="2026-10-01T10:00", description="Заробітна плата за вересень 2026")
    post(kind="expense", account_id=cash, amount="1000", occurred_at="2026-10-07T10:00", description="зп")
    plan, rec = payroll.payment_plan(main.con, "2026-09"), payroll.payments_recorded(main.con, "2026-09")
    assert (plan["adv_card"], plan["sal_card"], plan["cash"]) == (1000000, 2000000, 7000000)
    assert (rec["adv_card"], rec["sal_card"], rec["cash"]) == (1000000, 2000000, 100000)   # Sept 1 payment belongs to August
    assert client.get("/payroll?month=2026-09").status_code == 200
    # recording the cash payout keeps today's balances unchanged
    from app.db import account_balances
    before = account_balances(main.con)
    r = client.post("/payroll/record-cash", data={"month": "2026-09", "pay_date": "2026-10-07", f"amt_{safe}": "40000", f"amt_{cash}": "29000"}, follow_redirects=False)
    assert r.status_code == 303
    after = account_balances(main.con)
    assert after[safe] == before[safe] and after[cash] == before[cash]
    assert main.con.execute("SELECT COUNT(*) FROM transactions WHERE description LIKE 'Виплата ЗП за 2026-09%'").fetchone()[0] == 2
    client.post("/payroll/record-cash", data={"month": "2026-09", "pay_date": "2026-10-07", f"amt_{safe}": "40000"})
    assert main.con.execute("SELECT COUNT(*) FROM transactions WHERE description LIKE 'Виплата ЗП за 2026-09%'").fetchone()[0] == 2   # no double booking


def test_cleaners_stay_a_cost_when_payroll_comes_from_sheet(client):
    from app import pl
    d = __import__("datetime").date
    main.con.execute("INSERT INTO payroll(month,section,name,gross) VALUES('2026-09','Перукарі','М1',10000000)")
    main.con.commit()
    cash = accid("Каса салон")
    zp, staff = cat.get_or_create_category(main.con, "Зарплата", "expense"), cat.get_or_create_category(main.con, "Витрати на персонал", "expense")
    post = lambda **kw: client.post("/transactions/new", data=dict(kind="expense", account_id=cash, occurred_at="2026-09-10T10:00", **kw))
    post(amount="3000", category_id=zp, description="зп Лисюк")            # in the sheet -> not added twice
    post(amount="336", category_id=staff, description="Зп прибиральниці")  # not in the sheet -> still a cost
    c = pl.compute(main.con, d(2026, 9, 1), d(2026, 9, 30))
    assert c["pay_mode"] and c["labour"] == 10000000 + 33600 and c["paid_payroll"] == 300000


def test_transaction_filters(client):
    cash, safe, fop = accid("Каса салон"), accid("Сейф"), accid("ФОП 1")
    mat = cat.get_or_create_category(main.con, "Матеріал в роботу", "expense")
    zp = cat.get_or_create_category(main.con, "Зарплата", "expense")
    post = lambda **kw: client.post("/transactions/new", data=kw)
    post(kind="expense", account_id=cash, amount="100", occurred_at="2026-10-10T10:00", description="Гель лак Нейл", category_id=mat)
    post(kind="expense", account_id=fop, amount="200", occurred_at="2026-10-11T10:00", description="Заробітна плата", category_id=zp)
    post(kind="income", account_id=fop, amount="900", occurred_at="2026-10-12T10:00", description="Термінал")
    post(kind="transfer", account_id=cash, to_account_id=safe, amount="300", occurred_at="2026-10-13T10:00", description="Інкасація")
    main.con.execute("UPDATE transactions SET category_id=NULL WHERE description='Термінал'")
    main.con.commit()

    def n(qs):
        r = client.get("/transactions" + qs)
        assert r.status_code == 200
        return len(__import__("re").findall(r'<tr class=""><td class="num"><a href="/transactions/\d+">', r.text))
    assert n("") == 4
    assert n("?kind=expense") == 2 and n("?kind=income") == 1 and n("?kind=transfer") == 1
    assert n("?kind=expense&kind=income") == 3                                   # several types together
    assert n(f"?account={safe}") == 1 and n(f"?account={cash}") == 2              # transfer matches either side
    assert n(f"?account={cash}&account={fop}") == 4
    assert n(f"?category={mat}") == 1 and n(f"?category={mat}&category={zp}") == 2
    assert n("?category=none") == 1                                               # uncategorised, transfers excluded
    assert n("?q=ГЕЛЬ") == 1 and n("?q=гель нейл") == 1 and n("?q=гель зарплата") == 0
    assert n("?amount_from=150&amount_to=500") == 2
    assert n("?date_from=2026-10-12&date_to=2026-10-13") == 2
    assert n("?sort=amount_desc") == 4
    html = client.get("/transactions?q=гель").text
    assert "<mark>Гель</mark>" in html and "Знайдено операцій" in html
    assert client.get("/transactions/export.csv?kind=expense").text.count("Витрата") == 2
    assert client.get("/transactions/export.xlsx?kind=income").content[:2] == b"PK"


def test_favicon_and_titles(client):
    page = client.get("/cash").text
    assert "favicon.svg" in page and "<title>₴ Каса · Steffany</title>" in page
    anon = TestClient(main.app)
    assert anon.get("/login").status_code == 200 and "favicon.svg" in anon.get("/login").text
    assert client.get("/favicon.ico").headers["content-type"] == "image/png"
    assert client.get("/static/favicon.svg").status_code == 200 and client.get("/static/manifest.webmanifest").status_code == 200


def test_empty_credit_accounts_are_hidden(client):
    mk = lambda name, bal: main.con.execute("INSERT INTO accounts(name,kind,source,iban,bank_balance) VALUES(?,?,?,?,?)", (name, "credit", "privat", name, bal)).lastrowid
    empty, debt, moved = mk("ПУСТИЙ", 0), mk("БОРГ", -100000), mk("РУХ", 0)
    old = "2026-01-01T10:00:00"
    now = datetime.now(config.KYIV).strftime("%Y-%m-%dT%H:%M:%S")
    for aid, at, ext in ((empty, old, "o1"), (moved, now, "n1")):
        main.con.execute("INSERT INTO credit_ops(account_id,external_id,occurred_at,direction,amount,description) VALUES(?,?,?,?,?,?)", (aid, ext, at, "C", 100, "КД-1"))
    main.con.commit()
    page = client.get("/accounts").text
    assert "БОРГ" in page and "РУХ" not in page and "ПУСТИЙ" not in page and "приховано: 2" in page   # zero balance = hidden, even with old operations
    assert "ПУСТИЙ" in client.get("/accounts?all=1").text
    cr = client.get("/credits").text
    assert "ПУСТИЙ" not in cr
    # the account comes back as soon as a debt appears
    main.con.execute("UPDATE accounts SET bank_balance=-500 WHERE id=?", (empty,))
    main.con.commit()
    assert "ПУСТИЙ" in client.get("/accounts").text


def test_forms_accept_empty_selects_like_a_browser(client):
    """Browsers send '' for unselected <select> fields (To-account, Auto category, merge target, account id)."""
    cash = accid("Каса салон")
    base = dict(kind="expense", account_id=cash, amount="10", occurred_at="2026-10-10T10:00", description="молоко", counterparty="")
    assert client.post("/transactions/new", data={**base, "to_account_id": "", "category_id": ""}, follow_redirects=False).status_code == 303
    tid = main.con.execute("SELECT id FROM transactions ORDER BY id DESC LIMIT 1").fetchone()["id"]
    assert client.post(f"/transactions/{tid}", data={**base, "amount": "12", "to_account_id": "", "category_id": "", "make_rule": "", "rule_text": ""}, follow_redirects=False).status_code == 303
    cid = main.con.execute("SELECT id FROM categories LIMIT 1").fetchone()["id"]
    assert client.post(f"/categories/{cid}", data={"name": "Переіменована", "merge_into": ""}, follow_redirects=False).status_code == 303
    assert client.post("/accounts", data={"id": "", "name": "Нова каса", "kind": "cash", "source": "manual", "active": "1", "current": ""}, follow_redirects=False).status_code == 303
    safe = accid("Сейф")
    assert client.post("/transactions/new", data={**base, "kind": "transfer", "account_id": cash, "to_account_id": safe, "category_id": ""}, follow_redirects=False).status_code == 303


def test_alteg_cash_for_payroll_is_an_expense_not_a_transfer():
    base = {"id": 1, "date": "2026-10-07T15:39:00+0400", "amount": -21400, "expense": {"title": ""}}
    assert alteg.map_tx(dict(base, comment="Інкасація на зп"))["kind"] == "expense"
    assert alteg.map_tx(dict(base, comment="інкасація на зарплату"))["kind"] == "expense"
    assert alteg.map_tx(dict(base, comment="Інкасація"))["kind"] == "transfer"
    assert alteg.map_tx(dict(base, comment="інкасація"))["kind"] == "transfer"


def test_payroll_control_flags_waves_that_do_not_match(client):
    import datetime
    from app import payroll
    main.con.execute("INSERT INTO payroll(month,section,name,gross,adv_card,sal_card) VALUES('2026-09','Перукарі','А',4000000,500000,600000)")
    main.con.commit()
    d = datetime.date
    assert payroll.control(main.con, d(2026, 9, 10)) == []           # nothing is due yet
    late = payroll.control(main.con, d(2026, 10, 9))
    assert {x["wave"] for x in late} == {"Аванс (Ф-1)", "ЗП безготівка (Ф-1)"}   # nothing was paid in the ledger
    assert all(x["diff"] > 0 for x in late)
    r = client.get("/")
    assert r.status_code == 200


def test_control_centre_detects_duplicates_and_lets_you_close_findings(client):
    from app import control
    fop = accid("ФОП 1")
    for t in ("2026-09-10T10:00", "2026-09-11T10:00"):
        client.post("/transactions/new", data=dict(kind="expense", account_id=fop, amount="12000", occurred_at=t,
                                                    counterparty="ТОВ Постачальник", description="Оплата за товар"))
    client.post("/transactions/new", data=dict(kind="expense", account_id=accid("Каса салон"), amount="9000",
                                                occurred_at="2026-09-12T10:00", description="Витрата з каси"))
    r = client.get("/control")
    assert r.status_code == 200 and "Можливий дубль" in r.text and "Готівка з каси без пояснення" in r.text
    row = main.con.execute("SELECT id FROM findings WHERE key LIKE 'dup:%'").fetchone()
    client.post(f"/control/{row['id']}", data=dict(action="ignored", note="так і треба"))
    assert "Можливий дубль" not in client.get("/control").text
    control.run(main.con)    # an ignored finding stays ignored
    assert main.con.execute("SELECT status FROM findings WHERE id=?", (row["id"],)).fetchone()[0] == "ignored"
    assert "Можливий дубль" in client.get("/control?status=ignored").text
    assert "Контроль" in client.get("/").text and "Контроль ЗП" not in client.get("/").text


def test_user_can_change_own_password_many_times(client):
    client.post("/users", data={"email": "kate@x.ua", "name": "Катя", "role": "admin", "title": "Адмін", "password": "temp-pass-9"}, follow_redirects=True)
    me = _login("kate@x.ua", "temp-pass-9")
    other = _login("kate@x.ua", "temp-pass-9")              # a second device
    me.post("/password", data={"old": "temp-pass-9", "new": "first-own-pass", "new2": "first-own-pass"})
    page = me.get("/account")
    assert page.status_code == 200 and "Змінити пароль" in page.text and "Катя" in page.text
    bad = me.post("/account/password", data={"old": "wrong", "new": "second-pass-22", "new2": "second-pass-22"})
    assert bad.status_code == 400 and "невірно" in bad.text
    assert "не збігаються" in me.post("/account/password", data={"old": "first-own-pass", "new": "second-pass-22", "new2": "other-22-pass"}).text
    assert "закороткий" in me.post("/account/password", data={"old": "first-own-pass", "new": "short", "new2": "short"}).text
    for old, new in (("first-own-pass", "second-pass-22"), ("second-pass-22", "third-pass-333")):   # as often as needed
        r = me.post("/account/password", data={"old": old, "new": new, "new2": new, "others": "1"}, follow_redirects=False)
        assert r.status_code == 303 and r.headers["location"] == "/account"
    assert me.get("/account", follow_redirects=False).status_code == 200            # this device stays signed in
    assert other.get("/account", follow_redirects=False).status_code == 303          # the other device is signed out
    assert _login("kate@x.ua", "third-pass-333").get("/account").status_code == 200


def test_dashboard_lists_only_todays_operations(client):
    from datetime import datetime
    today = datetime.now(main.config.KYIV).strftime("%Y-%m-%d")
    fop = accid("ФОП 1")
    client.post("/transactions/new", data=dict(kind="expense", account_id=fop, amount="111", occurred_at=f"{today}T09:00", description="сьогоднішня-витрата"))
    client.post("/transactions/new", data=dict(kind="expense", account_id=fop, amount="222", occurred_at="2026-09-02T09:00", description="давня-витрата"))
    page = client.get("/").text
    assert "сьогоднішня-витрата" in page and "давня-витрата" not in page and "Операції за сьогодні" in page
    assert 'href="/transactions"' in page

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


def test_roles(client):
    client.post("/users", data={"email": "adm@x.ua", "name": "Адмін", "role": "admin", "password": "adminpass1"})
    adm = TestClient(main.app)
    adm.post("/login", data={"email": "adm@x.ua", "password": "adminpass1"})
    assert adm.get("/users").status_code == 403
    assert adm.post("/accounts", data={"name": "x", "kind": "cash", "source": "manual"}).status_code == 403
    assert adm.post("/categories", data={"name": "x", "kind": "expense"}).status_code == 403
    assert adm.get("/transactions/new").status_code == 200
    bad = adm.post("/logout", headers={"origin": "http://evil.example"})
    assert bad.status_code == 403


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
    assert "Зняття готівки" in client.get("/transactions?q=ГОТІВКИ").text


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

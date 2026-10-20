"""Altegio (alteg.io) CRM: imports cash-desk operations of one location."""
import re
import time

import requests

from . import config

API = "https://api.alteg.io/api/v1"
INCASSO_WORDS = ("інкас", "инкас")


class AltegError(Exception):
    pass


class AltegClient:
    def __init__(self, session=requests):
        self.s = session
        self.user_token = None

    def _call(self, fn, *a, **kw):
        """HTTP call with retries: Alteg sometimes drops connections under load."""
        last = None
        for i in range(5):
            try:
                r = fn(*a, **kw)
                if r.status_code in (429, 500, 502, 503, 504):
                    raise AltegError(f"HTTP {r.status_code}")
                time.sleep(0.12)  # be gentle with the API
                return r
            except (requests.RequestException, AltegError) as e:
                last = e
                time.sleep(2 * (i + 1))
        raise AltegError(f"Alteg недоступний: {last}")

    def _h(self, user=True):
        auth = f"Bearer {config.ALTEG_PARTNER_KEY}"
        if user and self.user_token:
            auth += f", User {self.user_token}"
        return {"Authorization": auth, "Accept": "application/vnd.api.v2+json", "Content-Type": "application/json"}

    def login(self):
        if not (config.ALTEG_PARTNER_KEY and config.ALTEG_LOGIN and config.ALTEG_PASSWORD):
            raise AltegError("Не задано ALTEG_PARTNER_KEY / ALTEG_LOGIN / ALTEG_PASSWORD")
        r = self._call(self.s.post, f"{API}/auth", headers=self._h(False), timeout=40,
                       json={"login": config.ALTEG_LOGIN, "password": config.ALTEG_PASSWORD})
        d = r.json()
        if not d.get("success"):
            raise AltegError("Alteg: не вдалось увійти (перевірте ключ/логін/пароль)")
        self.user_token = d["data"]["user_token"]

    def cash_transactions(self, start: str, end: str, account_id: int | None = None):
        account_id = account_id or config.ALTEG_CASH_ACCOUNT
        if not self.user_token:
            self.login()
        out, page = [], 1
        while True:
            r = self._call(self.s.get, f"{API}/transactions/{config.ALTEG_LOCATION}", headers=self._h(), timeout=60,
                          params={"start_date": start, "end_date": end, "account_id": account_id,
                                   "count": 200, "page": page})
            d = r.json()
            if not d.get("success"):
                raise AltegError(f"Alteg: {d.get('meta', {}).get('message', r.status_code)}")
            rows = d.get("data") or []
            out += rows
            if len(rows) < 200:
                return out
            page += 1
            if page > 200:
                raise AltegError("Alteg: забагато сторінок")


def _paged(self, path: str, slim=None, **params):
    if not self.user_token:
        self.login()
    out, page = [], 1
    while True:
        r = self._call(self.s.get, f"{API}{path}", headers=self._h(), timeout=60, params={**params, "count": 200, "page": page})
        d = r.json()
        if not d.get("success"):
            raise AltegError(f"Alteg {path}: {d.get('meta', {}).get('message', r.status_code)}")
        rows = d.get("data") or []
        out += [slim(x) for x in rows] if slim else rows
        if len(rows) < 200 or page > 100:
            return out
        page += 1


def _slim_record(r: dict) -> dict:
    """Keep only what the takings analytics needs (full records carry client data and are large)."""
    st = r.get("staff") or {}
    return {"id": r.get("id"), "staff": {"id": st.get("id"), "name": st.get("name"), "specialization": st.get("specialization")},
            "services": [{"id": x.get("id"), "title": x.get("title")} for x in r.get("services") or []]}


def _records(self, start: str, end: str):
    return _paged(self, f"/records/{config.ALTEG_LOCATION}", slim=_slim_record, start_date=start, end_date=end)


def _record(self, rid: int):
    if not self.user_token:
        self.login()
    try:
        d = self._call(self.s.get, f"{API}/record/{config.ALTEG_LOCATION}/{rid}", headers=self._h(), timeout=40).json()
    except AltegError:
        return None
    return _slim_record(d["data"]) if d.get("success") and d.get("data") else None


AltegClient.records = _records
AltegClient.record = _record
AltegClient.services = lambda self: _paged(self, f"/services/{config.ALTEG_LOCATION}")
AltegClient.service_categories = lambda self: _paged(self, f"/service_categories/{config.ALTEG_LOCATION}")


def local_dt(s: str) -> str:
    """'2026-10-19T15:30:00+0400' -> local wall-clock '2026-10-19T15:30:00' (as shown in Alteg)."""
    return s[:19]


def map_tx(t: dict):
    """Alteg cash row -> insert dict. Cash outflow marked 'інкасація' is a transfer to the safe;
    every other outflow is an expense (Alteg mirrors all outflows into its own 'Сейф' - ignored)."""
    amt = t.get("amount") or 0
    kop = int(round(abs(float(amt)) * 100))
    if kop == 0:
        return None
    comment = (t.get("comment") or "").strip()
    base = dict(amount=kop, occurred_at=local_dt(t["date"]), external_id=f"alteg:{t['id']}")
    if amt > 0:
        title = (t.get("expense") or {}).get("title") or ""
        desc = comment or ALTEG_INCOME_CATEGORY.get(title.lower(), title)
        return dict(base, kind="income", description=desc, counterparty="", alteg_title=title, raw=comment)
    low = comment.lower()
    if any(w in low for w in INCASSO_WORDS) and not re.search(r"(на\s+з/?п|зарплат|на\s+зп)", low):
        return dict(base, kind="transfer", description=comment or "Інкасація", counterparty="", raw=comment)
    # "Інкасація на зп" = cash taken out for payroll: it is a payout, not a transfer into the safe
    return dict(base, kind="expense", description=comment or "Витрата з каси", counterparty="", raw=comment)


ALTEG_INCOME_CATEGORY = {
    "services rendered": "Оплата послуг",
    "product sales": "Продаж товарів",
    "gift card sales": "Додаткові надходження",
}

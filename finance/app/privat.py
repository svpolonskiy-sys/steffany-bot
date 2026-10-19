"""PrivatBank 'Автоклієнт' read-only statements API (Приват24 для бізнесу)."""
import json
from datetime import date, datetime
from decimal import Decimal

import requests

BASE = "https://acp.privatbank.ua/api/statements"


class PrivatError(Exception):
    pass


def _headers(token: str) -> dict:
    return {"User-Agent": "steffany-finance", "token": token,
            "Content-Type": "application/json;charset=cp1251", "Accept": "application/json"}


def _json(r: requests.Response) -> dict:
    raw = r.content
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        text = raw.decode("cp1251", errors="replace")
    try:
        return json.loads(text)
    except ValueError:
        raise PrivatError(f"Некоректна відповідь банку (HTTP {r.status_code})")


def _check(r, data):
    if r.status_code in (401, 403):
        raise PrivatError("Токен Автоклієнта недійсний або без доступу")
    if r.status_code >= 400 or data.get("status") not in (None, "SUCCESS"):
        raise PrivatError(f"Помилка банку: {data.get('message') or data.get('status') or r.status_code}")


def to_kop(s) -> int:
    return int((Decimal(str(s).replace(" ", "").replace(",", ".")) * 100).to_integral_value())


def fetch_balance(token: str, acc: str, session=requests) -> int | None:
    today = date.today().strftime("%d-%m-%Y")
    r = session.get(f"{BASE}/balance", headers=_headers(token), timeout=40,
                    params={"acc": acc, "startDate": today, "endDate": today})
    data = _json(r)
    _check(r, data)
    items = data.get("balances") or []
    for b in items:
        if acc and b.get("acc") and b["acc"] != acc:
            continue
        v = b.get("balanceOut") or b.get("balanceOutEq")
        if v not in (None, ""):
            return to_kop(v)
    return None


def fetch_transactions(token: str, acc: str, start: date, end: date, session=requests, max_pages=200):
    out, follow = [], None
    for _ in range(max_pages):
        params = {"acc": acc, "startDate": start.strftime("%d-%m-%Y"),
                  "endDate": end.strftime("%d-%m-%Y"), "limit": 100}
        if follow:
            params["followId"] = follow
        r = session.get(f"{BASE}/transactions", headers=_headers(token), params=params, timeout=60)
        data = _json(r)
        _check(r, data)
        out += data.get("transactions") or []
        if data.get("exist_next_page") in (True, "true", "True") and data.get("next_page_id"):
            follow = data["next_page_id"]
        else:
            break
    return out


def parse_dt(t: dict) -> str:
    s = t.get("DATE_TIME_DAT_OD_TIM_P") or ""
    for fmt in ("%d.%m.%Y %H:%M:%S", "%d.%m.%Y %H:%M"):
        try:
            return datetime.strptime(s, fmt).strftime("%Y-%m-%dT%H:%M:%S")
        except ValueError:
            pass
    d = t.get("DAT_OD") or t.get("TRAN_DATE") or ""
    tm = (t.get("TIM_P") or "00:00").strip()
    try:
        return datetime.strptime(f"{d} {tm}", "%d.%m.%Y %H:%M").strftime("%Y-%m-%dT%H:%M:%S")
    except ValueError:
        raise PrivatError(f"Не вдалось розпізнати дату операції: {d!r}")


def map_tx(t: dict, acc: str):
    """Returns dict for insert_tx or None (non-UAH / zero)."""
    if (t.get("CCY") or "UAH") != "UAH":
        return None
    amount = to_kop(t.get("SUM") or "0")
    if amount <= 0:
        return None
    uid = t.get("ID") or ((t.get("REF") or "") + (t.get("REFN") or "")) or t.get("TECHNICAL_TRANSACTION_ID")
    if not uid:
        return None
    return dict(
        kind="income" if t.get("TRANTYPE") == "C" else "expense",
        amount=amount, occurred_at=parse_dt(t),
        description=(t.get("OSND") or "").strip(),
        counterparty=(t.get("AUT_CNTR_NAM") or "").strip(),
        external_id=f"privat:{acc}:{uid}")

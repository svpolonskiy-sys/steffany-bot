import requests
import sys
import os
from datetime import date

ALTEG_API_KEY = os.environ.get("ALTEG_API_KEY", "f1742e583923fe50102e8fb5279002b6")
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "8800960631:AAHrB0G1PX2uks6I33mwCTjhjgv5wG-_h4c")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "329530060")
ALTEG_COMPANY_ID = os.environ.get("ALTEG_COMPANY_ID", "72145")

HEADERS = {
    "Authorization": f"Bearer {ALTEG_API_KEY}",
    "Accept": "application/json"
}

def get_today_records():
    today = date.today().strftime("%Y-%m-%d")
    url = "https://api.alteg.io/api/v1/records"
    params = {"company_id": ALTEG_COMPANY_ID, "start_date": today, "end_date": today, "count": 200}
    r = requests.get(url, headers=HEADERS, params=params)
    return r.json().get("data", [])

def get_staff():
    url = "https://api.alteg.io/api/v1/staff"
    params = {"company_id": ALTEG_COMPANY_ID, "count": 100}
    r = requests.get(url, headers=

import requests
from datetime import datetime, date
import schedule
import time

# --- НАЛАШТУВАННЯ ---
ALTEG_API_KEY = "f1742e583923fe50102e8fb5279002b6"
TELEGRAM_BOT_TOKEN = "8800960631:AAHrB0G1PX2uks6I33mwCTjhjgv5wG-_h4c"
TELEGRAM_CHAT_ID = "329530060"
ALTEG_COMPANY_ID = "72145"

ALTEG_BASE_URL = "https://api.alteg.io/api/v1"

HEADERS = {
    "Authorization": f"Bearer {ALTEG_API_KEY}",
    "Accept": "application/json"
}

def get_today_records():
    today = date.today().strftime("%Y-%m-%d")
    url = f"{ALTEG_BASE_URL}/records"
    params = {
        "company_id": ALTEG_COMPANY_ID,
        "start_date": today,
        "end_date": today,
        "count": 200
    }
    r = requests.get(url, headers=HEADERS, params=params)
    return r.json().get("data", [])

def get_staff():
    url = f"{ALTEG_BASE_URL}/staff"
    params = {"company_id": ALTEG_COMPANY_ID, "count": 100}
    r = requests.get(url, headers=HEADERS, params=params)
    return r.json().get("data", [])

def build_report():
    records = get_today_records()
    staff_list = get_staff()

    today = date.today().strftime("%d.%m.%Y")

    # Клієнти та сума
    clients = set()
    total_sum = 0
    staff_revenue = {}

    for rec in records:
        if rec.get("deleted"):
            continue
        client_id = rec.get("client", {}).get("id")
        if client_id:
            clients.add(client_id)

        services = rec.get("services", [])
        for svc in services:
            price = svc.get("cost", 0)
            total_sum += price

        staff_id = rec.get("staff", {}).get("id")
        staff_name = rec.get("staff", {}).get("name", "Невідомо")
        if staff_id:
            staff_revenue[staff_id] = {
                "name": staff_name,
                "sum": staff_revenue.get(staff_id, {}).get("sum", 0) + sum(s.get("cost", 0) for s in services)
            }

    # Лідер та аутсайдер
    leader = "—"
    outsider = "—"
    if staff_revenue:
        sorted_staff = sorted(staff_revenue.values(), key=lambda x: x["sum"], reverse=True)
        leader = f"{sorted_staff[0]['name']} ({sorted_staff[0]['sum']} грн)"
        outsider = f"{sorted_staff[-1]['name']} ({sorted_staff[-1]['sum']} грн)"

    # Майстри в зміні
    roles = {
        "Перукар": 0,
        "Нейл майстер": 0,
        "Косметолог": 0,
        "Подолог": 0,
        "Бровіст": 0
    }
    working_ids = set(v for v in staff_revenue.keys())
    for s in staff_list:
        if s.get("id") in working_ids:
            pos = s.get("specialization", "").lower()
            if "перукар" in pos or "hair" in pos:
                roles["Перукар"] += 1
            elif "нейл" in pos or "nail" in pos or "манікюр" in pos:
                roles["Нейл майстер"] += 1
            elif "косметолог" in pos or "cosmet" in pos:
                roles["Косметолог"] += 1
            elif "подолог" in pos or "подо" in pos:
                roles["Подолог"] += 1
            elif "брови" in pos or "brow" in pos:
                roles["Бровіст"] += 1

    report = f"""
💇‍♀️ *ЗВІТ САЛОНУ STEFFANY*
📅 {today}
━━━━━━━━━━━━━━━━━━

👥 *МАЙСТРИ В ЗМІНІ:*
✂️ Перукарі: {roles['Перукар']}
💅 Нейл майстри: {roles['Нейл майстер']}
🧴 Косметологи: {roles['Косметолог']}
🦶 Подологи: {roles['Подолог']}
👁️ Бровісти: {roles['Бровіст']}

📊 *ПІДСУМКИ ДНЯ:*
👤 Клієнтів: {len(clients)}
💰 Сума послуг: {total_sum} грн

🏆 *Лідер дня:* {leader}
📉 *Аутсайдер:* {outsider}

━━━━━━━━━━━━━━━━━━
🕘 Звіт сформовано о 21:00
    """.strip()

    return report

def send_telegram(text):
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": text,
        "parse_mode": "Markdown"
    }
    requests.post(url, json=payload)

def send_report():
    try:
        report = build_report()
        send_telegram(report)
        print(f"Звіт надіслано: {datetime.now()}")
    except Exception as e:
        send_telegram(f"⚠️ Помилка при формуванні звіту: {str(e)}")
        print(f"Помилка: {e}")

# Розклад — щодня о 21:00
schedule.every().day.at("21:00").do(send_report)

print("Бот запущено. Очікую 21:00...")
while True:
    schedule.run_pending()
    time.sleep(60)

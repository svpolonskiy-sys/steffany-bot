import os
from zoneinfo import ZoneInfo

KYIV = ZoneInfo("Europe/Kyiv")

DB_PATH = os.environ.get("DB_PATH", "data/finance.db")
SECRET_KEY = os.environ.get("SECRET_KEY", "dev-insecure-change-me")
API_TOKEN = os.environ.get("API_TOKEN", "")  # read-only token for reports via /api
HISTORY_START = os.environ.get("HISTORY_START", "2026-09-01")
CREDIT_HISTORY_START = os.environ.get("CREDIT_HISTORY_START", "2026-08-01")  # credits were opened in August

# Altegio (CRM): only cash is imported, cashless comes from the bank
ALTEG_PARTNER_KEY = os.environ.get("ALTEG_PARTNER_KEY", "")
ALTEG_LOGIN = os.environ.get("ALTEG_LOGIN", "")
ALTEG_PASSWORD = os.environ.get("ALTEG_PASSWORD", "")
ALTEG_LOCATION = os.environ.get("ALTEG_LOCATION", "751396")  # Київська 77
ALTEG_CASH_ACCOUNT = int(os.environ.get("ALTEG_CASH_ACCOUNT", "1526207"))  # "Основна каса"

OWNER_EMAIL = os.environ.get("OWNER_EMAIL", "")
OWNER_PASSWORD = os.environ.get("OWNER_PASSWORD", "")

# Salon does not work 21:00-08:00 Kyiv time: no sync then
SYNC_FROM_HOUR = 8
SYNC_TO_HOUR = 21
SYNC_INTERVAL_SEC = int(os.environ.get("SYNC_INTERVAL_SEC", "3300"))
SCHEDULER_ENABLED = os.environ.get("SCHEDULER_ENABLED", "1") == "1"
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "0") == "1"

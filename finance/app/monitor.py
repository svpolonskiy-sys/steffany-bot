"""Daily self-check of the system (runs at 09:00 Kyiv inside the app).

It looks at what went wrong during the last 24 hours: server errors, «немає доступу» shown to people who must have access
(owner, accountant, director), stale or failed syncs, database integrity. The result is kept in settings, shown in «Контроль»
(card at the top and findings) and exposed without details at /status, so an external check can read it."""
import json
import logging
from datetime import datetime, timedelta

from . import config
from .db import get_setting, now_local, set_setting

log = logging.getLogger("monitor")
PRIVILEGED = ("owner", "accountant", "director")


def record(con, status: int, method: str, path: str, user: str = "", role: str = ""):
    """Remembers a server error or an access refusal (kept 30 days)."""
    con.execute("INSERT INTO app_errors(at,status,method,path,user_name,role) VALUES(?,?,?,?,?,?)", (now_local(), status, method, path[:200], user[:80], role))
    con.execute("DELETE FROM app_errors WHERE at < ?", ((datetime.now(config.KYIV).replace(tzinfo=None) - timedelta(days=30)).strftime("%Y-%m-%dT%H:%M:%S"),))
    con.commit()


def run(con) -> dict:
    now = datetime.now(config.KYIV).replace(tzinfo=None)
    since = (now - timedelta(hours=24)).strftime("%Y-%m-%dT%H:%M:%S")
    problems = []
    if con.execute("PRAGMA quick_check").fetchone()[0] != "ok":
        problems.append(dict(code="db", title="База даних: перевірка цілісності виявила проблему", detail="PRAGMA quick_check не повернув ok"))
    bad_fk = con.execute("PRAGMA foreign_key_check").fetchall()
    if bad_fk:
        problems.append(dict(code="fk", title=f"База даних: зламані посилання між таблицями ({len(bad_fk)})", detail=", ".join(sorted({r[0] for r in bad_fk}))))
    e5 = con.execute("SELECT method, path, COUNT(*) n FROM app_errors WHERE at>=? AND status>=500 GROUP BY 1,2 ORDER BY n DESC", (since,)).fetchall()
    if e5:
        problems.append(dict(code="err5xx", title=f"Помилки сервера за добу: {sum(r['n'] for r in e5)}",
                             detail="; ".join(f"{r['method']} {r['path']} ×{r['n']}" for r in e5[:6])))
    e403 = con.execute("SELECT role, user_name, method, path, COUNT(*) n FROM app_errors WHERE at>=? AND status=403 AND role IN ('owner','accountant','director') "
                       "GROUP BY 1,2,3,4 ORDER BY n DESC", (since,)).fetchall()
    if e403:
        problems.append(dict(code="denied", title=f"Співробітникам з повними правами показано «немає доступу»: {sum(r['n'] for r in e403)}",
                             detail="; ".join(f"{r['user_name']} ({r['role']}): {r['method']} {r['path']} ×{r['n']}" for r in e403[:6])))
    for a in con.execute("SELECT name, source, last_sync_at, last_sync_status FROM accounts WHERE active=1 AND source!='manual'"):
        if a["last_sync_status"] not in (None, "", "ok"):
            problems.append(dict(code=f"sync:{a['name']}", title=f"Помилка оновлення: {a['name']}", detail=(a["last_sync_status"] or "")[:160]))
        elif a["last_sync_at"] and (now - datetime.fromisoformat(a["last_sync_at"][:19])).total_seconds() > 26 * 3600:
            problems.append(dict(code=f"stale:{a['name']}", title=f"Дані не оновлювались понад добу: {a['name']}", detail=f"останнє оновлення {a['last_sync_at'][:16].replace('T', ' ')}"))
    result = dict(at=now.strftime("%Y-%m-%dT%H:%M:%S"), ok=not problems, problems=problems)
    set_setting(con, "monitor_last", json.dumps(result, ensure_ascii=False))
    log.info("monitor: %s", "ok" if not problems else f"{len(problems)} problems")
    return result


def last(con) -> dict | None:
    v = get_setting(con, "monitor_last")
    try:
        return json.loads(v) if v else None
    except ValueError:
        return None

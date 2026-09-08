# ZMOZHU — усі версії лендингу

Тут лежить увесь код лендингу ZMOZHU. Нумерація в назвах тек = порядок ітерацій.
**Тека без дати в назві — завжди актуальний код.** Архіви з датами — знімки на конкретний день.

```
zmozhu/
  01-original-2026-09-06/     Вихідний сайт, з якого почали (архів zmozhuredesign20260906.zip).
                              Не редагується, лише для порівняння.
  02-claude-redesign/         Редизайн Claude — АКТУАЛЬНИЙ КОД. Тут ведуться всі правки.
                              Версія вказана в package.json і на початку README.
  archives/
    01-original-2026-09-06.zip           Вихідний архів як був завантажений.
    02-claude-redesign-2026-09-08.zip    Знімок редизайну на 8 вересня 2026 (v2.1).
```

## Як користуватися

- Потрібен найновіший код → `02-claude-redesign/` (інструкція запуску в його README).
- Потрібно повернутися до стану на конкретну дату → відповідний zip в `archives/`.
- Потрібно порівняти з оригіналом → `01-original-2026-09-06/`.

## Історія версій редизайну

| Версія | Дата | Що змінено |
|---|---|---|
| v2.0 | 2026-09-07 | Нова структура, палітра (теал + папір + корал), шрифти Cormorant Garamond + Manrope, анімації, JSON-LD. Усі тексти й фото з оригіналу збережені. |
| v2.1 | 2026-09-08 | Прибрано квадрат із літерою; фінальний результат = вага на 30-й день; плашки на першому екрані зсунуто на краї фото; фото Анастасії на всю картку; чіп про оплату прибрано з першого екрана; кути темних карток на фоні сусідніх блоків; виділено ключові тези. |

## Як зробити новий знімок

```bash
# з кореня репозиторію
cd zmozhu/02-claude-redesign && npm run build && cd ../..
python3 - <<'PY'
import zipfile, os, datetime
root="zmozhu/02-claude-redesign"; skip={"node_modules",".next","out"}
name=f"zmozhu/archives/02-claude-redesign-{datetime.date.today()}.zip"
z=zipfile.ZipFile(name,"w",zipfile.ZIP_DEFLATED)
for d,dirs,files in os.walk(root):
    dirs[:]=[x for x in dirs if x not in skip]
    for f in files:
        if f=="next-env.d.ts" or f.endswith(".tsbuildinfo"): continue
        z.write(os.path.join(d,f), os.path.relpath(os.path.join(d,f),"zmozhu"))
z.close(); print(name)
PY
```

Після знімка додайте рядок у таблицю історії версій вище.

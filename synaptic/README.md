# Synaptic — презентаційний лендинг

Український B2B-лендинг (Next.js 16 App Router, React 19, TypeScript strict, CSS variables, Zod на сервері).
Знаходиться у підпапці `synaptic/`; решта репозиторію (`bot.py`) не пов’язана з цим сайтом.

## Запуск

```bash
cd synaptic
npm install
npm run dev            # розробка: http://localhost:3000
npm run build && npm start
npm run typecheck && npm run lint
npm test               # Playwright + axe (збирає сайт і запускає на :3100)
```

Тести використовують Chromium із `/opt/pw-browsers`; інший шлях — змінна `CHROMIUM_PATH`.

## Конфігурація (`.env.example`)

| Змінна | Призначення |
|---|---|
| `SITE_URL` | Реальна адреса сайту. Без неї: `noindex`, `robots: disallow`, без canonical/sitemap/OG-URL |
| `CONTACT_WEBHOOK_URL` | POST JSON (`name, email, company, message, topic, receivedAt`) у ваш канал. Без неї форма чесно показує «Це попередній перегляд. Надсилання ще не підключено.» |
| `CONTACT_WEBHOOK_SECRET` | Необов’язково; передається як `Authorization: Bearer …` |
| `NEXT_PUBLIC_PRIVACY_URL`, `NEXT_PUBLIC_CONTACT_EMAIL` | З’являються у футері лише якщо задані |

Секрети — лише серверні. Аналітика вимкнена: підключення — `window.__synapticAnalytics = (event, props) => …` після налаштування згоди (`src/lib/analytics.ts`).

## Розгортання

Будь-який хостинг Node (Vercel, Docker, VPS): `npm ci && npm run build && npm start`, задати змінні середовища. Rate-limit форми зберігається в пам’яті процесу — для кількох інстансів потрібне спільне сховище.

## Структура

`src/content/*` — тексти й демо-дані; `src/components/sections/*` — секції; `src/app/api/contact` — приймання звернень; `docs/*` — рішення, джерела, QA, чекліст запуску.

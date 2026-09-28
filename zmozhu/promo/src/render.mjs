// Рендер промо-ролика ZMOZHU для Instagram Reels (1080×1920, 30 fps).
//
// Використання (з кореня репозиторію, після `npm run build` у zmozhu/02-claude-redesign):
//   FFMPEG=/шлях/до/ffmpeg node zmozhu/promo/src/render.mjs            # повний ролик
//   FFMPEG=... node zmozhu/promo/src/render.mjs stills 1.2 3.3 6.5      # контрольні кадри
//
// Сцена (brag.html) — чиста функція часу render(t). Кадри знімаються браузером
// і передаються у ffmpeg через pipe, без проміжних файлів.

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROMO = path.resolve(HERE, "..");
const SITE_OUT = path.resolve(HERE, "../../02-claude-redesign/out");
const WORK = process.env.WORK || path.join(PROMO, "work");
const FFMPEG = process.env.FFMPEG || "ffmpeg";

const FPS = 30;
const DURATION = 21.0;
const POSTER_T = 3.3; // кадр-обкладинка: обидва рядки хука видно повністю
const W = 1080, H = 1920;

const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml" };

function serve() {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split("?")[0]);
    const file = url === "/" ? path.join(HERE, "brag.html") : path.join(SITE_OUT, url);
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
      res.end(buf);
    });
  });
  return new Promise((r) => server.listen(0, "127.0.0.1", () => r(server)));
}

async function openPage(port) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
  await page.evaluate(() => window.ready());
  // Перевірка, що шрифти сайту справді підвантажились (а не fallback)
  const fontsOk = await page.evaluate(() => document.fonts.check('600 64px "__Cormorant_Garamond_392439"') && document.fonts.check('700 32px "__Manrope_fe7774"'));
  if (!fontsOk) throw new Error("Шрифти сайту не підвантажились — перевірте шлях до out/_next/static");
  return { browser, page };
}

async function frame(page, t) {
  await page.evaluate((tt) => window.render(tt), t);
  return page.screenshot({ type: "png", clip: { x: 0, y: 0, width: W, height: H } });
}

async function stills(times) {
  fs.mkdirSync(path.join(WORK, "stills"), { recursive: true });
  const server = await serve();
  const { browser, page } = await openPage(server.address().port);
  for (const t of times) {
    const buf = await frame(page, t);
    const f = path.join(WORK, "stills", `t${t.toFixed(2).padStart(5, "0")}.png`);
    fs.writeFileSync(f, buf);
    console.log(f);
  }
  await browser.close();
  server.close();
}

async function full() {
  fs.mkdirSync(WORK, { recursive: true });
  const audio = path.join(WORK, "audio.wav");
  if (!fs.existsSync(audio)) throw new Error(`Немає ${audio} — спершу запустіть audio.py`);
  const out = path.join(PROMO, "brag.mp4");
  const server = await serve();
  const { browser, page } = await openPage(server.address().port);

  // Обкладинка
  const poster = await frame(page, POSTER_T);
  fs.writeFileSync(path.join(WORK, "poster.png"), poster);

  const ff = spawn(FFMPEG, [
    "-y", "-loglevel", "error",
    "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "png", "-i", "-",
    "-i", audio,
    "-map", "0:v", "-map", "1:a",
    "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-profile:v", "high", "-pix_fmt", "yuv420p",
    "-r", String(FPS),
    "-c:a", "aac", "-b:a", "192k", "-ar", "44100",
    "-shortest", "-movflags", "+faststart",
    out,
  ], { stdio: ["pipe", "inherit", "inherit"] });

  const N = Math.round(DURATION * FPS);
  for (let i = 0; i < N; i++) {
    // Кадр 0 = обкладинка (без додаткового кадру, синхрон зі звуком зберігається)
    const buf = i === 0 ? poster : await frame(page, i / FPS);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (i % 60 === 0) process.stdout.write(`кадр ${i}/${N}\n`);
  }
  ff.stdin.end();
  await new Promise((r, j) => ff.on("close", (c) => (c === 0 ? r() : j(new Error("ffmpeg " + c)))));
  await browser.close();
  server.close();

  // brag.jpg з тієї самої обкладинки
  await new Promise((r, j) => {
    const p = spawn(FFMPEG, ["-y", "-loglevel", "error", "-i", path.join(WORK, "poster.png"), "-q:v", "2", path.join(PROMO, "brag.jpg")], { stdio: "inherit" });
    p.on("close", (c) => (c === 0 ? r() : j(new Error("ffmpeg jpg " + c))));
  });
  console.log("Готово:", out);
}

const [mode, ...rest] = process.argv.slice(2);
if (mode === "stills") await stills(rest.map(Number));
else await full();

// Перевірка: усі тексти зі старого сайту (архів zmozhu redesign 2026-09-06)
// присутні у новому коді. Запуск: OLD_DIR=/шлях/до/старого npm run check:texts
import fs from "node:fs";
import path from "node:path";

const OLD = process.env.OLD_DIR;
if (!OLD) {
  console.error("Вкажіть OLD_DIR=/шлях/до/старого/сайту");
  process.exit(2);
}
const NEW = path.resolve(new URL(".", import.meta.url).pathname, "..");

const norm = (s) =>
  s
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\{"\s*"\}/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", "out", "public", ".git"].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx?|mjs)$/.test(e.name)) out.push(p);
  }
  return out;
}

// Витягуємо фрагменти: JSX-текст між тегами та рядкові літерали з кирилицею
function fragments(src) {
  const out = new Set();
  const jsx = src.replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/\/\/[^\n]*/g, " ");
  for (const m of jsx.matchAll(/>([^<>{}]+)</g)) {
    const t = norm(m[1]);
    if (t.length > 2 && /[А-Яа-яІіЇїЄєҐґ]/.test(t)) out.add(t);
  }
  for (const m of jsx.matchAll(/"([^"\n]{3,})"/g)) {
    const t = norm(m[1]);
    if (/[А-Яа-яІіЇїЄєҐґ]/.test(t) && !/^[\w\-\/#.:%]+$/.test(t)) out.add(t);
  }
  return [...out];
}

const oldFiles = walk(OLD).filter((f) => !/bot-mockup/.test(f));

// Джерело для порівняння: зібраний HTML (out/), а якщо його немає — вихідний код.
function htmlFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) htmlFiles(p, out);
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}
const built = htmlFiles(path.join(NEW, "out"));
const decodeEntities = (h) =>
  h
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ");
// Текст сторінок + значення атрибутів (alt, aria-label, meta) + вихідний код
// (для станів, що з'являються лише після взаємодії: відкриті відповіді FAQ, закріплена кнопка).
const htmlText = built
  .map((f) => {
    const h = fs.readFileSync(f, "utf8").replace(/<script[\s\S]*?<\/script>/g, " ");
    const attrs = [...h.matchAll(/="([^"]*)"/g)].map((m) => m[1]).join("\n");
    return decodeEntities(h.replace(/<\/?(p|div|li|h[1-6]|section|article|footer|header|ul|main|nav|figure|blockquote)\b[^>]*>/g, " ").replace(/<[^>]+>/g, "") + "\n" + attrs);
  })
  .join("\n");
const codeText = walk(NEW).map((f) => fs.readFileSync(f, "utf8")).join("\n");
const newSrc = norm(htmlText + "\n" + codeText);
console.log(`Порівняння: зібраний HTML (${built.length} файлів) + вихідний код`);

// Фрагменти, змінені за вказівкою власника (07.09.2026): фінальний результат —
// вага на 30-й день, а не середнє за три останні дні.
const CHANGED = [
  "Від стартової ваги. Фінальний результат визначаємо за середнім значенням останніх 3 зважувань.",
  "зниження ваги мінімум на 4% від ваги на старті, без різких стрибків у графіку (фінальний результат рахується як середнє за три останні дні зважувань);",
  "від ваги на старті, без різких стрибків у графіку. Фінальний результат обчислюється як середнє значення за три останні дні зважувань.",
  // 08.09.2026, за вказівкою власника
  "Внесок повернувся — участь фактично коштувала Тобі $0.",
  "Учасницею програми «ZMOZHU», повертається повністю або частково.",
  "Ці Правила описують умови, за яких мотиваційний внесок, сплачений Учасницею програми «ZMOZHU», повертається повністю або частково.",
  "Проходить ці 30 днів прямо зараз, разом із Тобою.",
  "Якщо Ти виконала всі три умови, повернення запускається автоматично. 2000 грн повертаються на ту саму картку, з якої була оплата, протягом кількох робочих днів.",
  // v2.3: попередження прибрано з першого екрана (факт лишається у блоці «Безпека»); абзац про мету перефразовано
  "Якщо хоча б одна умова не виконана, внесок не повертається. Підтримка триває до кінця 30 днів.",
  "Бо наша мета — не максимальна цифра на вагах за короткий час. А результат, який можна пройти без крайнощів.",
];
let missing = 0;
let total = 0;
for (const f of oldFiles) {
  for (const t of fragments(fs.readFileSync(f, "utf8"))) {
    total++;
    if (CHANGED.includes(t)) continue;
    if (!newSrc.includes(t)) {
      missing++;
      console.log(`MISSING [${path.relative(OLD, f)}]: ${t}`);
    }
  }
}
console.log(`\nПеревірено фрагментів: ${total}. Відсутні: ${missing}.`);
process.exit(missing ? 1 : 0);

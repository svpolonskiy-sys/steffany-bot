// Generates STORYBOARD.md from index.html so the storyboard never drifts from the deck.
// Usage: node tools/build-storyboard.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");

const decode = s => s
  .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
const text = s => decode(s.replace(/<br\s*\/?>/g, " / ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const fmt = sec => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
const attr = (tag, name) => { const m = tag.match(new RegExp(`${name}="([^"]*)"`)); return m ? decode(m[1]) : ""; };

const sections = [...html.matchAll(/<section class="slide[^"]*"[^>]*>[\s\S]*?<\/section>/g)].map(m => m[0]);
const slides = sections.map(sec => {
  const open = sec.match(/^<section[^>]*>/)[0];
  const aside = sec.match(/<aside class="notes"([^>]*)>([\s\S]*?)<\/aside>/);
  const body = sec.replace(/<aside[\s\S]*?<\/aside>/, "").replace(/<script[\s\S]*?<\/script>/g, "");
  const notes = aside ? aside[2].split(/<\/p>/).map(text).filter(Boolean) : [];
  return {
    id: attr(open, "id"),
    section: attr(open, "data-section") || "main",
    title: attr(open, "data-title"),
    block: attr(open, "data-block"),
    time: parseInt(attr(open, "data-time") || "0", 10),
    onScreen: text(body.replace(/^<section[^>]*>/, "")),
    visual: aside ? attr(aside[1], "data-visual") : "",
    anim: aside ? attr(aside[1], "data-anim") : "",
    notes,
  };
});

const main = slides.filter(s => s.section === "main");
const total = main.reduce((a, s) => a + s.time, 0);

let out = `# STORYBOARD — «Від ідеї в гуртожитку до глобального продукту за допомогою AI»\n\n`;
out += `> Згенеровано з \`index.html\` скриптом \`tools/build-storyboard.mjs\`. Не редагуй вручну — редагуй слайди й перезапусти скрипт.\n\n`;
out += `**Основне шоу:** ${main.length} слайдів · **${fmt(total)}** хв · Fallback: ${slides.filter(s => s.section === "fallback").length} · Appendix: ${slides.filter(s => s.section === "appendix").length} · Lobby: 1\n\n`;

// timing table per block
out += `## Таймінг по блоках\n\n| Блок | Старт | Тривалість | Слайди | Зміна формату всередині |\n|---|---|---|---|---|\n`;
const blocks = [];
main.forEach((s, i) => { const b = blocks.find(x => x.name === s.block); if (b) { b.time += s.time; b.n.push(i + 1); } else blocks.push({ name: s.block, time: s.time, n: [i + 1] }); });
const formats = {
  "01": "питання залу → мем → тиша/пауза → обіцянка",
  "02": "лічильник → велика цифра → таймлайн → голосування",
  "03": "«серіал» → 3 історії → питання залу",
  "04": "питання → велике «НІ» → kinetic-список → мем → формула",
  "05": "особиста історія → before/after + голос → продукт-анімація → уроки",
  "06": "тезис → мем → схема → LIVE DEMO → висновок",
  "07": "чорний екран → фейковий чат → правило",
  "08": "сходи → картки ідей → мем → висновок",
  "09": "fullscreen-заклик → LIVE BUILD з залом і таймером",
  "10": "челендж → перекреслення → цитата",
  "11": "Q&A → фінальний слайд",
};
let t = 0;
blocks.forEach(b => {
  out += `| ${b.name} | ${fmt(t)} | ${fmt(b.time)} | ${b.n[0]}–${b.n[b.n.length - 1]} | ${formats[b.name.slice(0, 2)] || ""} |\n`;
  t += b.time;
});
out += `| **Разом** | | **${fmt(total)}** | ${main.length} | |\n\n`;
out += `Найдовший відрізок одного формату — LIVE BUILD (${fmt(main.find(s => s.id === "s39").time)}) і LIVE DEMO NotebookLM (${fmt(main.find(s => s.id === "s29").time)}); обидва інтерактивні, із залом, і всередині мають 5–8 мікрозмін (промпти, голосування, подкаст). Жодного відрізка > 10 хв без зміни формату.\n\n`;

const card = (s, label) => {
  let c = `### ${label} · ${s.title}\n\n`;
  c += `| | |\n|---|---|\n`;
  c += `| **SLIDE** | ${label} (\`#${s.id}\`) |\n| **BLOCK** | ${s.block} |\n| **TIME** | ${fmt(s.time)} |\n`;
  c += `| **ON SCREEN** | ${s.onScreen.replace(/\|/g, "\\|")} |\n| **VISUAL** | ${s.visual.replace(/\|/g, "\\|")} |\n| **ANIMATION** | ${s.anim.replace(/\|/g, "\\|")} |\n\n`;
  c += `**SPEAKER NOTES**\n\n${s.notes.map(n => "- " + n).join("\n")}\n\n`;
  return c;
};

out += `## Основне шоу\n\n`;
let lastBlock = "", start = 0;
main.forEach((s, i) => {
  if (s.block !== lastBlock) { out += `---\n\n## ${s.block}\n\n`; lastBlock = s.block; }
  out += card(s, `${String(i + 1).padStart(2, "0")} · ${fmt(start)}`);
  start += s.time;
});
for (const [sec, name] of [["lobby", "Lobby (до старту)"], ["fallback", "Fallback — клавіша X"], ["appendix", "Appendix для Q&A — клавіша A"]]) {
  out += `---\n\n## ${name}\n\n`;
  slides.filter(s => s.section === sec).forEach((s, i) => { out += card(s, `${sec.toUpperCase()} ${i + 1}`); });
}

writeFileSync(join(root, "STORYBOARD.md"), out);
console.log(`STORYBOARD.md: ${main.length} main slides, ${fmt(total)} planned`);

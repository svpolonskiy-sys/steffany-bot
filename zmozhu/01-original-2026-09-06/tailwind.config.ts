import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Фони
        cream: "#FAFAF6",
        "cream-deep": "#F0F2EA",
        blush: "#ECF2CE",
        sage: "#E7ECE4",
        // Текст
        ink: "#273E36",
        // Було #6B7A88 — 3.72:1 на blush при нормі 4.5:1. Зараз 4.50–5.34:1.
        "ink-soft": "#5B6D63",
        // Акценти. Три відтінки теракоти під три різні задачі:
        // terracotta   — ТІЛЬКИ декор (крапки, рамки, фони) і текст на темному.
        //                Як текст на світлому дає 2.40–2.84:1 — не використовувати.
        // terracotta-l — те саме, найсвітліший. Текстом лише на bg-deep.
        // terracotta-mid  — великий текст (від 24px) на світлому: 3.00–3.56:1.
        // terracotta-deep — будь-який текст на світлому і фон кнопок: 4.51–5.35:1.
        terracotta: "#839C48",
        "terracotta-l": "#DCEC9F",
        "terracotta-mid": "#647E32",
        "terracotta-deep": "#37634B",
        "terracotta-deep-h": "#254A38",
        deep: "#153E35",
        // Службові
        line: "#D8DED2",
      },
      fontFamily: {
        serif: ["var(--font-lora)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "16px",
        pill: "100px",
      },
      boxShadow: {
        soft: "0 8px 30px rgba(64,86,110,0.08)",
      },
      maxWidth: {
        content: "1240px",
      },
    },
  },
  plugins: [],
};

export default config;

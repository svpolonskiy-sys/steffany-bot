import type { Config } from "tailwindcss";

// ZMOZHU «живий» варіант сайту від OpenAI.
// Ідентичність оригіналу збережена (глибокий зелений + лайм), але підсилена:
// лайм — єдиний яскравий акцент, персик — лише для «людських» моментів (Тетяна).
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: "#10352D",
        "forest-2": "#184A3F",
        "forest-3": "#21594C",
        lime: "#D9F27E",
        "lime-soft": "#EEF8C8",
        cream: "#F6F5EE",
        sage: "#E7EEDF",
        mist: "#EEF3E6",
        ink: "#17302A",
        "ink-soft": "#56685F",
        line: "#D9E0D2",
        peach: "#F3C9A8",
        moss: "#2F6B57",
      },
      fontFamily: {
        sans: ["var(--font-geologica)", "system-ui", "sans-serif"],
        voice: ["var(--font-lora)", "Georgia", "serif"],
      },
      borderRadius: { card: "28px", pill: "999px" },
      boxShadow: {
        soft: "0 14px 40px rgba(16,53,45,0.08)",
        lift: "0 30px 70px rgba(16,53,45,0.18)",
        deep: "0 40px 90px rgba(0,0,0,0.35)",
      },
      maxWidth: { content: "1240px" },
      keyframes: {
        breathe: { "0%,100%": { transform: "scale(1)", opacity: "1" }, "50%": { transform: "scale(1.35)", opacity: ".55" } },
        drift: { "0%,100%": { transform: "translate3d(0,0,0)" }, "50%": { transform: "translate3d(0,-12px,0)" } },
        marquee: { "0%": { transform: "translateX(0)" }, "100%": { transform: "translateX(-50%)" } },
        spin: { to: { transform: "rotate(360deg)" } },
      },
      animation: {
        breathe: "breathe 3.2s ease-in-out infinite",
        drift: "drift 7s ease-in-out infinite",
        "drift-slow": "drift 10s ease-in-out infinite",
        marquee: "marquee 40s linear infinite",
        "spin-slow": "spin 30s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;

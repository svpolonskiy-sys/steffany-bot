import type { Config } from "tailwindcss";

// Палітра ZMOZHU v2.
// Логіка кольорів: глибокий теал (#0F4C4C) — спокій, компетентність і надійність;
// теплий папір і пісок — «жива», не клінічна атмосфера; корал/абрикос — енергія
// та турбота, але лише як акцент. Усі текстові кольори перевірені на контраст.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAF7F1",
        sand: "#F1EBE1",
        mist: "#E4EEEA",
        rose: "#F7E6DE",
        ink: "#15252A",
        "ink-soft": "#53656B",
        teal: "#0F4C4C",
        "teal-deep": "#0A3636",
        "teal-mid": "#1E6B66",
        "teal-soft": "#CFE1DB",
        coral: "#E9765A",
        "coral-text": "#B0462B",
        apricot: "#F7C2A0",
        line: "#E4DDD1",
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "system-ui", "sans-serif"],
        display: ["var(--font-cormorant)", "Georgia", "serif"],
      },
      borderRadius: {
        card: "24px",
        pill: "999px",
      },
      boxShadow: {
        soft: "0 10px 40px rgba(21, 37, 42, 0.08)",
        lift: "0 24px 60px rgba(10, 54, 54, 0.18)",
        glow: "0 0 0 1px rgba(255,255,255,0.08), 0 30px 80px rgba(0,0,0,0.35)",
      },
      maxWidth: {
        content: "1200px",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        pulseRing: {
          "0%": { transform: "scale(0.8)", opacity: "0.8" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
        shine: {
          "0%": { transform: "translateX(-120%) skewX(-18deg)" },
          "100%": { transform: "translateX(220%) skewX(-18deg)" },
        },
      },
      animation: {
        marquee: "marquee 38s linear infinite",
        float: "float 6s ease-in-out infinite",
        pulseRing: "pulseRing 2.4s cubic-bezier(.2,.7,.2,1) infinite",
        shine: "shine 2.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;

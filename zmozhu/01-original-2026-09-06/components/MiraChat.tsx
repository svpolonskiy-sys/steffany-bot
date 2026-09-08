"use client";

// Точне відтворення реального інтерфейсу Telegram-бота ZMOZHU
// (темна тема, за скріншотом public/images/telegram-bot.png).
// Відтворено кодом, а не скріншотом, щоб коректно підставити ім'я учасниці.
//
// Повідомлення з'являються послідовно, з індикатором «друкує…» між ними —
// щоб показати продукт у дії, а не статичною картинкою.
// prefers-reduced-motion повністю вимикає послідовність: усе видно одразу.

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const messages = [
  "Дякую 🤍 Сьогодні лише одне правило — сідай, коли їси.",
  "Привіт, Олено! ☀️ День 4 — і ти знову тут, це вже сама по собі маленька перемога. Сьогодні без ваги, тож просто радію, що ти зі мною.",
  "Побачимось о 15:00 — на тебе чекає аудіо від нутриціолога 🎧",
];

const keyboard = [
  "⚖️ Зважитись",
  "💗 Підтримка",
  "🌅 Ранковий чекін",
  "🌙 Вечірній чекін",
  "📈 Мій прогрес",
  "📋 Правила",
];

// Скільки часу «друкує» Міра і скільки триває пауза після повідомлення
const TYPING_MS = 700;
const PAUSE_MS = 450;
const START_DELAY_MS = 400;

export default function MiraChat() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  // Чи Міра зараз «друкує» — показуємо статус у шапці, як у справжньому Telegram
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    if (reduce || !inView) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    let t = START_DELAY_MS;

    messages.forEach(() => {
      timers.push(setTimeout(() => setTyping(true), t));
      t += TYPING_MS;
      timers.push(setTimeout(() => setTyping(false), t));
      t += PAUSE_MS;
    });

    return () => timers.forEach(clearTimeout);
  }, [inView, reduce]);

  // Момент появи кожного повідомлення збігається з кінцем «друкує…»
  const messageDelay = (i: number) =>
    (START_DELAY_MS + (i + 1) * TYPING_MS + i * PAUSE_MS) / 1000;

  return (
    <div
      ref={ref}
      role="img"
      aria-label="Екран Telegram-бота ZMOZHU: Міра вітається з учасницею на четвертий день, нагадує про аудіо від нутриціолога; унизу меню з кнопками зважування, чекінів і прогресу."
      className="mx-auto w-full max-w-[300px] select-none overflow-hidden rounded-[26px] bg-[#0E1621] shadow-soft"
    >
      {/* Статус-бар */}
      <div className="flex items-center justify-between px-4 pb-1 pt-2 text-[11px] font-semibold text-white">
        <span>7:30</span>
        <span className="flex items-center gap-1 rounded-full bg-[#1C77A6] px-2 py-[2px] text-[9px] font-bold tracking-wide">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
            <path d="M21 3L3 10.5l6 2.5L21 3zm0 0l-3 15-9-5 12-10z" />
          </svg>
          TELEGRAM
        </span>
        <span className="flex items-center gap-[3px]">
          <svg width="13" height="9" viewBox="0 0 15 10" fill="none" aria-hidden="true">
            <rect y="7" width="2.4" height="3" rx="0.6" fill="#fff" />
            <rect x="3.5" y="5" width="2.4" height="5" rx="0.6" fill="#fff" />
            <rect x="7" y="2.5" width="2.4" height="7.5" rx="0.6" fill="#fff" fillOpacity="0.45" />
            <rect x="10.5" width="2.4" height="10" rx="0.6" fill="#fff" fillOpacity="0.45" />
          </svg>
          <svg width="12" height="9" viewBox="0 0 14 10" fill="none" aria-hidden="true">
            <path d="M7 8.5a1 1 0 100-2 1 1 0 000 2z" fill="#fff" />
            <path d="M2.7 4.2a6 6 0 018.6 0" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" />
            <path d="M4.6 6.1a3.3 3.3 0 014.8 0" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <span className="flex h-[11px] w-[20px] items-center justify-center rounded-[3px] bg-white text-[8px] font-bold text-[#0E1621]">
            24
          </span>
        </span>
      </div>

      {/* Шапка чату */}
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">
          <svg width="7" height="12" viewBox="0 0 8 14" fill="none" aria-hidden="true">
            <path d="M7 1L1 7l6 6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[10px] font-semibold text-white">3</span>
        </span>
        <div className="flex-1 rounded-full bg-white/10 py-1 text-center leading-tight">
          <p className="text-[12px] font-semibold text-white">ZMOZHU</p>
          <p className="text-[9px] text-white/50">
            {typing ? "друкує…" : "бот"}
          </p>
        </div>
        <span className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-[#F0C4B4] to-[#D98368]" />
      </div>

      {/* Стрічка повідомлень */}
      <div className="space-y-1.5 px-3 pb-2 pt-1">
        <div className="mx-auto w-fit rounded-full bg-white/10 px-2.5 py-[3px] text-[9px] text-white/75">
          1,5+ літра
        </div>

        {messages.map((text, i) => (
          <motion.div
            key={text}
            initial={reduce ? false : { opacity: 0, y: 8, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{
              duration: 0.35,
              ease: "easeOut",
              delay: reduce ? 0 : messageDelay(i),
            }}
            className="max-w-[92%] rounded-[14px] rounded-bl-[4px] bg-[#212D3B] px-3 py-2"
          >
            <p className="text-[11px] leading-snug text-white">{text}</p>
            <p className="mt-0.5 text-right text-[8px] text-white/75">7:28</p>
          </motion.div>
        ))}
      </div>

      {/* Поле вводу */}
      <div className="flex items-center gap-1.5 px-3 py-2">
        <span className="flex items-center gap-1 rounded-full bg-[#1C77A6] px-2.5 py-1.5 text-[10px] font-semibold text-white">
          <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M1 2h10M1 6h10M1 10h10" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          Меню
        </span>
        <span className="flex flex-1 items-center rounded-full bg-white/10 px-3 py-1.5 text-[10px] text-white/75">
          Повідомлення
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 3a3 3 0 013 3v6a3 3 0 01-6 0V6a3 3 0 013-3zM5 11a7 7 0 0014 0M12 18v3" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>

      {/* Клавіатура бота */}
      <div className="grid grid-cols-2 gap-1.5 px-3 pb-3">
        {keyboard.map((btn) => (
          <span
            key={btn}
            className="rounded-[10px] bg-white/[0.08] px-2 py-2 text-center text-[10px] text-white/90"
          >
            {btn}
          </span>
        ))}
      </div>
    </div>
  );
}

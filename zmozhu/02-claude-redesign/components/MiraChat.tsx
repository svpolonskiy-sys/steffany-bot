"use client";

// Відтворення реального інтерфейсу Telegram-бота ZMOZHU (за скріншотом
// public/images/telegram-bot.png). Розмітка, а не картинка — щоб коректно
// підставити жіноче ім'я. Повідомлення з'являються по черзі з «друкує…».

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

const TYPING_MS = 900;
const PAUSE_MS = 500;
const START_DELAY_MS = 500;

export default function MiraChat() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [typing, setTyping] = useState(false);
  const [shown, setShown] = useState(reduce ? messages.length : 0);

  useEffect(() => {
    if (reduce) {
      setShown(messages.length);
      return;
    }
    if (!inView) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    let t = START_DELAY_MS;
    messages.forEach((_, i) => {
      timers.push(setTimeout(() => setTyping(true), t));
      t += TYPING_MS;
      timers.push(
        setTimeout(() => {
          setTyping(false);
          setShown(i + 1);
        }, t)
      );
      t += PAUSE_MS;
    });
    return () => timers.forEach(clearTimeout);
  }, [inView, reduce]);

  return (
    <div className="relative mx-auto w-full max-w-[320px]">
      {/* Рамка телефона */}
      <div className="rounded-[38px] bg-[#0b0f14] p-[9px] shadow-glow">
        <div
          ref={ref}
          role="img"
          aria-label="Екран Telegram-бота ZMOZHU: Міра вітається з учасницею на четвертий день, нагадує про аудіо від нутриціолога; унизу меню з кнопками зважування, чекінів і прогресу."
          className="relative select-none overflow-hidden rounded-[30px] bg-[#0E1621]"
        >
          <div className="absolute left-1/2 top-2 h-[22px] w-[92px] -translate-x-1/2 rounded-full bg-[#0b0f14]" aria-hidden="true" />

          {/* Статус-бар */}
          <div className="flex items-center justify-between px-5 pb-1 pt-3 text-[11px] font-semibold text-white">
            <span>7:30</span>
            <span className="flex items-center gap-[3px]">
              <svg width="13" height="9" viewBox="0 0 15 10" fill="none" aria-hidden="true">
                <rect y="7" width="2.4" height="3" rx="0.6" fill="#fff" />
                <rect x="3.5" y="5" width="2.4" height="5" rx="0.6" fill="#fff" />
                <rect x="7" y="2.5" width="2.4" height="7.5" rx="0.6" fill="#fff" fillOpacity="0.45" />
                <rect x="10.5" width="2.4" height="10" rx="0.6" fill="#fff" fillOpacity="0.45" />
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
              <p className="flex h-3 items-center justify-center text-[9px] text-white/50">
                {typing ? (
                  <motion.span
                    animate={reduce ? undefined : { opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    друкує…
                  </motion.span>
                ) : (
                  "бот"
                )}
              </p>
            </div>
            <span className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-apricot to-coral" />
          </div>

          {/* Стрічка повідомлень */}
          <div className="min-h-[236px] space-y-1.5 px-3 pb-2 pt-1">
            <div className="mx-auto w-fit rounded-full bg-white/10 px-2.5 py-[3px] text-[9px] text-white/75">
              1,5+ літра
            </div>

            {messages.map((text, i) => (
              <motion.div
                key={text}
                initial={reduce ? false : { opacity: 0, y: 10, scale: 0.96 }}
                animate={i < shown ? { opacity: 1, y: 0, scale: 1 } : undefined}
                transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
                className="max-w-[92%] rounded-[14px] rounded-bl-[4px] bg-[#212D3B] px-3 py-2"
                style={reduce ? undefined : i < shown ? undefined : { opacity: 0 }}
              >
                <p className="text-[11.5px] leading-snug text-white">{text}</p>
                <p className="mt-0.5 text-right text-[8px] text-white/60">7:28</p>
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
          <div className="grid grid-cols-2 gap-1.5 px-3 pb-4">
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
      </div>
    </div>
  );
}

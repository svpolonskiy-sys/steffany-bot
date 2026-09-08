"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import Reveal, { Item, Stagger } from "@/components/Reveal";

const blocks = [
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 17h16M6 13a6 6 0 0112 0M12 3v3M4.5 7.5l2 2M19.5 7.5l-2 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    ),
    t: "Ранок",
    time: "≈ 5 хвилин",
    d: "Зважування, короткий ранковий чекін і тема дня.",
    d2: "Фіксуєш, де Ти сьогодні, і спокійно починаєш день.",
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 14v-2a8 8 0 0116 0v2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <rect x="3" y="13" width="4" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
        <rect x="17" y="13" width="4" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    ),
    t: "День",
    time: "≈ 3–5 хвилин",
    d: "Коротке аудіо від експерта про те, що впливає на Твій день.",
    d2: "Одна практична тема — без довгих лекцій і зайвої теорії.",
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M17 3v3M15.5 4.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    t: "Вечір",
    time: "≈ 4 хвилини",
    d: "Короткий чекін про те, як пройшов день, і чесне відео від Тетяни.",
    d2: "Закриваєш день і просто повертаєшся завтра.",
  },
];

export default function Day() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.9", "end 0.5"] });
  const x = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "100%"]);
  const width = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "100%" : "100%"]);

  return (
    <section id="day" className="bg-gradient-to-b from-sand from-50% to-paper to-50% px-3 py-3 md:px-5" aria-labelledby="day-title">
      <div className="on-dark grain relative overflow-hidden rounded-[32px] bg-teal-deep text-white md:rounded-[40px]">
        <div className="blob right-[-10%] top-[-20%] h-[520px] w-[520px] bg-teal-mid/60" aria-hidden="true" />
        <div className="blob bottom-[-30%] left-[-10%] h-[520px] w-[520px] bg-coral/25" aria-hidden="true" />

        <div className="wrap section">
          <div className="grid gap-10 md:grid-cols-[1.25fr_0.75fr] md:items-end">
            <Reveal>
              <p className="eyebrow eyebrow--light">Твій день у ZMOZHU</p>
              <h2 id="day-title" className="display mt-4 text-[clamp(34px,4.4vw,58px)]">
                Близько 15 хвилин на день.
                <span className="accent block">Усе в Telegram.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="max-w-[440px] text-[17px] leading-relaxed text-white/75 md:text-[18px]">
                Без окремих застосунків, складних кабінетів і годин контенту.
              </p>
            </Reveal>
          </div>

          {/* Лінія дня: заповнюється в міру скролу, по ній рухається сонце */}
          <div ref={ref} className="relative mt-14 hidden md:block" aria-hidden="true">
            <div className="h-[2px] w-full rounded bg-white/15" />
            <motion.div style={{ width }} className="absolute left-0 top-0 h-[2px] rounded bg-gradient-to-r from-apricot to-coral" />
            <motion.div style={{ left: x }} className="absolute top-1/2 -ml-3 h-6 w-6 -translate-y-1/2 rounded-full bg-apricot shadow-[0_0_0_10px_rgba(247,194,160,0.18)]" />
          </div>

          <Stagger className="mt-6 grid gap-4 md:mt-10 md:grid-cols-3" gap={0.12}>
            {blocks.map((b) => (
              <Item
                key={b.t}
                as="article"
                className="glass group relative rounded-card p-7 transition-colors duration-500 hover:bg-white/10"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-apricot transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110">
                    {b.icon}
                  </span>
                  <span className="rounded-pill border border-white/15 px-3 py-1 text-[12px] font-bold uppercase tracking-[0.1em] text-apricot">
                    {b.time}
                  </span>
                </div>
                <h3 className="display mt-6 text-[34px]">{b.t}</h3>
                <p className="mt-3 text-[16px] leading-relaxed text-white">{b.d}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-white/65">{b.d2}</p>
              </Item>
            ))}
          </Stagger>

          <div className="mt-12 grid gap-6 border-t border-white/10 pt-8 md:grid-cols-[1fr_1fr] md:items-center">
            <Reveal>
              <p className="text-[15px] leading-relaxed text-white/65">
                Нічого нового не потрібно встановлювати чи вивчати. Усе
                відбувається у звичному Telegram.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="display text-[clamp(24px,2.6vw,34px)] leading-[1.15] md:text-right">
                Один Telegram. Три короткі точки контакту.{" "}
                <span className="accent">Один день за раз.</span>
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

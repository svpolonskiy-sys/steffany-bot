"use client";

import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import { Reveal } from "@/components/motion";

const blocks = [
  { icon: "🌅", t: "Ранок", time: "≈ 5 хвилин", d: "Зважування, короткий ранковий чекін і тема дня.", d2: "Фіксуєш, де Ти сьогодні, і спокійно починаєш день." },
  { icon: "🎧", t: "День", time: "≈ 3–5 хвилин", d: "Коротке аудіо від експерта про те, що впливає на Твій день.", d2: "Одна практична тема — без довгих лекцій і зайвої теорії." },
  { icon: "🌙", t: "Вечір", time: "≈ 4 хвилини", d: "Короткий чекін про те, як пройшов день, і чесне відео від Тетяни.", d2: "Закриваєш день і просто повертаєшся завтра." },
];

// Кольори неба: світанок → ясний день → вечір
const SKY = ["#F6E3C8", "#E4F0DC", "#10352D"];
const INK = ["#17302A", "#17302A", "#FFFFFF"];

function Heading({ color }: { color?: string }) {
  return (
    <div style={{ color }}>
      <p className="tag opacity-80">Твій день у ZMOZHU</p>
      <h2 className="h-sec mt-5">
        Близько 15 хвилин на день.
        <span className="voice block">Усе в Telegram.</span>
      </h2>
      <p className="mt-5 max-w-[460px] text-[17px] leading-relaxed opacity-75">
        Без окремих застосунків, складних кабінетів і годин контенту.
      </p>
    </div>
  );
}

function Card({ b, i, dark }: { b: (typeof blocks)[number]; i: number; dark: boolean }) {
  return (
    <article className={`rounded-[32px] p-8 sm:p-10 ${dark ? "border border-white/15 bg-white/[0.06] text-white backdrop-blur" : "bg-white/75 text-ink shadow-soft backdrop-blur"}`}>
      <div className="flex items-center justify-between">
        <span className="text-[44px] leading-none" aria-hidden="true">{b.icon}</span>
        <span className={`rounded-pill px-4 py-1.5 text-[13px] font-semibold uppercase tracking-[0.1em] ${dark ? "bg-lime text-forest" : "bg-forest text-lime"}`}>{b.time}</span>
      </div>
      <p className={`mt-8 text-[13px] font-semibold uppercase tracking-[0.14em] ${dark ? "text-white/50" : "text-ink-soft"}`}>0{i + 1} / 03</p>
      <h3 className="mt-2 text-[clamp(40px,4.4vw,56px)] font-semibold leading-none tracking-[-0.04em]">{b.t}</h3>
      <p className="mt-6 text-[18px] leading-relaxed">{b.d}</p>
      <p className={`mt-3 text-[16px] leading-relaxed ${dark ? "text-white/65" : "text-ink-soft"}`}>{b.d2}</p>
    </article>
  );
}

export default function Day() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [phase, setPhase] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => setPhase(Math.min(2, Math.floor(v * 3.001))));

  const bg = useTransform(scrollYProgress, [0, 0.33, 0.5, 0.66, 0.8, 1], [SKY[0], SKY[0], SKY[1], SKY[1], SKY[2], SKY[2]]);
  const ink = useTransform(scrollYProgress, [0.66, 0.8], [INK[1], INK[2]]);
  // Сонце рухається по дузі; на вечір стає місяцем
  const angle = useTransform(scrollYProgress, [0, 1], [186, 354]);
  const sunX = useTransform(angle, (a) => 50 + 44 * Math.cos((a * Math.PI) / 180));
  const sunY = useTransform(angle, (a) => 108 + 96 * Math.sin((a * Math.PI) / 180));
  const sunLeft = useTransform(sunX, (v) => `${v}%`);
  const sunTop = useTransform(sunY, (v) => `${v}%`);
  const moon = useTransform(scrollYProgress, [0.7, 0.82], [0, 1]);
  const sunColor = useTransform(scrollYProgress, [0, 0.4, 0.75, 0.85], ["#F7B77E", "#F9E27A", "#F9E27A", "#D9F27E"]);

  return (
    <section id="day" aria-labelledby="day-title" className="scroll-mt-[var(--header-h)]">
      {/* Мобільний і «зменшений рух»: картки одна під одною, кожна зі своїм небом */}
      <div className={`${reduce ? "" : "md:hidden"} sec`} style={{ background: `linear-gradient(180deg, ${SKY[0]}, ${SKY[1]} 55%, #cfe0cf)` }}>
        <div className="wrap">
          <span id="day-title" className="sr-only">Твій день у ZMOZHU</span>
          <Reveal><Heading /></Reveal>
          <div className="mt-10 space-y-4">
            {blocks.map((b, i) => (
              <Reveal key={b.t} delay={i * 0.05}><Card b={b} i={i} dark={i === 2} /></Reveal>
            ))}
          </div>
        </div>
      </div>

      {/* Десктоп: день проходить під час прокрутки */}
      {!reduce && (
        <div ref={ref} className="relative hidden h-[320vh] md:block">
          <motion.div style={{ background: bg }} className="sticky top-0 flex h-screen items-center overflow-hidden">
            {/* дуга неба */}
            <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M 6 108 A 44 96 0 0 1 94 108" fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="0.15" strokeDasharray="0.8 0.8" style={{ color: phase === 2 ? "#fff" : "#10352D" }} />
            </svg>
            <motion.div aria-hidden="true" style={{ left: sunLeft, top: sunTop, backgroundColor: sunColor }} className="absolute h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_120px_40px_rgba(249,226,122,.35)]">
              <motion.span style={{ opacity: moon }} className="absolute -right-3 -top-3 h-20 w-20 rounded-full bg-forest" />
            </motion.div>

            <div className="wrap relative z-10 grid w-full items-center gap-16 lg:grid-cols-[1fr_1fr]">
              <motion.div style={{ color: ink }}>
                <Heading />
                <div className="mt-10 flex gap-2" aria-hidden="true">
                  {blocks.map((b, i) => (
                    <span key={b.t} className={`h-1.5 rounded-full transition-all duration-500 ${i === phase ? "w-16 bg-lime" : "w-6 bg-current opacity-25"}`} />
                  ))}
                </div>
              </motion.div>
              <div className="relative h-[460px]">
                {blocks.map((b, i) => (
                  <motion.div
                    key={b.t}
                    className="absolute inset-0"
                    initial={false}
                    animate={{ opacity: i === phase ? 1 : 0, y: i === phase ? 0 : i < phase ? -40 : 40, scale: i === phase ? 1 : 0.96 }}
                    transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
                    style={{ pointerEvents: i === phase ? "auto" : "none" }}
                  >
                    <Card b={b} i={i} dark={i === 2} />
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <div className="bg-forest text-white">
        <div className="wrap grid gap-6 py-14 md:grid-cols-2 md:items-center md:py-20">
          <Reveal>
            <p className="max-w-[440px] text-[15px] leading-relaxed text-white/65">
              Нічого нового не потрібно встановлювати чи вивчати. Усе
              відбувається у звичному Telegram.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-[clamp(26px,2.8vw,38px)] font-semibold leading-[1.15] tracking-[-0.03em] md:text-right">
              Один Telegram. Три короткі точки контакту. <span className="text-lime">Один день за раз.</span>
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

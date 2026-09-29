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

const THEME = [
  { bg: "#F6E3C8", ink: "#17302A", soft: "#6B5A45", chip: "bg-forest text-lime", sun: "#F7A86A" },
  { bg: "#DDEFD3", ink: "#17302A", soft: "#4E6356", chip: "bg-forest text-lime", sun: "#F4CF4E" },
  { bg: "#10352D", ink: "#FFFFFF", soft: "rgba(255,255,255,.72)", chip: "bg-lime text-forest", sun: "#D9F27E" },
];

// Дуга неба: сонце стоїть там, де воно в цю частину дня
function SkyArc({ i }: { i: number }) {
  const pos = [ { x: 18, y: 44 }, { x: 60, y: 8 }, { x: 102, y: 44 } ][i];
  const t = THEME[i];
  return (
    <svg viewBox="0 0 120 56" className="h-12 w-28" aria-hidden="true">
      <path d="M6 52 Q60 -20 114 52" fill="none" stroke={t.ink} strokeOpacity=".22" strokeWidth="1.5" strokeDasharray="3 4" />
      <circle cx={pos.x} cy={pos.y} r="8" fill={t.sun} />
      {i === 2 && <circle cx={pos.x + 4} cy={pos.y - 3} r="7" fill={t.bg} />}
    </svg>
  );
}

function Card({ b, i }: { b: (typeof blocks)[number]; i: number }) {
  const t = THEME[i];
  return (
    <article style={{ background: t.bg, color: t.ink }} className={`flex h-full flex-col rounded-[32px] p-7 shadow-soft sm:p-10 ${i === 2 ? "ring-1 ring-white/15" : ""}`}>
      <div className="flex items-start justify-between">
        <span className="text-[44px] leading-none" aria-hidden="true">{b.icon}</span>
        <SkyArc i={i} />
      </div>
      <div className="mt-6 flex items-center gap-3">
        <span style={{ color: t.soft }} className="text-[13px] font-semibold uppercase tracking-[0.14em]">0{i + 1} / 03</span>
        <span className={`rounded-pill px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.1em] ${t.chip}`}>{b.time}</span>
      </div>
      <h3 className="mt-3 text-[clamp(40px,4.4vw,56px)] font-semibold leading-none tracking-[-0.04em]">{b.t}</h3>
      <p className="mt-6 text-[18px] leading-relaxed">{b.d}</p>
      <p style={{ color: t.soft }} className="mt-3 text-[16px] leading-relaxed">{b.d2}</p>
    </article>
  );
}

// Мобільна «стрічка дня»: картки гортаються пальцем, крапки показують частину дня
function MobileDay() {
  const [active, setActive] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  return (
    <>
      <div
        ref={track}
        onScroll={(e) => {
          const el = e.currentTarget;
          setActive(Math.round(el.scrollLeft / (el.scrollWidth / blocks.length)));
        }}
        className="-mx-5 mt-10 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {blocks.map((b, i) => (
          <div key={b.t} className="w-[84%] shrink-0 snap-center">
            <Card b={b} i={i} />
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-center gap-2" aria-hidden="true">
        {blocks.map((b, i) => (
          <button
            key={b.t}
            type="button"
            tabIndex={-1}
            onClick={() => {
              const el = track.current;
              if (el) el.scrollTo({ left: (el.scrollWidth / blocks.length) * i, behavior: "smooth" });
            }}
            className={`h-2 rounded-full transition-all duration-500 ${i === active ? "w-10 bg-forest" : "w-2 bg-forest/25"}`}
          />
        ))}
      </div>
    </>
  );
}

// Три точки контакту на лінії дня: загоряються по черзі, як сповіщення
function TouchPoints() {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[420px]">
      <div className="absolute left-[27px] top-6 bottom-6 w-[2px] bg-white/15" />
      <motion.div
        className="absolute left-[27px] top-6 w-[2px] origin-top bg-lime"
        style={{ bottom: 24 }}
        initial={reduce ? false : { scaleY: 0 }}
        whileInView={{ scaleY: 1 }}
        viewport={{ once: true, margin: "-20% 0px" }}
        transition={{ duration: 1.6, ease: [0.2, 0.7, 0.2, 1] }}
      />
      {blocks.map((b, i) => (
        <motion.div
          key={b.t}
          className="relative flex items-center gap-4 py-3"
          initial={reduce ? false : { opacity: 0.25, x: 12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-20% 0px" }}
          transition={{ delay: 0.3 + i * 0.5, duration: 0.6 }}
        >
          <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-forest-2 text-[26px] ring-2 ring-lime/60">
            {b.icon}
            <motion.span
              className="absolute inset-0 rounded-full ring-2 ring-lime"
              animate={reduce ? undefined : { scale: [1, 1.35], opacity: [0.8, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.6 }}
            />
          </span>
          <span className="flex flex-1 items-center justify-between rounded-[18px] bg-white/[0.06] px-4 py-3">
            <span className="text-[17px] font-semibold">{b.t}</span>
            <span className="text-[13px] font-semibold text-lime">{b.time}</span>
          </span>
        </motion.div>
      ))}
    </div>
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
      {/* Мобільний і «зменшений рух»: стрічка карток, кожна зі своїм небом */}
      <div className={`${reduce ? "" : "md:hidden"} sec bg-cream`}>
        <div className="wrap">
          <span id="day-title" className="sr-only">Твій день у ZMOZHU</span>
          <Reveal><Heading /></Reveal>
          {reduce ? (
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {blocks.map((b, i) => <Card key={b.t} b={b} i={i} />)}
            </div>
          ) : (
            <MobileDay />
          )}
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
                    <Card b={b} i={i} />
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <div className="relative overflow-hidden bg-forest text-white">
        <div className="wrap py-16 md:py-24">
          <div className="grid gap-12 md:grid-cols-[1.1fr_0.9fr] md:items-center">
            <Reveal>
              <p className="text-[clamp(30px,3.6vw,48px)] font-semibold leading-[1.1] tracking-[-0.035em]">
                <span className="block">Один Telegram.</span>{" "}
                <span className="block text-white/70">Три короткі точки контакту.</span>{" "}
                <span className="block text-lime">Один день за раз.</span>
              </p>
              <p className="mt-6 max-w-[440px] text-[16px] leading-relaxed text-white/65">
                Нічого нового не потрібно встановлювати чи вивчати. Усе
                відбувається у звичному Telegram.
              </p>
            </Reveal>
            <TouchPoints />
          </div>
        </div>
      </div>
    </section>
  );
}

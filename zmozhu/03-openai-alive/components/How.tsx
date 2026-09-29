"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import CtaButton from "@/components/CtaButton";
import { CountUp, Item, Mark, Reveal, Stagger, useSpotlight } from "@/components/motion";

const conditions = [
  { n: "01", t: "Знизити вагу на 4%", d: "Від стартової ваги. Фінальний результат визначаємо за вагою на 30-й день." },
  { n: "02", t: "Ранкові та вечірні чекіни", d: "Короткий чекін двічі на день. За 30 днів можна пропустити до 3 ранкових і до 3 вечірніх чекінів." },
  { n: "03", t: "Щоденне зважування", d: "Фото ваг із секретним словом підтверджує зважування. За 30 днів можна пропустити до 3 разів." },
];

// Галочка, що «ставиться» при появі умови
function Tick({ delay }: { delay: number }) {
  const reduce = useReducedMotion();
  const ref = useRef<SVGSVGElement>(null);
  const seen = useInView(ref, { once: true, margin: "-10% 0px" });
  return (
    <svg ref={ref} width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
      <circle cx="22" cy="22" r="21" fill="#D9F27E" />
      <motion.path d="M13 22.5l6 6 12-13" fill="none" stroke="#10352D" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"
        initial={reduce ? false : { pathLength: 0 }} animate={seen ? { pathLength: 1 } : undefined} transition={{ delay: delay + 0.3, duration: 0.6 }} />
    </svg>
  );
}

// Графік ваги: рівний спад — зелений; різкий обрив — система ставить прапорець
function SafetyGraph() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, margin: "-15% 0px" });
  const calm = "M20 60 C 70 66, 110 74, 160 86 S 250 104, 290 112";
  const sharp = "M290 112 L 318 118 L 334 196";
  return (
    <div ref={ref} aria-hidden="true" className="relative flex min-h-[300px] items-center justify-center bg-sage p-6 sm:p-10">
      <svg viewBox="0 0 380 240" className="w-full max-w-[460px]">
        {[60, 110, 160, 210].map((y) => <line key={y} x1="20" x2="360" y1={y} y2={y} stroke="#10352D" strokeOpacity=".08" />)}
        <motion.path d={calm} fill="none" stroke="#2F6B57" strokeWidth="5" strokeLinecap="round"
          initial={reduce ? false : { pathLength: 0 }} animate={seen ? { pathLength: 1 } : undefined} transition={{ duration: 1.6, ease: [0.2, 0.7, 0.2, 1] }} />
        <motion.path d={sharp} fill="none" stroke="#E0674A" strokeWidth="5" strokeLinecap="round" strokeDasharray="1 10"
          initial={reduce ? false : { pathLength: 0, opacity: 0 }} animate={seen ? { pathLength: 1, opacity: 1 } : undefined} transition={{ delay: 1.6, duration: 0.6 }} />
        <motion.g initial={reduce ? false : { scale: 0, opacity: 0 }} animate={seen ? { scale: 1, opacity: 1 } : undefined}
          transition={{ delay: 2.2, type: "spring", stiffness: 260, damping: 14 }} style={{ transformOrigin: "334px 196px" }}>
          <circle cx="334" cy="196" r="22" fill="#FDE3D8" />
          <circle cx="334" cy="196" r="9" fill="#E0674A" />
          <motion.circle cx="334" cy="196" r="22" fill="none" stroke="#E0674A" strokeWidth="2"
            animate={seen && !reduce ? { r: [22, 36], opacity: [0.7, 0] } : undefined} transition={{ duration: 1.6, repeat: Infinity, delay: 2.6 }} />
        </motion.g>
        {[20, 90, 160, 230, 290].map((x, i) => (
          <motion.circle key={x} cx={x} cy={[60, 69, 86, 102, 112][i]} r="6" fill="#D9F27E" stroke="#10352D" strokeWidth="2"
            initial={reduce ? false : { scale: 0 }} animate={seen ? { scale: 1 } : undefined} transition={{ delay: 0.3 + i * 0.28 }} style={{ transformOrigin: `${x}px ${[60, 69, 86, 102, 112][i]}px` }} />
        ))}
      </svg>
    </div>
  );
}

export default function How() {
  const spot = useSpotlight<HTMLElement>();
  return (
    <section id="how" ref={spot} className="spot on-dark sec relative overflow-hidden bg-forest text-white" aria-labelledby="how-title">
      <div aria-hidden="true" className="absolute -left-40 top-40 h-[560px] w-[560px] rounded-full bg-forest-3 blur-[120px] animate-drift-slow" />
      <div className="wrap relative">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16">
          <div>
            <Reveal>
              <p className="tag text-lime">Як це працює</p>
              <h2 id="how-title" className="h-sec mt-5">
                2000 грн — це не плата за участь.
                <span className="block text-lime">Це Твій внесок у результат.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.05} className="mt-8 max-w-[560px]">
              <p className="text-[19px] leading-[1.65] text-white/85">
                Ти вносиш 2000 грн на старті. Виконуєш умови 30 днів — отримуєш усю суму
                назад.
              </p>
            </Reveal>
            <Reveal delay={0.1} className="mt-8 max-w-[560px] rounded-[26px] border border-white/15 bg-white/[0.05] p-6">
              <p className="text-[15px] font-semibold uppercase tracking-[0.08em] text-lime">Навіщо внесок взагалі?</p>
              <p className="mt-2 text-[17px] leading-[1.7] text-white/85">
                Бо коли Ти вже щось вклала, набагато складніше просто
                зникнути після одного важкого дня.
              </p>
            </Reveal>
            <Reveal delay={0.15} className="mt-8 max-w-[600px]">
              <p className="voice text-[clamp(24px,2.6vw,32px)] leading-[1.25]">
                Внесок повернувся — участь фактично коштувала Тобі 0 грн.
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.1} scale>
            <div className="relative overflow-hidden rounded-[40px] bg-lime p-9 text-forest shadow-deep sm:p-11">
              <div aria-hidden="true" className="absolute -right-10 -top-10 h-44 w-44 rounded-full border-[18px] border-forest/10 animate-spin-slow" />
              <p className="relative text-[clamp(30px,3vw,38px)] font-semibold tracking-[-0.03em]">Внесок 2000 грн</p>
              <p className="relative mt-4 text-[clamp(72px,9vw,120px)] font-bold leading-none tracking-[-0.07em]" aria-hidden="true">
                <CountUp to={2000} mode="int" duration={1.3} />
              </p>
              <p className="relative mt-5 text-[18px] font-medium leading-snug">Виконала умови → 2000 грн повертаються</p>
              <div className="relative mt-8">
                <CtaButton className="w-full">Я ЗМОЖУ</CtaButton>
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal className="mt-24">
          <h3 className="text-[clamp(34px,4vw,52px)] font-semibold tracking-[-0.04em]">Три умови. Все.</h3>
        </Reveal>
        <Stagger className="mt-8 grid gap-4 md:grid-cols-3" gap={0.15}>
          {conditions.map((c, i) => (
            <Item as="article" key={c.n}>
              <div className="group h-full rounded-[30px] border border-white/12 bg-white/[0.05] p-7 transition-colors duration-500 hover:bg-white/[0.09]">
                <div className="flex items-center justify-between">
                  <span className="text-[56px] font-bold leading-none tracking-[-0.06em] text-white/20 transition-colors duration-500 group-hover:text-lime">{c.n}</span>
                  <Tick delay={i * 0.15} />
                </div>
                <h4 className="mt-8 text-[22px] font-semibold tracking-[-0.02em]">{c.t}</h4>
                <p className="mt-3 text-[15.5px] leading-relaxed text-white/70">{c.d}</p>
              </div>
            </Item>
          ))}
        </Stagger>

        <Reveal delay={0.1} className="mx-auto mt-12 max-w-3xl text-center">
          <p className="text-[clamp(24px,2.8vw,36px)] font-semibold leading-[1.2] tracking-[-0.03em]">
            Виконала всі три умови — отримуєш свої{" "}
            <Mark className="text-lime">2000 грн назад</Mark>.
          </p>
        </Reveal>

        <Reveal className="mt-16">
          <div className="grid overflow-hidden rounded-[36px] bg-cream text-ink lg:grid-cols-[0.95fr_1.05fr]">
            <SafetyGraph />
            <div className="p-7 sm:p-10 lg:p-12">
              <h4 className="text-[clamp(28px,3vw,40px)] font-semibold leading-[1.1] tracking-[-0.035em] text-forest">
                <span className="text-moss">Безпека</span> важливіша за
                цифру на вагах.
              </h4>
              <p className="mt-5 text-[17px] leading-relaxed">Ми дивимося не лише на результат, а й на те, як Ти до нього йдеш.</p>
              <div className="mt-6 flex gap-4 rounded-[22px] bg-white p-5">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FDE3D8] text-[18px]" aria-hidden="true">🚩</span>
                <p className="text-[16px] leading-relaxed">
                  Якщо система бачить різкі або підозрілі зміни ваги, ми можемо
                  попросити додаткове підтвердження або зупинити участь — щоб не
                  заохочувати небезпечні способи схуднення.
                </p>
              </div>
              <div className="mt-3 flex gap-4 rounded-[22px] bg-white p-5">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lime text-forest" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                <div>
                  <p className="text-[16px] font-semibold leading-relaxed text-forest">Усі правила повернення внеску прозорі й однакові для всіх.</p>
                  <p className="mt-1 text-[16px] leading-relaxed">
                    Якщо якась із трьох умов не виконана, участь у програмі
                    продовжується, але внесок не повертається.
                  </p>
                </div>
              </div>
              <p className="mt-6 text-[14px] leading-relaxed text-ink-soft">
                Гроші повертаються на ту саму картку, з якої була оплата. Повні
                правила — у{" "}
                <a href="/oferta" className="font-semibold text-forest underline decoration-moss decoration-2 underline-offset-4 hover:text-moss">Публічній оферті</a>
                .
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

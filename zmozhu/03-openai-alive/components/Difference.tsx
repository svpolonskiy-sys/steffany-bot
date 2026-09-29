"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Reveal } from "@/components/motion";

const rows = [
  { first: "Дієта дає правила.", second: "ZMOZHU допомагає залишатися в процесі." },
  { first: "Експерт дає знання.", second: "ZMOZHU перетворює їх на щоденні дії." },
  { first: "Подруга підтримує.", second: "ZMOZHU додає до підтримки систему і ритм." },
];

// Рядок: «що дає звичний шлях» → стрілка малюється → «що додає ZMOZHU».
// Нічого не закреслюємо: дієта, експерт і подруга — не вороги, ZMOZHU їх доповнює.
function Row({ first, second, i }: { first: string; second: string; i: number }) {
  const reduce = useReducedMotion();
  const d = i * 0.12;
  return (
    <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-15% 0px" }} className="grid items-center gap-3 border-b border-forest/10 py-7 md:grid-cols-[0.8fr_auto_1.2fr] md:gap-8">
      <motion.p
        className="w-fit rounded-pill bg-white/70 px-4 py-2 text-[16px] text-ink-soft md:text-[17px]"
        variants={{ hidden: reduce ? { opacity: 1 } : { opacity: 0, x: -16 }, show: { opacity: 1, x: 0, transition: { delay: d, duration: 0.6 } } }}
      >
        {first}
      </motion.p>
      <svg aria-hidden="true" viewBox="0 0 64 24" className="h-6 w-12 rotate-90 text-moss md:w-16 md:rotate-0">
        <motion.path d="M2 12 H58 M48 3 L60 12 L48 21" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          variants={{ hidden: { pathLength: reduce ? 1 : 0 }, show: { pathLength: 1, transition: { delay: d + 0.35, duration: 0.6 } } }} />
      </svg>
      <motion.p
        className="text-[clamp(22px,2.6vw,34px)] font-semibold leading-[1.15] tracking-[-0.03em] text-forest"
        variants={{ hidden: reduce ? { opacity: 1 } : { opacity: 0, x: 24 }, show: { opacity: 1, x: 0, transition: { delay: d + 0.7, duration: 0.8, ease: [0.2, 0.7, 0.2, 1] } } }}
      >
        {second}
      </motion.p>
    </motion.div>
  );
}

export default function Difference() {
  return (
    <section className="sec bg-sage" aria-labelledby="diff-title">
      <div className="wrap">
        <Reveal className="max-w-[760px]">
          <h2 id="diff-title" className="h-sec text-forest">Чому цього разу може бути інакше</h2>
        </Reveal>
        <div className="mt-8">
          {rows.map((r, i) => <Row key={r.first} {...r} i={i} />)}
        </div>
        <Reveal className="mt-10">
          <div className="relative overflow-hidden rounded-[32px] bg-forest p-8 text-white sm:p-10">
            <div aria-hidden="true" className="absolute -bottom-20 -right-10 h-60 w-60 rounded-full bg-lime/25 blur-3xl animate-drift" />
            <p className="relative text-[18px] text-white/70">Не ще одна спроба почати.</p>
            <p className="relative mt-2 text-[clamp(28px,3.4vw,44px)] font-semibold leading-[1.1] tracking-[-0.03em]">
              Система, яка допомагає{" "}
              <span className="text-lime">продовжувати</span>.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

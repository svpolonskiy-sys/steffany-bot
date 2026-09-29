"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CountUp, Mark, Reveal } from "@/components/motion";

const bars = [
  { v: 47.4, label: "учасників із фінансовою відповідальністю", hi: true },
  { v: 10.5, label: "у контрольній групі", hi: false },
];

export default function Research() {
  const reduce = useReducedMotion();
  return (
    <section className="sec bg-cream" aria-labelledby="research-title">
      <div className="wrap grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div>
          <Reveal>
            <p className="tag text-moss">Дослідження</p>
            <h2 id="research-title" className="h-sec mt-5 text-forest">Фінансова мотивація працює</h2>
            <p className="mt-6 text-[18px] leading-relaxed text-ink">У рандомізованому дослідженні JAMA ціль досягли:</p>
          </Reveal>
          <Reveal delay={0.1} className="mt-10">
            <p className="text-[clamp(26px,3vw,38px)] font-semibold leading-[1.15] tracking-[-0.03em] text-forest">
              <span className="block sm:inline">
                У <Mark className="mark-dark">4,5 раза</Mark> вищий
                результат
              </span>{" "}
              <span className="block sm:inline">під час програми.</span>
            </p>
            <p className="mt-5 max-w-[480px] text-[17px] leading-relaxed text-ink">
              Саме тому в ZMOZHU є мотиваційний внесок, щоденні зважування та
              регулярні чекіни.
            </p>
          </Reveal>
        </div>

        <div className="flex flex-col justify-end">
          <div className="grid h-[420px] grid-cols-2 items-stretch gap-5 sm:h-[480px]">
            {bars.map((b, i) => (
              <div key={b.v} className="flex h-full flex-col justify-end">
                <p className={`text-[clamp(44px,6vw,76px)] font-bold leading-none tracking-[-0.06em] ${b.hi ? "text-forest" : "text-ink-soft"}`}>
                  <CountUp to={b.v} mode="pct1" duration={1.6} />
                </p>
                <motion.div
                  className={`mt-4 w-full origin-bottom rounded-t-[28px] ${b.hi ? "bg-forest" : "bg-sage"}`}
                  style={{ height: `${(b.v / 47.4) * 72}%` }}
                  initial={reduce ? false : { scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true, margin: "-10% 0px" }}
                  transition={{ duration: 1.4, delay: 0.2 + i * 0.15, ease: [0.2, 0.7, 0.2, 1] }}
                >
                  {b.hi && <div className="h-3 rounded-t-[28px] bg-lime" />}
                </motion.div>
                <p className={`mt-4 min-h-[48px] text-[15px] leading-snug ${b.hi ? "text-ink" : "text-ink-soft"}`}>{b.label}</p>
              </div>
            ))}
          </div>
          <Reveal delay={0.15} className="mt-8 border-t border-line pt-6">
            <p className="text-[13px] leading-relaxed text-ink-soft">
              Джерела:{" "}
              <span className="font-semibold text-forest">дослідження JAMA</span>
              <span className="px-1.5">·</span>
              <span className="font-semibold text-forest">PubMed</span>
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-ink">
              Дані стосуються окремого клінічного дослідження. ZMOZHU не
              гарантує аналогічний результат.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

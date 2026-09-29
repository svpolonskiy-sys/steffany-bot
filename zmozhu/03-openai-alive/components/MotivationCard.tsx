"use client";

// «Найважче — залишатися в процесі, коли мотивація закінчується.»
// Візуальна метафора: батарейка мотивації розряджається в міру прокрутки,
// а лінія «процесу» (30 днів) при цьому не обривається.
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export default function MotivationCard() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.9", "end 0.35"] });
  const level = useTransform(scrollYProgress, [0, 1], reduce ? [0.12, 0.12] : [1, 0.08]);
  const h = useTransform(level, (v) => `${v * 100}%`);
  const color = useTransform(level, [0.08, 0.3, 0.6, 1], ["#F08A6A", "#F3C9A8", "#D9F27E", "#D9F27E"]);
  const days = Array.from({ length: 30 }, (_, i) => i);

  return (
    <div ref={ref} className="relative overflow-hidden rounded-[32px] bg-forest p-7 text-white sm:p-10">
      <div aria-hidden="true" className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-forest-3 blur-3xl" />
      <div className="relative grid grid-cols-[1fr_auto] items-center gap-6 sm:gap-10">
        <p className="text-[clamp(26px,3vw,38px)] font-semibold leading-[1.15] tracking-[-0.03em]">
          Найважче — <span className="text-lime">залишатися в процесі</span>, коли мотивація закінчується.
        </p>

        {/* Батарейка мотивації */}
        <div aria-hidden="true" className="flex flex-col items-center">
          <span className="mb-1 h-2 w-6 rounded-t-md bg-white/30" />
          <div className="relative h-[120px] w-[54px] overflow-hidden rounded-[14px] border-[3px] border-white/30 p-[4px] sm:h-[150px] sm:w-[64px]">
            <div className="relative flex h-full w-full items-end overflow-hidden rounded-[8px]">
              <motion.div style={{ height: h, backgroundColor: color }} className="w-full rounded-[8px]" />
            </div>
          </div>
          <motion.span style={{ color }} className="mt-3 text-[22px] leading-none">⚡</motion.span>
        </div>
      </div>

      {/* Процес: 30 днів ідуть далі, навіть коли заряд падає */}
      <div aria-hidden="true" className="relative mt-8 flex gap-[3px]">
        {days.map((d) => (
          <motion.span
            key={d}
            className="h-1.5 flex-1 rounded-full bg-white/15"
            initial={reduce ? false : { backgroundColor: "rgba(255,255,255,.15)" }}
            whileInView={{ backgroundColor: "#D9F27E" }}
            viewport={{ once: true, margin: "-20% 0px" }}
            transition={{ delay: 0.3 + d * 0.04, duration: 0.3 }}
          />
        ))}
      </div>
    </div>
  );
}

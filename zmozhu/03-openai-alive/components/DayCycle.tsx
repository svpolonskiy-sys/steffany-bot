"use client";

// Мікросхема дня: Чекін → Зважування → День → Повернення завтра.
// Лаймова «хвиля» біжить по колу — думка блоку: важливо повернутися.
import { motion, useReducedMotion } from "framer-motion";

const steps = ["Чекін", "Зважування", "День", "Повернення завтра"];
const CYCLE = 4.8;

export default function DayCycle() {
  const reduce = useReducedMotion();
  return (
    <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-5">
      {steps.map((s, i) => (
        <span key={s} className="flex items-center gap-2">
          <motion.span
            className="rounded-pill border border-line px-3 py-1.5 text-[13px] font-medium text-ink"
            animate={reduce ? undefined : { backgroundColor: ["#FFFFFF", "#D9F27E", "#FFFFFF"] }}
            transition={reduce ? undefined : { duration: CYCLE, repeat: Infinity, times: [0, 0.12, 0.3], delay: (i * CYCLE) / steps.length }}
          >
            {s}
          </motion.span>
          {i < steps.length - 1 && <span className="text-moss" aria-hidden="true">→</span>}
        </span>
      ))}
    </div>
  );
}

"use client";

// Мікросхема дня: Чекін → Зважування → День → Повернення завтра.
// Хвиля підсвічування пробігає по колу — думка блоку: важливо повернутися.

import { motion, useReducedMotion } from "framer-motion";

const steps = ["Чекін", "Зважування", "День", "Повернення завтра"];
const CYCLE_S = 4.8;

export default function DayCycle() {
  const reduce = useReducedMotion();
  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-2 border-t border-line pt-4 text-[13px] font-medium text-ink-soft">
      {steps.map((step, i) => (
        <span key={step} className="flex items-center gap-2">
          <span className="flex items-center gap-1.5">
            <motion.span
              className="h-2 w-2 rounded-full bg-coral"
              aria-hidden="true"
              animate={reduce ? undefined : { opacity: [0.3, 1, 0.3], scale: [1, 1.5, 1] }}
              transition={
                reduce
                  ? undefined
                  : { duration: CYCLE_S, repeat: Infinity, ease: "easeInOut", times: [0, 0.14, 0.28], delay: (i * CYCLE_S) / steps.length / 1.6 }
              }
            />
            {step}
          </span>
          {i < steps.length - 1 && (
            <span className="text-teal" aria-hidden="true">
              →
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

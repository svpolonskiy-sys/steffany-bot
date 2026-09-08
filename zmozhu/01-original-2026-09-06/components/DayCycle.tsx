"use client";

// Мікросхема дня: Чекін → Зважування → День → Повернення завтра.
// Розмір, колір і розташування крапок — точно ті самі, що були до анімації.
// Додається ЛИШЕ м'яка хвиля прозорості, що пробігає по колу й підкріплює
// думку блоку: важливо повернутися наступного дня.
// prefers-reduced-motion: крапки статичні, як в оригіналі.
//
// Стрілка стоїть ПІСЛЯ свого кроку, а не перед наступним — щоб при
// переносі рядок закінчувався стрілкою, а не починався з неї.

import { motion, useReducedMotion } from "framer-motion";

const steps = ["Чекін", "Зважування", "День", "Повернення завтра"];

const CYCLE_S = 4.8;

export default function DayCycle() {
  const reduce = useReducedMotion();

  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-2 border-t border-line pt-4 text-[13px] text-ink-soft">
      {steps.map((step, i) => (
        <span key={step} className="flex items-center gap-2">
          <span className="flex items-center gap-1.5">
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-terracotta-l"
              aria-hidden="true"
              animate={reduce ? undefined : { opacity: [1, 0.35, 1] }}
              transition={
                reduce
                  ? undefined
                  : {
                      duration: CYCLE_S,
                      repeat: Infinity,
                      ease: "easeInOut",
                      times: [0, 0.14, 0.28],
                      delay: (i * CYCLE_S) / steps.length / 1.6,
                    }
              }
            />
            {step}
          </span>
          {i < steps.length - 1 && (
            <span className="text-terracotta-deep" aria-hidden="true">
              →
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

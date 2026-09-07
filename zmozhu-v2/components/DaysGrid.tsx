"use client";

// 30 крапок = 30 днів. Три контурні — «запас» на пропуски, який дозволяють правила.
// Крапки з'являються по черзі при появі блоку.

import { motion, useReducedMotion } from "framer-motion";

export default function DaysGrid({ allowed = 3, label }: { allowed?: number; label: string }) {
  const reduce = useReducedMotion();
  const days = Array.from({ length: 30 }, (_, i) => i);
  return (
    <div className="mt-5" aria-label={label} role="img">
      <motion.div
        className="grid grid-cols-10 gap-1.5"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-40px" }}
        transition={{ staggerChildren: 0.025 }}
      >
        {days.map((d) => {
          const isSpare = d >= 30 - allowed;
          return (
            <motion.span
              key={d}
              variants={{
                hidden: reduce ? { opacity: 1 } : { opacity: 0, scale: 0.4 },
                show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 260, damping: 18 } },
              }}
              className={`aspect-square rounded-[6px] ${
                isSpare ? "border-2 border-dashed border-coral/70 bg-transparent" : "bg-teal"
              }`}
            />
          );
        })}
      </motion.div>
      <p className="mt-2.5 flex items-center gap-4 text-[12px] text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-[3px] bg-teal" aria-hidden="true" /> день
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-[3px] border-2 border-dashed border-coral/70" aria-hidden="true" /> запас на пропуск
        </span>
      </p>
    </div>
  );
}

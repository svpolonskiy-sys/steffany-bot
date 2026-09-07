"use client";

import { motion, useReducedMotion } from "framer-motion";

// Дві цифри поруч. Смужка під кожною росте до ширини, рівної самій цифрі, —
// різниця видна оком, а не тільки читається.
export default function ResearchBars() {
  const reduce = useReducedMotion();
  const bars = [
    { value: 47.4, label: "47,4%", text: "учасників із фінансовою відповідальністю", accent: true },
    { value: 10.5, label: "10,5%", text: "у контрольній групі", accent: false },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {bars.map((b, i) => (
        <motion.div
          key={b.label}
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, delay: i * 0.12, ease: [0.2, 0.7, 0.2, 1] }}
          className={`rounded-card p-7 ${b.accent ? "bg-teal-deep text-white shadow-lift" : "border border-line bg-white text-ink"}`}
        >
          <p className={`font-sans text-[clamp(48px,6vw,64px)] font-extrabold leading-none tracking-[-0.05em] ${b.accent ? "text-apricot" : "text-ink-soft"}`}>
            {b.label}
          </p>
          <div className={`mt-5 h-2 w-full overflow-hidden rounded-pill ${b.accent ? "bg-white/15" : "bg-sand"}`} aria-hidden="true">
            <motion.div
              className={`h-full rounded-pill ${b.accent ? "bg-gradient-to-r from-apricot to-coral" : "bg-ink-soft"}`}
              initial={{ width: reduce ? `${b.value}%` : "0%" }}
              whileInView={{ width: `${b.value}%` }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 1.4, delay: 0.3 + i * 0.12, ease: [0.2, 0.7, 0.2, 1] }}
            />
          </div>
          <p className={`mt-4 text-[16px] leading-relaxed ${b.accent ? "text-white/85" : "text-ink-soft"}`}>{b.text}</p>
        </motion.div>
      ))}
    </div>
  );
}

"use client";

// Картка фінансової механіки на першому екрані.
// Уся суть пропозиції видно одразу в HTML; анімація лише «проводить» погляд:
// внесок → 30 днів → повернення, і цифра справа набирається до 2000.

import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export default function DepositCard({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [done, setDone] = useState(false);

  const value = useMotionValue(0);
  const display = useTransform(value, (v) => String(Math.round(v)));

  useEffect(() => {
    if (reduce || !inView) return;
    const controls = animate(value, 2000, {
      duration: 1.6,
      delay: 0.9,
      ease: [0.2, 0.7, 0.2, 1],
      onComplete: () => setDone(true),
    });
    return () => controls.stop();
  }, [inView, reduce, value]);

  const showFinal = reduce || done;

  return (
    <motion.div
      ref={ref}
      initial={reduce ? false : { opacity: 0, y: 30, scale: 0.96 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : undefined}
      transition={{ duration: 0.8, delay: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
      className={`relative overflow-hidden rounded-[22px] border border-white/60 bg-white/85 p-5 shadow-lift backdrop-blur-xl ${className}`}
    >
      <p className="text-[13px] font-semibold leading-snug text-teal-deep">
        30 днів щоденної підтримки та фінансової мотивації
      </p>

      <div className="mt-4 grid grid-cols-1 items-center gap-3 min-[420px]:grid-cols-[auto_1fr_auto] min-[420px]:gap-2 sm:gap-3">
        <div>
          <p className="whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.06em] text-ink-soft sm:text-[11px] sm:tracking-[0.08em]">Внесок на старті</p>
          <p className="mt-1 font-sans text-[24px] sm:text-[30px] font-extrabold leading-none tracking-[-0.04em] text-teal-deep">
            2000 <span className="text-[13px] font-semibold tracking-normal text-ink-soft">грн</span>
          </p>
        </div>

        {/* Лінія-шлях: заповнюється зліва направо, по ній «іде» крапка */}
        <div className="relative h-8 min-w-[52px]" aria-hidden="true">
          <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded bg-line" />
          <motion.div
            className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded bg-gradient-to-r from-teal to-coral"
            initial={{ width: reduce ? "100%" : "0%" }}
            animate={inView ? { width: "100%" } : undefined}
            transition={{ duration: 1.6, delay: 0.9, ease: [0.2, 0.7, 0.2, 1] }}
          />
          <motion.div
            className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-[3px] border-white bg-coral shadow"
            initial={{ left: reduce ? "calc(100% - 16px)" : "0%" }}
            animate={inView ? { left: "calc(100% - 16px)" } : undefined}
            transition={{ duration: 1.6, delay: 0.9, ease: [0.2, 0.7, 0.2, 1] }}
          />
          <span className="absolute inset-x-0 -top-1 whitespace-nowrap text-center text-[9px] font-bold uppercase tracking-[0.1em] text-ink-soft sm:text-[10px]">
            30 днів
          </span>
        </div>

        <div className="whitespace-nowrap min-[420px]:text-right">
          <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-ink-soft sm:text-[11px] sm:tracking-[0.08em]">Виконала всі три умови</p>
          <p className="mt-1 font-sans text-[24px] sm:text-[30px] font-extrabold leading-none tracking-[-0.04em] text-coral-text">
            {reduce ? "2000" : <motion.span>{display}</motion.span>}{" "}
            <span className="text-[13px] font-semibold tracking-normal text-ink-soft">грн назад</span>
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-line pt-3">
        <motion.span
          aria-hidden="true"
          initial={reduce ? false : { scale: 0, rotate: -30 }}
          animate={showFinal ? { scale: 1, rotate: 0 } : undefined}
          transition={{ type: "spring", stiffness: 300, damping: 16 }}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal text-white"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
            <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.span>
        <p className="text-[13px] font-medium text-ink">−4% ваги · ранкові й вечірні чекіни · зважування</p>
      </div>

      <a
        href="#how"
        className="mt-2 inline-flex min-h-[36px] items-center gap-1.5 text-[13px] font-semibold text-teal underline decoration-teal/30 underline-offset-4 transition-colors hover:text-coral-text hover:decoration-coral/40"
      >
        Усі умови повернення
        <span aria-hidden="true">↓</span>
      </a>
    </motion.div>
  );
}

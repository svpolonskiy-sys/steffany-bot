"use client";

// Велика цифра −4%: відлік від 0 до 4 при появі блоку.
// У серверному HTML одразу стоїть «−4%»; prefers-reduced-motion — статично.

import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";

export default function CountPercent({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLParagraphElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const value = useMotionValue(0);
  const display = useTransform(value, (v) => `−${Math.round(v)}%`);

  useEffect(() => {
    if (reduce || !inView) return;
    const controls = animate(value, 4, { duration: 2, ease: "linear" });
    return () => controls.stop();
  }, [inView, reduce, value]);

  return (
    <p ref={ref} className={`font-sans font-extrabold leading-none tracking-[-0.06em] ${className}`}>
      {reduce || !inView ? "−4%" : <motion.span aria-label="мінус 4 відсотки">{display}</motion.span>}
    </p>
  );
}

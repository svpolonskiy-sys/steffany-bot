"use client";

// Велика цифра −4%: відлік від 0 до 4 при появі блоку.
// Шрифт, розмір, колір і розмітка — точно ті самі, що були до анімації.
//
// Два запобіжники:
// 1) У серверному HTML одразу стоїть «−4%» — для пошуковиків і на випадок,
//    якщо JS не спрацює.
// 2) prefers-reduced-motion: цифра статична, як в оригіналі.

import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";

const TARGET = 4;

export default function CountPercent() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLParagraphElement>(null);
  // Спрацьовує, коли блок входить у кадр — щоб відлік було видно
  const inView = useInView(ref, { once: true });

  const value = useMotionValue(0);
  const display = useTransform(value, (v) => `−${Math.round(v)}%`);

  useEffect(() => {
    if (reduce || !inView) return;
    // Лінійно й повільно: кожна цифра тримається ~550 мс, тож око встигає
    const controls = animate(value, TARGET, {
      duration: 2.2,
      ease: "linear",
    });
    return () => controls.stop();
  }, [inView, reduce, value]);

  return (
    <p
      ref={ref}
      className="font-serif text-[clamp(44px,7vw,68px)] font-medium leading-none text-terracotta-deep"
    >
      {reduce || !inView ? (
        "−4%"
      ) : (
        <motion.span aria-label="мінус 4 відсотки">{display}</motion.span>
      )}
    </p>
  );
}

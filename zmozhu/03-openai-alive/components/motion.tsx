"use client";

// Спільні «живі» примітиви. Усі тексти лишаються в серверному HTML;
// рух — лише надбудова. prefers-reduced-motion вимикає все.

import {
  animate, motion, useInView, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform,
  type MotionValue, type Variants,
} from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

const EASE = [0.2, 0.7, 0.2, 1] as const;

type Tag = "div" | "section" | "article" | "li" | "p" | "span" | "h2" | "h3";

export function Reveal({
  children, className, delay = 0, y = 34, as = "div", scale = false,
}: { children: ReactNode; className?: string; delay?: number; y?: number; as?: Tag; scale?: boolean }) {
  const reduce = useReducedMotion();
  const M = motion[as] as typeof motion.div;
  const v: Variants = {
    hidden: reduce ? { opacity: 1 } : { opacity: 0, y, scale: scale ? 0.96 : 1, filter: "blur(8px)" },
    show: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { duration: 0.9, delay, ease: EASE } },
  };
  return (
    <M className={className} variants={v} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-8% 0px -8% 0px" }}>
      {children}
    </M>
  );
}

export function Stagger({ children, className, gap = 0.1, as = "div" }: { children: ReactNode; className?: string; gap?: number; as?: Tag }) {
  const M = motion[as] as typeof motion.div;
  return (
    <M className={className} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-8% 0px -8% 0px" }} transition={{ staggerChildren: gap }}>
      {children}
    </M>
  );
}

export function Item({ children, className, as = "div" }: { children: ReactNode; className?: string; as?: Tag }) {
  const reduce = useReducedMotion();
  const M = motion[as] as typeof motion.div;
  return (
    <M
      className={className}
      variants={{
        hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 30, rotate: -0.6 },
        show: { opacity: 1, y: 0, rotate: 0, transition: { duration: 0.8, ease: EASE } },
      }}
    >
      {children}
    </M>
  );
}

// Слова, що «виростають» із рядка
export function Words({ text, className = "", delay = 0, step = 0.06, inView = false }: { text: string; className?: string; delay?: number; step?: number; inView?: boolean }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, margin: "-10% 0px" });
  const go = inView ? seen : true;
  const words = text.split(" ");
  return (
    <span ref={ref} className={className}>
      {words.map((w, i) => (
        <span key={i}>
          <span className="inline-block overflow-hidden pb-[0.1em] align-bottom -mb-[0.1em]">
            <motion.span
              className="inline-block"
              initial={reduce ? false : { y: "115%", rotate: 4 }}
              animate={go ? { y: 0, rotate: 0 } : undefined}
              transition={{ duration: 0.95, delay: delay + i * step, ease: EASE }}
            >
              {w}
            </motion.span>
          </span>
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}

// Маркер-підсвічування: смуга лайму «замальовується» під фразою при появі
export function Mark({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, margin: "-15% 0px" });
  return (
    <span ref={ref} className={`mark ${seen ? "on" : ""} ${className}`}>
      {children}
    </span>
  );
}

// Лічильник 0 → N (у HTML одразу стоїть кінцеве значення)
const FORMATS = {
  int: (v: number) => String(Math.round(v)),
  minusPct: (v: number) => `−${Math.round(v)}%`,
  pct1: (v: number) => v.toFixed(1).replace(".", ",") + "%",
};

export function CountUp({ to, mode = "int", duration = 1.6, className = "" }: { to: number; mode?: keyof typeof FORMATS; duration?: number; className?: string }) {
  const format = FORMATS[mode];
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, margin: "-10% 0px" });
  const mv = useMotionValue(0);
  const [txt, setTxt] = useState(format(to));
  useEffect(() => {
    if (reduce || !seen) return;
    setTxt(format(0));
    const c = animate(mv, to, { duration, ease: [0.2, 0.7, 0.2, 1], onUpdate: (v) => setTxt(format(v)) });
    return () => c.stop();
  }, [seen, reduce, to, duration, mv, format]);
  return <span ref={ref} className={className}>{txt}</span>;
}

// Магнітна обгортка: елемент злегка тягнеться за курсором (лише миша)
export function Magnetic({ children, strength = 0.28, className = "" }: { children: ReactNode; strength?: number; className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const x = useSpring(0, { stiffness: 220, damping: 18, mass: 0.4 });
  const y = useSpring(0, { stiffness: 220, damping: 18, mass: 0.4 });
  return (
    <motion.div
      ref={ref}
      className={`inline-flex ${className}`}
      style={{ x, y }}
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse" || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * strength);
        y.set((e.clientY - r.top - r.height / 2) * strength);
      }}
      onPointerLeave={() => { x.set(0); y.set(0); }}
    >
      {children}
    </motion.div>
  );
}

// Прожектор за курсором (для темних секцій з класом .spot)
export function useSpotlight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const on = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    el.addEventListener("pointermove", on);
    return () => el.removeEventListener("pointermove", on);
  }, []);
  return ref;
}

// Паралакс за скролом
export function useParallax(range = 60) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : range, reduce ? 0 : -range]);
  return { ref, y, progress: scrollYProgress as MotionValue<number> };
}

// Текст, що «загоряється» слово за словом у міру прокрутки
export function ScrollLit({ text, className = "" }: { text: string; className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.9", "end 0.5"] });
  const words = text.split(" ");
  if (reduce) return <p className={className}>{text}</p>;
  return (
    <p ref={ref} className={className}>
      {words.map((w, i) => (
        <LitWord key={i} p={scrollYProgress} a={i / words.length} b={(i + 1) / words.length}>
          {w}
        </LitWord>
      ))}
    </p>
  );
}
function LitWord({ children, p, a, b }: { children: string; p: MotionValue<number>; a: number; b: number }) {
  const o = useTransform(p, [a, b], [0.16, 1]);
  return <motion.span style={{ opacity: o }} className="inline">{children} </motion.span>;
}

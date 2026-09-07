"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  as?: "div" | "section" | "li" | "article" | "p" | "figure";
  once?: boolean;
  blur?: boolean;
};

// Універсальна поява при скролі. Текст присутній у серверному HTML —
// анімація лише додає рух. prefers-reduced-motion повністю її вимикає.
export default function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
  as = "div",
  once = true,
  blur = true,
}: RevealProps) {
  const reduce = useReducedMotion();
  const Tag = motion[as];

  const variants: Variants = {
    hidden: reduce
      ? { opacity: 1 }
      : { opacity: 0, y, filter: blur ? "blur(6px)" : "none" },
    show: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.8, delay, ease: [0.2, 0.7, 0.2, 1] },
    },
  };

  return (
    <Tag
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: "-10% 0px -8% 0px" }}
    >
      {children}
    </Tag>
  );
}

// Контейнер, що по черзі запускає дочірні <Reveal>-и (stagger).
export function Stagger({
  children,
  className,
  gap = 0.08,
}: {
  children: ReactNode;
  className?: string;
  gap?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-10% 0px -8% 0px" }}
      transition={{ staggerChildren: gap }}
    >
      {children}
    </motion.div>
  );
}

export function Item({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "li" | "article";
}) {
  const reduce = useReducedMotion();
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      variants={{
        hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 24 },
        show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.2, 0.7, 0.2, 1] } },
      }}
    >
      {children}
    </Tag>
  );
}

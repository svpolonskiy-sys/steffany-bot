"use client";

// Текст, що «проявляється» слово за словом у міру скролу.
// Усі слова присутні в HTML одразу; змінюється лише прозорість.

import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useRef } from "react";

function Word({
  children,
  progress,
  range,
}: {
  children: string;
  progress: MotionValue<number>;
  range: [number, number];
}) {
  const opacity = useTransform(progress, range, [0.18, 1]);
  return (
    <motion.span style={{ opacity }} className="inline-block">
      {children}&nbsp;
    </motion.span>
  );
}

export default function ScrollWords({
  text,
  className = "",
  as = "p",
}: {
  text: string;
  className?: string;
  as?: "p" | "h2";
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.45"] });
  const words = text.split(" ");
  const Tag = as;

  if (reduce) {
    return <Tag className={className}>{text}</Tag>;
  }

  return (
    <Tag ref={ref} className={className}>
      {words.map((w, i) => (
        <Word key={`${w}-${i}`} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]}>
          {w}
        </Word>
      ))}
    </Tag>
  );
}

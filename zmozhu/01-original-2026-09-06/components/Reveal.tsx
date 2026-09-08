"use client";

import { useEffect, useRef, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "li" | "article";
};

// Content remains readable in server HTML and if JavaScript is unavailable.
// Motion is an enhancement, runs once, and respects the system preference.
export default function Reveal({ children, className, delay = 0, as = "div" }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let animation: Animation | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      animation = element.animate(
        [{ opacity: 0.3, transform: "translateY(22px)" }, { opacity: 1, transform: "translateY(0)" }],
        { duration: 620, delay: delay * 1000, easing: "cubic-bezier(.2,.7,.2,1)" }
      );
      observer.disconnect();
    }, { threshold: 0.05 });
    observer.observe(element);
    return () => { observer.disconnect(); animation?.cancel(); };
  }, [delay]);
  const Tag = as;
  return <Tag ref={(node: HTMLElement | null) => { ref.current = node; }} className={className}>{children}</Tag>;
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import { useEffect, useState } from "react";
import { TELEGRAM_BOT_URL } from "@/lib/config";

const navLinks = [
  { href: "/#how", label: "Як це працює" },
  { href: "/#team", label: "Хто поруч" },
  { href: "/#day", label: "Твій день" },
  { href: "/#faq", label: "Питання" },
];

const TICKS = 30;

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [filled, setFilled] = useState(0);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const onHero = usePathname() === "/" && !scrolled && !open;

  // 30 рисок = 30 днів: заповнюються в міру прокрутки сторінки
  useMotionValueEvent(scrollYProgress, "change", (v) => setFilled(Math.round(v * TICKS)));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    const close = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${scrolled || open ? "bg-cream/85 backdrop-blur-xl shadow-[0_1px_0_rgba(16,53,45,.07)]" : ""}`}>
      <div className="wrap flex h-[var(--header-h)] items-center justify-between gap-6">
        <Link href="/" onClick={() => setOpen(false)} className={`group flex items-center gap-2 text-[22px] font-extrabold tracking-[-0.06em] transition-colors ${onHero ? "text-white" : "text-forest"}`}>
          ZMOZHU
          <span className="relative mt-1 flex h-2.5 w-2.5">
            <span className="absolute inset-0 rounded-full bg-lime animate-breathe" />
            <span className="relative h-2.5 w-2.5 rounded-full bg-forest-3 transition-colors group-hover:bg-lime" />
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Розділи сторінки">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className={`rounded-pill px-4 py-2 text-[14px] font-medium transition-colors ${onHero ? "text-white/85 hover:bg-white/10" : "text-ink hover:bg-sage"}`}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a href={TELEGRAM_BOT_URL} target="_blank" rel="noopener noreferrer" className={`hidden items-center gap-2 rounded-pill px-5 py-2.5 text-[14px] font-semibold transition-all duration-300 hover:-translate-y-0.5 sm:inline-flex ${onHero ? "bg-white/10 text-white ring-1 ring-white/20" : "bg-forest text-white"}`}>
            Я ЗМОЖУ
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-lime text-forest">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
          </a>
          <button type="button" onClick={() => setOpen((v) => !v)} aria-label={open ? "Закрити меню" : "Відкрити меню"} aria-expanded={open} aria-controls="mobile-navigation" className={`flex h-11 w-11 items-center justify-center rounded-full md:hidden ${onHero ? "text-white" : "text-forest"}`}>
            <span className="relative block h-4 w-6">
              <span className={`absolute left-0 h-[2px] w-6 rounded bg-current transition-all duration-300 ${open ? "top-[7px] rotate-45" : "top-0"}`} />
              <span className={`absolute left-0 top-[7px] h-[2px] w-6 rounded bg-current transition-opacity duration-300 ${open ? "opacity-0" : ""}`} />
              <span className={`absolute left-0 h-[2px] w-6 rounded bg-current transition-all duration-300 ${open ? "top-[7px] -rotate-45" : "top-[14px]"}`} />
            </span>
          </button>
        </div>
      </div>

      {/* Шкала «30 днів» */}
      <div aria-hidden="true" className={`wrap flex gap-[3px] pb-2 transition-opacity duration-500 ${scrolled ? "opacity-100" : "opacity-0"}`}>
        {Array.from({ length: TICKS }, (_, i) => (
          <span key={i} className={`h-[3px] flex-1 rounded-full transition-colors duration-300 ${i < filled ? (i === filled - 1 ? "bg-lime" : "bg-forest-3") : "bg-line"}`} />
        ))}
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            id="mobile-navigation"
            aria-label="Мобільне меню"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28 }}
            className="wrap flex flex-col pb-5 md:hidden"
          >
            {navLinks.map((l, i) => (
              <motion.div key={l.href} initial={reduce ? false : { opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 + i * 0.05 }}>
                <Link href={l.href} onClick={() => setOpen(false)} className="flex min-h-[54px] items-center border-b border-line text-[19px] font-medium text-ink">
                  {l.label}
                </Link>
              </motion.div>
            ))}
            <a href={TELEGRAM_BOT_URL} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className="mt-5 flex items-center justify-center gap-2 rounded-pill bg-forest py-4 text-[17px] font-semibold text-white">
              Я ЗМОЖУ
            </a>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

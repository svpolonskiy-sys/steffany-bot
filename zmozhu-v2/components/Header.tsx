"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import { useEffect, useState } from "react";
import { TELEGRAM_BOT_URL } from "@/lib/config";

const navLinks = [
  { href: "/#how", label: "Як це працює" },
  { href: "/#team", label: "Хто поруч" },
  { href: "/#day", label: "Твій день" },
  { href: "/#faq", label: "Питання" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  // Тонка лінія прогресу читання під шапкою
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.3 });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled || open
          ? "bg-paper/85 shadow-[0_1px_0_rgba(21,37,42,0.06)] backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <div className="wrap flex h-[var(--header-h)] items-center justify-between">
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="flex items-center gap-2.5 font-sans text-[20px] font-extrabold tracking-[-0.06em] text-teal-deep"
          aria-label="ZMOZHU — на головну"
        >
          <span className="relative flex h-8 w-8 items-center justify-center rounded-[10px] bg-teal text-apricot">
            <svg width="16" height="16" viewBox="0 0 64 64" aria-hidden="true">
              <path d="M19 20h26v5.2L27.8 43H45v5H19v-5.2L36.2 25H19z" fill="currentColor" />
            </svg>
          </span>
          ZMOZHU
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Розділи сторінки">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="group relative text-[14px] font-medium text-ink transition-colors hover:text-teal"
            >
              {l.label}
              <span className="absolute -bottom-1 left-0 h-[2px] w-0 rounded bg-coral transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={TELEGRAM_BOT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-shine hidden items-center gap-2 rounded-pill bg-teal px-5 py-2.5 text-[14px] font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-teal-deep hover:shadow-lift sm:inline-flex"
          >
            Я ЗМОЖУ
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M7 17L17 7M9 7h8v8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Закрити меню" : "Відкрити меню"}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            className="flex h-11 w-11 items-center justify-center rounded-full text-teal-deep md:hidden"
          >
            <span className="relative block h-4 w-6">
              <span
                className={`absolute left-0 top-0 h-[2px] w-6 rounded bg-current transition-all duration-300 ${
                  open ? "top-[7px] rotate-45" : ""
                }`}
              />
              <span
                className={`absolute left-0 top-[7px] h-[2px] w-6 rounded bg-current transition-all duration-300 ${
                  open ? "opacity-0" : ""
                }`}
              />
              <span
                className={`absolute left-0 top-[14px] h-[2px] w-6 rounded bg-current transition-all duration-300 ${
                  open ? "top-[7px] -rotate-45" : ""
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      <motion.div
        aria-hidden="true"
        style={{ scaleX: progress, transformOrigin: "0 0" }}
        className={`h-[2px] w-full bg-gradient-to-r from-teal via-teal-mid to-coral transition-opacity duration-500 ${
          scrolled ? "opacity-100" : "opacity-0"
        }`}
      />

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-navigation"
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
            className="border-t border-line bg-paper/95 backdrop-blur-xl md:hidden"
          >
            <nav className="wrap flex flex-col py-3" aria-label="Мобільне меню">
              {navLinks.map((l, i) => (
                <motion.div
                  key={l.href}
                  initial={reduce ? undefined : { opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + i * 0.05 }}
                >
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="flex min-h-[52px] items-center border-b border-line/70 text-[18px] font-medium text-ink"
                  >
                    {l.label}
                  </Link>
                </motion.div>
              ))}
              <a
                href={TELEGRAM_BOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-pill bg-teal px-6 py-4 text-[16px] font-semibold text-white"
              >
                Я ЗМОЖУ
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M7 17L17 7M9 7h8v8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

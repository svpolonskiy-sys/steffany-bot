"use client";

import Link from "next/link";
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  return (
    <header
      className={`site-header sticky top-0 z-50 transition-colors duration-300 ${
        scrolled || open
          ? "border-b border-line bg-cream/85 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-content items-center justify-between px-5 py-3">
        {/* Логотип */}
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="brand font-serif text-xl font-semibold tracking-tight text-deep"
        >
          ZMOZHU
        </Link>

        {/* Навігація (десктоп) */}
        <nav className="hidden items-center gap-7 md:flex">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-ink transition-colors hover:text-terracotta-deep"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* CTA (десктоп/планшет) */}
          <a
            href={TELEGRAM_BOT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden rounded-pill bg-terracotta-deep px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-terracotta-deep-h sm:inline-flex"
          >
            Я ЗМОЖУ
          </a>

          {/* Гамбургер (мобільний) */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Закрити меню" : "Відкрити меню"}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            className="flex h-10 w-10 items-center justify-center rounded-full text-deep md:hidden"
          >
            {open ? (
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                <path d="M5 5l12 12M17 5L5 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                <path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Мобільне меню */}
      {open && (
        <div className="border-t border-line bg-cream/95 backdrop-blur-md md:hidden">
          <nav id="mobile-navigation" className="mx-auto flex max-w-content flex-col px-5 py-3">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="border-b border-line/60 py-3 text-[17px] text-ink"
              >
                {l.label}
              </Link>
            ))}
            <a
              href={TELEGRAM_BOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="mt-4 inline-flex items-center justify-center rounded-pill bg-terracotta-deep px-6 py-3.5 text-base font-medium text-white"
            >
              Я ЗМОЖУ
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}

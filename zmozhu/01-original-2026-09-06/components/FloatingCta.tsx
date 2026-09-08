"use client";

import { useEffect, useState } from "react";
import { TELEGRAM_BOT_URL } from "@/lib/config";

// Плаваюча CTA, що завжди на екрані після скролу за межі hero.
// Мобільний — нижня панель на всю ширину; десктоп — pill унизу справа.
export default function FloatingCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("top");
    if (!hero) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting && entry.boundingClientRect.bottom < 0), { threshold: 0 });
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Мобільний: нижня панель */}
      <div
        style={{
          paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
        }}
        aria-hidden={!visible}
        
        className={`floating-mobile fixed inset-x-0 bottom-0 z-40 px-4 pt-2 transition-all duration-300 md:hidden ${
          visible
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-6 opacity-0"
        }`}
      >
        <a
          tabIndex={visible ? 0 : -1}
          href={TELEGRAM_BOT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center rounded-pill bg-terracotta-deep px-8 py-4 text-base font-medium text-white shadow-soft"
        >
          Я починаю
        </a>
      </div>

      {/* Десктоп: плаваюча pill унизу справа */}
      <div
        aria-hidden={!visible}
        
        className={`floating-desktop fixed bottom-6 right-6 z-40 hidden transition-all duration-300 md:block ${
          visible
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0"
        }`}
      >
        <a
          tabIndex={visible ? 0 : -1}
          href={TELEGRAM_BOT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-pill bg-terracotta-deep px-7 py-4 text-base font-medium text-white shadow-soft transition-colors hover:bg-terracotta-deep-h"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M21 3L3 10.5l6 2.5m12-10l-3 15-9-5m12-10L9 13m0 0v6l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Я починаю
        </a>
      </div>
    </>
  );
}

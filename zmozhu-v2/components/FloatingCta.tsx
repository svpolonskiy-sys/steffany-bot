"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { TELEGRAM_BOT_URL } from "@/lib/config";

// Закріплена CTA: з'являється, коли перший екран виходить із поля зору,
// і ховається на фінальному блоці, де вже є велика кнопка.
export default function FloatingCta() {
  const [visible, setVisible] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    const hero = document.getElementById("top");
    const closing = document.getElementById("closing");
    if (!hero) return;

    let pastHero = false;
    let onClosing = false;
    const update = () => setVisible(pastHero && !onClosing);

    const heroObs = new IntersectionObserver(
      ([entry]) => {
        pastHero = !entry.isIntersecting && entry.boundingClientRect.bottom < 0;
        update();
      },
      { threshold: 0 }
    );
    heroObs.observe(hero);

    let closingObs: IntersectionObserver | undefined;
    if (closing) {
      closingObs = new IntersectionObserver(
        ([entry]) => {
          onClosing = entry.isIntersecting;
          update();
        },
        { threshold: 0.35 }
      );
      closingObs.observe(closing);
    }

    return () => {
      heroObs.disconnect();
      closingObs?.disconnect();
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Мобільний: нижня панель */}
          <motion.div
            key="m"
            initial={reduce ? { opacity: 0 } : { y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { y: 80, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}
            style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
            className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/90 px-4 pt-3 backdrop-blur-xl md:hidden"
          >
            <a
              href={TELEGRAM_BOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-shine flex w-full items-center justify-between rounded-pill bg-teal px-6 py-4 text-[16px] font-semibold text-white shadow-lift"
            >
              <span>Я починаю</span>
              <span className="flex items-center gap-2 text-[13px] font-medium text-white/80">
                у Telegram
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M21 3L3 10.5l6 2.5m12-10l-3 15-9-5m12-10L9 13m0 0v6l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </a>
          </motion.div>

          {/* Десктоп: pill унизу справа */}
          <motion.div
            key="d"
            initial={reduce ? { opacity: 0 } : { y: 24, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { y: 24, opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}
            className="fixed bottom-6 right-6 z-40 hidden md:block"
          >
            <a
              href={TELEGRAM_BOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-shine inline-flex items-center gap-3 rounded-pill bg-teal py-4 pl-6 pr-5 text-[16px] font-semibold text-white shadow-lift transition-transform duration-300 hover:-translate-y-0.5"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-pulseRing rounded-full bg-apricot" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-apricot" />
              </span>
              Я починаю
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M21 3L3 10.5l6 2.5m12-10l-3 15-9-5m12-10L9 13m0 0v6l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { TELEGRAM_BOT_URL } from "@/lib/config";

// З'являється після першого екрана, ховається на фінальному блоці.
export default function FloatingCta() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const hero = document.getElementById("top");
    const closing = document.getElementById("closing");
    if (!hero) return;
    let past = false, end = false;
    const upd = () => setVisible(past && !end);
    const a = new IntersectionObserver(([e]) => { past = !e.isIntersecting && e.boundingClientRect.bottom < 0; upd(); });
    a.observe(hero);
    const b = closing ? new IntersectionObserver(([e]) => { end = e.isIntersecting; upd(); }, { threshold: 0.3 }) : null;
    if (closing && b) b.observe(closing);
    return () => { a.disconnect(); b?.disconnect(); };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 90, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
          className="fixed inset-x-0 bottom-0 z-40 px-4 pt-3 md:inset-x-auto md:bottom-6 md:right-6 md:p-0"
        >
          <a href={TELEGRAM_BOT_URL} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-4 rounded-pill bg-forest py-2 pl-6 pr-2 text-[16px] font-semibold text-white shadow-deep md:justify-start">
            <span className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5"><span className="absolute inset-0 rounded-full bg-lime animate-breathe" /><span className="relative h-2.5 w-2.5 rounded-full bg-lime" /></span>
              Я починаю
            </span>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-lime text-forest" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21 3L3 10.5l6 2.5m12-10l-3 15-9-5m12-10L9 13m0 0v6l3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
          </a>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

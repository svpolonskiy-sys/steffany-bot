"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useId, useState, type ReactNode } from "react";

import { faqItems, type FaqItem as Item } from "@/lib/faq";

function Row({ item, open, onToggle }: { item: Item; open: boolean; onToggle: () => void }) {
  const id = useId();
  const reduce = useReducedMotion();
  return (
    <div className={`rounded-[20px] border transition-colors duration-300 ${open ? "border-teal-soft bg-white" : "border-transparent bg-white/60 hover:bg-white"}`}>
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={id}
          className="flex w-full items-center justify-between gap-5 px-6 py-5 text-left"
        >
          <span className="text-[17px] font-semibold leading-snug text-teal-deep sm:text-[18px]">{item.q}</span>
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
              open ? "rotate-45 bg-teal text-white" : "bg-rose text-coral-text"
            }`}
            aria-hidden="true"
          >
            <svg width="16" height="16" viewBox="0 0 22 22" fill="none">
              <path d="M11 4v14M4 11h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            key="content"
            initial={reduce ? { opacity: 1, height: "auto" } : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
            className="overflow-hidden"
          >
            <p className="max-w-[640px] px-6 pb-6 text-[16px] leading-[1.7] text-ink">{item.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  return (
    <div className="space-y-2">
      {faqItems.map((item, i) => (
        <Row key={item.q} item={item} open={openIndex === i} onToggle={() => setOpenIndex(openIndex === i ? null : i)} />
      ))}
    </div>
  );
}


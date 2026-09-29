"use client";

import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import CtaButton from "@/components/CtaButton";
import { useSpotlight, Words } from "@/components/motion";

const EASE = [0.2, 0.7, 0.2, 1] as const;

// Повідомлення Міри, що «друкується» біля фото (текст з макета бота на сайті)
function MiraBubble() {
  const reduce = useReducedMotion();
  const [typed, setTyped] = useState(!!reduce);
  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(() => setTyped(true), 2600);
    return () => clearTimeout(t);
  }, [reduce]);
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 1.5, duration: 0.7, ease: EASE }}
      className="absolute bottom-5 left-4 z-10 w-[min(280px,74%)] animate-drift lg:bottom-auto lg:-left-24 lg:top-[56%]"
      aria-hidden="true"
    >
      <div className="flex items-center gap-2 pb-1.5 pl-1 text-[11px] font-semibold text-white/70">
        <span className="h-5 w-5 rounded-full bg-gradient-to-br from-peach to-[#e9765a]" />
        ZMOZHU
        <span className="text-white/40">{typed ? "бот" : "друкує…"}</span>
      </div>
      <div className="rounded-[20px] rounded-tl-[6px] bg-[#212D3B] px-4 py-3 text-[13.5px] leading-snug text-white shadow-deep">
        {typed ? (
          <motion.span initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
            Побачимось о 15:00 — на тебе чекає аудіо від нутриціолога 🎧
          </motion.span>
        ) : (
          <span className="flex gap-1 py-1">
            {[0, 1, 2].map((i) => (
              <motion.span key={i} className="h-2 w-2 rounded-full bg-white/70" animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />
            ))}
          </span>
        )}
      </div>
    </motion.div>
  );
}

export default function Hero() {
  const reduce = useReducedMotion();
  const spot = useSpotlight<HTMLElement>();
  const box = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: box, offset: ["start start", "end start"] });
  const photoY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 90]);
  const photoScale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 1.08]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -50]);

  return (
    <section id="top" ref={spot} className="spot on-dark relative overflow-hidden bg-forest pt-[calc(var(--header-h)+36px)] text-white">
      {/* дихаючі плями світла */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-40 h-[620px] w-[620px] rounded-full bg-forest-3 blur-[110px] animate-drift-slow" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-52 -left-40 h-[520px] w-[520px] rounded-full bg-lime/15 blur-[120px] animate-drift" />

      <div ref={box} className="wrap relative grid items-center gap-14 pb-20 md:grid-cols-[1.08fr_0.92fr] md:gap-10 md:pb-28 lg:gap-16">
        <motion.div style={{ y: copyY }} className="relative z-10">
          <motion.p initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }} className="tag text-lime">
            30 днів · щоденна підтримка · −4% ваги
          </motion.p>

          <h1 className="h-display mt-7 text-[clamp(42px,5.5vw,80px)]">
            <Words text="Ти знаєш, як схуднути." className="block" delay={0.15} />
            <span className="relative block text-lime">
              <Words text={"Складніше\u00A0— не зупинитися."} delay={0.5} />
              {/* рукописний штрих під фразою */}
              <svg aria-hidden="true" viewBox="0 0 600 40" preserveAspectRatio="none" className="absolute -bottom-3 left-0 h-[0.28em] w-[min(100%,11.5em)] overflow-visible">
                <motion.path
                  d="M4 26 C 120 8, 250 34, 380 16 S 560 12, 596 22"
                  fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round"
                  initial={reduce ? false : { pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.9 }}
                  transition={{ delay: 1.35, duration: 1.1, ease: EASE }}
                />
              </svg>
            </span>
          </h1>

          <motion.p initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0, duration: 0.8, ease: EASE }} className="mt-10 text-[22px] font-semibold tracking-[-0.02em] sm:text-[26px]">
            Ми поруч щодня.
          </motion.p>

          <motion.div initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.15, duration: 0.8, ease: EASE }} className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <CtaButton variant="lime" className="w-full sm:w-auto">Я ЗМОЖУ</CtaButton>
          </motion.div>

          <motion.div initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4, duration: 1 }} className="mt-12 max-w-[520px] border-t border-white/15 pt-7">
            <p className="voice text-[clamp(24px,2.4vw,30px)] leading-[1.2]">
              <span className="block sm:inline">Мотивація закінчується —</span>{" "}
              <span className="block text-lime sm:inline">система залишається.</span>
            </p>
            <p className="mt-4 text-[16.5px] leading-[1.65] text-white/75">
              ZMOZHU допомагає пройти ці 30 днів до кінця без жорстких дієт і
              заборон. Щоденна підтримка і контроль, щоб один складний день не
              перекреслював увесь шлях.
            </p>
          </motion.div>
        </motion.div>

        {/* Фото Тетяни */}
        <motion.div style={{ y: photoY }} className="relative mx-auto w-full max-w-[500px]">
          <div className="relative">
          <motion.div
            initial={reduce ? false : { clipPath: "inset(18% 12% 18% 12% round 48px)", opacity: 0 }}
            animate={{ clipPath: "inset(0% 0% 0% 0% round 48px)", opacity: 1 }}
            transition={{ delay: 0.3, duration: 1.4, ease: EASE }}
            className="relative aspect-[4/5] overflow-hidden rounded-[48px] shadow-deep"
          >
            <motion.div style={{ scale: photoScale }} className="absolute inset-0">
              <Image src="/images/tanya-hero.jpg" alt="Тетяна — учасниця, що проходить 30 днів разом із тобою" fill priority sizes="(max-width: 768px) 92vw, 500px" className="object-cover object-[50%_32%]" />
            </motion.div>
            <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-forest/60 to-transparent" />
          </motion.div>

          <MiraBubble />
          </div>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.8, ease: EASE }}
            className="relative mt-4 rounded-[22px] bg-cream px-5 py-4 text-ink shadow-deep lg:absolute lg:-bottom-6 lg:-right-6 lg:mt-0 lg:max-w-[260px]"
          >
            <p className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-forest">
              <span className="relative flex h-2 w-2"><span className="absolute inset-0 rounded-full bg-moss animate-breathe" /><span className="relative h-2 w-2 rounded-full bg-moss" /></span>
              Тетяна — реальна учасниця
            </p>
            <p className="mt-1 text-[13px] leading-snug text-ink-soft">Проходить ті самі 30 днів разом із Тобою, день у день.</p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

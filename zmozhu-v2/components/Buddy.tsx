"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import Portrait from "@/components/Portrait";
import Reveal from "@/components/Reveal";

export default function Buddy() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : 50, reduce ? 0 : -50]);

  return (
    <section ref={ref} className="section relative overflow-hidden bg-sand" aria-labelledby="buddy-title">
      <div className="blob right-[-10%] top-[10%] h-[520px] w-[520px] bg-mist" aria-hidden="true" />
      <div className="wrap relative grid items-center gap-12 md:grid-cols-[0.85fr_1.15fr] md:gap-16">
        <div className="relative mx-auto w-full max-w-[420px]">
          <motion.div style={{ y }} className="relative">
            <Reveal blur={false}>
              <Portrait
                src="/images/tanya2.jpg"
                alt="Тетяна — учасниця, яка проходить ці 30 днів разом із тобою"
                name="Тетяна"
                sizes="(max-width: 768px) 90vw, 420px"
                className="rounded-[28px] rounded-tr-[160px] shadow-lift"
              />
            </Reveal>
          </motion.div>
          <Reveal delay={0.25} className="absolute -bottom-5 left-4 rounded-[18px] bg-teal-deep px-5 py-3 text-white shadow-lift sm:-left-6">
            <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-apricot">Твоя Баді</p>
            <p className="mt-0.5 font-display text-[22px] font-semibold leading-none">Тетяна</p>
          </Reveal>
        </div>

        <div>
          <Reveal>
            <p className="eyebrow">Не сама</p>
            <h2 id="buddy-title" className="display mt-4 text-[clamp(36px,5vw,64px)] text-teal-deep">
              Ти проходиш ці 30 днів не сама.
            </h2>
            <p className="display mt-3 text-[clamp(22px,2.6vw,32px)] font-medium text-ink">
              Поруч із Тобою — Тетяна. <span className="accent">Твоя Баді.</span>
            </p>
          </Reveal>

          <Reveal delay={0.1} className="mt-8 space-y-5">
            <p className="text-[17px] leading-[1.7] text-ink md:text-[18px]">
              Вона проходить ті самі 30 днів разом із Тобою. Так само
              зважується. Так само має хороші й складні дні. Так само іноді
              хоче все кинути.
            </p>
            <p className="text-[17px] leading-[1.7] text-ink md:text-[18px]">
              <strong className="font-semibold text-teal-deep">Щодня Тетяна ділиться коротким відео</strong> — показує, що в неї
              виходить, а де буває складно.
            </p>
          </Reveal>

          <Reveal delay={0.15} className="mt-8 border-t border-line pt-7">
            <p className="display text-[clamp(24px,2.8vw,36px)] leading-[1.15] text-teal-deep">
              Не як тренер.
              <span className="block">Не як людина, яка знає все краще за Тебе.</span>
              <span className="accent block">А як жінка, яка йде поруч.</span>
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

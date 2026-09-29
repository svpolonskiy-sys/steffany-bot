"use client";

import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Reveal } from "@/components/motion";

export default function Buddy() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  // Фото «вирівнюється» з нахилу, коли секція виходить у центр екрана
  const rotate = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : -9, 0]);
  const y = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : 80, 0]);
  const lines = ["Не як тренер.", "Не як людина, яка знає все краще за Тебе."];

  return (
    <section ref={ref} className="sec relative overflow-hidden bg-[#FBEFE4]" aria-labelledby="buddy-title">
      <div aria-hidden="true" className="absolute -left-40 top-20 h-[480px] w-[480px] rounded-full bg-peach/70 blur-[100px] animate-drift-slow" />
      <div className="wrap relative grid items-center gap-14 md:grid-cols-[0.85fr_1.15fr] md:gap-20">
        <motion.div style={{ rotate, y }} className="relative mx-auto w-full max-w-[400px]">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[40px] border-[10px] border-white shadow-lift">
            <Image src="/images/tanya2.jpg" alt="Тетяна — учасниця, яка проходить ці 30 днів разом із тобою" fill sizes="(max-width: 768px) 90vw, 400px" className="object-cover" />
          </div>
          <div className="absolute -bottom-5 -right-3 rotate-3 rounded-pill bg-forest px-5 py-3 text-[15px] font-semibold text-lime shadow-lift">
            Твоя Баді.
          </div>
        </motion.div>

        <div>
          <Reveal>
            <h2 id="buddy-title" className="h-sec text-forest">Ти проходиш ці 30 днів не сама.</h2>
            <p className="voice mt-4 text-[clamp(22px,2.4vw,30px)] text-ink">
              Поруч із Тобою — Тетяна. <span className="text-moss">Твоя Баді.</span>
            </p>
          </Reveal>
          <Reveal delay={0.1} className="mt-8 space-y-5 text-[17px] leading-[1.7] text-ink md:text-[18px]">
            <p>
              Вона проходить ті самі 30 днів разом із Тобою. Так само
              зважується. Так само має хороші й складні дні. Так само іноді
              хоче все кинути.
            </p>
            <p>
              Щодня Тетяна ділиться коротким відео — показує, що в неї
              виходить, а де буває складно.
            </p>
          </Reveal>
          <div className="mt-10 border-t border-forest/15 pt-8 text-[clamp(24px,2.6vw,34px)] font-semibold leading-[1.2] tracking-[-0.03em]">
            {lines.map((l, i) => (
              <Reveal key={l} delay={i * 0.15} y={16}>
                <p className="text-forest/55">{l}</p>
              </Reveal>
            ))}
            <Reveal delay={0.35} y={16}>
              <p className="voice mt-1 text-forest">А як жінка, яка йде поруч.</p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

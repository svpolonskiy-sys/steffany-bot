"use client";

import Image from "next/image";
import MiraChat from "@/components/MiraChat";
import Tilt from "@/components/Tilt";
import { Item, Mark, Reveal, Stagger, useParallax, useSpotlight } from "@/components/motion";
import { motion } from "framer-motion";

export default function Team() {
  const spot = useSpotlight<HTMLDivElement>();
  const px = useParallax(40);
  return (
    <section id="team" className="sec bg-cream" aria-labelledby="team-title">
      <div className="wrap">
        <Reveal className="max-w-[760px]">
          <h2 id="team-title" className="h-sec text-forest">Три опори на 30 днів</h2>
          <p className="mt-5 text-[18px] leading-relaxed text-ink-soft">
            Технологія, жива людина поруч і зрозуміла експертна підтримка.
          </p>
        </Reveal>

        <Stagger className="mt-14 grid gap-5 lg:grid-cols-12" gap={0.12}>
          {/* Міра */}
          <Item as="article" className="lg:col-span-12">
            <div ref={spot} className="spot on-dark relative h-full overflow-hidden rounded-[36px] bg-forest p-7 text-white sm:p-10">
              <div aria-hidden="true" className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-forest-3 blur-3xl animate-drift-slow" />
              <div className="relative grid gap-10 md:grid-cols-[1fr_300px] md:items-center lg:mx-auto lg:max-w-[1040px] lg:grid-cols-[1fr_320px] lg:gap-20">
                <div>
                  <p className="tag text-lime">Твоя щоденна опора</p>
                  <h3 className="mt-4 text-[clamp(52px,6vw,84px)] font-semibold leading-none tracking-[-0.05em]">Міра</h3>
                  <p className="mt-6 max-w-[460px] text-[17px] leading-[1.7] text-white/80 lg:max-w-[540px] lg:text-[18px]">
                    Міра пам&apos;ятає Твої чекіни, вагу й те, як проходить Твій
                    день. Допомагає розібрати складний момент, повернутися після
                    зриву й не випадати з процесу.
                  </p>
                  <p className="voice mt-7 max-w-[440px] text-[clamp(22px,2.2vw,28px)] lg:max-w-[540px] leading-[1.25]">
                    Вона не оцінює. <span className="text-lime">Вона допомагає залишатися в русі.</span>
                  </p>
                </div>
                <Tilt className="relative mx-auto w-full max-w-[300px]" max={6}>
                  <MiraChat />
                </Tilt>
              </div>
            </div>
          </Item>

          {/* Анастасія */}
          <Item as="article" className="lg:col-span-6">
            <Tilt className="h-full" max={3}>
              <div className="group grid h-full overflow-hidden rounded-[36px] border border-line bg-white sm:grid-cols-[0.9fr_1.1fr]">
                <div ref={px.ref} className="relative min-h-[340px] overflow-hidden sm:min-h-0">
                  <motion.div style={{ y: px.y }} className="absolute -inset-y-10 inset-x-0">
                    <Image src="/images/nastya.jpg" alt="Анастасія — експертка з харчування у програмі" fill sizes="(max-width: 640px) 100vw, 320px" className="object-cover object-[center_20%] transition-transform duration-[1.4s] group-hover:scale-105" />
                  </motion.div>
                  <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-forest/85 to-transparent" />
                  <div className="absolute bottom-5 left-6 text-white">
                    <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-lime">Експертка з харчування</p>
                    <h3 className="mt-1 text-[38px] font-semibold leading-none tracking-[-0.04em]">Анастасія</h3>
                  </div>
                </div>
                <div className="flex flex-col p-7">
                  <p className="text-[15px] leading-relaxed text-ink">
                    Науковиця, понад 10 років досвіду. Співзасновниця школи
                    Nodiet School, авторка подкасту «Що в меню».
                  </p>
                  <p className="mt-4 text-[16px] leading-[1.7] text-ink-soft">
                    Коротко й зрозуміло пояснює, що відбувається з тілом, апетитом
                    і звичками — та як застосувати це у звичайному житті без
                    жорстких заборон.
                  </p>
                  <p className="voice mt-auto pt-6 text-[22px] leading-[1.25] text-forest">
                    Менше теорії. Більше того, що можна використати сьогодні.
                  </p>
                </div>
              </div>
            </Tilt>
          </Item>

          {/* Жива людина */}
          <Item as="article" className="lg:col-span-6">
            <div className="relative h-full overflow-hidden rounded-[36px] bg-lime-soft p-7 sm:p-9">
              <div aria-hidden="true" className="absolute -bottom-20 -right-16 h-64 w-64 rounded-full bg-lime blur-3xl opacity-70 animate-drift" />
              <div className="relative">
                <p className="tag text-moss">Не лише алгоритм</p>
                <h3 className="mt-3 text-[clamp(32px,3.2vw,44px)] font-semibold leading-none tracking-[-0.04em] text-forest">Поруч є людина</h3>
                <p className="mt-6 text-[16px] leading-[1.7] text-ink">
                  Ми стежимо за тим, як проходить програму кожна учасниця. Якщо
                  бачимо, що щось потребує додаткової уваги,{" "}
                  <Mark className="mark-dark font-semibold text-forest">зв&apos;язуємося з Тобою</Mark>{" "}
                  і, за потреби, пропонуємо консультацію профільного експерта.
                </p>
                <p className="mt-4 text-[16px] leading-[1.7] text-ink">
                  Якщо Тобі стане складно — Ти завжди можеш написати в підтримку
                  й отримати відповідь від живої людини.
                </p>
                <p className="mt-7 text-[20px] font-semibold tracking-[-0.02em] text-forest">
                  За кожним рішенням тут стоїть людина.
                </p>
              </div>
            </div>
          </Item>
        </Stagger>
      </div>
    </section>
  );
}

"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { CountUp, Reveal } from "@/components/motion";

// Механіка внеску як «шлях у 30 днів»: 30 крапок загоряються по черзі,
// після чого сума праворуч набирається до 2000.
export default function DepositFlow() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, margin: "-15% 0px" });
  const days = Array.from({ length: 30 }, (_, i) => i);

  return (
    <section className="relative bg-cream">
      <div className="wrap -mt-px py-16 md:py-24">
        <Reveal className="relative overflow-hidden rounded-[36px] border border-line bg-white p-6 shadow-soft sm:p-10 lg:p-12">
          <p className="max-w-[640px] text-[clamp(20px,2vw,26px)] font-semibold leading-snug tracking-[-0.02em] text-forest">
            30 днів щоденної підтримки та фінансової мотивації
          </p>

          <div ref={ref} className="mt-10 grid items-end gap-8 lg:grid-cols-[auto_1fr_auto] lg:gap-10">
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-soft">Внесок на старті</p>
              <p className="mt-2 text-[clamp(56px,7vw,88px)] font-bold leading-none tracking-[-0.06em] text-forest">
                2000 <span className="text-[0.3em] font-semibold tracking-normal text-ink-soft">грн</span>
              </p>
            </div>

            <div className="relative pb-3" aria-hidden="true">
              <div className="flex items-center justify-between gap-[3px]">
                {days.map((d) => (
                  <motion.span
                    key={d}
                    className="h-3 flex-1 rounded-full"
                    initial={{ backgroundColor: reduce ? "#2F6B57" : "#E7EEDF" }}
                    animate={seen ? { backgroundColor: d === 29 ? "#D9F27E" : "#2F6B57" } : undefined}
                    transition={{ delay: reduce ? 0 : 0.2 + d * 0.045, duration: 0.25 }}
                  />
                ))}
              </div>
              <div className="mt-3 flex justify-between text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-soft">
                <span>1</span><span className="text-forest">→</span><span>30</span>
              </div>
            </div>
            <span className="sr-only">→</span>

            <div className="lg:text-right">
              <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-soft">Виконала всі три умови</p>
              <p className="mt-2 text-[clamp(56px,7vw,88px)] font-bold leading-none tracking-[-0.06em] text-moss">
                <CountUp to={2000} mode="int" duration={1.2} />{" "}
                <span className="text-[0.3em] font-semibold tracking-normal text-ink-soft">грн назад</span>
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-4 border-t border-line pt-6 md:flex-row md:items-center md:justify-between">
            <p className="text-[16px] font-medium text-ink">−4% ваги · ранкові й вечірні чекіни · зважування</p>
            <a className="inline-flex min-h-[44px] items-center gap-2 text-[15px] font-semibold text-forest underline decoration-lime decoration-[3px] underline-offset-[6px] transition-colors hover:text-moss" href="#how">
              Усі умови повернення <span aria-hidden="true">↗</span>
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

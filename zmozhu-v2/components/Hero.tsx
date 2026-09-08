"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import CtaButton from "@/components/CtaButton";
import DepositCard from "@/components/DepositCard";
import Portrait from "@/components/Portrait";

const ease = [0.2, 0.7, 0.2, 1] as const;

// Слово за словом, із маскою знизу — заголовок «виростає» з рядка.
function Words({ text, className = "", start = 0 }: { text: string; className?: string; start?: number }) {
  const reduce = useReducedMotion();
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((w, i) => (
        <span key={`${w}-${i}`} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <motion.span
            className="inline-block"
            initial={reduce ? false : { y: "110%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.9, delay: start + i * 0.07, ease }}
          >
            {w}
          </motion.span>
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}

const chips = [
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M21 3L3 10.5l6 2.5m12-10l-3 15-9-5m12-10L9 13m0 0v6l3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    label: "Усе в Telegram",
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    label: "Близько 15 хвилин на день",
  },
];

export default function Hero() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const photoY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 80]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -40]);
  const fade = useTransform(scrollYProgress, [0, 0.9], [1, reduce ? 1 : 0.45]);

  return (
    <section
      id="top"
      ref={ref}
      className="grain relative overflow-hidden bg-paper pt-[calc(var(--header-h)+28px)] md:pt-[calc(var(--header-h)+48px)]"
    >
      {/* Кольорові плями: теплий і прохолодний — баланс турботи й спокою */}
      <div className="blob left-[-10%] top-[-10%] h-[520px] w-[520px] bg-rose opacity-90" aria-hidden="true" />
      <div className="blob right-[-8%] top-[10%] h-[560px] w-[560px] bg-mist" aria-hidden="true" />
      <div className="blob bottom-[-20%] left-[30%] h-[420px] w-[420px] bg-apricot/40" aria-hidden="true" />

      <div className="wrap relative pb-16 md:pb-24">
        <div className="grid items-start gap-12 md:grid-cols-[1.05fr_0.95fr] md:gap-10 lg:gap-16">
          {/* ---------- Копі ---------- */}
          <motion.div style={{ y: copyY, opacity: fade }} className="relative z-10 pt-2 md:pt-8">
            <motion.p
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease }}
              className="flex items-center gap-3 text-[12px] font-bold uppercase tracking-[0.14em] text-coral-text sm:text-[13px] sm:tracking-[0.18em]"
            >
              <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-pulseRing rounded-full bg-coral" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-coral" />
              </span>
              30 днів · щоденна підтримка · −4% ваги
            </motion.p>

            <h1 className="display mt-6 text-[clamp(40px,4.6vw,64px)] text-teal-deep">
              <Words text="Ти знаєш, як схуднути." className="block" start={0.1} />
              <Words text="Складніше — не зупинитися." className="accent block" start={0.45} />
            </h1>

            <motion.p
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.9, ease }}
              className="mt-7 max-w-[520px] text-[20px] font-semibold leading-snug text-teal-deep sm:text-[22px]"
            >
              Ми поруч щодня.
            </motion.p>

            <motion.p
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.0, ease }}
              className="mt-3 max-w-[540px] text-[17px] leading-[1.6] text-ink sm:text-[18px]"
            >
              ZMOZHU допомагає пройти ці 30 днів до кінця без жорстких дієт і
              заборон. Щоденна підтримка і контроль, щоб один складний день не
              перекреслював увесь шлях.
            </motion.p>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.15, ease }}
              className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
            >
              <CtaButton className="w-full sm:w-auto">Я ЗМОЖУ</CtaButton>
              <CtaButton href="#how" variant="ghost" className="w-full sm:w-auto">
                Як це працює
              </CtaButton>
            </motion.div>

            {/* Довіра одразу після дії: три факти, які знімають перші сумніви */}
            <motion.ul
              initial="hidden"
              animate="show"
              transition={{ staggerChildren: 0.1, delayChildren: 1.3 }}
              className="mt-8 flex flex-wrap gap-2.5"
              aria-label="Коротко про формат"
            >
              {chips.map((c) => (
                <motion.li
                  key={c.label}
                  variants={{
                    hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 10 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
                  }}
                  className="inline-flex items-center gap-2 rounded-pill border border-line bg-white/70 px-3.5 py-2 text-[13px] font-medium text-ink backdrop-blur"
                >
                  <span className="text-teal">{c.icon}</span>
                  {c.label}
                </motion.li>
              ))}
            </motion.ul>

            <motion.blockquote
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 1.6 }}
              className="mt-10 max-w-[520px] border-l-2 border-coral/60 pl-5"
            >
              <p className="display text-[clamp(24px,2.6vw,32px)] leading-[1.15] text-teal-deep">
                Мотивація закінчується —{" "}
                <span className="accent">система залишається.</span>
              </p>
            </motion.blockquote>
          </motion.div>

          {/* ---------- Візуал ---------- */}
          <motion.div style={{ y: photoY }} className="relative md:pl-4">
            {/* Мобільний підпис: окремим рядком над фото, щоб нічого не перекривати */}
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.9, ease }}
              className="mb-4 flex items-start gap-2.5 lg:hidden"
            >
              <span className="relative mt-[6px] flex h-2 w-2 shrink-0" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-pulseRing rounded-full bg-teal" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-teal" />
              </span>
              <p className="text-[14px] leading-snug text-ink">
                <span className="font-bold text-teal-deep">Тетяна — реальна учасниця.</span>{" "}
                <span className="text-ink-soft">Проходить ці 30 днів прямо зараз, разом із Тобою.</span>
              </p>
            </motion.div>
            <motion.figure
              initial={reduce ? false : { clipPath: "inset(12% 8% 12% 8% round 200px 200px 28px 28px)", opacity: 0, scale: 1.04 }}
              animate={{ clipPath: "inset(0% 0% 0% 0% round 200px 200px 28px 28px)", opacity: 1, scale: 1 }}
              transition={{ duration: 1.3, delay: 0.3, ease }}
              className="relative mx-auto w-full max-w-[520px]"
              style={{ clipPath: "inset(0% 0% 0% 0% round 200px 200px 28px 28px)" }}
            >
              <Portrait
                src="/images/tanya-hero.jpg"
                alt="Тетяна — учасниця, що проходить 30 днів разом із тобою"
                name="Тетяна"
                priority
                sizes="(max-width: 768px) 92vw, 520px"
                imgClassName="object-[50%_35%]"
              />
            </motion.figure>

            {/* Підпис до фото */}
            <motion.div
              initial={reduce ? false : { opacity: 0, x: 24, rotate: 0 }}
              animate={{ opacity: 1, x: 0, rotate: -2 }}
              whileHover={{ rotate: 0, scale: 1.02 }}
              transition={{ duration: 0.9, delay: 1.0, ease }}
              className="absolute top-[4%] hidden max-w-[270px] rounded-[18px] border border-white/70 bg-white/85 px-4 py-3 shadow-lift backdrop-blur-xl lg:-left-10 lg:block"
            >
              <p className="flex items-center gap-2 text-[14px] font-bold text-teal-deep">
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-pulseRing rounded-full bg-teal" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-teal" />
                </span>
                Тетяна — реальна учасниця
              </p>
              <p className="mt-1 text-[12.5px] leading-snug text-ink-soft">
                Проходить ці 30 днів прямо зараз, разом із Тобою.
              </p>
            </motion.div>

            {/* Картка внеску: перекриває нижній край фото */}
            <DepositCard className="relative z-10 mx-auto -mt-16 w-full max-w-[460px] md:-mt-10 lg:absolute lg:-bottom-8 lg:-left-14 lg:mt-0 lg:w-[min(440px,88%)]" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

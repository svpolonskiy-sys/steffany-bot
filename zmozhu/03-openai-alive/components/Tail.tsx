import CtaButton from "@/components/CtaButton";
import Faq from "@/components/Faq";
import { Mark, Reveal } from "@/components/motion";

export function FaqSection() {
  return (
    <section id="faq" className="sec bg-cream" aria-labelledby="faq-title">
      <div className="wrap grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
        <Reveal className="lg:sticky lg:top-[calc(var(--header-h)+60px)] lg:self-start">
          <h2 id="faq-title" className="h-sec text-forest">Питання, які зазвичай виникають</h2>
        </Reveal>
        <Reveal delay={0.1}><Faq /></Reveal>
      </div>
    </section>
  );
}

export function Afterwards() {
  return (
    <section className="sec bg-cream !pt-0" aria-labelledby="after-title">
      <div className="wrap">
        <div className="relative overflow-hidden rounded-[40px] bg-lime-soft px-6 py-16 sm:px-12 sm:py-20">
          <div aria-hidden="true" className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-lime blur-3xl opacity-60 animate-drift-slow" />
          <div className="relative mx-auto max-w-[820px] text-center">
            <Reveal>
              <p className="tag justify-center text-moss">Після програми</p>
              <h2 id="after-title" className="h-sec mt-5 text-forest">Що буде після 30-го дня?</h2>
              <p className="voice mx-auto mt-5 max-w-[560px] text-[clamp(24px,2.6vw,32px)] text-forest">
                На 30-му дні ZMOZHU не закінчується.
              </p>
            </Reveal>
            <Reveal delay={0.1} className="mt-12 grid gap-4 text-left sm:grid-cols-2">
              <div className="rounded-[26px] bg-white p-7">
                <span className="block h-1.5 w-12 rounded-full bg-lime" aria-hidden="true" />
                <p className="mt-5 text-[16px] leading-relaxed text-ink">
                  Якщо Ти досягла своєї цілі й виконала умови програми, ми
                  запропонуємо наступний етап — утримання результату.
                </p>
              </div>
              <div className="rounded-[26px] bg-white p-7">
                <span className="block h-1.5 w-12 rounded-full bg-moss" aria-hidden="true" />
                <p className="mt-5 text-[16px] leading-relaxed text-ink">
                  Якщо захочеш рухатись далі — допоможемо визначити нову ціль і
                  продовжити шлях.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.15} className="mt-4">
              <div className="rounded-[26px] bg-forest p-8 text-left text-white sm:p-10">
                <h3 className="text-[clamp(24px,2.6vw,32px)] font-semibold tracking-[-0.03em]">
                  <Mark>Ми не залишаємо Тебе після фінішу.</Mark>
                </h3>
                <p className="mt-4 text-[16px] leading-relaxed text-white/75">
                  Наша задача — бути поруч доти, доки нові звички й система не
                  стануть для Тебе природною частиною життя.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Closing() {
  return (
    <section id="closing" className="on-dark relative overflow-hidden bg-forest text-white" aria-labelledby="closing-title">
      <div aria-hidden="true" className="absolute left-1/2 top-1/2 h-[720px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-forest-3 blur-[120px] animate-drift-slow" />
      <div aria-hidden="true" className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-lime/15 animate-breathe" />
      <div className="wrap sec relative text-center">
        <div className="mx-auto max-w-[860px]">
          <Reveal>
            <h2 id="closing-title" className="h-display text-[clamp(40px,6vw,80px)]">Ти не мусиш пройти ці 30 днів ідеально.</h2>
          </Reveal>
          <Reveal delay={0.1} className="mt-10">
            <p className="voice text-[clamp(24px,3vw,34px)] leading-[1.35] text-white/80">
              Будуть хороші дні.
              <span className="block">Будуть складні.</span>
            </p>
            <p className="mt-6 text-[clamp(20px,2.3vw,26px)] font-semibold">Головне — не зникнути після одного з них.</p>
          </Reveal>
          <Reveal delay={0.15} className="mt-8">
            <p className="mx-auto max-w-[620px] text-[17px] leading-[1.75] text-white/70">
              ZMOZHU створений саме для моменту, коли хочеться все кинути — щоб
              допомогти Тобі повернутися і продовжити.
            </p>
            <p className="mt-6 inline-flex rounded-pill border border-white/15 bg-white/5 px-5 py-2 text-[15px] text-white/85">
              Виконала умови — отримуєш свої 2000 грн назад.
            </p>
          </Reveal>
          <Reveal delay={0.2} className="mt-14">
            <p className="text-[clamp(28px,3.6vw,46px)] font-semibold leading-[1.12] tracking-[-0.03em]">
              Цього разу Тобі не потрібно починати заново.
              <span className="voice block text-lime">Потрібно просто продовжити завтра.</span>
            </p>
            <div className="mt-10 flex justify-center">
              <CtaButton variant="lime">Я ЗМОЖУ</CtaButton>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

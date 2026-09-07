import CtaButton from "@/components/CtaButton";
import DaysGrid from "@/components/DaysGrid";
import Reveal, { Item, Stagger } from "@/components/Reveal";

export default function Investment() {
  return (
    <section id="how" className="section relative overflow-hidden bg-sand" aria-labelledby="how-title">
      <div className="blob left-[-10%] top-[30%] h-[520px] w-[520px] bg-rose/80" aria-hidden="true" />
      <div className="wrap relative">
        <div className="grid gap-12 md:grid-cols-[1.1fr_0.9fr] md:items-center md:gap-16">
          <div>
            <Reveal>
              <p className="eyebrow">Як це працює</p>
              <h2 id="how-title" className="display mt-4 text-[clamp(34px,4.4vw,58px)] text-teal-deep">
                2000 грн — це не плата за участь.
                <span className="accent block">Це Твій внесок у результат.</span>
              </h2>
            </Reveal>

            <Reveal delay={0.05} className="mt-8 max-w-[560px]">
              <p className="text-[18px] leading-[1.7] text-ink">
                Ти вносиш 2000 грн на старті. Виконуєш умови 30 днів — отримуєш усю суму
                назад.
              </p>
            </Reveal>

            <Reveal delay={0.1} className="mt-7 max-w-[560px] rounded-[20px] border border-line bg-white/70 p-6">
              <p className="text-[15px] font-bold uppercase tracking-[0.06em] text-teal-deep">
                Навіщо внесок взагалі?
              </p>
              <p className="mt-2 text-[17px] leading-[1.7] text-ink">
                Бо коли Ти вже щось вклала, набагато складніше просто
                зникнути після одного важкого дня.
              </p>
            </Reveal>

            <Reveal delay={0.15} className="mt-8 max-w-[600px]">
              <p className="display text-[clamp(24px,2.7vw,34px)] leading-[1.15] text-teal-deep">
                Внесок повернувся — участь фактично коштувала Тобі{" "}
                <span className="accent">$0.</span>
              </p>
            </Reveal>
          </div>

          {/* Картка внеску */}
          <Reveal delay={0.1} className="md:justify-self-end md:w-full md:max-w-[440px]">
            <div className="on-dark grain relative overflow-hidden rounded-[28px] bg-teal-deep p-8 text-center text-white shadow-lift sm:p-10">
              <div className="blob -right-10 -top-10 h-56 w-56 bg-coral/40" aria-hidden="true" />
              <div className="blob -bottom-16 -left-10 h-56 w-56 bg-teal-mid/70" aria-hidden="true" />
              <div className="relative">
                <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-apricot">Внесок 2000 грн</p>
                <p className="mt-4 font-sans text-[clamp(56px,7vw,84px)] font-extrabold leading-none tracking-[-0.06em]">
                  2000<span className="ml-1 text-[22px] font-semibold tracking-normal text-white/70">грн</span>
                </p>
                <p className="mt-5 inline-flex items-center gap-2 rounded-pill bg-white/10 px-4 py-2 text-[15px] leading-snug">
                  Виконала умови <span className="text-apricot" aria-hidden="true">→</span> 2000 грн повертаються
                </p>
                <div className="mt-8">
                  <CtaButton variant="light" className="w-full">Я ЗМОЖУ</CtaButton>
                </div>
                <p className="mt-4 text-[12px] text-white/55">Оплата через WayForPay · Visa / Mastercard</p>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Три умови */}
        <Reveal className="mt-20 md:mt-28">
          <h3 className="display text-[clamp(32px,4vw,52px)] text-teal-deep">Три умови. Все.</h3>
        </Reveal>

        <Stagger className="mt-8 grid gap-5 md:grid-cols-3" gap={0.12}>
          <Item as="article" className="rounded-card border border-line bg-white p-7">
            <span className="inline-flex rounded-pill bg-rose px-3 py-1 font-sans text-[13px] font-bold text-coral-text">01</span>
            <h4 className="mt-4 text-[20px] font-bold leading-snug text-teal-deep">Знизити вагу на 4%</h4>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
              Від стартової ваги. Фінальний результат визначаємо за середнім значенням останніх 3 зважувань.
            </p>
            <div className="mt-5 border-t border-line pt-4">
              <div className="flex items-end justify-between">
                <span className="font-sans text-[40px] font-extrabold leading-none tracking-[-0.05em] text-teal">−4%</span>
                <span className="text-[12px] text-ink-soft">середнє за 3 останні дні</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-pill bg-sand" aria-hidden="true">
                <div className="h-full w-[40%] rounded-pill bg-gradient-to-r from-teal to-coral" />
              </div>
            </div>
          </Item>

          <Item as="article" className="rounded-card border border-line bg-white p-7">
            <span className="inline-flex rounded-pill bg-rose px-3 py-1 font-sans text-[13px] font-bold text-coral-text">02</span>
            <h4 className="mt-4 text-[20px] font-bold leading-snug text-teal-deep">Ранкові та вечірні чекіни</h4>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
              Короткий чекін двічі на день. За 30 днів можна пропустити до 3 ранкових і до 3 вечірніх чекінів.
            </p>
            <DaysGrid allowed={3} label="30 днів чекінів, із них 3 можна пропустити" />
          </Item>

          <Item as="article" className="rounded-card border border-line bg-white p-7">
            <span className="inline-flex rounded-pill bg-rose px-3 py-1 font-sans text-[13px] font-bold text-coral-text">03</span>
            <h4 className="mt-4 text-[20px] font-bold leading-snug text-teal-deep">Щоденне зважування</h4>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
              Фото ваг із секретним словом підтверджує зважування. За 30 днів можна пропустити до 3 разів.
            </p>
            <DaysGrid allowed={3} label="30 днів зважувань, із них 3 можна пропустити" />
          </Item>
        </Stagger>

        <Reveal delay={0.1} className="mx-auto mt-10 max-w-2xl text-center">
          <p className="display text-[clamp(24px,2.8vw,36px)] leading-[1.15] text-teal-deep">
            Виконала всі три умови — отримуєш свої{" "}
            <span className="accent">2000 грн назад</span>.
          </p>
        </Reveal>

        {/* Безпека */}
        <Reveal className="mx-auto mt-10 max-w-3xl">
          <div className="grid gap-6 rounded-card border border-line bg-white p-7 sm:grid-cols-[auto_1fr] sm:p-9">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mist text-teal" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
            <div>
              <h4 className="display text-[clamp(24px,2.6vw,32px)] leading-[1.15] text-teal-deep">
                <span className="accent">Безпека</span> важливіша за цифру на вагах.
              </h4>
              <p className="mt-4 text-[16px] leading-relaxed text-ink">
                Ми дивимося не лише на результат, а й на те, як Ти до нього йдеш.
              </p>
              <p className="mt-3 text-[16px] leading-relaxed text-ink">
                Якщо система бачить різкі або підозрілі зміни ваги, ми можемо
                попросити додаткове підтвердження або зупинити участь — щоб не
                заохочувати небезпечні способи схуднення.
              </p>
              <p className="mt-5 text-[16px] font-semibold leading-relaxed text-teal-deep">
                Усі правила повернення внеску прозорі й однакові для всіх.
              </p>
              <p className="mt-2 text-[16px] leading-relaxed text-ink">
                Якщо якась із трьох умов не виконана, участь у програмі
                продовжується, але внесок не повертається.
              </p>
              <p className="mt-5 border-t border-line pt-4 text-[14px] leading-relaxed text-ink-soft">
                Гроші повертаються на ту саму картку, з якої була оплата. Повні
                правила — у{" "}
                <a href="/oferta" className="font-semibold text-teal underline underline-offset-4 hover:text-coral-text">
                  Публічній оферті
                </a>
                .
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

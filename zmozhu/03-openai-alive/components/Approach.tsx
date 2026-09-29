import DayCycle from "@/components/DayCycle";
import { CountUp, Item, Mark, Reveal, Stagger } from "@/components/motion";

const base = "flex h-full flex-col rounded-[32px] p-7 transition-all duration-500 hover:-translate-y-1 hover:shadow-lift sm:p-8";
const card = `${base} border border-line bg-white`;

export default function Approach() {
  return (
    <section className="sec bg-cream" aria-labelledby="approach-title">
      <div className="wrap">
        <Stagger className="grid gap-5 lg:grid-cols-3" gap={0.12}>
          <Item as="article" className="lg:col-span-1">
            <div className={`${base} bg-forest text-white`}>
              <h3 id="approach-title" className="text-[clamp(28px,2.6vw,34px)] font-semibold leading-[1.1] tracking-[-0.03em]">
                Не магія. Не сила волі.
                <span className="block text-lime">Поведінкова наука.</span>
              </h3>
              <p className="mt-5 text-[16px] leading-relaxed text-white/75">
                ZMOZHU побудований на принципах поведінкової психології, які
                допомагають людям змінювати звички та залишатися в процесі.
              </p>
              <p className="mt-3 text-[16px] leading-relaxed text-white/75">
                Ми перетворили ці підходи на просту щоденну систему підтримки,
                контролю та маленьких дій.
              </p>
              <p className="mt-5 text-[17px] font-semibold leading-snug">
                Щоб Тобі не потрібно було щоранку знову шукати мотивацію.
              </p>
              <div className="mt-auto border-t border-white/15 pt-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-lime">В основі підходу</p>
                <p className="mt-2 text-[13px] leading-snug text-white/70">
                  Когнітивно-поведінкові та поведінкові підходи, принципи
                  психологічної гнучкості й самоспівчуття.
                </p>
                <p className="mt-2 text-[12px] leading-snug text-white/55">
                  За працями: Джудіт Бек · Расс Гарріс · Крістін Нефф · Брене
                  Браун
                </p>
              </div>
            </div>
          </Item>

          <Item as="article">
            <div className={card}>
              <h3 className="text-[clamp(28px,2.6vw,34px)] font-semibold leading-[1.1] tracking-[-0.03em] text-forest">
                Твій <span className="voice text-moss">щоденний ритм</span>
              </h3>
              <p className="mt-5 text-[17px] font-semibold leading-snug text-forest">Зранку — короткий чекін і зважування.</p>
              <p className="mt-2 text-[16px] leading-relaxed text-ink-soft">Кілька хвилин, щоб зафіксувати, де Ти сьогодні.</p>
              <p className="mt-4 text-[16px] leading-relaxed text-ink-soft">
                Не для контролю заради контролю. А щоб Ти бачила свій рух і не
                випадала з процесу на кілька днів після одного складного вечора.
              </p>
              <DayCycle />
              <p className="mt-6 text-[17px] font-semibold leading-snug text-forest">
                Один день не вирішує нічого. Важливо повернутися наступного.
              </p>
            </div>
          </Item>

          <Item as="article">
            <div className={card}>
              <h3 className="text-[clamp(28px,2.6vw,34px)] font-semibold leading-[1.1] tracking-[-0.03em] text-forest">
                Щодня — <span className="voice text-moss">одна важлива тема</span>
              </h3>
              <p className="mt-5 text-[16px] leading-relaxed text-ink-soft">
                Не лекції й не складна теорія. Коротко й просто — про те, що
                реально впливає на Твої рішення щодня.
              </p>
              <ul className="mt-5 space-y-2">
                {[
                  "Чому виникає голод.",
                  "Як працюють звички.",
                  "Що робити після зриву.",
                  "Як сон і стрес впливають на апетит.",
                  "Як не жити в режимі «або ідеально, або ніяк».",
                ].map((theme) => (
                  <li key={theme} className="group flex items-center gap-3 rounded-2xl px-3 py-2 text-[15px] leading-snug text-ink transition-colors hover:bg-lime-soft">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-moss transition-transform group-hover:scale-150" aria-hidden="true" />
                    <span>{theme}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-auto pt-6 text-[17px] font-semibold leading-snug text-forest">Не щоб знати більше. А щоб легше діяти.</p>
            </div>
          </Item>
        </Stagger>

        {/* Чому саме −4% */}
        <Reveal className="mt-5">
          <div className="relative overflow-hidden rounded-[36px] bg-sage p-8 sm:p-12">
            <div aria-hidden="true" className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-lime/60 blur-3xl animate-drift-slow" />
            <div className="relative grid gap-10 md:grid-cols-[0.85fr_1.15fr] md:items-center md:gap-16">
              <div>
                <h3 className="text-[clamp(28px,3vw,40px)] font-semibold tracking-[-0.03em] text-forest">
                  Чому саме <span className="text-moss">−4%</span>?
                </h3>
                <p className="mt-4 text-[clamp(110px,15vw,200px)] font-bold leading-[0.85] tracking-[-0.07em] text-forest" aria-label="мінус 4 відсотки">
                  <CountUp to={4} mode="minusPct" duration={2.2} />
                </p>
                <p className="mt-4 text-[15px] text-ink-soft">від стартової ваги за 30 днів</p>
              </div>
              <div>
                <p className="text-[18px] leading-[1.7] text-ink">
                  Бо наша мета — не максимальна цифра на вагах за короткий час. А
                  результат, який можна пройти без крайнощів.
                </p>
                <ul className="mt-6 space-y-3">
                  {["Без гонки за «мінус 10».", "Без жорстких обмежень.", "Без вимоги бути ідеальною щодня."].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-[17px] font-medium text-ink">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest text-lime" aria-hidden="true">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-8 text-[clamp(22px,2.2vw,28px)] font-semibold leading-[1.2] tracking-[-0.02em] text-forest">
                  <Mark className="mark-dark">Достатньо, щоб побачити результат. Реалістично, щоб пройти шлях до кінця.</Mark>
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

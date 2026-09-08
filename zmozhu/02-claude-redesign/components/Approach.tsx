import CountPercent from "@/components/CountPercent";
import DayCycle from "@/components/DayCycle";
import Reveal, { Item, Stagger } from "@/components/Reveal";

function Dot() {
  return (
    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-rose" aria-hidden="true">
      <span className="h-2.5 w-2.5 rounded-full bg-coral" />
    </span>
  );
}

export default function Approach() {
  return (
    <section className="section bg-paper" aria-labelledby="approach-title">
      <div className="wrap">
        <Reveal className="max-w-[760px]">
          <p className="eyebrow">Підхід</p>
          <h2 id="approach-title" className="display mt-4 text-[clamp(36px,5vw,64px)] text-teal-deep">
            Не магія. Не сила волі.
            <span className="accent block">Поведінкова наука.</span>
          </h2>
        </Reveal>

        <Stagger className="mt-12 grid gap-5 md:grid-cols-3" gap={0.1}>
          {/* Поведінковий підхід */}
          <Item as="article" className="flex flex-col rounded-card border border-line bg-white p-7 transition-shadow duration-500 hover:shadow-soft">
            <Dot />
            <p className="mt-5 text-[16px] leading-relaxed text-ink">
              ZMOZHU побудований на принципах поведінкової психології, які
              допомагають людям змінювати звички та залишатися в процесі.
            </p>
            <p className="mt-3 text-[16px] leading-relaxed text-ink-soft">
              Ми перетворили ці підходи на просту щоденну систему підтримки,
              контролю та маленьких дій.
            </p>
            <p className="mt-5 text-[17px] font-semibold leading-snug text-teal-deep">
              Щоб Тобі не потрібно було щоранку знову шукати мотивацію.
            </p>
            <div className="mt-auto border-t border-line pt-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">В основі підходу</p>
              <p className="mt-1.5 text-[13px] leading-snug text-ink-soft">
                Когнітивно-поведінкові та поведінкові підходи, принципи
                психологічної гнучкості й самоспівчуття.
              </p>
              <p className="mt-1.5 text-[12px] leading-snug text-ink-soft">
                За працями: Джудіт Бек · Расс Гарріс · Крістін Нефф · Брене Браун
              </p>
            </div>
          </Item>

          {/* Щоденний ритм */}
          <Item as="article" className="flex flex-col rounded-card border border-line bg-white p-7 transition-shadow duration-500 hover:shadow-soft">
            <Dot />
            <h3 className="display mt-5 text-[clamp(26px,2.6vw,32px)] text-teal-deep">
              Твій <span className="accent">щоденний ритм</span>
            </h3>
            <p className="mt-4 text-[17px] font-semibold leading-snug text-teal-deep">
              Зранку — короткий чекін і зважування.
            </p>
            <p className="mt-2 text-[16px] leading-relaxed text-ink-soft">
              Кілька хвилин, щоб зафіксувати, де Ти сьогодні.
            </p>
            <p className="mt-4 text-[16px] leading-relaxed text-ink-soft">
              Не для контролю заради контролю. А щоб Ти бачила свій рух і не
              випадала з процесу на кілька днів після одного складного вечора.
            </p>
            <DayCycle />
            <p className="mt-5 text-[17px] font-semibold leading-snug text-teal-deep">
              Один день не вирішує нічого. Важливо повернутися наступного.
            </p>
          </Item>

          {/* Щоденна тема */}
          <Item as="article" className="flex flex-col rounded-card border border-line bg-white p-7 transition-shadow duration-500 hover:shadow-soft">
            <Dot />
            <h3 className="display mt-5 text-[clamp(26px,2.6vw,32px)] text-teal-deep">
              Щодня — <span className="accent">одна важлива тема</span>
            </h3>
            <p className="mt-4 text-[16px] leading-relaxed text-ink-soft">
              Не лекції й не складна теорія. Коротко й просто — про те, що
              реально впливає на Твої рішення щодня.
            </p>
            <ul className="mt-5 space-y-2.5">
              {[
                "Чому виникає голод.",
                "Як працюють звички.",
                "Що робити після зриву.",
                "Як сон і стрес впливають на апетит.",
                "Як не жити в режимі «або ідеально, або ніяк».",
              ].map((theme) => (
                <li key={theme} className="flex gap-2.5 text-[15px] leading-snug text-ink">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-coral" aria-hidden="true" />
                  <span>{theme}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[17px] font-semibold leading-snug text-teal-deep">
              Не щоб знати більше. А щоб легше діяти.
            </p>
          </Item>
        </Stagger>

        {/* Чому −4% */}
        <Reveal className="mt-6">
          <div className="grain relative overflow-hidden rounded-card bg-mist p-7 sm:p-10">
            <div className="blob -right-16 -top-16 h-72 w-72 bg-teal-soft" aria-hidden="true" />
            <div className="relative grid gap-8 md:grid-cols-[0.8fr_1.2fr] md:gap-14">
              <div>
                <h3 className="display text-[clamp(28px,3vw,40px)] text-teal-deep">
                  Чому саме <span className="accent">−4%</span>?
                </h3>
                <CountPercent className="mt-6 text-[clamp(84px,12vw,150px)] text-teal" />
                <p className="mt-2 text-[14px] text-ink-soft">від стартової ваги за 30 днів</p>
              </div>
              <div className="md:pt-3">
                <p className="text-[17px] leading-[1.7] text-ink">
                  Бо наша мета — не максимальна цифра на вагах за короткий час. А
                  результат, який можна пройти без крайнощів.
                </p>
                <ul className="mt-5 space-y-2.5">
                  {[
                    "Без гонки за «мінус 10».",
                    "Без жорстких обмежень.",
                    "Без вимоги бути ідеальною щодня.",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-[16px] leading-snug text-ink">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-teal" aria-hidden="true">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="display mt-7 text-[clamp(22px,2.4vw,30px)] leading-[1.15] text-teal-deep">
                  Достатньо, щоб побачити результат. Реалістично, щоб пройти шлях
                  до кінця.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

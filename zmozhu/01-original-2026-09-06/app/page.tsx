import Reveal from "@/components/Reveal";
import CtaButton from "@/components/CtaButton";
import FloatingCta from "@/components/FloatingCta";
import Faq from "@/components/Faq";
import Footer from "@/components/Footer";
import Portrait from "@/components/Portrait";
import MiraChat from "@/components/MiraChat";
import DepositFlow from "@/components/DepositFlow";
import DayCycle from "@/components/DayCycle";
import CountPercent from "@/components/CountPercent";

export default function Home() {
  return (
    <main className="landing">
<section id="top" className="hero">
        <div className="hero-grid">
          <Reveal className="hero-copy">
            <p className="text-[12px] font-semibold uppercase tracking-[0.07em] text-terracotta-deep sm:text-xs sm:tracking-[0.18em]">
              30 днів · щоденна підтримка · −4% ваги
            </p>

            <h1 className="offer-headline">
              <span>Ти знаєш, як схуднути.</span>{" "}
              <span className="offer-headline-return">Складніше — не зупинитися.</span>
            </h1>

            <p className="hero-support-heading">Ми поруч щодня.</p>

            <DepositFlow />

            <div className="hero-primary-action">
              <CtaButton className="w-full sm:w-auto">Я ЗМОЖУ</CtaButton>
            </div>

            <div className="hero-original-message">

            {/* Головна теза продукту */}
            <p className="mt-5 max-w-md text-[18px] font-semibold leading-snug text-deep sm:text-[19px]">
              <span className="block sm:inline">Мотивація закінчується —</span>{" "}
              <span className="block sm:inline">система залишається.</span>
            </p>

            <p className="mt-3 max-w-md text-[18px] leading-[1.45] text-ink">
              ZMOZHU допомагає пройти ці 30 днів до кінця без жорстких дієт і
              заборон. Щоденна підтримка і контроль, щоб один складний день не
              перекреслював увесь шлях.
            </p>

            </div>
          </Reveal>

          <Reveal delay={0.1} className="hero-visual">
            <div className="hero-photo">
              <Portrait
                src="/images/tanya-hero.jpg"
                alt="Тетяна — учасниця, що проходить 30 днів разом із тобою"
                name="Тетяна"
                priority
              />
              <div className="hero-caption">
                <p className="font-serif text-lg font-medium text-deep">
                  Тетяна — реальна учасниця
                </p>
                <p className="text-sm text-ink-soft">
                  Проходить ці 30 днів прямо зараз, разом із Тобою.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

<section className="recognition bg-cream-deep">
        <div className="mx-auto max-w-[920px] px-5 py-24">
          <Reveal className="text-center">
            <h2 className="font-serif text-[clamp(28px,4vw,44px)] font-medium leading-[1.15] tracking-[-0.01em] text-deep">
              Ти вже починала.
              <span className="block text-terracotta-deep">І, можливо, не раз.</span>
            </h2>
          </Reveal>

          <Reveal delay={0.05} className="mx-auto mt-10 max-w-[600px] text-center">
            <p className="text-[18px] leading-[1.7] text-ink">
              Ти знаєш, що краще їсти. Знаєш, що треба більше рухатися. Можливо,
              навіть бачила результат.
            </p>
          </Reveal>

          <Reveal delay={0.1} className="mx-auto mt-8 max-w-[600px] text-center">
            <p className="text-[18px] leading-[1.7] text-ink">
              А потім був звичайний день. Втома. Вечеря не за планом. Пропущене
              тренування. І поступово все поверталося назад.
            </p>
          </Reveal>

          <Reveal delay={0.15} className="mx-auto mt-8 max-w-[600px] text-center">
            <p className="text-[18px] leading-[1.7] text-ink-soft">
              Не тому, що Тобі бракує знань.
              <span className="block">І не тому, що Тобі бракує сили волі.</span>
            </p>
          </Reveal>

          <Reveal delay={0.2} className="mx-auto mt-14 max-w-[720px] text-center">
            <p className="font-serif text-[clamp(20px,2.8vw,28px)] font-medium leading-snug text-deep">
              Найважче — залишатися в процесі, коли мотивація закінчується.
            </p>
          </Reveal>
        </div>
      </section>

<section id="day" className="daily scroll-mt-24 bg-sage">
        <div className="mx-auto max-w-content px-5 py-20">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-terracotta-deep">
              Твій день у ZMOZHU
            </p>
            <h2 className="mt-4 font-serif text-[clamp(26px,4vw,40px)] font-medium leading-tight tracking-[-0.01em] text-deep">
              Близько 15 хвилин на день.
              <span className="block">Усе в Telegram.</span>
            </h2>
            <p className="mt-4 text-[17px] leading-relaxed text-ink-soft">
              Без окремих застосунків, складних кабінетів і годин контенту.
            </p>
          </Reveal>

          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
            {[
              {
                icon: "🌅",
                t: "Ранок",
                time: "≈ 5 хвилин",
                d: "Зважування, короткий ранковий чекін і тема дня.",
                d2: "Фіксуєш, де Ти сьогодні, і спокійно починаєш день.",
              },
              {
                icon: "🎧",
                t: "День",
                time: "≈ 3–5 хвилин",
                d: "Коротке аудіо від експерта про те, що впливає на Твій день.",
                d2: "Одна практична тема — без довгих лекцій і зайвої теорії.",
              },
              {
                icon: "🌙",
                t: "Вечір",
                time: "≈ 4 хвилини",
                d: "Короткий чекін про те, як пройшов день, і чесне відео від Тетяни.",
                d2: "Закриваєш день і просто повертаєшся завтра.",
              },
            ].map((block, i) => (
              <Reveal
                key={block.t}
                delay={i * 0.05}
                as="article"
                className="rounded-card bg-white/70 p-7 text-center"
              >
                <div className="text-4xl" aria-hidden="true">
                  {block.icon}
                </div>
                <h3 className="mt-4 font-serif text-xl font-medium text-deep">
                  {block.t}
                </h3>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-terracotta-deep">
                  {block.time}
                </p>
                <p className="mt-3 text-[16px] leading-relaxed text-ink">
                  {block.d}
                </p>
                <p className="mt-2 text-[16px] leading-relaxed text-ink-soft">
                  {block.d2}
                </p>
              </Reveal>
            ))}
          </div>

          <Reveal className="mx-auto mt-10 max-w-xl text-center">
            <p className="text-sm text-ink-soft">
              Нічого нового не потрібно встановлювати чи вивчати. Усе
              відбувається у звичному Telegram.
            </p>
          </Reveal>

          <Reveal delay={0.05} className="mx-auto mt-6 max-w-2xl text-center">
            <p className="font-serif text-[clamp(19px,2.4vw,26px)] font-medium leading-snug text-deep">
              Один Telegram. Три короткі точки контакту. Один день за раз.
            </p>
          </Reveal>
        </div>
      </section>

<section id="team" className="support scroll-mt-24 bg-cream-deep">
        <div className="mx-auto max-w-content px-5 py-20">
          <Reveal className="mx-auto max-w-[720px] text-center">
            <h2 className="font-serif text-[clamp(26px,4vw,40px)] font-medium leading-tight tracking-[-0.01em] text-deep">
              Три опори на 30 днів
            </h2>
            <p className="mt-3 text-[17px] leading-relaxed text-ink-soft">
              Технологія, жива людина поруч і зрозуміла експертна підтримка.
            </p>
          </Reveal>

          {/* Опора 1 — Міра (головна картка) */}
          <Reveal
            as="article"
            className="mt-12 rounded-card border border-line bg-white p-7 sm:p-9"
          >
            <div className="grid gap-8 md:grid-cols-[1fr_0.75fr] md:items-center md:gap-12">
              <div>
                <h3 className="font-serif text-[clamp(24px,3vw,32px)] font-medium leading-snug text-deep">
                  Міра
                </h3>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-terracotta-deep">
                  Твоя щоденна опора
                </p>
                <p className="mt-5 text-[17px] leading-[1.7] text-ink">
                  Міра пам&apos;ятає Твої чекіни, вагу й те, як проходить Твій
                  день. Допомагає розібрати складний момент, повернутися після
                  зриву й не випадати з процесу.
                </p>
                <p className="mt-5 font-serif text-[clamp(18px,2.2vw,22px)] font-medium leading-snug text-deep">
                  Вона не оцінює. Вона допомагає залишатися в русі.
                </p>
              </div>

              <MiraChat />
            </div>
          </Reveal>

          {/* Опора 2 — Анастасія. Фото ліворуч, щоб чергувалося з карткою Міри */}
          <Reveal
            delay={0.05}
            as="article"
            className="mt-6 rounded-card border border-line bg-white p-7 sm:p-9"
          >
            <div className="grid gap-8 md:grid-cols-[0.75fr_1fr] md:items-center md:gap-12">
              {/* Текст першим у розмітці, щоб на мобільному спершу читалось імʼя,
                  як у картці Міри. На десктопі фото стає ліворуч. */}
              <div className="order-1 md:order-2">
                <h3 className="font-serif text-[clamp(24px,3vw,32px)] font-medium leading-snug text-deep">
                  Анастасія
                </h3>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-terracotta-deep">
                  Експертка з харчування
                </p>

                {/* Регалії — усе, що вона сама публічно про себе каже
                    і що можна перевірити за посиланнями нижче. */}
                <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
                  Науковиця, понад 10 років досвіду. Співзасновниця школи
                  Nodiet School, авторка подкасту «Що в меню».
                </p>

                <p className="mt-4 text-[17px] leading-[1.7] text-ink">
                  Коротко й зрозуміло пояснює, що відбувається з тілом, апетитом
                  і звичками — та як застосувати це у звичайному житті без
                  жорстких заборон.
                </p>
                <p className="mt-5 font-serif text-[clamp(18px,2.2vw,22px)] font-medium leading-snug text-deep">
                  Менше теорії. Більше того, що можна використати сьогодні.
                </p>

              </div>

              <div className="order-2 mx-auto w-full max-w-[340px] md:order-1">
                <Portrait
                  src="/images/nastya.jpg"
                  className="expert-portrait"
                  alt="Анастасія — експертка з харчування у програмі"
                  name="Анастасія"
                />
              </div>
            </div>
          </Reveal>

          {/* Опора 3 — жива людина. Свідомо без інтерфейсу й без фото:
              це єдина картка без екрана, і сама її тиша працює на сенс. */}
          <Reveal
            delay={0.1}
            as="article"
            className="mt-6 rounded-card border border-line bg-white p-7 sm:p-9"
          >
            <div className="mx-auto max-w-[640px]">
              <div className="text-center">
                <h3 className="font-serif text-[clamp(24px,3vw,32px)] font-medium leading-snug text-deep">
                  Поруч є людина
                </h3>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-terracotta-deep">
                  Не лише алгоритм
                </p>
              </div>

              {/* Абзаци вирівняні вліво: центрований текст у 3–4 рядки
                  читається важче, ніж здається. Заголовок і фінальна теза
                  лишаються по центру. */}
              <p className="mt-6 text-[17px] leading-[1.7] text-ink">
                Ми стежимо за тим, як проходить програму кожна учасниця. Якщо
                бачимо, що щось потребує додаткової уваги,{" "}
                <span className="font-medium text-deep">
                  зв&apos;язуємося з Тобою
                </span>{" "}
                і, за потреби, пропонуємо консультацію профільного експерта.
              </p>

              <p className="mt-4 text-[17px] leading-[1.7] text-ink">
                Якщо Тобі стане складно — Ти завжди можеш написати в підтримку
                й отримати відповідь від живої людини.
              </p>

              <p className="mt-7 text-center font-serif text-[clamp(18px,2.2vw,22px)] font-medium leading-snug text-deep">
                За кожним рішенням тут стоїть людина.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

<section className="buddy bg-cream-deep">
        <div className="mx-auto max-w-content px-5 pb-24">
          <Reveal className="mx-auto max-w-[760px] text-center">
            <h2 className="font-serif text-[clamp(26px,3.6vw,40px)] font-medium leading-[1.15] tracking-[-0.01em] text-deep">
              Ти проходиш ці 30 днів не сама.
            </h2>
            <p className="mt-3 font-serif text-[clamp(18px,2.2vw,24px)] leading-snug text-ink">
              Поруч із Тобою — Тетяна.{" "}
              <span className="text-terracotta-deep">Твоя Баді.</span>
            </p>
          </Reveal>

          <div className="mt-10 grid items-center gap-8 md:grid-cols-[0.9fr_1.1fr] md:gap-12">
            <Reveal>
              <div className="mx-auto w-full max-w-[340px]">
                <Portrait
                  src="/images/tanya2.jpg"
                  alt="Тетяна — учасниця, яка проходить ці 30 днів разом із тобою"
                  name="Тетяна"
                />
              </div>
            </Reveal>

            <Reveal delay={0.05}>
              <p className="text-[18px] leading-[1.7] text-ink">
                Вона проходить ті самі 30 днів разом із Тобою. Так само
                зважується. Так само має хороші й складні дні. Так само іноді
                хоче все кинути.
              </p>
              <p className="mt-5 text-[18px] leading-[1.7] text-ink">
                Щодня Тетяна ділиться коротким відео — показує, що в неї
                виходить, а де буває складно.
              </p>

              <p className="mt-8 font-serif text-[clamp(19px,2.3vw,26px)] font-medium leading-snug text-deep">
                Не як тренер.
                <span className="block">
                  Не як людина, яка знає все краще за Тебе.
                </span>
                <span className="block text-terracotta-deep">
                  А як жінка, яка йде поруч.
                </span>
              </p>
            </Reveal>
          </div>
        </div>
      </section>

<section className="approach bg-cream-deep">
        <div className="mx-auto max-w-content px-5 pb-20">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {/* Картка довіри — поведінковий підхід */}
            <Reveal
              as="article"
              className="self-start rounded-card border border-line bg-white p-7 lg:self-auto"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-terracotta-l">
                <span className="h-2.5 w-2.5 rounded-full bg-terracotta" />
              </span>

              <h3 className="mt-4 font-serif text-[clamp(20px,2.4vw,26px)] font-medium leading-snug text-deep">
                Не магія. Не сила волі.
                <span className="block text-terracotta-deep">Поведінкова наука.</span>
              </h3>

              <p className="mt-3 text-[16px] leading-relaxed text-ink-soft">
                ZMOZHU побудований на принципах поведінкової психології, які
                допомагають людям змінювати звички та залишатися в процесі.
              </p>
              <p className="mt-2.5 text-[16px] leading-relaxed text-ink-soft">
                Ми перетворили ці підходи на просту щоденну систему підтримки,
                контролю та маленьких дій.
              </p>

              <p className="mt-4 text-[17px] font-medium leading-snug text-deep">
                Щоб Тобі не потрібно було щоранку знову шукати мотивацію.
              </p>

              {/* Наукова основа — другорядний доказ */}
              <div className="mt-5 border-t border-line pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
                  В основі підходу
                </p>
                <p className="mt-1.5 text-[13px] leading-snug text-ink-soft">
                  Когнітивно-поведінкові та поведінкові підходи, принципи
                  психологічної гнучкості й самоспівчуття.
                </p>
                <p className="mt-1.5 text-[12px] leading-snug text-ink-soft">
                  За працями: Джудіт Бек · Расс Гарріс · Крістін Нефф · Брене
                  Браун
                </p>
              </div>
            </Reveal>

            {/* Картка щоденного ритму */}
            <Reveal
              as="article"
              delay={0.05}
              className="self-start rounded-card border border-line bg-white p-7 lg:self-auto"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-terracotta-l">
                <span className="h-2.5 w-2.5 rounded-full bg-terracotta" />
              </span>

              <h3 className="mt-4 font-serif text-[clamp(20px,2.4vw,26px)] font-medium leading-snug text-deep">
                Твій <span className="text-terracotta-deep">щоденний ритм</span>
              </h3>

              <p className="mt-4 text-[17px] font-medium leading-snug text-deep">
                Зранку — короткий чекін і зважування.
              </p>
              <p className="mt-2 text-[16px] leading-relaxed text-ink-soft">
                Кілька хвилин, щоб зафіксувати, де Ти сьогодні.
              </p>

              <p className="mt-4 text-[16px] leading-relaxed text-ink-soft">
                Не для контролю заради контролю. А щоб Ти бачила свій рух і не
                випадала з процесу на кілька днів після одного складного вечора.
              </p>

              {/* Мікросхема дня */}
              <DayCycle />

              <p className="mt-5 text-[17px] font-medium leading-snug text-deep">
                Один день не вирішує нічого. Важливо повернутися наступного.
              </p>
            </Reveal>

            {/* Картка щоденної теми */}
            <Reveal
              as="article"
              delay={0.1}
              className="self-start rounded-card border border-line bg-white p-7 lg:self-auto sm:col-span-2 lg:col-span-1"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-terracotta-l">
                <span className="h-2.5 w-2.5 rounded-full bg-terracotta" />
              </span>

              <h3 className="mt-4 font-serif text-[clamp(20px,2.4vw,26px)] font-medium leading-snug text-deep">
                Щодня —{" "}
                <span className="text-terracotta-deep">одна важлива тема</span>
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
                  <li
                    key={theme}
                    className="flex gap-2.5 text-[15px] leading-snug text-ink"
                  >
                    <span
                      className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-terracotta-l"
                      aria-hidden="true"
                    />
                    <span>{theme}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-6 text-[17px] font-medium leading-snug text-deep">
                Не щоб знати більше. А щоб легше діяти.
              </p>
            </Reveal>
          </div>

          <Reveal className="mx-auto mt-10 max-w-3xl">
            <div className="rounded-card border-l-[3px] border-terracotta bg-white p-7 sm:p-9">
              <h3 className="font-serif text-[clamp(22px,3vw,30px)] font-medium leading-snug text-deep">
                Чому саме <span className="text-terracotta-deep">−4%</span>?
              </h3>

              {/* Акцент на цифрі */}
              <div className="mt-6">
                <CountPercent />
                <p className="mt-2 text-sm text-ink-soft">
                  від стартової ваги за 30 днів
                </p>
              </div>

              <p className="mt-6 max-w-[560px] text-[17px] leading-[1.7] text-ink">
                Бо наша мета — не максимальна цифра на вагах за короткий час. А
                результат, який можна пройти без крайнощів.
              </p>

              <ul className="mt-5 space-y-2.5">
                {[
                  "Без гонки за «мінус 10».",
                  "Без жорстких обмежень.",
                  "Без вимоги бути ідеальною щодня.",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex gap-2.5 text-[16px] leading-snug text-ink-soft"
                  >
                    <span
                      className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-terracotta-l"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-7 max-w-[560px] font-serif text-[clamp(18px,2.2vw,22px)] font-medium leading-snug text-deep">
                Достатньо, щоб побачити результат. Реалістично, щоб пройти шлях
                до кінця.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

<section id="how" className="investment scroll-mt-24 bg-cream">
        <div className="mx-auto max-w-content px-5 py-20">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-terracotta-deep">
              Як це працює
            </p>
            <h2 className="mt-4 font-serif text-[clamp(26px,4vw,40px)] font-medium leading-tight tracking-[-0.01em] text-deep">
              2000 грн — це не плата за участь.
              <span className="block text-terracotta-deep">
                Це Твій внесок у результат.
              </span>
            </h2>
          </Reveal>

          <Reveal delay={0.05} className="mx-auto mt-8 max-w-[600px] text-center">
            <p className="text-[18px] leading-[1.7] text-ink">
              Ти вносиш 2000 грн на старті. Виконуєш умови 30 днів — отримуєш усю суму
              назад.
            </p>
          </Reveal>

          <Reveal delay={0.1} className="mx-auto mt-8 max-w-[600px] text-center">
            <p className="text-[17px] font-medium text-deep">
              Навіщо внесок взагалі?
            </p>
            <p className="mt-2 text-[18px] leading-[1.7] text-ink">
              Бо коли Ти вже щось вклала, набагато складніше просто
              зникнути після одного важкого дня.
            </p>
          </Reveal>

          <Reveal delay={0.15} className="mx-auto mt-10 max-w-[680px] text-center">
            <p className="font-serif text-[clamp(19px,2.4vw,26px)] font-medium leading-snug text-deep">
              Внесок повернувся — участь фактично коштувала Тобі $0.
            </p>
          </Reveal>

          <Reveal className="mx-auto mt-12 max-w-md">
            <div className="rounded-[24px] bg-blush px-8 py-9 text-center">
              <p className="font-serif text-[clamp(24px,3.4vw,32px)] font-medium leading-none text-deep">
                Внесок 2000 грн
              </p>
              <p className="mt-3 text-[17px] leading-snug text-ink">
                Виконала умови → 2000 грн повертаються
              </p>
              <div className="mt-6 flex justify-center">
                <CtaButton>Я ЗМОЖУ</CtaButton>
              </div>
            </div>
          </Reveal>

          <Reveal className="mt-16 text-center">
            <h3 className="font-serif text-2xl font-medium text-deep">
              Три умови. Все.
            </h3>
          </Reveal>

          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
            {[
              {
                n: "01",
                t: "Знизити вагу на 4%",
                d: "Від стартової ваги. Фінальний результат визначаємо за середнім значенням останніх 3 зважувань.",
              },
              {
                n: "02",
                t: "Ранкові та вечірні чекіни",
                d: "Короткий чекін двічі на день. За 30 днів можна пропустити до 3 ранкових і до 3 вечірніх чекінів.",
              },
              {
                n: "03",
                t: "Щоденне зважування",
                d: "Фото ваг із секретним словом підтверджує зважування. За 30 днів можна пропустити до 3 разів.",
              },
            ].map((card, i) => (
              <Reveal
                key={card.n}
                delay={i * 0.05}
                as="article"
                className="rounded-card border border-line bg-white p-7"
              >
                <span className="font-serif text-3xl font-medium text-terracotta-mid">
                  {card.n}
                </span>
                <h4 className="mt-3 font-serif text-xl font-medium text-deep">
                  {card.t}
                </h4>
                <p className="mt-2 text-[16px] leading-relaxed text-ink-soft">
                  {card.d}
                </p>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.1} className="mx-auto mt-8 max-w-2xl text-center">
            <p className="font-serif text-[clamp(19px,2.4vw,26px)] font-medium leading-snug text-deep">
              Виконала всі три умови — отримуєш свої{" "}
              <span className="text-terracotta-deep">2000 грн назад</span>.
            </p>
          </Reveal>

          <Reveal className="mx-auto mt-8 max-w-2xl">
            <div className="rounded-card border-l-[3px] border-terracotta bg-cream-deep p-6 sm:p-8">
              <h4 className="font-serif text-[clamp(19px,2.4vw,24px)] font-medium leading-snug text-deep">
                <span className="text-terracotta-deep">Безпека</span> важливіша за
                цифру на вагах.
              </h4>

              <p className="mt-4 text-[16px] leading-relaxed text-ink">
                Ми дивимося не лише на результат, а й на те, як Ти до нього йдеш.
              </p>

              <p className="mt-3 text-[16px] leading-relaxed text-ink">
                Якщо система бачить різкі або підозрілі зміни ваги, ми можемо
                попросити додаткове підтвердження або зупинити участь — щоб не
                заохочувати небезпечні способи схуднення.
              </p>

              <p className="mt-5 text-[16px] font-medium leading-relaxed text-deep">
                Усі правила повернення внеску прозорі й однакові для всіх.
              </p>
              <p className="mt-2 text-[16px] leading-relaxed text-ink">
                Якщо якась із трьох умов не виконана, участь у програмі
                продовжується, але внесок не повертається.
              </p>

              <p className="mt-5 border-t border-line pt-4 text-[14px] leading-relaxed text-ink-soft">
                Гроші повертаються на ту саму картку, з якої була оплата. Повні
                правила — у{" "}
                <a href="/oferta" className="underline hover:text-terracotta-deep">
                  Публічній оферті
                </a>
                .
              </p>
            </div>
          </Reveal>

        </div>
      </section>

<section className="research bg-sage">
        <div className="mx-auto max-w-content px-5 py-20">
          <Reveal className="mx-auto max-w-[760px] text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
              Дослідження
            </p>
            <h2 className="mt-3 font-serif text-[clamp(26px,4vw,40px)] font-medium leading-tight tracking-[-0.01em] text-deep">
              Фінансова мотивація працює
            </h2>
            <p className="mt-4 text-[17px] leading-relaxed text-ink">
              У рандомізованому дослідженні JAMA ціль досягли:
            </p>
          </Reveal>

          {/* Дві цифри поруч. Смужка під кожною має ширину, рівну самій
              цифрі, — різниця видно оком, а не тільки читається. */}
          <Reveal delay={0.05} className="mx-auto mt-10 max-w-[760px]">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-card border border-terracotta bg-white p-7">
                <p className="font-serif text-[clamp(40px,7vw,52px)] font-medium leading-none text-terracotta-deep">
                  47,4%
                </p>
                <div
                  className="mt-5 h-1.5 w-full overflow-hidden rounded-pill bg-terracotta-l/40"
                  aria-hidden="true"
                >
                  <div
                    className="h-full rounded-pill bg-terracotta-deep"
                    style={{ width: "47.4%" }}
                  />
                </div>
                <p className="mt-4 text-[16px] leading-relaxed text-ink">
                  учасників із фінансовою відповідальністю
                </p>
              </div>

              <div className="rounded-card border border-line bg-white/70 p-7">
                <p className="font-serif text-[clamp(40px,7vw,52px)] font-medium leading-none text-ink-soft">
                  10,5%
                </p>
                <div
                  className="mt-5 h-1.5 w-full overflow-hidden rounded-pill bg-line"
                  aria-hidden="true"
                >
                  <div
                    className="h-full rounded-pill bg-ink-soft"
                    style={{ width: "10.5%" }}
                  />
                </div>
                <p className="mt-4 text-[16px] leading-relaxed text-ink-soft">
                  у контрольній групі
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1} className="mx-auto mt-9 max-w-[680px] text-center">
            <p className="font-serif text-[clamp(20px,2.6vw,28px)] font-medium leading-snug text-deep">
              <span className="block sm:inline">
                У <span className="text-terracotta-deep">4,5 раза</span> вищий
                результат
              </span>{" "}
              <span className="block sm:inline">під час програми.</span>
            </p>
            <p className="mt-5 text-[17px] leading-relaxed text-ink">
              Саме тому в ZMOZHU є мотиваційний внесок, щоденні зважування та
              регулярні чекіни.
            </p>
          </Reveal>

          {/* Джерела навмисно не клікабельні — просто називаємо, звідки цифри. */}
          <Reveal
            delay={0.15}
            className="mx-auto mt-10 max-w-[680px] border-t border-line pt-6 text-center"
          >
            <p className="text-[13px] leading-relaxed text-ink-soft">
              Джерела:{" "}
              <span className="font-semibold text-terracotta-deep">
                дослідження JAMA
              </span>
              <span className="px-1.5">·</span>
              <span className="font-semibold text-terracotta-deep">PubMed</span>
            </p>
            <p className="mx-auto mt-2 max-w-[560px] text-[12px] leading-relaxed text-ink">
              Дані стосуються окремого клінічного дослідження. ZMOZHU не
              гарантує аналогічний результат.
            </p>
          </Reveal>
        </div>
      </section>

<section className="difference bg-cream">
        <div className="mx-auto max-w-content px-5 py-20">
          <Reveal className="text-center">
            <h2 className="font-serif text-[clamp(26px,4vw,40px)] font-medium leading-tight tracking-[-0.01em] text-deep">
              Чому цього разу може бути інакше
            </h2>
          </Reveal>

          <div className="mx-auto mt-12 max-w-2xl space-y-4">
            {[
              {
                first: "Дієта дає правила.",
                second: "ZMOZHU допомагає залишатися в процесі.",
              },
              {
                first: "Експерт дає знання.",
                second: "ZMOZHU перетворює їх на щоденні дії.",
              },
              {
                first: "Подруга підтримує.",
                second: "ZMOZHU додає до підтримки систему і ритм.",
              },
            ].map((row, i) => (
              <Reveal
                key={row.first}
                delay={i * 0.05}
                className="rounded-card border border-line bg-white p-5"
              >
                <p className="text-[17px] leading-snug text-deep">
                  {row.first}
                </p>
                <p className="mt-1 text-[17px] font-medium leading-snug text-terracotta-deep">
                  {row.second}
                </p>
              </Reveal>
            ))}

            {/* Фінальний акцент */}
            <Reveal
              delay={0.15}
              className="rounded-card border border-terracotta bg-blush/60 p-5"
            >
              <p className="text-[17px] leading-snug text-deep">
                Не ще одна спроба почати.
              </p>
              <p className="mt-1 font-serif text-[clamp(19px,2.3vw,24px)] font-medium leading-snug text-deep">
                Система, яка допомагає{" "}
                <span className="text-terracotta-deep">продовжувати</span>.
              </p>
            </Reveal>
          </div>

        </div>
      </section>

<section id="faq" className="questions scroll-mt-24 bg-cream-deep">
        <div className="mx-auto max-w-content px-5 py-20">
          <Reveal className="text-center">
            <h2 className="font-serif text-[clamp(26px,4vw,40px)] font-medium leading-tight tracking-[-0.01em] text-deep">
              Питання, які зазвичай виникають
            </h2>
          </Reveal>
          <Reveal className="mt-10">
            <Faq />
          </Reveal>
        </div>
      </section>

<section className="afterwards bg-cream">
        <div className="mx-auto max-w-content px-5 py-20">
          <Reveal className="mx-auto max-w-[720px] text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
              Після програми
            </p>
            <h2 className="mt-3 font-serif text-[clamp(26px,4vw,40px)] font-medium leading-tight tracking-[-0.01em] text-deep">
              Що буде після 30-го дня?
            </h2>
            {/* Перше речення — відповідь на питання в заголовку,
                тому воно серифом і окремо. */}
            <p className="mx-auto mt-6 max-w-[520px] font-serif text-[clamp(20px,2.4vw,26px)] font-medium leading-snug text-deep">
              На 30-му дні ZMOZHU не закінчується.
            </p>
          </Reveal>

          {/* Два «якщо» — це дві рівноцінні гілки, тому дві колонки,
              а не суцільний абзац. Риска згори замість рамки: легше,
              і не повторює картки з блоку про дослідження. */}
          <Reveal delay={0.05} className="mx-auto mt-10 max-w-[720px]">
            <div className="grid gap-7 sm:grid-cols-2 sm:gap-10">
              <div>
                <span
                  className="block h-[3px] w-10 rounded-pill bg-terracotta"
                  aria-hidden="true"
                />
                <p className="mt-4 text-[16px] leading-relaxed text-ink">
                  Якщо Ти досягла своєї цілі й виконала умови програми, ми
                  запропонуємо наступний етап — утримання результату.
                </p>
              </div>
              <div>
                <span
                  className="block h-[3px] w-10 rounded-pill bg-terracotta"
                  aria-hidden="true"
                />
                <p className="mt-4 text-[16px] leading-relaxed text-ink">
                  Якщо захочеш рухатись далі — допоможемо визначити нову ціль і
                  продовжити шлях.
                </p>
              </div>
            </div>
          </Reveal>

          {/* Той самий тип картки, що й «Безпека важливіша за цифру»,
              щоб фінальна обіцянка читалась як частина тієї ж мови. */}
          <Reveal delay={0.1} className="mx-auto mt-12 max-w-[720px]">
            <div className="rounded-card border-l-[3px] border-terracotta bg-cream-deep p-6 sm:p-8">
              <h3 className="font-serif text-[clamp(19px,2.4vw,26px)] font-medium leading-snug text-deep">
                Ми не залишаємо Тебе після фінішу.
              </h3>
              <p className="mt-4 text-[16px] leading-relaxed text-ink">
                Наша задача — бути поруч доти, доки нові звички й система не
                стануть для Тебе природною частиною життя.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

<section className="closing bg-deep">
        <div className="mx-auto max-w-content px-5 py-24 text-center">
          <Reveal className="mx-auto max-w-2xl">
            <h2 className="font-serif text-[clamp(26px,3.6vw,40px)] font-medium leading-[1.2] tracking-[-0.01em] text-white">
              Ти не мусиш пройти ці 30 днів ідеально.
            </h2>

            <p className="mt-8 text-[18px] leading-[1.9] text-white/80">
              Будуть хороші дні.
              <span className="block">Будуть складні.</span>
            </p>

            <p className="mt-8 text-[clamp(19px,2.3vw,23px)] font-medium leading-snug text-white">
              Головне — не зникнути після одного з них.
            </p>

            <p className="mt-8 text-[17px] leading-[1.75] text-white/75">
              ZMOZHU створений саме для моменту, коли хочеться все кинути — щоб
              допомогти Тобі повернутися і продовжити.
            </p>

            <p className="mt-8 text-[16px] text-white/75">
              Виконала умови — отримуєш свої 2000 грн назад.
            </p>

            <p className="mt-12 font-serif text-[clamp(21px,2.9vw,30px)] font-medium leading-snug text-white">
              Цього разу Тобі не потрібно починати заново.
              <span className="block text-terracotta-l">
                Потрібно просто продовжити завтра.
              </span>
            </p>

            <div className="mt-10 flex justify-center">
              <CtaButton>Я ЗМОЖУ</CtaButton>
            </div>
          </Reveal>
        </div>
      </section>
<Footer />
<FloatingCta />
</main>
  );
}

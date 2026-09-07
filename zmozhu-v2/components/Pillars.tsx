import MiraChat from "@/components/MiraChat";
import Portrait from "@/components/Portrait";
import Reveal from "@/components/Reveal";

export default function Pillars() {
  return (
    <section id="team" className="section bg-paper" aria-labelledby="team-title">
      <div className="wrap">
        <Reveal className="max-w-[720px]">
          <p className="eyebrow">Хто поруч</p>
          <h2 id="team-title" className="display mt-4 text-[clamp(36px,5vw,64px)] text-teal-deep">
            Три опори на 30 днів
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-ink-soft md:text-[18px]">
            Технологія, жива людина поруч і зрозуміла експертна підтримка.
          </p>
        </Reveal>

        {/* Опора 1 — Міра */}
        <Reveal as="article" className="mt-12 overflow-hidden rounded-card border border-line bg-white">
          <div className="grid md:grid-cols-[1.05fr_0.95fr]">
            <div className="p-7 sm:p-10 lg:p-14">
              <p className="eyebrow">Твоя щоденна опора</p>
              <h3 className="display mt-3 text-[clamp(38px,4.6vw,60px)] text-teal-deep">Міра</h3>
              <p className="mt-5 max-w-[480px] text-[17px] leading-[1.7] text-ink">
                Міра пам&apos;ятає Твої чекіни, вагу й те, як проходить Твій
                день. Допомагає розібрати складний момент, повернутися після
                зриву й не випадати з процесу.
              </p>
              <p className="display mt-7 max-w-[460px] text-[clamp(24px,2.5vw,32px)] leading-[1.15] text-teal-deep">
                Вона не оцінює. <span className="accent">Вона допомагає залишатися в русі.</span>
              </p>
            </div>
            <div className="grain relative flex items-end justify-center bg-mist px-6 pt-10 md:pt-14">
              <div className="blob left-[10%] top-[10%] h-64 w-64 bg-teal-soft" aria-hidden="true" />
              <div className="relative -mb-10 w-full max-w-[320px] translate-y-2 transition-transform duration-700 hover:-translate-y-1">
                <MiraChat />
              </div>
            </div>
          </div>
        </Reveal>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {/* Опора 2 — Анастасія */}
          <Reveal as="article" delay={0.05} className="group overflow-hidden rounded-card border border-line bg-white">
            <div className="grid grid-cols-[112px_1fr] gap-5 p-7 sm:grid-cols-[150px_1fr] sm:gap-7 sm:p-9">
              <div className="overflow-hidden rounded-[20px]">
                <Portrait
                  src="/images/nastya.jpg"
                  alt="Анастасія — експертка з харчування у програмі"
                  name="Анастасія"
                  sizes="150px"
                  className="aspect-[4/5]"
                  imgClassName="object-[center_top] transition-transform duration-[1.2s] group-hover:scale-105"
                />
              </div>
              <div>
                <p className="eyebrow">Експертка з харчування</p>
                <h3 className="display mt-2 text-[clamp(32px,3.4vw,44px)] text-teal-deep">Анастасія</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
                  Науковиця, понад 10 років досвіду. Співзасновниця школи
                  Nodiet School, авторка подкасту «Що в меню».
                </p>
              </div>
            </div>
            <div className="px-7 pb-8 sm:px-9 sm:pb-9">
              <p className="text-[16px] leading-[1.7] text-ink">
                Коротко й зрозуміло пояснює, що відбувається з тілом, апетитом
                і звичками — та як застосувати це у звичайному житті без
                жорстких заборон.
              </p>
              <p className="display mt-5 text-[clamp(22px,2.2vw,28px)] leading-[1.15] text-teal-deep">
                Менше теорії. <span className="accent">Більше того, що можна використати сьогодні.</span>
              </p>
            </div>
          </Reveal>

          {/* Опора 3 — жива людина. Свідомо без інтерфейсу й без фото. */}
          <Reveal as="article" delay={0.1} className="grain relative overflow-hidden rounded-card bg-rose">
            <div className="blob -bottom-16 -right-10 h-56 w-56 bg-apricot/70" aria-hidden="true" />
            <div className="relative flex h-full flex-col p-7 sm:p-9">
              <p className="eyebrow">Не лише алгоритм</p>
              <h3 className="display mt-2 text-[clamp(32px,3.4vw,44px)] text-teal-deep">Поруч є людина</h3>

              <p className="mt-6 text-[16px] leading-[1.7] text-ink">
                Ми стежимо за тим, як проходить програму кожна учасниця. Якщо
                бачимо, що щось потребує додаткової уваги,{" "}
                <span className="font-semibold text-teal-deep">зв&apos;язуємося з Тобою</span>{" "}
                і, за потреби, пропонуємо консультацію профільного експерта.
              </p>

              <p className="mt-4 text-[16px] leading-[1.7] text-ink">
                Якщо Тобі стане складно — Ти завжди можеш написати в підтримку
                й отримати відповідь від живої людини.
              </p>

              <p className="display mt-auto pt-8 text-[clamp(22px,2.2vw,28px)] leading-[1.15] text-teal-deep">
                За кожним рішенням тут стоїть людина.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

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
            <div className="grain relative flex items-end justify-center bg-mist px-6 pb-8 pt-10 md:pb-0 md:pt-14">
              <div className="blob left-[10%] top-[10%] h-64 w-64 bg-teal-soft" aria-hidden="true" />
              <div className="relative w-full max-w-[320px] transition-transform duration-700 hover:-translate-y-1 md:-mb-10 md:translate-y-2">
                <MiraChat />
              </div>
            </div>
          </div>
        </Reveal>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {/* Опора 2 — Анастасія */}
          <Reveal as="article" delay={0.05} className="group grid overflow-hidden rounded-card border border-line bg-white sm:grid-cols-[0.95fr_1.05fr]">
            {/* Фото на всю висоту картки (планшет і десктоп) або на всю ширину (мобільний) */}
            <div className="relative min-h-[320px] overflow-hidden sm:min-h-0">
              <Portrait
                src="/images/nastya.jpg"
                alt="Анастасія — експертка з харчування у програмі"
                name="Анастасія"
                sizes="(max-width: 640px) 100vw, 320px"
                className="aspect-[4/5] sm:absolute sm:inset-0 sm:aspect-auto sm:h-full"
                imgClassName="object-[center_20%] transition-transform duration-[1.2s] group-hover:scale-[1.04]"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-teal-deep/80 to-transparent px-5 pb-5 pt-14 text-white">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-apricot">Експертка з харчування</p>
                <p className="mt-1 font-display text-[34px] font-semibold leading-none">Анастасія</p>
              </div>
            </div>
            <div className="flex flex-col p-7 sm:p-9">
              <p className="text-[14px] leading-relaxed text-ink-soft">
                Науковиця, понад 10 років досвіду. Співзасновниця школи
                Nodiet School, авторка подкасту «Що в меню».
              </p>
              <p className="mt-5 text-[16px] leading-[1.7] text-ink">
                Коротко й зрозуміло пояснює, що відбувається з тілом, апетитом
                і звичками — та як застосувати це у звичайному житті без
                жорстких заборон.
              </p>
              <p className="display mt-auto pt-6 text-[clamp(22px,2.2vw,28px)] leading-[1.15] text-teal-deep">
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

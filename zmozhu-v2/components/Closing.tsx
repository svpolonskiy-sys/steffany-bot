import CtaButton from "@/components/CtaButton";
import Reveal from "@/components/Reveal";

export default function Closing() {
  return (
    <section id="closing" className="px-3 pb-3 md:px-5" aria-labelledby="closing-title">
      <div className="on-dark grain relative overflow-hidden rounded-[32px] bg-teal-deep text-white md:rounded-[40px]">
        <div className="blob left-[-10%] top-[-10%] h-[520px] w-[520px] bg-teal-mid/70" aria-hidden="true" />
        <div className="blob bottom-[-20%] right-[-10%] h-[520px] w-[520px] bg-coral/30" aria-hidden="true" />

        <div className="wrap section text-center">
          <div className="mx-auto max-w-[820px]">
            <Reveal>
              <h2 id="closing-title" className="display text-[clamp(38px,5.6vw,72px)]">
                Ти не мусиш пройти ці 30 днів ідеально.
              </h2>
            </Reveal>

            <Reveal delay={0.1} className="mt-10">
              <p className="display text-[clamp(24px,3vw,36px)] leading-[1.3] text-white/80">
                Будуть хороші дні.
                <span className="block">Будуть складні.</span>
              </p>
              <p className="mt-6 text-[clamp(19px,2.3vw,24px)] font-semibold leading-snug text-white">
                Головне — не зникнути після одного з них.
              </p>
            </Reveal>

            <Reveal delay={0.15} className="mt-8">
              <p className="mx-auto max-w-[600px] text-[17px] leading-[1.75] text-white/70">
                ZMOZHU створений саме для моменту, коли хочеться все кинути — щоб
                допомогти Тобі повернутися і продовжити.
              </p>
              <p className="mt-6 inline-flex items-center gap-2 rounded-pill border border-white/15 bg-white/5 px-4 py-2 text-[15px] text-white/85">
                <span className="h-1.5 w-1.5 rounded-full bg-apricot" aria-hidden="true" />
                Виконала умови — отримуєш свої 2000 грн назад.
              </p>
            </Reveal>

            <Reveal delay={0.2} className="mt-14">
              <p className="display text-[clamp(28px,3.6vw,46px)] leading-[1.12]">
                Цього разу Тобі не потрібно починати заново.
                <span className="accent block">Потрібно просто продовжити завтра.</span>
              </p>
              <div className="mt-10 flex justify-center">
                <CtaButton variant="light" className="w-full sm:w-auto sm:min-w-[280px]">Я ЗМОЖУ</CtaButton>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

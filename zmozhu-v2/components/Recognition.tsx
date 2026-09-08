import Reveal from "@/components/Reveal";
import ScrollWords from "@/components/ScrollWords";

export default function Recognition() {
  return (
    <section className="section relative overflow-hidden bg-sand" aria-labelledby="recognition-title">
      <div className="blob left-[-15%] top-[20%] h-[480px] w-[480px] bg-rose/80" aria-hidden="true" />
      <div className="wrap relative grid gap-12 md:grid-cols-[0.9fr_1.1fr] md:gap-20">
        <div className="md:sticky md:top-[calc(var(--header-h)+40px)] md:self-start">
          <Reveal>
            <p className="eyebrow">Впізнаєш себе?</p>
            <h2 id="recognition-title" className="display mt-4 text-[clamp(38px,5.4vw,68px)] text-teal-deep">
              Ти вже починала.
              <span className="accent block">І, можливо, не раз.</span>
            </h2>
          </Reveal>
        </div>

        <div className="space-y-8">
          <ScrollWords
            className="text-[clamp(20px,2.3vw,27px)] leading-[1.55] text-ink"
            text="Ти знаєш, що краще їсти. Знаєш, що треба більше рухатися. Можливо, навіть бачила результат."
          />
          <ScrollWords
            className="text-[clamp(20px,2.3vw,27px)] leading-[1.55] text-ink"
            text="А потім був звичайний день. Втома. Вечеря не за планом. Пропущене тренування. І поступово все поверталося назад."
          />
          <ScrollWords
            className="text-[clamp(22px,2.5vw,30px)] font-semibold leading-[1.45] text-teal-deep"
            text="Не тому, що Тобі бракує знань. І не тому, що Тобі бракує сили волі."
          />

          <Reveal delay={0.1} className="pt-6">
            <div className="relative overflow-hidden rounded-card bg-teal-deep p-8 text-white sm:p-10">
              <div className="blob -right-10 -top-10 h-48 w-48 bg-coral/50" aria-hidden="true" />
              <p className="display relative text-[clamp(26px,3vw,38px)] leading-[1.12]">
                Найважче — залишатися в процесі, коли мотивація закінчується.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

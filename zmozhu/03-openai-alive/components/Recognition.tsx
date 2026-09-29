import MotivationCard from "@/components/MotivationCard";
import { Reveal, ScrollLit } from "@/components/motion";

export default function Recognition() {
  return (
    <section className="sec relative bg-cream" aria-labelledby="rec-title">
      <div className="wrap grid gap-12 md:grid-cols-[0.9fr_1.1fr] md:gap-20">
        <div className="md:sticky md:top-[calc(var(--header-h)+60px)] md:self-start">
          <Reveal>
            <h2 id="rec-title" className="h-sec text-forest">
              Ти вже починала.
              <span className="voice mt-2 block text-moss">І, можливо, не раз.</span>
            </h2>
          </Reveal>
        </div>
        <div className="space-y-9">
          <ScrollLit className="text-[clamp(22px,2.4vw,30px)] font-medium leading-[1.45] tracking-[-0.015em] text-ink" text="Ти знаєш, що краще їсти. Знаєш, що треба більше рухатися. Можливо, навіть бачила результат." />
          <ScrollLit className="text-[clamp(22px,2.4vw,30px)] font-medium leading-[1.45] tracking-[-0.015em] text-ink" text="А потім був звичайний день. Втома. Вечеря не за планом. Пропущене тренування. І поступово все поверталося назад." />
          <Reveal>
            <p className="text-[clamp(20px,2vw,24px)] leading-[1.5] text-ink-soft">
              Не тому, що Тобі бракує знань.
              <span className="block">І не тому, що Тобі бракує сили волі.</span>
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <MotivationCard />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

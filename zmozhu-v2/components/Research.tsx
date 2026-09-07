import ResearchBars from "@/components/ResearchBars";
import Reveal from "@/components/Reveal";

export default function Research() {
  return (
    <section className="section bg-paper" aria-labelledby="research-title">
      <div className="wrap grid gap-12 md:grid-cols-[0.9fr_1.1fr] md:gap-16">
        <div>
          <Reveal>
            <p className="eyebrow">Дослідження</p>
            <h2 id="research-title" className="display mt-4 text-[clamp(36px,5vw,64px)] text-teal-deep">
              Фінансова мотивація працює
            </h2>
            <p className="mt-4 text-[17px] leading-relaxed text-ink">
              У рандомізованому дослідженні JAMA ціль досягли:
            </p>
          </Reveal>

          <Reveal delay={0.1} className="mt-8">
            <p className="display text-[clamp(26px,3vw,40px)] leading-[1.12] text-teal-deep">
              У <span className="accent">4,5 раза</span> вищий результат під час програми.
            </p>
            <p className="mt-5 max-w-[460px] text-[17px] leading-relaxed text-ink">
              Саме тому в ZMOZHU є мотиваційний внесок, щоденні зважування та
              регулярні чекіни.
            </p>
          </Reveal>
        </div>

        <div>
          <ResearchBars />
          <Reveal delay={0.15} className="mt-6 border-t border-line pt-5">
            <p className="text-[13px] leading-relaxed text-ink-soft">
              Джерела:{" "}
              <span className="font-semibold text-teal-deep">дослідження JAMA</span>
              <span className="px-1.5">·</span>
              <span className="font-semibold text-teal-deep">PubMed</span>
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
              Дані стосуються окремого клінічного дослідження. ZMOZHU не
              гарантує аналогічний результат.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

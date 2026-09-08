import Faq from "@/components/Faq";
import Reveal from "@/components/Reveal";

export default function FaqSection() {
  return (
    <section id="faq" className="section bg-paper" aria-labelledby="faq-title">
      <div className="wrap grid gap-10 md:grid-cols-[0.75fr_1.25fr] md:gap-16">
        <Reveal className="md:sticky md:top-[calc(var(--header-h)+40px)] md:self-start">
          <p className="eyebrow">Питання</p>
          <h2 id="faq-title" className="display mt-4 text-[clamp(36px,5vw,60px)] text-teal-deep">
            Питання, які зазвичай виникають
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <Faq />
        </Reveal>
      </div>
    </section>
  );
}

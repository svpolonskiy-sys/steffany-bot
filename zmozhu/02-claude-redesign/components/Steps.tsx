import Reveal, { Item, Stagger } from "@/components/Reveal";

// Три кроки — вся механіка одним поглядом одразу після першого екрана.
// Розгорнуті умови та правила безпеки — нижче, у розділі «Як це працює».
const steps = [
  {
    n: "01",
    title: "Вносиш 2000 грн на старті",
    text: "Це не плата за участь. Це Твій внесок у результат.",
  },
  {
    n: "02",
    title: "30 днів виконуєш три умови",
    text: "−4% ваги · ранкові й вечірні чекіни · зважування",
  },
  {
    n: "03",
    title: "Отримуєш усю суму назад",
    text: "Гроші повертаються на ту саму картку, з якої була оплата.",
  },
];

export default function Steps() {
  return (
    <section className="section bg-paper !pt-16 md:!pt-24" aria-labelledby="steps-title">
      <div className="wrap">
        <Reveal className="max-w-[760px]">
          <p className="eyebrow">Як це працює</p>
          <h2 id="steps-title" className="display mt-4 text-[clamp(30px,4.4vw,52px)] text-teal-deep">
            Ти вносиш 2000 грн на старті. Виконуєш умови 30 днів —{" "}
            <span className="accent">отримуєш усю суму назад.</span>
          </h2>
        </Reveal>

        <Stagger className="mt-12 grid gap-4 md:grid-cols-3" gap={0.12}>
          {steps.map((s, i) => (
            <Item
              key={s.n}
              as="article"
              className="group relative overflow-hidden rounded-card border border-line bg-white p-7 transition-all duration-500 hover:-translate-y-1 hover:border-teal-soft hover:shadow-soft"
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-[44px] font-semibold leading-none text-coral/60 transition-colors duration-500 group-hover:text-coral">
                  {s.n}
                </span>
                {i < steps.length - 1 && (
                  <svg className="hidden text-line md:block" width="28" height="12" viewBox="0 0 28 12" fill="none" aria-hidden="true">
                    <path d="M0 6h26m0 0l-5-5m5 5l-5 5" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                )}
              </div>
              <h3 className="mt-5 text-[19px] font-bold leading-snug text-teal-deep">{s.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{s.text}</p>
              <span className="absolute inset-x-0 bottom-0 h-[3px] origin-left scale-x-0 bg-gradient-to-r from-teal to-coral transition-transform duration-500 group-hover:scale-x-100" />
            </Item>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

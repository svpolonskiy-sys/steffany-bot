import Reveal, { Item, Stagger } from "@/components/Reveal";

const rows = [
  { first: "Дієта дає правила.", second: "ZMOZHU допомагає залишатися в процесі." },
  { first: "Експерт дає знання.", second: "ZMOZHU перетворює їх на щоденні дії." },
  { first: "Подруга підтримує.", second: "ZMOZHU додає до підтримки систему і ритм." },
];

export default function Difference() {
  return (
    <section className="section bg-sand" aria-labelledby="difference-title">
      <div className="wrap grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:gap-20">
        <Reveal className="md:sticky md:top-[calc(var(--header-h)+40px)] md:self-start">
          <p className="eyebrow">Відмінність</p>
          <h2 id="difference-title" className="display mt-4 text-[clamp(36px,5vw,60px)] text-teal-deep">
            Чому цього разу може бути інакше
          </h2>
        </Reveal>

        <div>
          <Stagger className="divide-y divide-line" gap={0.12}>
            {rows.map((row) => (
              <Item key={row.first} className="group grid gap-2 py-7 sm:grid-cols-[0.8fr_1.2fr] sm:gap-8">
                <p className="text-[17px] leading-snug text-ink-soft line-through decoration-line decoration-2 transition-colors duration-500 group-hover:text-ink">
                  {row.first}
                </p>
                <p className="display text-[clamp(22px,2.4vw,30px)] leading-[1.15] text-teal-deep">
                  {row.second}
                </p>
              </Item>
            ))}
          </Stagger>

          <Reveal delay={0.1} className="mt-8">
            <div className="grain relative overflow-hidden rounded-card bg-teal-deep p-7 text-white sm:p-9">
              <div className="blob -right-10 -bottom-12 h-56 w-56 bg-coral/50" aria-hidden="true" />
              <p className="relative text-[16px] text-white/70">Не ще одна спроба почати.</p>
              <p className="display relative mt-2 text-[clamp(26px,3vw,40px)] leading-[1.12]">
                Система, яка допомагає <span className="text-apricot">продовжувати</span>.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

import Reveal from "@/components/Reveal";

export default function Afterwards() {
  return (
    <section className="section bg-sand" aria-labelledby="after-title">
      <div className="wrap">
        <div className="mx-auto max-w-[900px]">
          <Reveal className="text-center">
            <p className="eyebrow justify-center">Після програми</p>
            <h2 id="after-title" className="display mt-4 text-[clamp(36px,5vw,60px)] text-teal-deep">
              Що буде після 30-го дня?
            </h2>
            <p className="display mx-auto mt-5 max-w-[560px] text-[clamp(22px,2.6vw,30px)] font-medium leading-[1.2] text-ink">
              На 30-му дні ZMOZHU <span className="accent">не закінчується.</span>
            </p>
          </Reveal>

          <Reveal delay={0.05} className="mt-12 grid gap-5 sm:grid-cols-2">
            <div className="rounded-card border border-line bg-white p-7">
              <span className="block h-[3px] w-10 rounded-pill bg-coral" aria-hidden="true" />
              <p className="mt-5 text-[16px] leading-relaxed text-ink">
                Якщо Ти досягла своєї цілі й виконала умови програми, ми
                запропонуємо наступний етап — утримання результату.
              </p>
            </div>
            <div className="rounded-card border border-line bg-white p-7">
              <span className="block h-[3px] w-10 rounded-pill bg-teal" aria-hidden="true" />
              <p className="mt-5 text-[16px] leading-relaxed text-ink">
                Якщо захочеш рухатись далі — допоможемо визначити нову ціль і
                продовжити шлях.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1} className="mt-5">
            <div className="rounded-card bg-mist p-7 text-center sm:p-9">
              <h3 className="display text-[clamp(24px,2.8vw,34px)] leading-[1.15] text-teal-deep">
                Ми не залишаємо Тебе після фінішу.
              </h3>
              <p className="mx-auto mt-4 max-w-[560px] text-[16px] leading-relaxed text-ink">
                Наша задача — бути поруч доти, доки нові звички й система не
                стануть для Тебе природною частиною життя.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

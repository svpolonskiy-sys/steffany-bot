import { demoIntro } from "@/content/site.uk";
import { Reveal } from "../ui/Reveal";
import { DecisionDemo } from "./DecisionDemo";

export function Demo() {
  return (
    <section id="demo" className="section" tabIndex={-1} aria-labelledby="demo-title" style={{ paddingTop: 0 }}>
      <div className="container">
        <Reveal className="section-head">
          <h2 id="demo-title" className="h2">Від сигналу — до <span className="serif" style={{ color: "var(--teal-dark)" }}>погодженої дії.</span></h2>
          <p className="lead">{demoIntro.intro}</p>
        </Reveal>
        <DecisionDemo />
        <noscript>
          <ol className="demo-noscript" style={{ marginTop: 24 }}>
            <li><b>Бачить.</b> Частину замовлень неможливо виконати за поточними залишками. Джерела: «Замовлення», «Облік запасів».</li>
            <li><b>Пояснює.</b> Можлива причина: товару недостатньо на одному складі, хоча він є на іншому.</li>
            <li><b>Радить.</b> Перевірити можливість перерозподілу запасів; завдання очікує погодження.</li>
            <li><b>Робить.</b> У демо створено завдання для відповідального. {demoIntro.disclaimer}</li>
          </ol>
        </noscript>
      </div>
    </section>
  );
}

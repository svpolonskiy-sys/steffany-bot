import { pilot, cta } from "@/content/site.uk";
import { Reveal } from "../ui/Reveal";
import { PrimaryCta } from "../ui/TrackedLink";

export function PilotSteps() {
  return (
    <section id="pilot" className="section" tabIndex={-1} aria-labelledby="pilot-title">
      <div className="container">
        <Reveal className="section-head">
          <h2 id="pilot-title" className="h2">{pilot.title}</h2>
          <p className="lead">{pilot.intro}</p>
        </Reveal>
        <ol className="steps">
          {pilot.steps.map((s, i) => (
            <li key={s.t} className="step">
              <span className="num" aria-hidden="true">{i + 1}</span>
              <h3 className="h3">{s.t}</h3>
              <p>{s.d}</p>
            </li>
          ))}
        </ol>
        <p className="small" style={{ margin: "32px 0", maxWidth: "70ch" }}>{pilot.note}</p>
        <PrimaryCta placement="pilot">{cta.primary}</PrimaryCta>
      </div>
    </section>
  );
}

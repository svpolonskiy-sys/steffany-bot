import { scenarios } from "@/content/site.uk";
import { Reveal } from "../ui/Reveal";
import { ScenarioTabs } from "./ScenarioTabs";

export function Scenarios() {
  return (
    <section id="scenarios" className="section" tabIndex={-1} aria-labelledby="scenarios-title">
      <div className="container">
        <Reveal className="section-head"><h2 id="scenarios-title" className="h2">{scenarios.title}</h2></Reveal>
        <ScenarioTabs />
        <noscript>
          {scenarios.items.map((s) => (
            <div key={s.id} className="example" style={{ marginTop: 16 }}>
              <h3 className="h3">{s.tab}: {s.question}</h3>
              {s.rows.map((r) => <div key={r.k} className="ex-row"><b>{r.k}</b><span>{r.v}</span></div>)}
              <p className="value">{s.value}</p>
            </div>
          ))}
        </noscript>
      </div>
    </section>
  );
}

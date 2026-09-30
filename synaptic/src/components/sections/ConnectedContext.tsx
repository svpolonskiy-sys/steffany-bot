import { context } from "@/content/site.uk";
import { Reveal } from "../ui/Reveal";
import { Arrow } from "../ui/icons";

export function ConnectedContext() {
  return (
    <section id="context" className="section" tabIndex={-1} aria-labelledby="context-title" style={{ paddingTop: 0 }}>
      <div className="container">
        <Reveal className="section-head">
          <h2 id="context-title" className="h2">{context.title}</h2>
          <p className="lead">{context.intro}</p>
        </Reveal>
        <ol className="flow">
          {context.columns.flatMap((c, i) => {
            const col = (
              <li key={c.h} className={`flow-col${i === 1 ? " core" : ""}`}>
                <span className="step-n">Крок {i + 1}</span>
                <h3 className="h3">{c.h}</h3>
                <ul>{c.items.map((x) => <li key={x}>{x}</li>)}</ul>
              </li>
            );
            return i < 2
              ? [col, <li key={`a${i}`} className="flow-arrow" aria-hidden="true"><Arrow /></li>]
              : [col];
          })}
        </ol>
        <p className="small note">{context.note}</p>
      </div>
    </section>
  );
}

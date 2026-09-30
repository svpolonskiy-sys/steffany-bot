import { challenges } from "@/content/site.uk";
import { Reveal } from "../ui/Reveal";

export function Challenges() {
  return (
    <section id="challenges" className="section" tabIndex={-1} aria-labelledby="challenges-title">
      <div className="container">
        <Reveal className="section-head">
          <h2 id="challenges-title" className="h2">{challenges.title}</h2>
          <p className="lead">{challenges.intro}</p>
        </Reveal>
        <ol className="problems">
          {challenges.items.map((it, i) => (
            <li key={it.t} className="problem">
              <span className="num" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="h3">{it.t}</h3>
              <p>{it.d}</p>
            </li>
          ))}
        </ol>
        <p className="outro">{challenges.outro}</p>
      </div>
    </section>
  );
}

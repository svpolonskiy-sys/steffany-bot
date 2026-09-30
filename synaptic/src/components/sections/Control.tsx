import { control } from "@/content/site.uk";
import { Reveal } from "../ui/Reveal";
import { TopicLink } from "../ui/TrackedLink";

export function Control() {
  return (
    <section id="control" className="section dark" tabIndex={-1} aria-labelledby="control-title">
      <div className="container">
        <div className="control-grid">
          <div>
            <Reveal className="section-head" >
              <h2 id="control-title" className="h2">Контроль залишається <span className="serif" style={{ color: "var(--mint)" }}>у вас.</span></h2>
              <p className="lead on-dark">{control.intro}</p>
            </Reveal>
            <ul className="pillars">
              {control.pillars.map((p) => (
                <li key={p.t} className="pillar"><b>{p.t}</b><span>{p.d}</span></li>
              ))}
            </ul>
            <div className="control-lines">
              <p>{control.line}</p>
              <p className="small">{control.line2}</p>
              <p style={{ marginTop: 16 }}><TopicLink topic="security">{control.link}</TopicLink></p>
            </div>
          </div>
          <div className="log" role="group" aria-label={control.log.title}>
            <h3 className="h3">{control.log.title}</h3>
            <ul>
              {control.log.rows.map((r, i) => (
                <li key={i}>
                  <time>{r.time}</time>
                  <span>{r.text}</span>
                  <span className={`badge ${r.status === "Очікує погодження" ? "warn" : "ok"}`}>{r.status}</span>
                </li>
              ))}
            </ul>
            <p className="small" style={{ marginTop: 12 }}>{control.log.caption}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

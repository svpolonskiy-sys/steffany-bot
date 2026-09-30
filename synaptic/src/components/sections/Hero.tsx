import { hero, cta } from "@/content/site.uk";
import { PrimaryCta } from "../ui/TrackedLink";
import { LinkButton } from "../ui/Button";

const ys = [12.5, 37.5, 62.5, 87.5];
const xs = ys;

export function Hero() {
  return (
    <section id="top" className="hero" tabIndex={-1} aria-labelledby="hero-title">
      <div className="container hero-grid">
        <div className="hero-copy hero-intro">
          <p className="eyebrow">{hero.eyebrow}</p>
          <h1 id="hero-title" className="h1 hero-title">
            {hero.titleA} Зрозумілий <span className="serif">наступний крок.</span>
          </h1>
          <p className="lead">{hero.lead}</p>
          <div className="hero-actions">
            <PrimaryCta placement="hero">{cta.primary}</PrimaryCta>
            <LinkButton href="#demo" variant="secondary">{cta.secondary}</LinkButton>
          </div>
          <p className="small">{hero.micro}</p>
        </div>

        <div className="hero-scene-wrap">
          <figure className="scene">
            <div className="scene-board">
              <div className="scene-grid">
                <ul className="chips" aria-label="Джерела контексту">
                  {hero.sources.map((s) => <li key={s} className="chip">{s}</li>)}
                </ul>
                <svg className="lines lines-v" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  {xs.map((x) => (
                    <path key={x} pathLength={1} d={`M${x} 0 C${x} 60 50 40 50 100`} />
                  ))}
                </svg>
                <svg className="lines lines-h" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  {ys.map((y) => (
                    <path key={y} pathLength={1} d={`M0 ${y} C60 ${y} 40 50 100 50`} />
                  ))}
                </svg>
                <div className="ctx-card">
                  <span className="tag"><span className="dot" aria-hidden="true" /> {hero.card.label}</span>
                  <p className="signal">{hero.card.signal}</p>
                  <p className="next">{hero.card.next}</p>
                </div>
              </div>
            </div>
            <figcaption className="small">{hero.caption}</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

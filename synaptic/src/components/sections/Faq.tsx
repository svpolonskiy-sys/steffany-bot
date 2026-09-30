import { faq } from "@/content/site.uk";
import { Reveal } from "../ui/Reveal";
import { Plus } from "../ui/icons";

export function Faq() {
  return (
    <section id="faq" className="section" tabIndex={-1} aria-labelledby="faq-title" style={{ paddingTop: 0 }}>
      <div className="container">
        <Reveal className="section-head"><h2 id="faq-title" className="h2">{faq.title}</h2></Reveal>
        <div className="faq">
          {faq.items.map((f) => (
            <details key={f.q}>
              <summary>{f.q}<Plus /></summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

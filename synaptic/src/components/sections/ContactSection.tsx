import { contact } from "@/content/site.uk";
import { Reveal } from "../ui/Reveal";
import { ContactForm } from "./Contact";

export function ContactSection() {
  return (
    <section id="contact" className="section contact" tabIndex={-1} aria-labelledby="contact-title">
      <div className="container contact-grid">
        <Reveal className="section-head" >
          <h2 id="contact-title" className="h2">Який процес ви хочете <span className="serif" style={{ color: "var(--teal-dark)" }}>спростити першим?</span></h2>
          <p className="lead">{contact.intro}</p>
        </Reveal>
        <ContactForm />
      </div>
    </section>
  );
}

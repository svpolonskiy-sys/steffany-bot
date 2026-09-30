import { nav, footer } from "@/content/site.uk";
import { siteConfig } from "@/lib/site-config";
import { Logo } from "../ui/icons";

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="container footer-in">
        <div style={{ display: "grid", gap: 8 }}>
          <span className="brand"><Logo /> Synaptic</span>
          <p className="small">{footer.tagline}</p>
        </div>
        <nav aria-label="Навігація у футері">
          <ul>
            {nav.map((n) => <li key={n.href}><a href={n.href}>{n.label}</a></li>)}
            {siteConfig.privacyUrl && <li><a href={siteConfig.privacyUrl}>Політика конфіденційності</a></li>}
            {siteConfig.contactEmail && <li><a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a></li>}
          </ul>
        </nav>
      </div>
    </footer>
  );
}

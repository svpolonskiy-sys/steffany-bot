import { siteConfig } from "@/lib/site-config";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Hero } from "@/components/sections/Hero";
import { Challenges } from "@/components/sections/Challenges";
import { ConnectedContext } from "@/components/sections/ConnectedContext";
import { Demo } from "@/components/sections/Demo";
import { Scenarios } from "@/components/sections/Scenarios";
import { Control } from "@/components/sections/Control";
import { PilotSteps } from "@/components/sections/PilotSteps";
import { Faq } from "@/components/sections/Faq";
import { ContactSection } from "@/components/sections/ContactSection";

export default function Home() {
  const jsonLd = siteConfig.url
    ? [
        { "@context": "https://schema.org", "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
        { "@context": "https://schema.org", "@type": "WebSite", name: siteConfig.name, url: siteConfig.url, inLanguage: "uk" },
      ]
    : null;
  return (
    <>
      <a href="#main" className="skip-link">Перейти до основного змісту</a>
      <SiteHeader />
      <main id="main">
        <Hero />
        <Challenges />
        <ConnectedContext />
        <Demo />
        <Scenarios />
        <Control />
        <PilotSteps />
        <Faq />
        <ContactSection />
      </main>
      <SiteFooter />
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
    </>
  );
}

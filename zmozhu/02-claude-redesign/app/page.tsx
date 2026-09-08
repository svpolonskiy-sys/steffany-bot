import Afterwards from "@/components/Afterwards";
import Approach from "@/components/Approach";
import Buddy from "@/components/Buddy";
import Closing from "@/components/Closing";
import Day from "@/components/Day";
import Difference from "@/components/Difference";
import FaqSection from "@/components/FaqSection";
import FloatingCta from "@/components/FloatingCta";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import Investment from "@/components/Investment";
import Marquee from "@/components/Marquee";
import Pillars from "@/components/Pillars";
import Recognition from "@/components/Recognition";
import Research from "@/components/Research";
import Steps from "@/components/Steps";
import { faqItems } from "@/lib/faq";

// Порядок секцій = логіка довіри:
// 1. Пропозиція + реальна людина + механіка внеску (hero)
// 2. Три кроки — вся механіка одним поглядом
// 3. Впізнавання ситуації (емпатія)
// 4. Наскільки це просто: твій день
// 5. Хто поруч: Міра, Анастасія, жива людина
// 6. Тетяна — баді
// 7. Підхід і чому −4%
// 8. Внесок, три умови, безпека (повні правила)
// 9. Дослідження
// 10. Чому цього разу інакше
// 11. Питання
// 12. Після програми
// 13. Фінальний заклик
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "FAQPage",
      mainEntity: faqItems.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.plain },
      })),
    },
    {
      "@type": "Product",
      name: "ZMOZHU — 30 днів щоденної підтримки",
      description:
        "Щоденна підтримка в Telegram, зрозумілий ритм і ціль −4% ваги за 30 днів. Виконала умови — отримуєш 2000 грн назад.",
      brand: { "@type": "Brand", name: "ZMOZHU" },
      offers: {
        "@type": "Offer",
        price: "2000",
        priceCurrency: "UAH",
        availability: "https://schema.org/InStock",
        url: "https://zmozhu.com/",
      },
    },
  ],
};

export default function Home() {
  return (
    <main className="landing">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Hero />
      <Marquee />
      <Steps />
      <Recognition />
      <Day />
      <Pillars />
      <Buddy />
      <Approach />
      <Investment />
      <Research />
      <Difference />
      <FaqSection />
      <Afterwards />
      <Closing />
      <Footer />
      <FloatingCta />
    </main>
  );
}

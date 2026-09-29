import Approach from "@/components/Approach";
import Buddy from "@/components/Buddy";
import Day from "@/components/Day";
import DepositFlow from "@/components/DepositFlow";
import Difference from "@/components/Difference";
import FloatingCta from "@/components/FloatingCta";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import How from "@/components/How";
import Recognition from "@/components/Recognition";
import Research from "@/components/Research";
import { Afterwards, Closing, FaqSection } from "@/components/Tail";
import Team from "@/components/Team";

// Порядок блоків збігається з оригіналом OpenAI; єдина зміна структури —
// картка внеску винесена з першого екрана одразу під нього.
export default function Home() {
  return (
    <main className="landing">
      <Hero />
      <DepositFlow />
      <Recognition />
      <Day />
      <Team />
      <Buddy />
      <Approach />
      <How />
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

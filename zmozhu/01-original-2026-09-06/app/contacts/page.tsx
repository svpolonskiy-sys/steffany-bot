import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";
import { LEGAL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Контакти — ZMOZHU",
  description: "Контактна інформація та реквізити ФОП для програми ZMOZHU.",
  robots: { index: true, follow: true },
};

export default function ContactsPage() {
  return (
    <LegalShell title="Контакти">
      <p>
        З будь-яких питань щодо участі у програмі, оплати чи повернення коштів
        звертайтеся за наведеними нижче контактами. Ми відповідаємо у розумний
        строк у робочі дні.
      </p>

      <h2>Реквізити</h2>
      <p>
        {LEGAL.entity}
        <br />
        ІПН: {LEGAL.ipn}
        <br />
        Розрахунковий рахунок: {LEGAL.iban} ({LEGAL.bank})
      </p>

      <h2>Адреса</h2>
      <p>{LEGAL.address}</p>

      <h2>Зв'язок</h2>
      <p>
        Телефон:{" "}
        <a href={`tel:${LEGAL.phoneHref}`}>{LEGAL.phone}</a>
        <br />
        Email: <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>
      </p>
    </LegalShell>
  );
}

import Link from "next/link";
import { LEGAL } from "@/lib/config";

const legalLinks = [
  { href: "/oferta", label: "Оферта" },
  { href: "/refund", label: "Повернення коштів" },
  { href: "/terms", label: "Правила та умови" },
  { href: "/privacy", label: "Конфіденційність" },
  { href: "/contacts", label: "Контакти" },
];

function VisaLogo() {
  return (
    <svg width="52" height="32" viewBox="0 0 52 32" role="img" aria-label="Visa">
      <rect x="0.5" y="0.5" width="51" height="31" rx="6" fill="#fff" stroke="#E4DDD1" />
      <text
        x="26"
        y="21"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="13"
        fontStyle="italic"
        fontWeight="700"
        fill="#1A1F71"
      >
        VISA
      </text>
    </svg>
  );
}

function MastercardLogo() {
  return (
    <svg width="52" height="32" viewBox="0 0 52 32" role="img" aria-label="Mastercard">
      <rect x="0.5" y="0.5" width="51" height="31" rx="6" fill="#fff" stroke="#E4DDD1" />
      <circle cx="21" cy="16" r="8" fill="#EB001B" />
      <circle cx="31" cy="16" r="8" fill="#F79E1B" fillOpacity="0.9" />
    </svg>
  );
}

function WayForPay() {
  return (
    <span className="inline-flex h-8 items-center rounded-md border border-line bg-white px-2.5 text-[11px] font-bold tracking-wide text-teal-deep">
      WayForPay
    </span>
  );
}

export default function Footer() {
  return (
    <footer className="border-t border-line bg-sand">
      <div className="wrap pt-14 pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-14">
        <div className="grid gap-10 md:grid-cols-[1.2fr_1fr]">
          <div className="space-y-1 text-[14px] text-ink-soft">
            <p className="font-sans text-[20px] font-extrabold tracking-[-0.06em] text-teal-deep">ZMOZHU</p>
            <p className="pt-3">{LEGAL.entity}</p>
            <p>ІПН: {LEGAL.ipn}</p>
            <p>Адреса: {LEGAL.address}</p>
            <p>
              Телефон:{" "}
              <a href={`tel:${LEGAL.phoneHref}`} className="text-ink hover:text-coral-text">
                {LEGAL.phone}
              </a>
            </p>
            <p>
              Email:{" "}
              <a href={`mailto:${LEGAL.email}`} className="text-ink hover:text-coral-text">
                {LEGAL.email}
              </a>
            </p>
          </div>

          <div className="md:text-right">
            <nav
              aria-label="Юридична інформація"
              className="flex flex-wrap gap-x-5 gap-y-2 text-[14px] md:justify-end"
            >
              {legalLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-ink-soft underline-offset-4 transition-colors hover:text-coral-text hover:underline"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="mt-6 flex items-center gap-3 md:justify-end">
              <VisaLogo />
              <MastercardLogo />
              <WayForPay />
            </div>
          </div>
        </div>

        {/* Команда. Зовнішні посилання свідомо тут, а не в картках «Три опори»:
            там зона конверсії, і клік назовні відводить людину зі сторінки. */}
        <div className="mt-10 border-t border-line pt-6">
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-soft">
            Команда програми
          </p>
          <div className="mt-3 flex flex-col gap-2 text-[14px] text-ink-soft sm:flex-row sm:flex-wrap sm:gap-x-8">
            <p>
              Тетяна —{" "}
              <a
                href="https://www.instagram.com/_tanya_novak_/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-teal-deep underline underline-offset-4 transition-opacity hover:opacity-70"
              >
                Instagram
              </a>
            </p>
            <p>
              Анастасія —{" "}
              <a
                href="https://vit-ana.net"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-teal-deep underline underline-offset-4 transition-opacity hover:opacity-70"
              >
                сайт
              </a>
              <span className="px-1.5 text-ink-soft">·</span>
              <a
                href="https://www.instagram.com/vit_anastasiya_"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-teal-deep underline underline-offset-4 transition-opacity hover:opacity-70"
              >
                Instagram
              </a>
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-2 border-t border-line pt-6 text-[12px] text-ink-soft">
          <p>
            Оплата здійснюється через захищений сервіс WayForPay. Ми не зберігаємо
            дані Твоєї картки.
          </p>
          <p>© 2026 ZMOZHU</p>
        </div>
      </div>
    </footer>
  );
}

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
    <svg width="46" height="28" viewBox="0 0 46 28" role="img" aria-label="Visa">
      <rect width="46" height="28" rx="4" fill="#fff" stroke="#EADFD4" />
      <text
        x="23"
        y="19"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="12"
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
    <svg
      width="46"
      height="28"
      viewBox="0 0 46 28"
      role="img"
      aria-label="Mastercard"
    >
      <rect width="46" height="28" rx="4" fill="#fff" stroke="#EADFD4" />
      <circle cx="19" cy="14" r="7" fill="#EB001B" />
      <circle cx="27" cy="14" r="7" fill="#F79E1B" fillOpacity="0.9" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="border-t border-line bg-cream-deep">
      <div className="mx-auto max-w-content px-5 pt-14 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-14">
        <div className="grid gap-10 md:grid-cols-2">
          {/* Реквізити ФОП */}
          <div className="space-y-1 text-sm text-ink-soft">
            <p className="text-base font-semibold text-deep">ZMOZHU</p>
            <p className="pt-2">{LEGAL.entity}</p>
            <p>ІПН: {LEGAL.ipn}</p>
            <p>Адреса: {LEGAL.address}</p>
            <p>
              Телефон:{" "}
              <a href={`tel:${LEGAL.phoneHref}`} className="hover:text-terracotta-deep">
                {LEGAL.phone}
              </a>
            </p>
            <p>
              Email:{" "}
              <a
                href={`mailto:${LEGAL.email}`}
                className="hover:text-terracotta-deep"
              >
                {LEGAL.email}
              </a>
            </p>
          </div>

          {/* Навігація по юридичних сторінках */}
          <div className="md:text-right">
            <nav
              aria-label="Юридична інформація"
              className="flex flex-wrap gap-x-4 gap-y-2 text-sm md:justify-end"
            >
              {legalLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-ink-soft hover:text-terracotta-deep"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="mt-6 flex items-center gap-3 md:justify-end">
              <VisaLogo />
              <MastercardLogo />
            </div>
          </div>
        </div>

        {/* Команда. Посилання назовні свідомо винесені сюди, а не в картки
            секції «Три опори»: там зона конверсії, і клік по зовнішньому
            посиланню відводить людину зі сторінки перед самою дією. */}
        <div className="mt-10 border-t border-line pt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
            Команда програми
          </p>
          <div className="mt-3 flex flex-col gap-2 text-sm text-ink-soft sm:flex-row sm:flex-wrap sm:gap-x-8">
            <p>
              Тетяна —{" "}
              <a
                href="https://www.instagram.com/_tanya_novak_/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-deep underline underline-offset-4 transition-opacity hover:opacity-70"
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
                className="font-medium text-deep underline underline-offset-4 transition-opacity hover:opacity-70"
              >
                сайт
              </a>
              <span className="px-1.5 text-ink-soft">·</span>
              <a
                href="https://www.instagram.com/vit_anastasiya_"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-deep underline underline-offset-4 transition-opacity hover:opacity-70"
              >
                Instagram
              </a>
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-2 border-t border-line pt-6 text-xs text-ink-soft">
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

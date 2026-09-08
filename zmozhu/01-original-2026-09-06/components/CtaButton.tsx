import Link from "next/link";
import { TELEGRAM_BOT_URL } from "@/lib/config";

type CtaButtonProps = {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  href?: string;
  className?: string;
};

const base =
  "cta-link inline-flex items-center justify-center rounded-pill px-8 py-4 text-base font-medium transition-colors duration-200 select-none";

const styles = {
  primary:
    "bg-terracotta-deep text-white hover:bg-terracotta-deep-h shadow-soft",
  secondary:
    "bg-transparent text-ink border border-line hover:bg-cream-deep",
};

// Основна CTA веде на Telegram-бот (зовнішнє посилання).
// Вторинну можна спрямувати на якір (href="#...").
export default function CtaButton({
  children,
  variant = "primary",
  href,
  className = "",
}: CtaButtonProps) {
  const isAnchor = href?.startsWith("#");
  const target = href ?? TELEGRAM_BOT_URL;

  if (isAnchor) {
    return (
      <Link href={target} className={`${base} ${styles[variant]} ${className}`}>
        {children}
      </Link>
    );
  }

  return (
    <a
      href={target}
      target="_blank"
      rel="noopener noreferrer"
      className={`${base} ${styles[variant]} ${className}`}
    >
      <span>{children}</span><span className="cta-arrow" aria-hidden="true">↗</span>
    </a>
  );
}

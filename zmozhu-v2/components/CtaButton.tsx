import Link from "next/link";
import { TELEGRAM_BOT_URL } from "@/lib/config";

type CtaButtonProps = {
  children: React.ReactNode;
  variant?: "primary" | "light" | "ghost" | "ghost-light";
  href?: string;
  className?: string;
  size?: "md" | "lg";
};

const base =
  "group inline-flex items-center justify-center gap-3 whitespace-nowrap rounded-pill font-semibold select-none transition-[transform,box-shadow,background-color] duration-300 ease-out active:scale-[0.98]";

const sizes = {
  md: "px-7 py-3.5 text-[15px]",
  lg: "px-8 py-[18px] text-[17px]",
};

const styles = {
  // Основна: глибокий теал на світлому тлі (контраст ~10:1)
  primary:
    "btn-shine bg-teal text-white shadow-soft hover:-translate-y-0.5 hover:shadow-lift hover:bg-teal-deep",
  // На темному тлі: теплий абрикос
  light:
    "btn-shine bg-apricot text-teal-deep shadow-lift hover:-translate-y-0.5 hover:bg-[#FBD3B8]",
  ghost:
    "border border-line bg-white/60 text-ink hover:bg-white hover:border-teal-soft",
  "ghost-light":
    "border border-white/25 text-white hover:bg-white/10",
};

function Arrow() {
  return (
    <span
      aria-hidden="true"
      className="relative flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-white/15 group-hover:bg-white/25"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
      >
        <path d="M7 17L17 7M9 7h8v8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

// Усі основні CTA ведуть на Telegram-бот. href="#..." дає якірну кнопку.
export default function CtaButton({
  children,
  variant = "primary",
  href,
  className = "",
  size = "lg",
}: CtaButtonProps) {
  const isAnchor = href?.startsWith("#");
  const target = href ?? TELEGRAM_BOT_URL;
  const cls = `${base} ${sizes[size]} ${styles[variant]} ${className}`;

  if (isAnchor) {
    return (
      <Link href={target} className={cls}>
        <span>{children}</span>
        <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-y-0.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14m0 0l-6-6m6 6l6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </Link>
    );
  }

  return (
    <a href={target} target="_blank" rel="noopener noreferrer" className={cls}>
      <span>{children}</span>
      <Arrow />
    </a>
  );
}

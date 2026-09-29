import Link from "next/link";
import { TELEGRAM_BOT_URL } from "@/lib/config";
import { Magnetic } from "@/components/motion";

type Props = {
  children: React.ReactNode;
  variant?: "primary" | "lime" | "ghost";
  href?: string;
  className?: string;
};

const styles = {
  primary: "bg-forest text-white hover:shadow-lift",
  lime: "bg-lime text-forest hover:shadow-deep",
  ghost: "border border-line bg-white/60 text-ink hover:bg-white",
};

// Основні CTA ведуть на Telegram-бот; href="#..." — якір.
export default function CtaButton({ children, variant = "primary", href, className = "" }: Props) {
  const isAnchor = href?.startsWith("#");
  const cls = `group inline-flex min-h-[58px] items-center justify-between gap-6 rounded-pill py-2 pl-7 pr-2 text-[17px] font-semibold transition-shadow duration-300 ${styles[variant]} ${className}`;
  const arrowBg = variant === "lime" ? "bg-forest text-lime" : variant === "ghost" ? "bg-sage text-forest" : "bg-lime text-forest";

  const inner = (
    <>
      <span>{children}</span>
      <span className={`relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full ${arrowBg}`} aria-hidden="true">
        {isAnchor ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="transition-transform duration-300 group-hover:translate-y-0.5"><path d="M12 5v14m0 0l-6-6m6 6l6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="transition-transform duration-300 group-hover:translate-x-8 group-hover:-translate-y-8"><path d="M7 17L17 7M9 7h8v8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="absolute -translate-x-8 translate-y-8 transition-transform duration-300 group-hover:translate-x-0 group-hover:translate-y-0"><path d="M7 17L17 7M9 7h8v8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </>
        )}
      </span>
    </>
  );

  return (
    <Magnetic className={className.includes("w-full") ? "w-full sm:w-auto" : ""}>
      {isAnchor ? (
        <Link href={href!} className={cls}>{inner}</Link>
      ) : (
        <a href={href ?? TELEGRAM_BOT_URL} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>
      )}
    </Magnetic>
  );
}

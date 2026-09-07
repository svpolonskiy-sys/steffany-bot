import Link from "next/link";
import Footer from "@/components/Footer";

export default function LegalShell({
  title,
  updated = "12 серпня 2026 року",
  children,
}: {
  title: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="bg-paper pt-[var(--header-h)]">
      <div className="mx-auto max-w-3xl px-5 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[14px] text-ink-soft transition-colors hover:text-coral-text"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          На головну
        </Link>

        <h1 className="display mt-6 text-[clamp(34px,5vw,52px)] text-teal-deep">{title}</h1>
        <p className="mt-2 text-[14px] text-ink-soft">Редакція від {updated}</p>

        <div className="legal mt-10">{children}</div>
      </div>
      <Footer />
    </main>
  );
}

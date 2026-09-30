import type { Metadata, Viewport } from "next";
import { Manrope, Noto_Serif } from "next/font/google";
import { siteConfig } from "@/lib/site-config";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin", "cyrillic"], variable: "--font-manrope", display: "swap" });
const serif = Noto_Serif({ subsets: ["cyrillic"], style: ["italic"], weight: ["500"], variable: "--font-noto-serif", display: "swap", preload: false });

export const viewport: Viewport = { themeColor: "#f5f2ea", width: "device-width", initialScale: 1 };

export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
  ...(siteConfig.url ? { metadataBase: new URL(siteConfig.url), alternates: { canonical: "/" } } : {}),
  robots: siteConfig.url ? { index: true, follow: true } : { index: false, follow: false },
  openGraph: {
    type: "website", locale: "uk_UA", siteName: siteConfig.name, title: siteConfig.title, description: siteConfig.description,
    ...(siteConfig.url ? { url: "/", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Synaptic — від даних до зрозумілої дії" }] } : {}),
  },
  twitter: { card: "summary_large_image", title: siteConfig.title, description: siteConfig.description },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" className={`${manrope.variable} ${serif.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

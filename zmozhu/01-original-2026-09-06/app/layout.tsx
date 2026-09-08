import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin", "cyrillic"],
  variable: "--font-lora",
  display: "swap",
});

const siteUrl = "https://zmozhu.com";
const ogImage = "/images/og-zmozhu.jpg";
const ogTitle = "Ти знаєш, як схуднути. Складніше — не зупинитися.";
const ogDescription =
  "30 днів у Telegram. Щоденна підтримка, проста система і чітка ціль. Без жорстких дієт і марафонів.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "ZMOZHU — 30 днів, щоб не зупинитися і втримати результат.",
  description:
    "Щоденна підтримка в Telegram, зрозумілий ритм і ціль −4% ваги за 30 днів. Виконала умови — отримуєш 2000 грн назад.",
  keywords: [
    "підтримка щодня",
    "система звичок",
    "Telegram",
    "зниження ваги",
    "для жінок",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: ogTitle,
    description: ogDescription,
    url: "/",
    siteName: "ZMOZHU",
    locale: "uk_UA",
    type: "website",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "ZMOZHU — Ти знаєш, як схуднути. Складніше — не зупинитися.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: ogTitle,
    description: ogDescription,
    images: [ogImage],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uk" className={`${inter.variable} ${lora.variable}`}>
      <body className="font-sans">
        <Header />
        {children}
      </body>
    </html>
  );
}

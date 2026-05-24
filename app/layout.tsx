import type { Metadata } from "next";
import {
  Inter,
  Geist_Mono,
  Montserrat,
  Oswald,
  Bebas_Neue,
  Space_Grotesk,
} from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

// UI font — Inter covers all UI chrome
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

// ── Caption / display fonts ─────────────────────────────────────────────────
// Loaded with display:swap so they don't block render.
// Each is available as a CSS variable for caption styling.

/** Clean modern bold — great for talking-head captions */
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
  weight: ["400", "700", "900"],
});

/** Tall condensed — very legible on portrait video */
const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-oswald",
  display: "swap",
  weight: ["400", "600", "700"],
});

/** Ultra-condensed all-caps — high-impact YouTube/TikTok style */
const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  variable: "--font-bebas-neue",
  display: "swap",
  weight: "400",
});

/** Geometric grotesque — modern, great for brand content */
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Boltcut — Edit at the speed of thought",
    template: "%s | Boltcut",
  },
  description:
    "Turn any idea into a viral video in under 60 seconds. AI script, voice, B-roll, captions, and music — all automated.",
  keywords: [
    "AI video editor",
    "video creation",
    "reels maker",
    "AI voiceover",
    "auto captions",
    "video editing India",
  ],
  authors: [{ name: "Boltcut" }],
  creator: "Boltcut",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://boltcut.in",
    siteName: "Boltcut",
    title: "Boltcut — Edit at the speed of thought",
    description: "Turn any idea into a viral video in under 60 seconds.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Boltcut — Edit at the speed of thought",
    description: "Turn any idea into a viral video in under 60 seconds.",
    creator: "@boltcutapp",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${geistMono.variable} ${montserrat.variable} ${oswald.variable} ${bebasNeue.variable} ${spaceGrotesk.variable} bg-base text-white antialiased`}
      >
        {/* Skip to content — visible only on keyboard focus */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[999] focus:rounded-lg focus:bg-gold-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-black focus:shadow-lg"
        >
          Skip to content
        </a>
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}

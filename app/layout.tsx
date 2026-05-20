import type { Metadata } from "next";
import { Inter, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
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
        className={`${inter.variable} ${geistSans.variable} ${geistMono.variable} bg-base text-white antialiased`}
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

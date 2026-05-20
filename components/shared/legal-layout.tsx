import Link from "next/link";
import { Logo } from "@/components/shared/logo";

interface LegalLayoutProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function LegalLayout({ title, lastUpdated, children }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-base text-white">
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <Link href="/" aria-label="Boltcut home">
            <Logo size="sm" />
          </Link>
          <Link
            href="/"
            className="text-xs text-subtle hover:text-white transition-colors"
          >
            ← Back to home
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-display text-4xl font-bold text-white mb-2">{title}</h1>
        <p className="text-subtle mb-10">Last updated: {lastUpdated}</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-subtle leading-relaxed">
          {children}
        </div>
      </main>
    </div>
  );
}

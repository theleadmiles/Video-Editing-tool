"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Logo } from "./logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
];

export function Navbar() {
  const pathname = usePathname();
  const isMarketing = pathname === "/";
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Glass pill navbar */}
          <div className="flex w-full items-center justify-between rounded-2xl border border-border bg-surface/70 px-4 py-2 backdrop-blur-xl">
            <Link href="/" aria-label="Boltcut home" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 rounded-lg">
              <Logo size="sm" />
            </Link>

            {/* Desktop nav */}
            {isMarketing && (
              <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-lg px-3 py-1.5 text-sm text-subtle transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            )}

            {/* Desktop auth buttons */}
            <div className="hidden md:flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/auth/login">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/auth/signup">Start free</Link>
              </Button>
            </div>

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-xl text-subtle hover:text-white hover:bg-elevated transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        <div
          className={cn(
            "md:hidden absolute left-6 right-6 mt-2 rounded-2xl border border-border bg-surface/95 backdrop-blur-xl shadow-xl overflow-hidden transition-all duration-200",
            mobileOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none"
          )}
        >
          <nav className="flex flex-col p-2" aria-label="Mobile navigation">
            {isMarketing && navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-4 py-3 text-sm font-medium text-subtle hover:bg-elevated hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="my-1 h-px bg-border" />
            <Link
              href="/auth/login"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-4 py-3 text-sm font-medium text-subtle hover:bg-elevated hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              onClick={() => setMobileOpen(false)}
              className="m-1 rounded-xl bg-gold-500 px-4 py-3 text-sm font-semibold text-black text-center hover:bg-gold-400 transition-colors"
            >
              Start free →
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

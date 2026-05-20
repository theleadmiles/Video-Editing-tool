"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Zap, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to monitoring if available
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="bg-base text-white">
        <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <div className="pointer-events-none absolute left-1/2 top-1/3 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ember-500/5 blur-[100px]" />

          <div className="relative">
            <div className="mb-8 flex justify-center">
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-gold-500 to-ember-500">
                  <Zap className="h-5 w-5 text-black" />
                </div>
                <span className="font-display text-lg font-bold text-white">Boltcut</span>
              </Link>
            </div>

            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ember-500/15">
                <span className="text-3xl">⚡</span>
              </div>
            </div>

            <h1 className="font-display text-2xl font-bold text-white">
              Something went wrong
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-sm text-subtle leading-relaxed">
              An unexpected error occurred. It&apos;s been logged and we&apos;ll look into it.
            </p>

            {error.digest && (
              <p className="mt-2 font-mono text-xs text-muted">
                Error ID: {error.digest}
              </p>
            )}

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button onClick={reset}>
                <RefreshCw className="h-4 w-4" />
                Try again
              </Button>
              <Button variant="outline" asChild>
                <Link href="/">
                  <Home className="h-4 w-4" />
                  Go home
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

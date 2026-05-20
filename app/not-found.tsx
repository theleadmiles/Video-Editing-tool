import Link from "next/link";
import { Zap, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-base px-6 text-center">
      {/* Background glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-500/5 blur-[100px]" />

      <div className="relative">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-gold-500 to-ember-500">
              <Zap className="h-5 w-5 text-black" />
            </div>
            <span className="font-display text-lg font-bold text-white">Boltcut</span>
          </Link>
        </div>

        {/* 404 */}
        <div className="mb-2 font-display text-8xl font-bold text-gradient-gold leading-none">
          404
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold text-white">
          Page not found
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-subtle leading-relaxed">
          This page doesn&apos;t exist or was moved. Let&apos;s get you back to creating videos.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/dashboard">
              <Home className="h-4 w-4" />
              Back to dashboard
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Go home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-base px-6 text-center">
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ember-500/5 blur-[80px]" />

      <div className="relative max-w-sm">
        <div className="mb-6 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ember-500/15">
            <AlertTriangle className="h-7 w-7 text-ember-500" />
          </div>
        </div>

        <h1 className="font-display text-xl font-bold text-white">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-subtle leading-relaxed">
          {error.message?.includes("fetch")
            ? "Network error — check your connection and try again."
            : "An unexpected error occurred on this page."}
        </p>

        {error.digest && (
          <p className="mt-2 font-mono text-xs text-muted">
            Ref: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <Button className="w-full" onClick={reset}>
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
          <Button variant="outline" className="w-full" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

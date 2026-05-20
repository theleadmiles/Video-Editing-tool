"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProcessingScreenProps {
  project: { id: string; status: string; title: string; timeline_data?: Record<string, unknown> | null };
}

export function ProcessingScreen({ project: initial }: ProcessingScreenProps) {
  const router  = useRouter();
  const [status,  setStatus]  = useState(initial.status);
  const [errMsg,  setErrMsg]  = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Poll the project status every 3 seconds
  useEffect(() => {
    if (status !== "processing") return;

    const interval = setInterval(async () => {
      try {
        const res  = await fetch(`/api/projects/${initial.id}/status`);
        const data = await res.json();
        setStatus(data.status);
        if (data.status === "error") {
          const td = data.timeline_data as { error?: string } | null;
          setErrMsg(td?.error ?? "Transcription failed. Please try again.");
        }
        if (data.status === "ready") {
          clearInterval(interval);
          // Small delay so user sees the success state before redirect
          setTimeout(() => router.refresh(), 600);
        }
      } catch {
        // ignore transient network errors, keep polling
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [status, initial.id, router]);

  // Elapsed time counter
  useEffect(() => {
    if (status !== "processing") return;
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-base">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-red-500/15">
            <AlertCircle className="h-10 w-10 text-red-400" />
          </div>
          <h2 className="font-display text-2xl font-bold text-white mb-2">Transcription failed</h2>
          <p className="text-sm text-subtle mb-6">{errMsg}</p>
          <Button onClick={() => router.push("/projects/caption")} className="w-full">
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (status === "ready") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-base">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-green-500/15">
            <CheckCircle2 className="h-10 w-10 text-green-400" />
          </div>
          <h2 className="font-display text-2xl font-bold text-white mb-2">Captions ready!</h2>
          <p className="text-sm text-subtle">Opening your editor…</p>
        </div>
      </div>
    );
  }

  // Processing state
  const steps = [
    { label: "Fetching audio from storage",    done: elapsed > 3  },
    { label: "Transcribing with Whisper AI",   done: elapsed > 15 },
    { label: "Building caption timeline",      done: false        },
  ];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-base">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gold-500/15">
          <Loader2 className="h-10 w-10 text-gold-500 animate-spin" />
        </div>
        <h2 className="font-display text-2xl font-bold text-white mb-1">
          Transcribing your video…
        </h2>
        <p className="text-sm text-subtle mb-8">
          This takes 15–60 seconds. You can leave this tab — we&apos;ll finish in the background.
        </p>

        <div className="space-y-2.5 mb-6">
          {steps.map((s, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 rounded-xl border p-3 text-sm transition-all duration-500 ${
                s.done
                  ? "border-green-500/20 bg-green-500/5 text-green-400"
                  : i === steps.findIndex(x => !x.done)
                    ? "border-gold-500/30 bg-gold-500/10 text-gold-400"
                    : "border-border bg-surface text-muted"
              }`}
            >
              <span className="flex-1 text-left font-medium">{s.label}</span>
              {s.done
                ? <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
                : i === steps.findIndex(x => !x.done)
                  ? <div className="h-4 w-4 rounded-full border-2 border-gold-500 border-t-transparent animate-spin flex-shrink-0" />
                  : null}
            </div>
          ))}
        </div>

        <p className="text-xs text-muted">{elapsed}s elapsed · checking every 3s</p>
      </div>
    </div>
  );
}

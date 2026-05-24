"use client";

import { useState } from "react";
import {
  Sparkles, Wand2, Languages, Trash2, Zap,
  MessageSquare, Loader2, ChevronDown, CheckCircle2,
  Crosshair,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { TimelineClip } from "@/types";

interface Props {
  captions: TimelineClip[];
  /** Called when AI returns updated clips — caller merges into state */
  onUpdate: (updatedClips: TimelineClip[]) => void;
  /** If provided, auto-position runs face detection on this video element */
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}

const LANGUAGES = [
  "Hindi", "Spanish", "French", "German", "Portuguese", "Arabic",
  "Japanese", "Korean", "Chinese (Simplified)", "Italian", "Russian",
  "Bengali", "Gujarati", "Marathi", "Tamil", "Telugu", "Urdu",
];

type Op = "emphasis" | "remove_fillers" | "emotion_styling" | "correct" | "translate" | "auto_position";

/** Panel that surfaces all AI caption operations in one place */
export function CaptionAIPanel({ captions, onUpdate, videoRef }: Props) {
  const [running, setRunning] = useState<Op | null>(null);
  const [showLangs, setShowLangs] = useState(false);
  const [correctContext, setCorrectContext] = useState("");
  const [showCorrectInput, setShowCorrectInput] = useState(false);
  const [completedOps, setCompletedOps] = useState<Set<Op>>(new Set());

  const markDone = (op: Op) =>
    setCompletedOps((s) => new Set([...s, op]));

  async function runEnhance(options: { emphasis?: boolean; remove_fillers?: boolean; emotion_styling?: boolean }) {
    const opKey: Op = options.emphasis ? "emphasis"
                    : options.remove_fillers ? "remove_fillers"
                    : "emotion_styling";
    setRunning(opKey);
    try {
      const res = await fetch("/api/captions/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clips: captions, options }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { clips } = await res.json() as { clips: TimelineClip[] };
      onUpdate(clips);
      markDone(opKey);
      toast.success(
        options.emphasis       ? "Emphasis markers added" :
        options.remove_fillers ? "Filler words removed" :
        "Emotion styling applied"
      );
    } catch {
      toast.error("AI operation failed — check your OpenRouter key");
    } finally {
      setRunning(null);
    }
  }

  async function runTranslate(lang: string) {
    setRunning("translate");
    setShowLangs(false);
    try {
      const res = await fetch("/api/captions/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clips: captions, target_language: lang }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { clips } = await res.json() as { clips: TimelineClip[] };
      onUpdate(clips);
      markDone("translate");
      toast.success(`Translated to ${lang}`);
    } catch {
      toast.error("Translation failed");
    } finally {
      setRunning(null);
    }
  }

  async function runCorrect() {
    setRunning("correct");
    setShowCorrectInput(false);
    try {
      const res = await fetch("/api/captions/correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clips: captions, context: correctContext }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { clips } = await res.json() as { clips: TimelineClip[] };
      onUpdate(clips);
      markDone("correct");
      toast.success("Transcript corrected");
    } catch {
      toast.error("Correction failed");
    } finally {
      setRunning(null);
    }
  }

  async function runAutoPosition() {
    // Use browser FaceDetector API (Chrome 97+ / Android)
    setRunning("auto_position");
    try {
      const video = videoRef?.current;
      let facePosY = 80; // default: bottom

      if (video && "FaceDetector" in window) {
        const canvas = document.createElement("canvas");
        canvas.width  = video.videoWidth  || 270;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          try {
            // @ts-expect-error — FaceDetector not yet in TS DOM lib
            const detector = new window.FaceDetector({ maxDetectedFaces: 2 });
            const faces = await detector.detect(canvas) as Array<{ boundingBox: DOMRectReadOnly }>;
            if (faces.length > 0) {
              // Average face center Y
              const avgCenterY = faces.reduce((sum, f) =>
                sum + (f.boundingBox.top + f.boundingBox.height / 2) / canvas.height, 0
              ) / faces.length;
              // If face is in bottom half → push caption to top
              facePosY = avgCenterY > 0.5 ? 12 : 82;
            }
          } catch { /* FaceDetector not supported */ }
        }
      } else {
        toast("Face detection not supported in this browser — using smart default");
      }

      const updated = captions.map((c) => ({
        ...c,
        position: { x: c.position?.x ?? 50, y: facePosY },
      }));
      onUpdate(updated);
      markDone("auto_position");
      toast.success(`Captions repositioned to ${facePosY < 50 ? "top" : "bottom"} (clear of faces)`);
    } catch {
      toast.error("Auto-position failed");
    } finally {
      setRunning(null);
    }
  }

  const busy = running !== null;
  const noCaptions = captions.length === 0;

  return (
    <div className="rounded-xl border border-gold-500/20 bg-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-gold-500/5">
        <Sparkles className="h-3 w-3 text-gold-500" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gold-500">
          AI Caption Tools
        </span>
        {busy && <Loader2 className="h-3 w-3 animate-spin text-gold-500 ml-auto" />}
      </div>

      <div className="p-3 space-y-1.5">

        {/* Auto-Emphasis */}
        <AIButton
          icon={Wand2}
          label="Auto-Emphasis"
          description="Highlight key words per sentence"
          op="emphasis"
          running={running}
          done={completedOps.has("emphasis")}
          disabled={busy || noCaptions}
          onClick={() => runEnhance({ emphasis: true })}
        />

        {/* Remove Fillers */}
        <AIButton
          icon={Trash2}
          label="Remove Fillers"
          description='Strip "um", "uh", "you know", "like"'
          op="remove_fillers"
          running={running}
          done={completedOps.has("remove_fillers")}
          disabled={busy || noCaptions}
          onClick={() => runEnhance({ remove_fillers: true })}
        />

        {/* Emotion Styling */}
        <AIButton
          icon={Zap}
          label="Emotion Styling"
          description="Auto-assign style based on tone"
          op="emotion_styling"
          running={running}
          done={completedOps.has("emotion_styling")}
          disabled={busy || noCaptions}
          onClick={() => runEnhance({ emotion_styling: true })}
        />

        {/* Fix Transcript */}
        <div>
          <AIButton
            icon={MessageSquare}
            label="Fix Transcript"
            description="Correct misheared words & proper nouns"
            op="correct"
            running={running}
            done={completedOps.has("correct")}
            disabled={busy || noCaptions}
            onClick={() => setShowCorrectInput((v) => !v)}
          />
          {showCorrectInput && (
            <div className="mt-1.5 space-y-1.5 pl-0.5">
              <input
                type="text"
                value={correctContext}
                onChange={(e) => setCorrectContext(e.target.value)}
                placeholder="Topic/context hint (optional): e.g. crypto, yoga, iPhone"
                className="w-full rounded-lg border border-border bg-elevated px-2.5 py-1.5 text-[11px] text-white placeholder:text-muted focus:border-gold-500/50 focus:outline-none"
              />
              <button
                onClick={runCorrect}
                disabled={busy}
                className="w-full rounded-lg bg-gold-500/15 border border-gold-500/30 py-1.5 text-[11px] font-medium text-gold-400 hover:bg-gold-500/25 transition-all disabled:opacity-50"
              >
                Run correction
              </button>
            </div>
          )}
        </div>

        {/* Translate */}
        <div className="relative">
          <AIButton
            icon={Languages}
            label="Translate"
            description="Translate to another language"
            op="translate"
            running={running}
            done={completedOps.has("translate")}
            disabled={busy || noCaptions}
            onClick={() => setShowLangs((v) => !v)}
            suffix={<ChevronDown className={cn("h-3 w-3 transition-transform", showLangs && "rotate-180")} />}
          />
          {showLangs && (
            <div className="mt-1 rounded-lg border border-border bg-elevated overflow-y-auto max-h-36 shadow-card">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  onClick={() => runTranslate(lang)}
                  className="w-full text-left px-3 py-1.5 text-[11px] text-subtle hover:text-white hover:bg-surface transition-colors"
                >
                  {lang}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Auto-Position via Face Detection */}
        <AIButton
          icon={Crosshair}
          label="Auto-Position"
          description="Face detection — keep captions clear of faces"
          op="auto_position"
          running={running}
          done={completedOps.has("auto_position")}
          disabled={busy || noCaptions}
          onClick={runAutoPosition}
        />

      </div>
    </div>
  );
}

// ── Internal button component ──────────────────────────────────────────────

interface AIButtonProps {
  icon: React.ElementType;
  label: string;
  description: string;
  op: Op;
  running: Op | null;
  done: boolean;
  disabled: boolean;
  onClick: () => void;
  suffix?: React.ReactNode;
}

function AIButton({ icon: Icon, label, description, op, running, done, disabled, onClick, suffix }: AIButtonProps) {
  const isRunning = running === op;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all",
        done
          ? "border-green-500/30 bg-green-500/5 text-green-400"
          : "border-border bg-elevated text-subtle hover:text-white hover:border-border-strong hover:bg-surface",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className={cn("flex-shrink-0 h-6 w-6 rounded-md flex items-center justify-center",
        done ? "bg-green-500/15" : "bg-gold-500/10"
      )}>
        {isRunning
          ? <Loader2 className="h-3.5 w-3.5 animate-spin text-gold-500" />
          : done
          ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
          : <Icon className="h-3.5 w-3.5 text-gold-500" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold leading-tight">{label}</p>
        <p className="text-[9px] text-muted mt-0.5 leading-tight">{description}</p>
      </div>
      {suffix && <div className="flex-shrink-0 text-muted">{suffix}</div>}
    </button>
  );
}

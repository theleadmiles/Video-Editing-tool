"use client";

import { useState } from "react";
import {
  Sparkles, Wand2, Languages, Trash2, Zap,
  MessageSquare, Loader2, ChevronDown, CheckCircle2,
  Crosshair, TrendingUp, Smile,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { TimelineClip } from "@/types";

interface Props {
  captions: TimelineClip[];
  onUpdate: (updatedClips: TimelineClip[]) => void;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  onHookFound?: (clips: TimelineClip[], reason: string, startTime: number) => void;
}

const LANGUAGES = [
  "Hindi", "Spanish", "French", "German", "Portuguese", "Arabic",
  "Japanese", "Korean", "Chinese (Simplified)", "Italian", "Russian",
  "Bengali", "Gujarati", "Marathi", "Tamil", "Telugu", "Urdu",
];

type Op = "emphasis" | "remove_fillers" | "emotion_styling" | "correct" | "translate" | "auto_position" | "hook" | "emoji";

// Category definitions
const CATEGORIES = [
  {
    id: "enhance",
    label: "Enhance",
    description: "Make captions more engaging",
    color: "#10C8D8",
    bgClass: "bg-[#10C8D8]/10",
    textClass: "text-[#10C8D8]",
    borderClass: "border-[#10C8D8]/20",
  },
  {
    id: "fix",
    label: "Fix & Clean",
    description: "Correct and tidy transcript",
    color: "#FBBF24",
    bgClass: "bg-amber-500/10",
    textClass: "text-amber-400",
    borderClass: "border-amber-500/20",
  },
  {
    id: "transform",
    label: "Transform",
    description: "Reshape content for impact",
    color: "#A78BFA",
    bgClass: "bg-violet-500/10",
    textClass: "text-violet-400",
    borderClass: "border-violet-500/20",
  },
] as const;

type CategoryId = typeof CATEGORIES[number]["id"];

export function CaptionAIPanel({ captions, onUpdate, videoRef, onHookFound }: Props) {
  const [running, setRunning]             = useState<Op | null>(null);
  const [showLangs, setShowLangs]         = useState(false);
  const [correctContext, setCorrectContext] = useState("");
  const [showCorrectInput, setShowCorrectInput] = useState(false);
  const [completedOps, setCompletedOps]   = useState<Set<Op>>(new Set());
  const [collapsed, setCollapsed]         = useState<Set<CategoryId>>(new Set());

  const markDone = (op: Op) => setCompletedOps((s) => new Set([...s, op]));
  const toggleCategory = (id: CategoryId) =>
    setCollapsed((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  async function runEnhance(options: { emphasis?: boolean; remove_fillers?: boolean; emotion_styling?: boolean }) {
    const opKey: Op = options.emphasis ? "emphasis" : options.remove_fillers ? "remove_fillers" : "emotion_styling";
    setRunning(opKey);
    try {
      const res = await fetch("/api/captions/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clips: captions, options }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? `Server error ${res.status}`);
      }
      const { clips } = await res.json() as { clips: TimelineClip[] };
      onUpdate(clips);
      markDone(opKey);
      toast.success(
        options.emphasis ? "Emphasis markers added" :
        options.remove_fillers ? "Filler words removed" :
        "Emotion styling applied"
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(msg.length < 120 ? msg : "AI operation failed — check console");
    } finally { setRunning(null); }
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
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? `Server error ${res.status}`);
      }
      const { clips } = await res.json() as { clips: TimelineClip[] };
      onUpdate(clips);
      markDone("translate");
      toast.success(`Translated to ${lang}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(msg.length < 120 ? msg : "Translation failed — check console");
    } finally { setRunning(null); }
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
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? `Server error ${res.status}`);
      }
      const { clips } = await res.json() as { clips: TimelineClip[] };
      onUpdate(clips);
      markDone("correct");
      toast.success("Transcript corrected");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(msg.length < 120 ? msg : "Correction failed — check console");
    } finally { setRunning(null); }
  }

  async function runAutoPosition() {
    setRunning("auto_position");
    try {
      const video = videoRef?.current;
      let facePosY = 80;
      if (video && "FaceDetector" in window) {
        const canvas = document.createElement("canvas");
        canvas.width  = video.videoWidth  || 270;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          try {
            // @ts-expect-error — FaceDetector not in TS DOM lib
            const detector = new window.FaceDetector({ maxDetectedFaces: 2 });
            const faces = await detector.detect(canvas) as Array<{ boundingBox: DOMRectReadOnly }>;
            if (faces.length > 0) {
              const avgCenterY = faces.reduce((sum, f) =>
                sum + (f.boundingBox.top + f.boundingBox.height / 2) / canvas.height, 0
              ) / faces.length;
              facePosY = avgCenterY > 0.5 ? 12 : 82;
            }
          } catch { /* FaceDetector not supported */ }
        }
      } else {
        toast("Face detection not available — using smart default");
      }
      const updated = captions.map((c) => ({ ...c, position: { x: c.position?.x ?? 50, y: facePosY } }));
      onUpdate(updated);
      markDone("auto_position");
      toast.success(`Captions moved to ${facePosY < 50 ? "top" : "bottom"}`);
    } catch { toast.error("Auto-position failed"); }
    finally { setRunning(null); }
  }

  async function runHook() {
    setRunning("hook");
    try {
      const res = await fetch("/api/captions/hook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clips: captions }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? `Server error ${res.status}`);
      }
      const { clips, reason, start_time } = await res.json() as {
        clips: TimelineClip[]; reason: string; start_time: number; end_time: number;
      };
      markDone("hook");
      onHookFound?.(clips, reason, start_time);
      toast.success(`Hook: ${reason}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(msg.length < 120 ? msg : "Hook detection failed");
    } finally { setRunning(null); }
  }

  async function runEmoji() {
    setRunning("emoji");
    try {
      const res = await fetch("/api/captions/emoji", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clips: captions }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? `Server error ${res.status}`);
      }
      const { clips } = await res.json() as { clips: TimelineClip[] };
      onUpdate(clips);
      markDone("emoji");
      toast.success("Emojis added");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(msg.length < 120 ? msg : "Emoji generation failed");
    } finally { setRunning(null); }
  }

  const busy       = running !== null;
  const noCaptions = captions.length === 0;

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-border bg-gradient-to-r from-gold-500/6 to-transparent">
        <div className="flex h-5 w-5 items-center justify-center rounded-md bg-gold-500/15">
          <Sparkles className="h-3 w-3 text-gold-500" />
        </div>
        <span className="text-xs font-semibold text-white tracking-tight">AI Caption Tools</span>
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-gold-500 ml-auto" />}
      </div>

      <div className="divide-y divide-border/60">

        {/* ── ENHANCE ── */}
        <CategorySection
          id="enhance"
          label="Enhance"
          count={3}
          color="#10C8D8"
          collapsed={collapsed.has("enhance")}
          onToggle={() => toggleCategory("enhance")}
        >
          <AIButton icon={Wand2} label="Auto-Emphasis" description="Highlight key words per sentence"
            op="emphasis" running={running} done={completedOps.has("emphasis")}
            disabled={busy || noCaptions} onClick={() => runEnhance({ emphasis: true })}
            accentColor="#10C8D8" accentBg="bg-[#10C8D8]/10" />
          <AIButton icon={Zap} label="Emotion Styling" description="Auto-assign style based on tone"
            op="emotion_styling" running={running} done={completedOps.has("emotion_styling")}
            disabled={busy || noCaptions} onClick={() => runEnhance({ emotion_styling: true })}
            accentColor="#10C8D8" accentBg="bg-[#10C8D8]/10" />
          <AIButton icon={Smile} label="Auto Emoji" description="Add contextual emoji to captions"
            op="emoji" running={running} done={completedOps.has("emoji")}
            disabled={busy || noCaptions} onClick={runEmoji}
            accentColor="#10C8D8" accentBg="bg-[#10C8D8]/10" />
        </CategorySection>

        {/* ── FIX & CLEAN ── */}
        <CategorySection
          id="fix"
          label="Fix & Clean"
          count={2}
          color="#FBBF24"
          collapsed={collapsed.has("fix")}
          onToggle={() => toggleCategory("fix")}
        >
          {/* Fix Transcript — has context input */}
          <div>
            <AIButton icon={MessageSquare} label="Fix Transcript" description="Correct misheared words & proper nouns"
              op="correct" running={running} done={completedOps.has("correct")}
              disabled={busy || noCaptions} onClick={() => setShowCorrectInput((v) => !v)}
              accentColor="#FBBF24" accentBg="bg-amber-500/10" />
            {showCorrectInput && (
              <div className="mt-2 ml-9 space-y-2 panel-enter">
                <input
                  type="text"
                  value={correctContext}
                  onChange={(e) => setCorrectContext(e.target.value)}
                  placeholder="Topic hint (optional): e.g. crypto, yoga, iPhone"
                  className="w-full rounded-lg border border-border bg-elevated px-2.5 py-1.5 text-[11px] text-white placeholder:text-muted focus:border-gold-500/40 focus:outline-none"
                />
                <button
                  onClick={runCorrect}
                  disabled={busy}
                  className="w-full rounded-lg bg-amber-500/15 border border-amber-500/25 py-1.5 text-[11px] font-medium text-amber-400 hover:bg-amber-500/25 transition-all disabled:opacity-50"
                >
                  Run correction
                </button>
              </div>
            )}
          </div>
          <AIButton icon={Trash2} label="Remove Fillers" description={'Strip "um", "uh", "you know", "like"'}
            op="remove_fillers" running={running} done={completedOps.has("remove_fillers")}
            disabled={busy || noCaptions} onClick={() => runEnhance({ remove_fillers: true })}
            accentColor="#FBBF24" accentBg="bg-amber-500/10" />
        </CategorySection>

        {/* ── TRANSFORM ── */}
        <CategorySection
          id="transform"
          label="Transform"
          count={3}
          color="#A78BFA"
          collapsed={collapsed.has("transform")}
          onToggle={() => toggleCategory("transform")}
        >
          {/* Translate — has language dropdown */}
          <div>
            <AIButton icon={Languages} label="Translate" description="Translate to another language"
              op="translate" running={running} done={completedOps.has("translate")}
              disabled={busy || noCaptions} onClick={() => setShowLangs((v) => !v)}
              accentColor="#A78BFA" accentBg="bg-violet-500/10"
              suffix={<ChevronDown className={cn("h-3 w-3 transition-transform", showLangs && "rotate-180")} />}
            />
            {showLangs && (
              <div className="mt-1.5 ml-9 rounded-xl border border-border bg-elevated overflow-hidden shadow-card panel-enter">
                <div className="max-h-40 overflow-y-auto scroll-thin divide-y divide-border/40">
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
              </div>
            )}
          </div>
          <AIButton icon={TrendingUp} label="Viral Hook Finder" description="Find the best 15s clip for max impact"
            op="hook" running={running} done={completedOps.has("hook")}
            disabled={busy || noCaptions} onClick={runHook}
            accentColor="#A78BFA" accentBg="bg-violet-500/10" />
          <AIButton icon={Crosshair} label="Auto-Position" description="Face detection — clear of faces"
            op="auto_position" running={running} done={completedOps.has("auto_position")}
            disabled={busy || noCaptions} onClick={runAutoPosition}
            accentColor="#A78BFA" accentBg="bg-violet-500/10" />
        </CategorySection>

      </div>

      {noCaptions && (
        <p className="px-3.5 py-3 text-[11px] text-muted text-center border-t border-border">
          Upload and process a video to use AI tools
        </p>
      )}
    </div>
  );
}

// ── Category section ────────────────────────────────────────────────────────

function CategorySection({
  id, label, count, color, collapsed, onToggle, children,
}: {
  id: string; label: string; count: number; color: string;
  collapsed: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3.5 py-2 hover:bg-elevated/50 transition-colors"
      >
        <span
          className="h-1.5 w-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted flex-1 text-left">
          {label}
        </span>
        <span
          className="text-[9px] font-bold rounded-full px-1.5 py-0.5"
          style={{ color, backgroundColor: `${color}18` }}
        >
          {count}
        </span>
        <ChevronDown
          className={cn("h-3 w-3 text-muted transition-transform", collapsed && "-rotate-90")}
        />
      </button>

      {!collapsed && (
        <div className="px-3 pb-3 space-y-1.5 panel-enter">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Individual AI action button ─────────────────────────────────────────────

interface AIButtonProps {
  icon: React.ElementType;
  label: string;
  description: string;
  op: Op;
  running: Op | null;
  done: boolean;
  disabled: boolean;
  onClick: () => void;
  accentColor: string;
  accentBg: string;
  suffix?: React.ReactNode;
}

function AIButton({
  icon: Icon, label, description, op, running, done,
  disabled, onClick, accentColor, accentBg, suffix,
}: AIButtonProps) {
  const isRunning = running === op;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all",
        done
          ? "border-green-500/25 bg-green-500/5"
          : "border-border bg-elevated hover:bg-surface hover:border-border-strong",
        disabled && !isRunning && "opacity-50 cursor-not-allowed",
        isRunning && "opacity-75"
      )}
    >
      <div className={cn(
        "flex-shrink-0 h-7 w-7 rounded-lg flex items-center justify-center",
        done ? "bg-green-500/12" : accentBg
      )}>
        {isRunning
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: accentColor }} />
          : done
          ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
          : <Icon className="h-3.5 w-3.5" style={{ color: accentColor }} />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-[11px] font-semibold leading-tight", done ? "text-green-400" : "text-white")}>
          {label}
        </p>
        <p className="text-[9px] text-muted mt-0.5 leading-tight truncate">{description}</p>
      </div>
      {suffix && <div className="flex-shrink-0 text-muted">{suffix}</div>}
    </button>
  );
}

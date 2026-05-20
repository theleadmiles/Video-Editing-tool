"use client";

import { useState, useRef, useCallback, DragEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ChevronLeft, Upload, Film, Captions,
  CheckCircle2, Loader2, Globe, Ratio,
  FileVideo, X, Sparkles,
} from "lucide-react";

const LANGUAGES = [
  { value: "English", label: "English", flag: "🇬🇧" },
  { value: "Hindi", label: "हिन्दी", flag: "🇮🇳" },
  { value: "Tamil", label: "தமிழ்", flag: "🇮🇳" },
  { value: "Telugu", label: "తెలుగు", flag: "🇮🇳" },
  { value: "Bengali", label: "বাংলা", flag: "🇮🇳" },
  { value: "Kannada", label: "ಕನ್ನಡ", flag: "🇮🇳" },
  { value: "Marathi", label: "मराठी", flag: "🇮🇳" },
  { value: "Punjabi", label: "ਪੰਜਾਬੀ", flag: "🇮🇳" },
  { value: "Malayalam", label: "മലയാളം", flag: "🇮🇳" },
  { value: "Gujarati", label: "ગુજરાતી", flag: "🇮🇳" },
];

const ASPECT_RATIOS = [
  { value: "9:16", label: "9:16", desc: "Reels / Shorts", icon: "▯" },
  { value: "16:9", label: "16:9", desc: "YouTube", icon: "▭" },
  { value: "1:1", label: "1:1", desc: "Feed post", icon: "□" },
];

type Stage = "idle" | "uploading" | "transcribing" | "done";

const ACCEPTED_TYPES = [
  "video/mp4", "video/quicktime", "video/webm", "video/x-matroska",
  "audio/mpeg", "audio/mp3", "audio/wav",
];
const ACCEPTED_EXT = ".mp4,.mov,.webm,.mkv,.mp3,.wav";
const MAX_SIZE_MB = 25;
const MAX_SIZE = MAX_SIZE_MB * 1024 * 1024;

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CaptionPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("English");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [stage, setStage] = useState<Stage>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [captionCount, setCaptionCount] = useState(0);

  // ── File selection ────────────────────────────────────────────────────────
  function selectFile(f: File) {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      toast.error("Unsupported format. Please upload MP4, MOV, WebM, MP3, or WAV.");
      return;
    }
    if (f.size > MAX_SIZE) {
      toast.error(
        `File is ${formatBytes(f.size)} — max is ${MAX_SIZE_MB} MB. Compress it first (HandBrake or Clideo work great).`,
        { duration: 6000 }
      );
      return;
    }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  }

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) selectFile(f);
    e.target.value = "";
  };

  const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) selectFile(f);
  }, [title]); // eslint-disable-line react-hooks/exhaustive-deps

  const onDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!file) { toast.error("Please select a video first"); return; }

    setStage("uploading");

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("title", title || file.name.replace(/\.[^.]+$/, ""));
      form.append("language", language);
      form.append("aspect_ratio", aspectRatio);

      // The transcribe route handles upload + transcription in one shot.
      // We fake two visual stages: "uploading" for the first ~2s then "transcribing".
      const timer = setTimeout(() => setStage("transcribing"), 2000);

      const res = await fetch("/api/projects/transcribe", {
        method: "POST",
        body: form,
      });

      clearTimeout(timer);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Something went wrong");
      }

      setCaptionCount(data.captionCount ?? 0);
      setStage("done");

      setTimeout(() => {
        router.push(`/projects/${data.projectId}/edit`);
      }, 1200);

    } catch (err) {
      setStage("idle");
      toast.error(err instanceof Error ? err.message : "Upload failed. Please try again.");
    }
  }

  // ── Loading screen ────────────────────────────────────────────────────────
  if (stage === "uploading" || stage === "transcribing" || stage === "done") {
    const steps = [
      { key: "uploading", label: "Uploading your video", icon: "☁️" },
      { key: "transcribing", label: "Transcribing audio with AI", icon: "🎙️" },
      { key: "done", label: stage === "done" ? `${captionCount} captions ready!` : "Building caption timeline", icon: "✨" },
    ];
    const activeIndex = stage === "uploading" ? 0 : stage === "transcribing" ? 1 : 2;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-base">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gold-500/15">
            {stage === "done"
              ? <CheckCircle2 className="h-10 w-10 text-green-400" />
              : <Loader2 className="h-10 w-10 text-gold-500 animate-spin" />
            }
          </div>
          <h2 className="font-display text-2xl font-bold text-white mb-1">
            {stage === "done" ? "Captions ready!" : "Working on it…"}
          </h2>
          <p className="text-sm text-subtle mb-8">
            {stage === "done"
              ? "Opening your editor…"
              : "This usually takes 10–30 seconds depending on video length."}
          </p>

          <div className="space-y-2.5">
            {steps.map((s, i) => {
              const isDone = i < activeIndex;
              const isCurrent = i === activeIndex;
              return (
                <div
                  key={s.key}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 text-sm transition-all duration-500",
                    isDone && "border-green-500/20 bg-green-500/5 text-green-400",
                    isCurrent && "border-gold-500/30 bg-gold-500/10 text-gold-400",
                    !isDone && !isCurrent && "border-border bg-surface text-muted"
                  )}
                >
                  <span className="text-base">{s.icon}</span>
                  <span className="flex-1 text-left font-medium">{s.label}</span>
                  {isDone && <CheckCircle2 className="h-4 w-4 text-green-400" />}
                  {isCurrent && stage !== "done" && (
                    <div className="h-4 w-4 rounded-full border-2 border-gold-500 border-t-transparent animate-spin" />
                  )}
                  {isCurrent && stage === "done" && <CheckCircle2 className="h-4 w-4 text-green-400" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-xl">
        {/* Back link */}
        <Link
          href="/projects/new"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-subtle hover:text-white transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-500/15">
            <Captions className="h-6 w-6 text-gold-500" />
          </div>
          <h1 className="font-display text-2xl font-bold text-white">Caption my video</h1>
          <p className="mt-1 text-sm text-subtle">
            Upload your video — AI transcribes the audio and adds word-timed captions automatically.
          </p>
        </div>

        <div className="space-y-6">
          {/* Drop zone */}
          <div>
            <label className="mb-2 block text-sm font-medium text-subtle">Video file</label>
            <div
              onClick={() => !file && inputRef.current?.click()}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              className={cn(
                "relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all",
                isDragging
                  ? "border-gold-500 bg-gold-500/10"
                  : file
                  ? "border-green-500/40 bg-green-500/5 cursor-default"
                  : "border-border hover:border-gold-500/50 hover:bg-gold-500/5"
              )}
            >
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_EXT}
                onChange={onFileChange}
                className="sr-only"
              />

              {file ? (
                <div className="flex w-full items-center gap-3">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-green-500/10">
                    <FileVideo className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-medium text-white">{file.name}</p>
                    <p className="text-xs text-subtle mt-0.5">{formatBytes(file.size)}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); setTitle(""); }}
                    className="flex-shrink-0 rounded-lg p-1.5 text-muted hover:text-white hover:bg-elevated transition-colors"
                    title="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-elevated">
                    {isDragging
                      ? <Film className="h-6 w-6 text-gold-500" />
                      : <Upload className="h-6 w-6 text-subtle" />
                    }
                  </div>
                  <p className="text-sm font-medium text-white">
                    {isDragging ? "Drop it here" : "Drop your video here"}
                  </p>
                  <p className="mt-1 text-xs text-muted">or click to browse</p>
                  <p className="mt-3 text-[11px] text-muted">
                    MP4, MOV, WebM · max {MAX_SIZE_MB} MB
                  </p>
                </>
              )}
            </div>

            {/* Size hint */}
            {!file && (
              <p className="mt-2 text-xs text-muted flex items-start gap-1.5">
                <span className="text-gold-500 flex-shrink-0">💡</span>
                File too big? Compress with{" "}
                <a href="https://www.handbrake.fr" target="_blank" rel="noopener noreferrer" className="text-gold-500 hover:underline">HandBrake</a>{" "}
                (free) or{" "}
                <a href="https://clideo.com/compress-video" target="_blank" rel="noopener noreferrer" className="text-gold-500 hover:underline">Clideo</a>{" "}
                (online).
              </p>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="mb-2 block text-sm font-medium text-subtle">Project title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My video"
              maxLength={80}
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-white placeholder:text-muted focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
            />
          </div>

          {/* Language */}
          <div>
            <label className="mb-3 flex items-center gap-2 text-sm font-medium text-subtle">
              <Globe className="h-4 w-4" /> Spoken language
            </label>
            <div className="grid grid-cols-5 gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.value}
                  onClick={() => setLanguage(lang.value)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border p-2.5 text-center transition-all",
                    language === lang.value
                      ? "border-gold-500/50 bg-gold-500/10"
                      : "border-border bg-surface hover:border-border-strong"
                  )}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span className={cn("text-[10px] font-medium leading-tight", language === lang.value ? "text-gold-500" : "text-subtle")}>
                    {lang.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Aspect ratio */}
          <div>
            <label className="mb-3 flex items-center gap-2 text-sm font-medium text-subtle">
              <Ratio className="h-4 w-4" /> Video format
            </label>
            <div className="grid grid-cols-3 gap-3">
              {ASPECT_RATIOS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setAspectRatio(r.value)}
                  className={cn(
                    "rounded-xl border p-4 text-center transition-all",
                    aspectRatio === r.value
                      ? "border-gold-500/50 bg-gold-500/10"
                      : "border-border bg-surface hover:border-border-strong"
                  )}
                >
                  <div className={cn("mx-auto mb-2 flex items-center justify-center text-2xl",
                    aspectRatio === r.value ? "text-gold-500" : "text-subtle")}>
                    {r.icon}
                  </div>
                  <p className={cn("font-semibold text-sm", aspectRatio === r.value ? "text-gold-500" : "text-white")}>
                    {r.label}
                  </p>
                  <p className="text-xs text-muted">{r.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* What you get */}
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
              <Sparkles className="h-3 w-3 text-gold-500" /> What happens next
            </p>
            <ul className="space-y-1.5 text-sm text-subtle">
              <li className="flex items-start gap-2">
                <span className="text-gold-500 flex-shrink-0">✓</span>
                AI transcribes every word with timestamps
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold-500 flex-shrink-0">✓</span>
                Captions are synced to the exact moment each word is spoken
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold-500 flex-shrink-0">✓</span>
                Edit text, style, position, and timing in the editor
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold-500 flex-shrink-0">✓</span>
                Change fonts, colours, and animations per caption
              </li>
            </ul>
          </div>

          <Button
            className="w-full"
            size="lg"
            disabled={!file}
            onClick={handleSubmit}
          >
            <Captions className="h-4 w-4" />
            Generate captions
          </Button>
        </div>
      </div>
    </div>
  );
}

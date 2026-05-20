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

// ── Constants ─────────────────────────────────────────────────────────────────

const LANGUAGES = [
  { value: "auto",      label: "Auto",       flag: "🌐" },
  { value: "English",   label: "English",    flag: "🇬🇧" },
  { value: "Hindi",     label: "हिन्दी",      flag: "🇮🇳" },
  { value: "Tamil",     label: "தமிழ்",      flag: "🇮🇳" },
  { value: "Telugu",    label: "తెలుగు",     flag: "🇮🇳" },
  { value: "Bengali",   label: "বাংলা",       flag: "🇮🇳" },
  { value: "Kannada",   label: "ಕನ್ನಡ",      flag: "🇮🇳" },
  { value: "Marathi",   label: "मराठी",       flag: "🇮🇳" },
  { value: "Punjabi",   label: "ਪੰਜਾਬੀ",     flag: "🇮🇳" },
  { value: "Malayalam", label: "മലയാളം",     flag: "🇮🇳" },
  { value: "Gujarati",  label: "ગુજરાતી",    flag: "🇮🇳" },
];

const ASPECT_RATIOS = [
  { value: "9:16",  label: "9:16",  desc: "Reels / Shorts", icon: "▯" },
  { value: "16:9",  label: "16:9",  desc: "YouTube",        icon: "▭" },
  { value: "1:1",   label: "1:1",   desc: "Feed post",      icon: "□" },
];

const ACCEPTED_TYPES = [
  "video/mp4", "video/quicktime", "video/webm", "video/x-matroska",
];
const ACCEPTED_EXT = ".mp4,.mov,.webm,.mkv";
const MAX_SIZE_BYTES = 1024 * 1024 * 1024; // 1 GB

// ── Audio extraction ──────────────────────────────────────────────────────────

/** Extracts audio from a video file as 16 kHz mono WAV using the browser's
 *  OfflineAudioContext — runs faster than real-time, no server needed. */
async function extractAudioWAV(file: File): Promise<File> {
  const arrayBuffer = await file.arrayBuffer();

  // Decode via a throw-away AudioContext
  const tmpCtx = new AudioContext();
  const decoded = await tmpCtx.decodeAudioData(arrayBuffer);
  await tmpCtx.close();

  // Resample to 16 kHz mono (optimal for Whisper, small file size)
  const TARGET_RATE = 16_000;
  const offCtx = new OfflineAudioContext(
    1,
    Math.ceil(decoded.duration * TARGET_RATE),
    TARGET_RATE,
  );
  const src = offCtx.createBufferSource();
  src.buffer = decoded;
  src.connect(offCtx.destination);
  src.start();
  const mono16 = await offCtx.startRendering();

  return new File([pcmToWav(mono16)], "audio.wav", { type: "audio/wav" });
}

function pcmToWav(buf: AudioBuffer): ArrayBuffer {
  const samples = buf.getChannelData(0);
  const out = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(out);
  const str = (off: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };
  str(0, "RIFF"); v.setUint32(4, 36 + samples.length * 2, true);
  str(8, "WAVE"); str(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, buf.sampleRate, true); v.setUint32(28, buf.sampleRate * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, "data"); v.setUint32(40, samples.length * 2, true);
  let off = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    off += 2;
  }
  return out;
}

function formatBytes(b: number) {
  return b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Stage = "idle" | "extracting" | "uploading" | "transcribing" | "done";

// ── Component ─────────────────────────────────────────────────────────────────

export default function CaptionPage() {
  const router   = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file,         setFile]         = useState<File | null>(null);
  const [title,        setTitle]        = useState("");
  const [language,     setLanguage]     = useState("auto");
  const [aspectRatio,  setAspectRatio]  = useState("9:16");
  const [stage,        setStage]        = useState<Stage>("idle");
  const [isDragging,   setIsDragging]   = useState(false);
  const [uploadPct,    setUploadPct]    = useState(0);
  const [captionCount, setCaptionCount] = useState(0);

  // ── File selection ──────────────────────────────────────────────────────────
  function selectFile(f: File) {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      toast.error("Please upload an MP4, MOV, or WebM video.");
      return;
    }
    if (f.size > MAX_SIZE_BYTES) {
      toast.error(`File is ${formatBytes(f.size)} — max is 200 MB.`);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

  const onDragOver  = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!file) { toast.error("Please select a video first"); return; }

    // Warn if user tries to leave while processing
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Warn if user switches tabs during transcription
    const handleVisibilityChange = () => {
      if (document.hidden) {
        toast.warning("⚠️ Don't switch tabs — transcription will fail if you leave this page.", { duration: 6000 });
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    try {
      // ── Stage 1: Extract audio ────────────────────────────────────────────
      setStage("extracting");
      let audioFile: File;
      try {
        audioFile = await extractAudioWAV(file);
      } catch {
        toast.error("Could not read audio from this video. Make sure it has a valid audio track.");
        setStage("idle");
        return;
      }

      // Whisper limit is 25 MB. 16 kHz mono WAV ≈ 32 KB/s → ~13 min max.
      const WHISPER_LIMIT = 25 * 1024 * 1024;
      if (audioFile.size > WHISPER_LIMIT) {
        toast.error(
          `Audio track is ${formatBytes(audioFile.size)} after extraction — Whisper's limit is 25 MB (~13 min of audio). Please trim your video to under 13 minutes.`,
          { duration: 8000 }
        );
        setStage("idle");
        return;
      }

      // ── Stage 2: Upload video + audio directly to R2 (no Vercel in the loop) ─
      setStage("uploading");
      setUploadPct(0);

      // Helper: get a presigned R2 URL for any file
      async function getR2Url(f: File, suffix: string) {
        const r = await fetch("/api/storage/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: suffix, content_type: f.type }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Could not get upload URL");
        return d as { signed_url: string; public_url: string };
      }

      // Helper: XHR PUT to R2 with progress
      async function r2Put(f: File, signedUrl: string, onProgress?: (pct: number) => void) {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", signedUrl);
          xhr.setRequestHeader("Content-Type", f.type);
          if (onProgress) {
            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
            };
          }
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText?.slice(0, 200) || "R2 rejected the upload"}`));
          };
          xhr.onerror = () => reject(new Error("Network error during upload — check your connection"));
          xhr.send(f);
        });
      }

      // Upload video to R2 (with progress bar)
      const videoUrlData = await getR2Url(file, file.name);
      await r2Put(file, videoUrlData.signed_url, setUploadPct);
      setUploadPct(100);

      // Upload audio to R2 (no progress needed — it's small)
      const audioUrlData = await getR2Url(audioFile, "audio.wav");
      await r2Put(audioFile, audioUrlData.signed_url);

      // ── Stage 3: Transcribe — server fetches audio from R2 (tiny JSON request) ─
      setStage("transcribing");

      const form = new FormData();
      form.append("audio_url",    audioUrlData.public_url);
      form.append("video_url",    videoUrlData.public_url);
      form.append("title",        title || file.name.replace(/\.[^.]+$/, ""));
      form.append("language",     language);
      form.append("aspect_ratio", aspectRatio);

      const res  = await fetch("/api/projects/transcribe", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Transcription failed");

      setCaptionCount(data.captionCount ?? 0);
      setStage("done");
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      setTimeout(() => router.push(`/projects/${data.projectId}/edit`), 1200);

    } catch (err) {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      setStage("idle");
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      const isConnectionError = msg.toLowerCase().includes("failed to fetch") || msg.toLowerCase().includes("network") || msg.toLowerCase().includes("connection");
      toast.error(
        isConnectionError
          ? "Connection lost — this usually happens when you switch tabs during transcription. Please try again and keep this tab open."
          : msg,
        { duration: 8000 }
      );
    }
  }

  // ── Progress screen ─────────────────────────────────────────────────────────
  if (stage !== "idle") {
    const steps = [
      { key: "extracting",   label: "Extracting audio track",        icon: "🎵" },
      { key: "uploading",    label: stage === "uploading"
                                      ? `Uploading video… ${uploadPct}%`
                                      : "Uploading video",              icon: "☁️" },
      { key: "transcribing", label: "Transcribing with AI",           icon: "🎙️" },
      { key: "done",         label: stage === "done"
                                      ? `${captionCount} captions ready!`
                                      : "Building caption timeline",    icon: "✨" },
    ];
    const ORDER  = ["extracting", "uploading", "transcribing", "done"] as const;
    const active = ORDER.indexOf(stage as typeof ORDER[number]);

    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-base">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gold-500/15">
            {stage === "done"
              ? <CheckCircle2 className="h-10 w-10 text-green-400" />
              : <Loader2 className="h-10 w-10 text-gold-500 animate-spin" />}
          </div>
          <h2 className="font-display text-2xl font-bold text-white mb-1">
            {stage === "done" ? "Captions ready!" : "Working on it…"}
          </h2>
          <p className="text-sm text-subtle mb-2">
            {stage === "done"
              ? "Opening your editor…"
              : "Hang tight — this takes 15–60 seconds depending on video length."}
          </p>
          {stage !== "done" && (
            <p className="text-xs text-amber-400/80 mb-6 flex items-center justify-center gap-1.5">
              <span>⚠️</span> Keep this tab open until it finishes
            </p>
          )}

          <div className="space-y-2.5">
            {steps.map((s, i) => {
              const isDone    = i < active;
              const isCurrent = i === active;
              return (
                <div
                  key={s.key}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 text-sm transition-all duration-500",
                    isDone    && "border-green-500/20 bg-green-500/5 text-green-400",
                    isCurrent && "border-gold-500/30 bg-gold-500/10 text-gold-400",
                    !isDone && !isCurrent && "border-border bg-surface text-muted"
                  )}
                >
                  <span className="text-base">{s.icon}</span>
                  <span className="flex-1 text-left font-medium">{s.label}</span>
                  {isDone    && <CheckCircle2 className="h-4 w-4 text-green-400" />}
                  {isCurrent && stage !== "done" && (
                    <div className="h-4 w-4 rounded-full border-2 border-gold-500 border-t-transparent animate-spin" />
                  )}
                  {isCurrent && stage === "done" && <CheckCircle2 className="h-4 w-4 text-green-400" />}
                </div>
              );
            })}
          </div>

          {/* Upload progress bar */}
          {stage === "uploading" && (
            <div className="mt-5 space-y-1.5">
              <div className="h-1.5 w-full rounded-full bg-overlay overflow-hidden">
                <div
                  className="h-1.5 rounded-full bg-gradient-gold transition-all duration-300"
                  style={{ width: `${uploadPct}%` }}
                />
              </div>
              <p className="text-xs text-muted">{uploadPct}% uploaded</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Main form ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-xl">
        <Link
          href="/projects/new"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-subtle hover:text-white transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Link>

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
                isDragging  ? "border-gold-500 bg-gold-500/10"
                : file      ? "border-green-500/40 bg-green-500/5 cursor-default"
                            : "border-border hover:border-gold-500/50 hover:bg-gold-500/5"
              )}
            >
              <input ref={inputRef} type="file" accept={ACCEPTED_EXT} onChange={onFileChange} className="sr-only" />

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
                    {isDragging ? <Film className="h-6 w-6 text-gold-500" /> : <Upload className="h-6 w-6 text-subtle" />}
                  </div>
                  <p className="text-sm font-medium text-white">
                    {isDragging ? "Drop it here" : "Drop your video here"}
                  </p>
                  <p className="mt-1 text-xs text-muted">or click to browse</p>
                  <p className="mt-3 text-[11px] text-muted">MP4, MOV, WebM · up to 1 GB · auto-deleted after 30 days</p>
                </>
              )}
            </div>

            <p className="mt-2 text-xs text-muted flex items-start gap-1.5">
              <span className="text-gold-500 flex-shrink-0">💡</span>
              Audio is extracted in your browser before uploading — your video goes straight to storage, not through our server.
            </p>
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
            {/* Auto-detect as full-width first row */}
            <button
              onClick={() => setLanguage("auto")}
              className={cn(
                "mb-2 w-full flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all",
                language === "auto"
                  ? "border-gold-500/50 bg-gold-500/10 text-gold-400"
                  : "border-border bg-surface text-subtle hover:border-border-strong hover:text-white"
              )}
            >
              <span className="text-base">🌐</span>
              Auto-detect language
              {language === "auto" && (
                <span className="ml-auto text-[10px] text-gold-500 font-semibold">Selected</span>
              )}
            </button>
            <div className="grid grid-cols-5 gap-2">
              {LANGUAGES.filter(l => l.value !== "auto").map((lang) => (
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
              {[
                "Audio is extracted in your browser (fast, private)",
                "Video uploads directly to storage — no server detour",
                "AI transcribes every word with exact timestamps",
                "Captions land in the editor, ready to style and export",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <span className="text-gold-500 flex-shrink-0 mt-0.5">✓</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <Button className="w-full" size="lg" disabled={!file} onClick={handleSubmit}>
            <Captions className="h-4 w-4" />
            Generate captions
          </Button>
        </div>
      </div>
    </div>
  );
}

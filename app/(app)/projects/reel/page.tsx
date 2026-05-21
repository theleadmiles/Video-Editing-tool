"use client";

import { useState, useRef, useCallback, DragEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MUSIC_MOODS } from "@/lib/ai/elevenlabs";
import { cn } from "@/lib/utils";
import {
  ChevronLeft, Upload, X, Loader2,
  Check, Plus, Sparkles,
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────

const ASPECT_RATIOS = [
  { value: "9:16", label: "9:16", desc: "Reels / Shorts", icon: "▯" },
  { value: "16:9", label: "16:9", desc: "YouTube",        icon: "▭" },
  { value: "1:1",  label: "1:1",  desc: "Feed post",      icon: "□" },
] as const;

const CLIP_DURATIONS = [
  { value: 1, label: "1s", desc: "Fast cut" },
  { value: 2, label: "2s", desc: "Quick" },
  { value: 3, label: "3s", desc: "Standard" },
  { value: 4, label: "4s", desc: "Slow" },
];

const TRANSITIONS = [
  { value: "cut",  label: "Hard Cut", desc: "Instant" },
  { value: "fade", label: "Fade",     desc: "Smooth" },
];

const ACCEPTED_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-matroska"];
const MAX_CLIPS = 8;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Capture a thumbnail from a video URL using canvas (runs in browser) */
async function extractThumbnail(url: string): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.src = url;
    video.currentTime = 0.5;
    const fallback = setTimeout(() => resolve(url), 4000);
    video.onseeked = () => {
      clearTimeout(fallback);
      try {
        const canvas = document.createElement("canvas");
        canvas.width  = Math.min(video.videoWidth,  320);
        canvas.height = Math.min(video.videoHeight, 240);
        canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      } catch { resolve(url); }
    };
    video.onerror = () => { clearTimeout(fallback); resolve(url); };
  });
}

/** Read the duration of a video from its URL */
async function getVideoDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.src = url;
    const fallback = setTimeout(() => resolve(5), 4000);
    video.onloadedmetadata = () => { clearTimeout(fallback); resolve(video.duration || 5); };
    video.onerror = () => { clearTimeout(fallback); resolve(5); };
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface UploadedClip {
  id: string;
  file: File;
  url: string;
  thumbnail: string;
  duration: number;
  uploading: boolean;
  uploadProgress: number; // 0–1
  error?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ReelCreatorPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [clips, setClips]             = useState<UploadedClip[]>([]);
  const [dragging, setDragging]       = useState(false);
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9" | "1:1">("9:16");
  const [clipDuration, setClipDuration] = useState(3);
  const [transition, setTransition]   = useState("cut");
  const [musicMood, setMusicMood]     = useState("upbeat");
  const [title, setTitle]             = useState("");
  const [creating, setCreating]       = useState(false);

  // ── Upload ────────────────────────────────────────────────────────────────

  /**
   * Upload a video clip directly to Cloudflare R2 via a presigned URL.
   * This completely bypasses Vercel's serverless body-size limit (~4.5 MB)
   * so large video files work without issues.
   */
  async function uploadOneClip(
    file: File,
    clipId: string,
  ): Promise<{ url: string } | null> {
    try {
      // Step 1 — get a short-lived presigned R2 PUT URL from our API
      const urlRes = await fetch("/api/storage/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, content_type: file.type }),
      });
      const urlData = await urlRes.json();
      if (!urlRes.ok) throw new Error(urlData.error || "Could not get upload URL");

      const { signed_url, public_url } = urlData as { signed_url: string; public_url: string };

      // Step 2 — PUT the file directly to R2 (browser → R2, no Vercel middleman)
      // Use XHR so we can track real upload progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", signed_url);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = e.loaded / e.total;
            setClips((prev) =>
              prev.map((c) => c.id === clipId ? { ...c, uploadProgress: pct } : c)
            );
          }
        };
        xhr.onload  = () => xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`));
        xhr.onerror = () => reject(new Error("Network error — check your connection"));
        xhr.send(file);
      });

      return { url: public_url };
    } catch (e) {
      console.error("Clip upload error:", e);
      return null;
    }
  }

  const processFiles = useCallback(async (files: File[]) => {
    const valid = files.filter((f) => ACCEPTED_TYPES.includes(f.type));
    if (!valid.length) { toast.error("Only MP4, MOV, or WebM videos are supported"); return; }

    const canAdd = MAX_CLIPS - clips.length;
    const toAdd  = valid.slice(0, canAdd);
    if (toAdd.length < valid.length) toast.info(`Max ${MAX_CLIPS} clips — added first ${toAdd.length}`);

    // Insert placeholders immediately so the user sees progress
    const placeholders: UploadedClip[] = toAdd.map((file) => ({
      id:             `clip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      file,
      url:            "",
      thumbnail:      URL.createObjectURL(file),
      duration:       0,
      uploading:      true,
      uploadProgress: 0,
    }));
    setClips((prev) => [...prev, ...placeholders]);

    // Upload sequentially to avoid hammering the API
    for (const ph of placeholders) {
      const result = await uploadOneClip(ph.file, ph.id);
      if (!result?.url) {
        setClips((prev) => prev.map((c) =>
          c.id === ph.id ? { ...c, uploading: false, uploadProgress: 0, error: "Upload failed" } : c
        ));
        toast.error(`Failed to upload ${ph.file.name}`);
        continue;
      }

      const [thumbnail, duration] = await Promise.all([
        extractThumbnail(result.url),
        getVideoDuration(result.url),
      ]);

      setClips((prev) => prev.map((c) =>
        c.id === ph.id
          ? { ...c, url: result.url, thumbnail, duration, uploading: false }
          : c
      ));
    }
  }, [clips.length]);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    processFiles(Array.from(e.dataTransfer.files));
  }

  function handleFileInput(e: ChangeEvent<HTMLInputElement>) {
    processFiles(Array.from(e.target.files || []));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeClip(id: string) {
    setClips((prev) => prev.filter((c) => c.id !== id));
  }

  // ── Create reel ───────────────────────────────────────────────────────────

  async function createReel() {
    const ready = clips.filter((c) => c.url && !c.error);
    if (!ready.length) { toast.error("Upload at least one clip"); return; }
    if (clips.some((c) => c.uploading)) { toast.error("Wait for uploads to finish"); return; }

    setCreating(true);
    try {
      const autoTitle =
        title.trim() ||
        `Reel · ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;

      const res = await fetch("/api/projects/create-reel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: autoTitle,
          clips: ready.map((c) => ({ url: c.url, thumbnail: c.thumbnail, duration: c.duration })),
          musicMood,
          clipDuration,
          transition,
          aspectRatio,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create reel");
      toast.success("Reel created! Opening editor…");
      router.push(`/projects/${data.projectId}/edit`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setCreating(false);
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const readyCount       = clips.filter((c) => c.url && !c.error).length;
  const hasUploading     = clips.some((c) => c.uploading);
  const totalDuration    = readyCount * clipDuration;
  const canCreate        = readyCount > 0 && !hasUploading && !creating;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-base">

      {/* Header */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-surface/90 backdrop-blur px-4">
        <div className="flex items-center gap-3">
          <Link
            href="/projects"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-white hover:bg-elevated transition-all"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-sm font-semibold text-white">Reel Creator</h1>
            <p className="text-[10px] text-muted">Sequence clips → music → open in editor</p>
          </div>
        </div>

        <Button onClick={createReel} disabled={!canCreate} loading={creating} size="sm" className="gap-2">
          <Sparkles className="h-3.5 w-3.5" />
          {creating ? "Creating…" : "Create Reel"}
          {canCreate && (
            <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">
              {readyCount} clip{readyCount !== 1 ? "s" : ""} · {totalDuration}s
            </span>
          )}
        </Button>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-8 space-y-10">

        {/* ── Step 1: Upload ── */}
        <section>
          <SectionHeader n={1} title="Upload Your Clips" sub={`${clips.length} / ${MAX_CLIPS} clips`} />

          {/* Drop zone — shown when there's room */}
          {clips.length < MAX_CLIPS && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed cursor-pointer transition-all py-10 mb-4",
                dragging
                  ? "border-gold-500 bg-gold-500/5"
                  : "border-border bg-elevated/20 hover:border-gold-500/40 hover:bg-elevated/40"
              )}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-500/10 mb-3">
                <Upload className="h-6 w-6 text-gold-500" />
              </div>
              <p className="text-sm font-medium text-white mb-1">
                {dragging ? "Drop to add clips" : "Drag & drop clips here"}
              </p>
              <p className="text-xs text-muted">or click to browse · MP4, MOV, WebM</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp4,.mov,.webm,.mkv"
                multiple
                className="hidden"
                onChange={handleFileInput}
              />
            </div>
          )}

          {/* Clip grid */}
          {clips.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {clips.map((clip, i) => (
                <div
                  key={clip.id}
                  className={cn(
                    "relative rounded-xl overflow-hidden border aspect-video bg-elevated",
                    clip.error ? "border-ember-500/40" : "border-border"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={clip.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />

                  {/* Index badge */}
                  <span className="absolute top-1.5 left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[10px] font-bold text-white">
                    {i + 1}
                  </span>

                  {/* Uploading overlay with progress bar */}
                  {clip.uploading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 px-3 gap-2">
                      <Loader2 className="h-4 w-4 text-gold-500 animate-spin" />
                      <div className="w-full">
                        <div className="h-1 w-full rounded-full bg-white/20">
                          <div
                            className="h-1 rounded-full bg-gold-500 transition-all duration-200"
                            style={{ width: `${Math.max(clip.uploadProgress * 100, 4)}%` }}
                          />
                        </div>
                        <p className="text-[9px] text-white/70 text-center mt-1">
                          {clip.uploadProgress > 0
                            ? `${Math.round(clip.uploadProgress * 100)}%`
                            : "Starting…"}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Error overlay */}
                  {clip.error && !clip.uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-ember-500/20">
                      <span className="text-[10px] text-ember-400 px-2 text-center">{clip.error}</span>
                    </div>
                  )}

                  {/* Ready tick */}
                  {!clip.uploading && !clip.error && clip.url && (
                    <div className="absolute top-1.5 right-6">
                      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-green-500">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                    </div>
                  )}

                  {/* Duration */}
                  {clip.duration > 0 && (
                    <span className="absolute bottom-1.5 left-1.5 text-[10px] text-white/80 font-mono">
                      {clip.duration.toFixed(1)}s
                    </span>
                  )}

                  {/* Remove */}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeClip(clip.id); }}
                    className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-ember-500/80 transition-all"
                    aria-label="Remove clip"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {/* Add-more button */}
              {clips.length < MAX_CLIPS && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border aspect-video text-muted hover:border-gold-500/40 hover:text-gold-500 transition-all"
                >
                  <Plus className="h-5 w-5 mb-1" />
                  <span className="text-[10px]">Add clip</span>
                </button>
              )}
            </div>
          )}

          {readyCount > 0 && (
            <p className="mt-2 text-[11px] text-muted">
              {readyCount} uploaded · at {clipDuration}s per clip → <span className="text-gold-500 font-medium">{totalDuration}s reel</span>
            </p>
          )}
        </section>

        {/* ── Step 2: Music ── */}
        <section>
          <SectionHeader n={2} title="Music" sub="AI picks a matching track from Pixabay" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {MUSIC_MOODS.map((mood) => (
              <button
                key={mood.id}
                onClick={() => setMusicMood(mood.id)}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all",
                  musicMood === mood.id
                    ? "border-gold-500/50 bg-gold-500/10"
                    : "border-border bg-elevated/40 hover:border-border-strong"
                )}
              >
                <span className="text-xl leading-none flex-shrink-0">{mood.emoji}</span>
                <span className={cn(
                  "text-xs font-medium leading-tight",
                  musicMood === mood.id ? "text-gold-500" : "text-white"
                )}>
                  {mood.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Step 3: Style ── */}
        <section>
          <SectionHeader n={3} title="Style" />
          <div className="space-y-5">

            {/* Aspect ratio */}
            <div>
              <p className="text-[11px] text-muted uppercase tracking-wider font-semibold mb-2">Aspect ratio</p>
              <div className="flex gap-2">
                {ASPECT_RATIOS.map((ar) => (
                  <button
                    key={ar.value}
                    onClick={() => setAspectRatio(ar.value)}
                    className={cn(
                      "flex-1 flex flex-col items-center rounded-xl border p-3 transition-all",
                      aspectRatio === ar.value
                        ? "border-gold-500/50 bg-gold-500/10"
                        : "border-border bg-elevated/40 hover:border-border-strong"
                    )}
                  >
                    <span className="text-2xl mb-1" style={{ lineHeight: 1 }}>{ar.icon}</span>
                    <span className={cn("text-xs font-bold", aspectRatio === ar.value ? "text-gold-500" : "text-white")}>{ar.label}</span>
                    <span className="text-[10px] text-muted">{ar.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Seconds per clip */}
            <div>
              <p className="text-[11px] text-muted uppercase tracking-wider font-semibold mb-2">Seconds per clip</p>
              <div className="flex gap-2">
                {CLIP_DURATIONS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setClipDuration(d.value)}
                    className={cn(
                      "flex-1 flex flex-col items-center rounded-xl border p-3 transition-all",
                      clipDuration === d.value
                        ? "border-gold-500/50 bg-gold-500/10"
                        : "border-border bg-elevated/40 hover:border-border-strong"
                    )}
                  >
                    <span className={cn("text-sm font-bold", clipDuration === d.value ? "text-gold-500" : "text-white")}>{d.label}</span>
                    <span className="text-[10px] text-muted">{d.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Transitions */}
            <div>
              <p className="text-[11px] text-muted uppercase tracking-wider font-semibold mb-2">Transitions</p>
              <div className="flex gap-2">
                {TRANSITIONS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTransition(t.value)}
                    className={cn(
                      "flex-1 flex flex-col items-center rounded-xl border p-3 transition-all",
                      transition === t.value
                        ? "border-gold-500/50 bg-gold-500/10"
                        : "border-border bg-elevated/40 hover:border-border-strong"
                    )}
                  >
                    <span className={cn("text-xs font-bold", transition === t.value ? "text-gold-500" : "text-white")}>{t.label}</span>
                    <span className="text-[10px] text-muted">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Step 4: Title ── */}
        <section>
          <SectionHeader n={4} title="Project Title" sub="optional" />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`Reel · ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
            maxLength={80}
            className="w-full rounded-xl border border-border bg-elevated px-4 py-3 text-sm text-white placeholder:text-muted focus:border-gold-500/50 focus:outline-none"
          />
        </section>

        {/* ── Create button ── */}
        <div className="pb-10">
          <Button
            className="w-full h-12 text-sm gap-2"
            onClick={createReel}
            disabled={!canCreate}
            loading={creating}
          >
            <Sparkles className="h-4 w-4" />
            {creating
              ? "Creating your reel…"
              : canCreate
                ? `Create Reel · ${readyCount} clip${readyCount !== 1 ? "s" : ""} · ${totalDuration}s`
                : "Upload at least one clip to continue"}
          </Button>
          {canCreate && (
            <p className="mt-2 text-center text-[11px] text-muted">
              Opens straight in the editor — fine-tune cuts, add captions &amp; export
            </p>
          )}
        </div>

      </div>
    </div>
  );
}

// ── Small helper component ────────────────────────────────────────────────────

function SectionHeader({ n, title, sub }: { n: number; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gold-500 text-white text-[11px] font-bold">
        {n}
      </div>
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      {sub && <span className="text-xs text-muted">{sub}</span>}
    </div>
  );
}

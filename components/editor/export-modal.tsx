"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Download, X, Film, Loader2, CheckCircle2, Cloud, Smartphone, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getNativeMp4Mime, transcodeWebmToMp4 } from "@/lib/mp4-converter";
import type { Project, TimelineData, TimelineClip } from "@/types";

interface ExportModalProps {
  project: Project;
  onClose: () => void;
}

type Phase = "idle" | "loading" | "rendering" | "transcoding" | "uploading" | "done";
type Format = "webm" | "mp4";
type Resolution = "720p" | "1080p";

export function ExportModal({ project, onClose }: ExportModalProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [transcodeProgress, setTranscodeProgress] = useState(0);
  const [format, setFormat] = useState<Format>("mp4");
  const [resolution, setResolution] = useState<Resolution>("1080p");
  const [saveToCloud, setSaveToCloud] = useState(true);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stopRef = useRef(false);
  // set to the native MP4 mime used for recording, null = need to transcode
  const nativeMp4MimeRef = useRef<string | null>(null);

  const timeline = project.timeline_data as TimelineData | null;
  const videoTrack = timeline?.tracks?.find((t) => t.type === "video");
  const captionTrack = timeline?.tracks?.find((t) => t.type === "text");
  const voiceoverTrack = timeline?.tracks?.find((t) => t.id === "voiceover_track");
  const musicTrack = timeline?.tracks?.find((t) => t.id === "music_track");

  const brollClips = (videoTrack?.clips || []) as TimelineClip[];
  const captions = (captionTrack?.clips || []) as TimelineClip[];
  const voiceoverUrl = voiceoverTrack?.clips?.[0]?.url || "";
  const musicClip = musicTrack?.clips?.[0];
  const musicUrl = musicClip?.url || "";
  // trim_start: the best-segment offset stored during reel creation
  const musicTrimStart: number = (musicClip as (typeof musicClip & { trim_start?: number }) | undefined)?.trim_start ?? 0;
  const totalDuration = timeline?.duration || project.duration_seconds || 45;

  const DIMS: Record<Resolution, Record<string, { w: number; h: number }>> = {
    "720p":  { "9:16": { w: 720,  h: 1280 }, "16:9": { w: 1280, h: 720  }, "1:1": { w: 720,  h: 720  } },
    "1080p": { "9:16": { w: 1080, h: 1920 }, "16:9": { w: 1920, h: 1080 }, "1:1": { w: 1080, h: 1080 } },
  };
  const dim = DIMS[resolution][project.aspect_ratio] || DIMS[resolution]["9:16"];

  /** Draw a single frame at time t using real video el (or thumbnail fallback) */
  function drawFrame(
    ctx: CanvasRenderingContext2D,
    t: number,
    videoEls: HTMLVideoElement[],
    fallbackImgs: (HTMLImageElement | null)[],
    w: number,
    h: number
  ) {
    // Determine active clip index
    let elapsed = 0;
    let idx = Math.max(0, brollClips.length - 1);
    for (let i = 0; i < brollClips.length; i++) {
      if (t >= elapsed && t < elapsed + brollClips[i].duration) { idx = i; break; }
      elapsed += brollClips[i].duration;
    }

    ctx.fillStyle = "#0A0A0A";
    ctx.fillRect(0, 0, w, h);

    // Use live video frame if the element is ready, else fall back to thumbnail
    const videoEl = videoEls[idx];
    const useVideo = videoEl && videoEl.readyState >= 2 && videoEl.videoWidth > 0;
    const srcW = useVideo ? videoEl.videoWidth  : (fallbackImgs[idx]?.width  ?? 0);
    const srcH = useVideo ? videoEl.videoHeight : (fallbackImgs[idx]?.height ?? 0);
    const drawSrc: CanvasImageSource | null = useVideo ? videoEl : (fallbackImgs[idx] ?? null);

    if (drawSrc && srcW > 0 && srcH > 0) {
      // Apply color_grade CSS-like transform on canvas via filter
      const grade = (brollClips[idx] as TimelineClip & { color_grade?: { brightness: number; contrast: number; saturation: number } }).color_grade;
      if (grade) {
        ctx.filter = `brightness(${grade.brightness}) contrast(${grade.contrast}) saturate(${grade.saturation})`;
      } else {
        ctx.filter = "none";
      }

      const ir = srcW / srcH;
      const cr = w / h;
      let sw: number, sh: number, sx: number, sy: number;
      if (ir > cr) { sh = h; sw = h * ir; sy = 0; sx = (sw - w) / 2; }
      else { sw = w; sh = w / ir; sx = 0; sy = (sh - h) / 2; }
      ctx.drawImage(drawSrc, -sx, -sy, sw, sh);
      ctx.filter = "none";
    }

    // Gradient vignette overlay
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(0,0,0,0.25)");
    g.addColorStop(0.5, "rgba(0,0,0,0.05)");
    g.addColorStop(1, "rgba(0,0,0,0.75)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Captions
    const cap = captions.find((c) => t >= c.start_time && t < c.start_time + c.duration);
    if (cap?.text) {
      const fs = w >= 1280 ? 54 : 44;
      ctx.font = `bold ${fs}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = cap.color || "#FFFFFF";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.9)";
      ctx.shadowBlur = 14;

      const maxW = w * 0.84;
      const words = String(cap.text).split(" ");
      const lines: string[] = [];
      let line = "";
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = word; }
        else line = test;
      }
      if (line) lines.push(line);

      const lh = fs * 1.35;
      const startY = h * 0.8 - ((lines.length - 1) * lh) / 2;
      lines.forEach((l, i) => ctx.fillText(l, w / 2, startY + i * lh));
      ctx.shadowBlur = 0;
    }
  }

  async function saveRenderToCloud(blob: Blob, finalFormat: Format) {
    setPhase("uploading");
    try {
      const file = new File(
        [blob],
        `${project.title || "boltcut"}.${finalFormat}`,
        { type: finalFormat === "mp4" ? "video/mp4" : "video/webm" }
      );
      const form = new FormData();
      form.append("file", file);
      form.append("project_id", project.id);
      form.append("project_title", project.title || "Untitled");
      form.append("format", finalFormat);
      form.append("aspect_ratio", project.aspect_ratio);
      form.append("duration", String(totalDuration));

      const res = await fetch("/api/render-jobs", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cloud save failed");
      setDownloadUrl(data.url);
      toast.success("Saved to your Renders library");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cloud save failed (file still downloaded locally)");
    }
  }

  async function handleBlobReady(blob: Blob, audioCtx: AudioContext | null, usedMime: string) {
    audioCtx?.close();
    let finalBlob: Blob = blob;
    let finalFormat: Format = "webm";

    const usedNativeMp4 = usedMime.startsWith("video/mp4");

    if (format === "mp4" && usedNativeMp4) {
      // Browser recorded native MP4 — no transcode needed
      finalBlob = new Blob([blob], { type: "video/mp4" });
      finalFormat = "mp4";
    } else if (format === "mp4") {
      // Need to transcode WebM → MP4
      setPhase("transcoding");
      setTranscodeProgress(0);
      try {
        finalBlob = await transcodeWebmToMp4(
          blob,
          (ratio) => setTranscodeProgress(ratio),
        );
        finalFormat = "mp4";
      } catch (err) {
        console.error("MP4 transcode failed:", err);
        toast.error("MP4 conversion failed — downloading as WebM");
        finalBlob = blob;
        finalFormat = "webm";
      }
    } else {
      finalFormat = "webm";
    }

    // Trigger local download
    const url = URL.createObjectURL(finalBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(project.title || "boltcut").replace(/[^a-z0-9]/gi, "-").toLowerCase()}.${finalFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (saveToCloud) {
      await saveRenderToCloud(finalBlob, finalFormat);
    }

    setPhase("done");
  }

  const startExport = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    stopRef.current = false;
    setPhase("loading");
    setProgress(0);
    setTranscodeProgress(0);
    setDownloadUrl(null);

    const { w, h } = dim;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;

    // ── Load video elements (real motion) + thumbnail fallbacks ──────────────
    const videoEls: HTMLVideoElement[] = brollClips.map((clip) => {
      const v = document.createElement("video");
      if (clip.url) v.src = clip.url;
      v.muted = true; // audio handled separately via AudioContext
      v.crossOrigin = "anonymous";
      v.playsInline = true;
      v.preload = "auto";
      return v;
    });

    const fallbackImgs = await Promise.all(
      brollClips.map((c) =>
        c.thumbnail
          ? new Promise<HTMLImageElement | null>((res) => {
              const img = new Image();
              img.crossOrigin = "anonymous";
              img.onload = () => res(img);
              img.onerror = () => res(null);
              img.src = c.thumbnail!;
            })
          : Promise.resolve(null)
      )
    );

    // Wait for videos to buffer (resolve on canplay or error, don't block forever)
    await Promise.all(
      videoEls.map(
        (v) =>
          new Promise<void>((resolve) => {
            if (!v.src) { resolve(); return; }
            const done = () => resolve();
            v.addEventListener("canplay", done, { once: true });
            v.addEventListener("error", done, { once: true });
            v.load();
            // max 5s wait per clip
            setTimeout(resolve, 5000);
          })
      )
    );

    // ── Audio setup ───────────────────────────────────────────────────────────
    let audioCtx: AudioContext | null = null;
    let destStream: MediaStream | null = null;
    let voiceSrc: AudioBufferSourceNode | null = null;
    let musicSrc: AudioBufferSourceNode | null = null;

    try {
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const dest = audioCtx.createMediaStreamDestination();

      if (voiceoverUrl) {
        const buf = await (await fetch(voiceoverUrl)).arrayBuffer();
        const decoded = await audioCtx.decodeAudioData(buf);
        voiceSrc = audioCtx.createBufferSource();
        voiceSrc.buffer = decoded;
        const g = audioCtx.createGain(); g.gain.value = 1;
        voiceSrc.connect(g).connect(dest);
      }
      if (musicUrl) {
        try {
          const buf = await (await fetch(musicUrl)).arrayBuffer();
          const decoded = await audioCtx.decodeAudioData(buf);
          musicSrc = audioCtx.createBufferSource();
          musicSrc.buffer = decoded;
          const g = audioCtx.createGain(); g.gain.value = 0.2;
          musicSrc.connect(g).connect(dest);
          // trim_start: begin playback at the beat-synced best-segment offset
          if (musicTrimStart > 0 && musicTrimStart < decoded.duration) {
            // Store offset — used in musicSrc.start() below
            (musicSrc as typeof musicSrc & { _trimStart?: number })._trimStart = musicTrimStart;
          }
        } catch { /* music is optional */ }
      }
      destStream = dest.stream;
    } catch { /* export video-only if audio fails */ }

    // ── Determine MIME: native MP4 first, then WebM ───────────────────────────
    const nativeMp4Mime = format === "mp4" ? getNativeMp4Mime() : null;
    nativeMp4MimeRef.current = nativeMp4Mime;

    const mime =
      nativeMp4Mime ??
      (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm");

    const videoStream = canvas.captureStream(30);
    const combined = new MediaStream([
      ...videoStream.getVideoTracks(),
      ...(destStream?.getAudioTracks() || []),
    ]);
    const videoBitrate = resolution === "1080p" ? 8_000_000 : 3_000_000;
    const recorder = new MediaRecorder(combined, { mimeType: mime, videoBitsPerSecond: videoBitrate });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mime });
      handleBlobReady(blob, audioCtx, mime);
    };

    setPhase("rendering");
    recorder.start(200);

    voiceSrc?.start(0);
    // Start music at the best-segment offset (trim_start), default 0
    const musicOffset = (musicSrc as (typeof musicSrc & { _trimStart?: number }) | null)?._trimStart ?? 0;
    musicSrc?.start(0, musicOffset);

    // ── Sequential clip playback ──────────────────────────────────────────────
    // Precompute start times so we can switch clips at the right moment
    const clipStartTimes = brollClips.map((_, i) =>
      brollClips.slice(0, i).reduce((s, c) => s + c.duration, 0)
    );

    let activeVideoIdx = -1;

    function activateClip(idx: number) {
      if (idx === activeVideoIdx) return;
      if (activeVideoIdx >= 0) {
        videoEls[activeVideoIdx]?.pause();
      }
      activeVideoIdx = idx;
      const v = videoEls[idx];
      if (v && v.src) {
        v.currentTime = 0;
        v.play().catch(() => {});
      }
    }

    // Start first clip immediately
    if (videoEls.length > 0) activateClip(0);

    const t0 = performance.now();

    function render() {
      if (stopRef.current) {
        videoEls.forEach((v) => v.pause());
        recorder.stop();
        audioCtx?.close();
        return;
      }

      const t = (performance.now() - t0) / 1000;
      setProgress(Math.min(t / totalDuration, 1));

      // Switch clip if we've crossed a boundary
      let targetIdx = 0;
      for (let i = clipStartTimes.length - 1; i >= 0; i--) {
        if (t >= clipStartTimes[i]) { targetIdx = i; break; }
      }
      activateClip(targetIdx);

      drawFrame(ctx, t, videoEls, fallbackImgs, w, h);

      if (t < totalDuration) {
        requestAnimationFrame(render);
      } else {
        videoEls.forEach((v) => v.pause());
        recorder.stop();
      }
    }

    requestAnimationFrame(render);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, brollClips, captions, voiceoverUrl, musicUrl, totalDuration, format, resolution, saveToCloud]);

  const isRendering = phase !== "idle" && phase !== "done";
  const needsTranscode = format === "mp4" && !getNativeMp4Mime();
  const stepCount = format === "mp4"
    ? (needsTranscode ? (saveToCloud ? "3" : "2") : (saveToCloud ? "2" : "1"))
    : (saveToCloud ? "2" : "1");

  return (
    <Dialog
      open={true}
      onClose={onClose}
      ariaLabel="Export video"
      closeOnEsc={!isRendering}
      closeOnBackdrop={!isRendering}
      className="max-w-md"
    >
      <div className="p-6">
        <canvas ref={canvasRef} className="hidden" />

        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-white">Export Video</h2>
            <p className="text-xs text-muted mt-0.5">Renders directly in your browser</p>
          </div>
          <button
            onClick={onClose}
            disabled={isRendering}
            aria-label="Close export dialog"
            className="text-muted hover:text-white transition-colors disabled:opacity-30"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Idle — picker UI */}
        {phase === "idle" && (
          <div className="space-y-4">
            {/* Format picker */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">Output format</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setFormat("mp4")}
                  aria-pressed={format === "mp4"}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-all",
                    format === "mp4"
                      ? "border-gold-500/60 bg-gold-500/10"
                      : "border-border bg-elevated/30 hover:border-border-strong"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-white">MP4</span>
                    <Smartphone className={cn("h-4 w-4", format === "mp4" ? "text-gold-500" : "text-muted")} />
                  </div>
                  <p className="text-[10px] text-muted leading-snug">
                    Universal · iPhone · WhatsApp · YouTube
                  </p>
                  <p className="mt-1 text-[10px] text-gold-500/80">
                    {getNativeMp4Mime() ? "Native · No transcode" : "Recommended"}
                  </p>
                </button>
                <button
                  onClick={() => setFormat("webm")}
                  aria-pressed={format === "webm"}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-all",
                    format === "webm"
                      ? "border-gold-500/60 bg-gold-500/10"
                      : "border-border bg-elevated/30 hover:border-border-strong"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-white">WebM</span>
                    <Zap className={cn("h-4 w-4", format === "webm" ? "text-gold-500" : "text-muted")} />
                  </div>
                  <p className="text-[10px] text-muted leading-snug">
                    Faster · Chrome / Firefox / Edge only
                  </p>
                  <p className="mt-1 text-[10px] text-muted">~10-20s faster</p>
                </button>
              </div>
            </div>

            {/* Resolution picker */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">Resolution</p>
              <div className="grid grid-cols-2 gap-2">
                {(["720p", "1080p"] as Resolution[]).map((res) => (
                  <button
                    key={res}
                    onClick={() => setResolution(res)}
                    aria-pressed={resolution === res}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-all",
                      resolution === res
                        ? "border-gold-500/60 bg-gold-500/10"
                        : "border-border bg-elevated/30 hover:border-border-strong"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-white">{res}</span>
                      {res === "1080p" && <Zap className={cn("h-4 w-4", resolution === "1080p" ? "text-gold-500" : "text-muted")} />}
                    </div>
                    <p className="text-[10px] text-muted">
                      {res === "720p"
                        ? project.aspect_ratio === "16:9" ? "1280×720 · Fast" : "720×1280 · Fast"
                        : project.aspect_ratio === "16:9" ? "1920×1080 · HD" : "1080×1920 · Full HD"}
                    </p>
                    {res === "1080p" && <p className="mt-1 text-[10px] text-gold-500/80">Recommended</p>}
                  </button>
                ))}
              </div>
            </div>

            {/* Details */}
            <div className="rounded-xl border border-border bg-elevated p-3 space-y-2">
              {[
                { label: "Resolution", value: `${dim.w} × ${dim.h}` },
                { label: "Frame rate", value: "30fps" },
                { label: "Duration", value: `${totalDuration}s` },
                { label: "Audio", value: voiceoverUrl ? "Voice + Music mixed" : musicUrl ? "Music" : "No audio" },
                { label: "Clips", value: `${brollClips.length} clip${brollClips.length !== 1 ? "s" : ""}` },
              ].map((row) => (
                <div key={row.label} className="flex justify-between text-xs">
                  <span className="text-muted">{row.label}</span>
                  <span className="text-white font-medium">{row.value}</span>
                </div>
              ))}
            </div>

            {/* Cloud save toggle */}
            <button
              onClick={() => setSaveToCloud((v) => !v)}
              className={cn(
                "w-full flex items-center justify-between rounded-xl border p-3 transition-all",
                saveToCloud ? "border-gold-500/40 bg-gold-500/5" : "border-border bg-elevated/30"
              )}
            >
              <div className="flex items-start gap-2.5 text-left">
                <Cloud className={cn("h-4 w-4 mt-0.5 flex-shrink-0", saveToCloud ? "text-gold-500" : "text-muted")} />
                <div>
                  <p className="text-xs font-medium text-white">Save to cloud library</p>
                  <p className="text-[10px] text-muted mt-0.5">
                    Access later from /renders · re-share without re-exporting
                  </p>
                </div>
              </div>
              <div className={cn(
                "h-4 w-7 rounded-full relative transition-colors flex-shrink-0",
                saveToCloud ? "bg-gold-500" : "bg-overlay"
              )}>
                <div className={cn(
                  "h-3 w-3 rounded-full bg-white absolute top-0.5 transition-transform",
                  saveToCloud ? "translate-x-3.5" : "translate-x-0.5"
                )} />
              </div>
            </button>

            {!voiceoverUrl && !musicUrl && (
              <div className="rounded-xl border border-ember-500/20 bg-ember-500/5 p-2.5">
                <p className="text-[11px] text-ember-400">
                  No audio detected. Generate a voiceover before exporting for sound.
                </p>
              </div>
            )}

            <Button className="w-full" size="lg" onClick={startExport}>
              <Download className="h-4 w-4" />
              Export {format === "mp4" ? "MP4" : "WebM"}
            </Button>
          </div>
        )}

        {/* Loading */}
        {phase === "loading" && (
          <div className="py-10 text-center">
            <Loader2 className="h-9 w-9 text-gold-500 animate-spin mx-auto mb-4" />
            <p className="font-semibold text-white">Loading assets…</p>
            <p className="text-xs text-muted mt-1">Fetching video clips and audio</p>
          </div>
        )}

        {/* Rendering */}
        {phase === "rendering" && (
          <div className="space-y-5 py-2">
            <div className="text-center">
              <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-gold-500/15 flex items-center justify-center animate-pulse">
                <Film className="h-7 w-7 text-gold-500" />
              </div>
              <p className="font-semibold text-white">Rendering…</p>
              <p className="text-xs text-muted mt-1">
                {Math.round(progress * totalDuration)}s / {totalDuration}s
              </p>
            </div>

            <div>
              <div className="mb-1.5 flex justify-between text-xs text-muted">
                <span>Step 1 of {stepCount} — Capturing frames</span>
                <span>{Math.round(progress * 100)}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-overlay">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-gold-500 to-ember-500 transition-all duration-200"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => { stopRef.current = true; setPhase("idle"); setProgress(0); }}
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Transcoding to MP4 */}
        {phase === "transcoding" && (
          <div className="space-y-5 py-2">
            <div className="text-center">
              <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-gold-500/15 flex items-center justify-center animate-pulse">
                <Smartphone className="h-7 w-7 text-gold-500" />
              </div>
              <p className="font-semibold text-white">Converting to MP4…</p>
              <p className="text-xs text-muted mt-1">Making it iPhone-compatible</p>
            </div>

            <div>
              <div className="mb-1.5 flex justify-between text-xs text-muted">
                <span>Step 2 — Transcoding (ffmpeg)</span>
                <span>{Math.round(transcodeProgress * 100)}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-overlay">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-gold-500 to-ember-500 transition-all duration-200"
                  style={{ width: `${Math.max(transcodeProgress, 0.05) * 100}%` }}
                />
              </div>
              <p className="mt-1.5 text-[10px] text-muted">
                First time? Loading ffmpeg (~30MB) — subsequent exports are instant.
              </p>
            </div>
          </div>
        )}

        {/* Uploading to cloud */}
        {phase === "uploading" && (
          <div className="py-10 text-center">
            <Cloud className="h-9 w-9 text-gold-500 animate-pulse mx-auto mb-4" />
            <p className="font-semibold text-white">Saving to your library…</p>
            <p className="text-xs text-muted mt-1">Almost done</p>
          </div>
        )}

        {/* Done */}
        {phase === "done" && (
          <div className="py-6 text-center space-y-5">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-green-500/15 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-green-400" />
            </div>
            <div>
              <p className="font-semibold text-white text-lg">Export complete! 🎬</p>
              <p className="text-sm text-muted mt-1">
                Your {format === "mp4" ? "MP4" : "WebM"} downloaded to your computer.
                {downloadUrl && " Also saved to your Renders library."}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setPhase("idle"); setProgress(0); }}>
                Export again
              </Button>
              <Button className="flex-1" onClick={onClose}>
                Done
              </Button>
            </div>
            {downloadUrl && (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-[11px] text-gold-500 hover:underline"
              >
                Open cloud copy →
              </a>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}

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
  Check, Plus, Sparkles, Music2, AudioWaveform, GripVertical,
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────

const ASPECT_RATIOS = [
  { value: "9:16", label: "9:16", desc: "Reels / Shorts", icon: "▯" },
  { value: "16:9", label: "16:9", desc: "YouTube",        icon: "▭" },
  { value: "1:1",  label: "1:1",  desc: "Feed post",      icon: "□" },
] as const;

const TARGET_DURATIONS = [
  { value: 15,  label: "15s",  desc: "Story" },
  { value: 30,  label: "30s",  desc: "Reel" },
  { value: 45,  label: "45s",  desc: "Standard" },
  { value: 60,  label: "60s",  desc: "Minute" },
];

const TRANSITIONS = [
  { value: "cut",  label: "Hard Cut", desc: "Instant" },
  { value: "fade", label: "Fade",     desc: "Smooth" },
];

const ACCEPTED_VIDEO = ["video/mp4", "video/quicktime", "video/webm", "video/x-matroska"];
const ACCEPTED_AUDIO = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/mp4", "audio/aac", "audio/ogg", "audio/flac"];
const MAX_CLIPS = 8;

// ── Music analysis ────────────────────────────────────────────────────────────

interface MusicAnalysis {
  fileName:      string;
  duration:      number;      // total file duration in seconds
  bestStartTime: number;      // start of the most energetic segment
  beatTimes:     number[];    // onset timestamps (relative to file start)
  energyBars:    number[];    // 60 normalised bars 0–1 for the mini chart
  estimatedBpm:  number;
}

async function analyzeAudioFile(file: File, targetDuration: number): Promise<MusicAnalysis> {
  const audioCtx = new AudioContext();
  try {
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const sr          = audioBuffer.sampleRate;
    const totalLen    = audioBuffer.length;
    // Cap analysis at 4 minutes to limit memory
    const analyzeLen  = Math.min(totalLen, sr * 240);

    // Mix down to mono
    const mono = new Float32Array(analyzeLen);
    for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
      const ch = audioBuffer.getChannelData(c);
      for (let i = 0; i < analyzeLen; i++) mono[i] += ch[i] / audioBuffer.numberOfChannels;
    }

    // RMS energy per 100ms window
    const windowSize     = Math.floor(sr * 0.1);
    const energyWindows: number[] = [];
    for (let i = 0; i < mono.length; i += windowSize) {
      const end = Math.min(i + windowSize, mono.length);
      let sum = 0;
      for (let j = i; j < end; j++) sum += mono[j] * mono[j];
      energyWindows.push(Math.sqrt(sum / (end - i)));
    }

    // Normalise
    const maxE = Math.max(...energyWindows, 1e-6);
    const norm = energyWindows.map(e => e / maxE);

    // Onset detection
    const beatTimes: number[] = [];
    for (let i = 1; i < norm.length - 1; i++) {
      if (norm[i] > 0.35 && norm[i] > norm[i - 1] * 1.55) {
        const t = i * 0.1;
        const last = beatTimes[beatTimes.length - 1] ?? -1;
        if (t - last >= 0.25) beatTimes.push(t);
      }
    }

    // Estimate BPM
    let estimatedBpm = 120;
    if (beatTimes.length >= 4) {
      const spacings = beatTimes.slice(1, 21).map((t, i) => t - beatTimes[i]);
      const avg = spacings.reduce((a, b) => a + b, 0) / spacings.length;
      estimatedBpm = Math.round(60 / avg);
      while (estimatedBpm < 60)  estimatedBpm *= 2;
      while (estimatedBpm > 200) estimatedBpm /= 2;
    }

    // Best segment: sliding window of targetDuration with highest avg energy
    const winCount = Math.max(1, Math.floor(targetDuration / 0.1));
    let bestStart = 0;
    let bestSum   = -1;
    for (let i = 0; i <= norm.length - winCount; i++) {
      let s = 0;
      for (let j = i; j < i + winCount; j++) s += norm[j];
      if (s > bestSum) { bestSum = s; bestStart = i; }
    }
    const bestStartTime = bestStart * 0.1;

    // Downsample norm to 60 bars for the mini chart
    const barCount = 60;
    const step = Math.max(1, Math.floor(norm.length / barCount));
    const energyBars = Array.from({ length: barCount }, (_, i) => {
      const slice = norm.slice(i * step, (i + 1) * step);
      return slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : 0;
    });
    const barMax = Math.max(...energyBars, 1e-6);
    const normBars = energyBars.map(b => b / barMax);

    return {
      fileName:      file.name,
      duration:      audioBuffer.duration,
      bestStartTime,
      beatTimes,
      energyBars:    normBars,
      estimatedBpm,
    };
  } finally {
    audioCtx.close();
  }
}

/**
 * Assign clip durations synced to beat onsets.
 * Total sum ≈ targetDuration.
 */
function computeBeatSyncedDurations(
  beatTimes:     number[],
  startTime:     number,
  numClips:      number,
  targetDuration: number,
): number[] {
  const inWindow = beatTimes
    .filter(t => t >= startTime && t < startTime + targetDuration)
    .map(t => t - startTime);

  if (inWindow.length < 2 || numClips <= 1) {
    return Array(numClips).fill(targetDuration / numClips);
  }

  // Pick numClips-1 evenly-spread beat indices as cut points
  const step = Math.max(1, Math.floor(inWindow.length / numClips));
  const cuts = [0];
  for (let i = 1; i < numClips; i++) {
    const idx = Math.min(i * step, inWindow.length - 1);
    const t = inWindow[idx];
    if (t > cuts[cuts.length - 1] + 0.2) cuts.push(t);
  }
  cuts.push(targetDuration);

  const durations: number[] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    durations.push(Math.max(0.25, cuts[i + 1] - cuts[i]));
  }

  // Trim / pad to exactly numClips
  while (durations.length > numClips) {
    const minIdx = durations.indexOf(Math.min(...durations));
    if (minIdx < durations.length - 1) {
      durations[minIdx] += durations.splice(minIdx + 1, 1)[0];
    } else {
      durations[durations.length - 2] += durations.pop()!;
    }
  }
  while (durations.length < numClips) durations.push(targetDuration / numClips);

  return durations;
}

// ── Video clip helpers ────────────────────────────────────────────────────────

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
  id:             string;
  file:           File;
  url:            string;
  thumbnail:      string;
  duration:       number;
  uploading:      boolean;
  uploadProgress: number;
  error?:         string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ReelCreatorPage() {
  const router = useRouter();
  const videoInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);

  const [clips, setClips]             = useState<UploadedClip[]>([]);
  const [dragging, setDragging]       = useState(false);
  // Clip drag-to-reorder
  const [dragClipId, setDragClipId]   = useState<string | null>(null);
  const [dragOverClipId, setDragOverClipId] = useState<string | null>(null);

  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9" | "1:1">("9:16");
  const [targetDuration, setTargetDuration] = useState(30);
  // Manual duration input (raw string so user can type freely)
  const [customDurStr, setCustomDurStr] = useState("");
  const [beatSync, setBeatSync]       = useState(true);
  const [transition, setTransition]   = useState("cut");
  const [title, setTitle]             = useState("");
  const [creating, setCreating]       = useState(false);

  // Music: "mood" tab or "upload" tab
  const [musicTab, setMusicTab]       = useState<"mood" | "upload">("mood");
  const [musicMood, setMusicMood]     = useState("upbeat");
  // Uploaded music state
  const [musicFile, setMusicFile]     = useState<File | null>(null);
  const [musicUrl, setMusicUrl]       = useState<string>("");
  const [musicUploading, setMusicUploading] = useState(false);
  const [musicUploadProgress, setMusicUploadProgress] = useState(0);
  const [musicAnalysis, setMusicAnalysis]   = useState<MusicAnalysis | null>(null);
  const [analyzingMusic, setAnalyzingMusic] = useState(false);

  // ── Video clip upload ─────────────────────────────────────────────────────

  async function uploadOneClip(file: File, clipId: string): Promise<{ url: string } | null> {
    try {
      const urlRes = await fetch("/api/storage/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, content_type: file.type }),
      });
      const urlData = await urlRes.json();
      if (!urlRes.ok) throw new Error(urlData.error || "Could not get upload URL");
      const { signed_url, public_url } = urlData as { signed_url: string; public_url: string };

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", signed_url);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable)
            setClips(prev => prev.map(c => c.id === clipId ? { ...c, uploadProgress: e.loaded / e.total } : c));
        };
        xhr.onload  = () => xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`));
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(file);
      });

      return { url: public_url };
    } catch (e) { console.error(e); return null; }
  }

  const processFiles = useCallback(async (files: File[]) => {
    const valid    = files.filter(f => ACCEPTED_VIDEO.includes(f.type));
    if (!valid.length) { toast.error("Only MP4, MOV, or WebM videos are supported"); return; }

    const canAdd   = MAX_CLIPS - clips.length;
    const toAdd    = valid.slice(0, canAdd);
    if (toAdd.length < valid.length) toast.info(`Max ${MAX_CLIPS} clips — added first ${toAdd.length}`);

    const placeholders: UploadedClip[] = toAdd.map(file => ({
      id:             `clip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      file,
      url:            "",
      thumbnail:      URL.createObjectURL(file),
      duration:       0,
      uploading:      true,
      uploadProgress: 0,
    }));
    setClips(prev => [...prev, ...placeholders]);

    // Upload all clips in parallel — much faster than sequential for multiple files
    await Promise.all(placeholders.map(async (ph) => {
      const result = await uploadOneClip(ph.file, ph.id);
      if (!result?.url) {
        setClips(prev => prev.map(c =>
          c.id === ph.id ? { ...c, uploading: false, uploadProgress: 0, error: "Upload failed" } : c
        ));
        toast.error(`Failed to upload ${ph.file.name}`);
        return;
      }

      const [thumbnail, duration] = await Promise.all([
        extractThumbnail(result.url),
        getVideoDuration(result.url),
      ]);
      setClips(prev => prev.map(c =>
        c.id === ph.id
          ? { ...c, url: result.url, thumbnail, duration, uploading: false, uploadProgress: 1 }
          : c
      ));
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clips.length]);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    processFiles(Array.from(e.dataTransfer.files));
  }
  function handleVideoInput(e: ChangeEvent<HTMLInputElement>) {
    processFiles(Array.from(e.target.files || []));
    if (videoInputRef.current) videoInputRef.current.value = "";
  }
  function removeClip(id: string) { setClips(prev => prev.filter(c => c.id !== id)); }

  // Drag-to-reorder clip grid
  function handleClipDragStart(e: DragEvent<HTMLDivElement>, id: string) {
    setDragClipId(id);
    e.dataTransfer.effectAllowed = "move";
  }
  function handleClipDragOver(e: DragEvent<HTMLDivElement>, id: string) {
    e.preventDefault();
    if (id !== dragClipId) setDragOverClipId(id);
  }
  function handleClipDrop(e: DragEvent<HTMLDivElement>, targetId: string) {
    e.preventDefault();
    if (!dragClipId || dragClipId === targetId) {
      setDragClipId(null); setDragOverClipId(null); return;
    }
    setClips(prev => {
      const arr   = [...prev];
      const srcIdx = arr.findIndex(c => c.id === dragClipId);
      const dstIdx = arr.findIndex(c => c.id === targetId);
      if (srcIdx < 0 || dstIdx < 0) return prev;
      const [moved] = arr.splice(srcIdx, 1);
      arr.splice(dstIdx, 0, moved);
      return arr;
    });
    setDragClipId(null); setDragOverClipId(null);
  }
  function handleClipDragEnd() { setDragClipId(null); setDragOverClipId(null); }

  // ── Music upload + analysis ───────────────────────────────────────────────

  async function handleMusicFile(file: File) {
    if (!ACCEPTED_AUDIO.includes(file.type)) {
      toast.error("Upload an MP3, WAV, AAC, or M4A file");
      return;
    }
    setMusicFile(file);
    setMusicUrl("");
    setMusicAnalysis(null);
    setMusicUploading(true);
    setMusicUploadProgress(0);
    setAnalyzingMusic(true);

    try {
      // Analyse + upload in parallel
      const [analysis, urlData] = await Promise.all([
        analyzeAudioFile(file, targetDuration).catch(() => null),
        (async () => {
          const r = await fetch("/api/storage/upload-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename: file.name, content_type: file.type }),
          });
          return r.json() as Promise<{ signed_url: string; public_url: string; error?: string }>;
        })(),
      ]);

      if (urlData.error) throw new Error(urlData.error);

      // Upload with progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", urlData.signed_url);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setMusicUploadProgress(e.loaded / e.total);
        };
        xhr.onload  = () => xhr.status < 300 ? resolve() : reject(new Error("Music upload failed"));
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(file);
      });

      setMusicUrl(urlData.public_url);
      setMusicAnalysis(analysis);
      toast.success(`${file.name} ready · ${analysis ? `~${analysis.estimatedBpm} BPM` : "no analysis"}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Music upload failed");
      setMusicFile(null);
    } finally {
      setMusicUploading(false);
      setAnalyzingMusic(false);
      setMusicUploadProgress(0);
    }
  }

  function handleMusicInput(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleMusicFile(file);
    if (musicInputRef.current) musicInputRef.current.value = "";
  }

  function clearMusic() {
    setMusicFile(null);
    setMusicUrl("");
    setMusicAnalysis(null);
  }

  // ── Create reel ───────────────────────────────────────────────────────────

  async function createReel() {
    const ready = clips.filter(c => c.url && !c.error);
    if (!ready.length) { toast.error("Upload at least one clip"); return; }
    if (clips.some(c => c.uploading)) { toast.error("Wait for uploads to finish"); return; }
    if (musicUploading) { toast.error("Music still uploading…"); return; }

    setCreating(true);
    try {
      const autoTitle = title.trim() ||
        `Reel · ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;

      // Compute per-clip durations
      let clipDurations: number[] | undefined;
      let musicStartTime = 0;

      if (musicUrl && musicAnalysis && beatSync) {
        musicStartTime = musicAnalysis.bestStartTime;
        clipDurations  = computeBeatSyncedDurations(
          musicAnalysis.beatTimes,
          musicStartTime,
          ready.length,
          targetDuration,
        );
      }

      const body = {
        title:          autoTitle,
        clips:          ready.map(c => ({ url: c.url, thumbnail: c.thumbnail, duration: c.duration })),
        musicMood,
        customMusicUrl: musicUrl || undefined,
        musicStartTime,
        clipDurations,
        targetDuration,
        transition,
        aspectRatio,
      };

      const res = await fetch("/api/projects/create-reel", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
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

  const readyCount   = clips.filter(c => c.url && !c.error).length;
  const hasUploading = clips.some(c => c.uploading);
  const canCreate    = readyCount > 0 && !hasUploading && !creating && !musicUploading;

  const beatCount = musicAnalysis
    ? musicAnalysis.beatTimes.filter(
        t => t >= musicAnalysis.bestStartTime &&
             t < musicAnalysis.bestStartTime + targetDuration
      ).length
    : 0;

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
            <p className="text-[10px] text-muted">Smart beat-sync · music analysis · auto-sequence</p>
          </div>
        </div>

        <Button onClick={createReel} disabled={!canCreate} size="sm" className="gap-2">
          <Sparkles className="h-3.5 w-3.5" />
          {creating ? "Creating…" : "Create Reel"}
          {canCreate && (
            <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">
              {readyCount} clip{readyCount !== 1 ? "s" : ""}
            </span>
          )}
        </Button>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-8 space-y-10">

        {/* ── Step 1: Upload clips ── */}
        <section>
          <SectionHeader n={1} title="Upload Your Clips" sub={`${clips.length} / ${MAX_CLIPS} clips`} />

          {clips.length < MAX_CLIPS && (
            <div
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onClick={() => videoInputRef.current?.click()}
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
              <input ref={videoInputRef} type="file" accept=".mp4,.mov,.webm,.mkv" multiple className="hidden" onChange={handleVideoInput} />
            </div>
          )}

          {clips.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {clips.map((clip, i) => (
                <div
                  key={clip.id}
                  draggable={!clip.uploading}
                  onDragStart={e => handleClipDragStart(e, clip.id)}
                  onDragOver={e => handleClipDragOver(e, clip.id)}
                  onDrop={e => handleClipDrop(e, clip.id)}
                  onDragEnd={handleClipDragEnd}
                  className={cn(
                    "group relative rounded-xl overflow-hidden border aspect-video bg-elevated transition-all",
                    clip.error ? "border-ember-500/40" : "border-border",
                    dragOverClipId === clip.id && "ring-2 ring-gold-500 scale-[0.97]",
                    dragClipId === clip.id && "opacity-40"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={clip.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
                  <span className="absolute top-1.5 left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[10px] font-bold text-white">{i + 1}</span>
                  {/* Drag handle — visible on hover */}
                  {!clip.uploading && !clip.error && (
                    <div className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                      <GripVertical className="h-3.5 w-3.5 text-white/70" />
                    </div>
                  )}

                  {clip.uploading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 px-3 gap-2">
                      <Loader2 className="h-4 w-4 text-gold-500 animate-spin" />
                      <div className="w-full">
                        <div className="h-1 w-full rounded-full bg-white/20">
                          <div className="h-1 rounded-full bg-gold-500 transition-all duration-200" style={{ width: `${Math.max(clip.uploadProgress * 100, 4)}%` }} />
                        </div>
                        <p className="text-[9px] text-white/70 text-center mt-1">
                          {clip.uploadProgress > 0 ? `${Math.round(clip.uploadProgress * 100)}%` : "Starting…"}
                        </p>
                      </div>
                    </div>
                  )}
                  {clip.error && !clip.uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-ember-500/20">
                      <span className="text-[10px] text-ember-400 px-2 text-center">{clip.error}</span>
                    </div>
                  )}
                  {!clip.uploading && !clip.error && clip.url && (
                    <div className="absolute top-1.5 right-6">
                      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-green-500">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                    </div>
                  )}
                  {clip.duration > 0 && (
                    <span className="absolute bottom-1.5 left-1.5 text-[10px] text-white/80 font-mono">{clip.duration.toFixed(1)}s</span>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); removeClip(clip.id); }}
                    className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-ember-500/80 transition-all"
                    aria-label="Remove clip"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {clips.length < MAX_CLIPS && (
                <button
                  onClick={() => videoInputRef.current?.click()}
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
              {readyCount} uploaded · target <span className="text-gold-500 font-medium">{targetDuration}s reel</span>
              {readyCount > 1 && <span className="ml-2 opacity-60">· drag clips to reorder</span>}
            </p>
          )}
        </section>

        {/* ── Step 2: Music ── */}
        <section>
          <SectionHeader n={2} title="Music" />

          {/* Tab switcher */}
          <div className="flex rounded-xl border border-border overflow-hidden mb-4">
            {([
              { id: "upload", label: "🎵 Upload your music" },
              { id: "mood",   label: "🤖 AI picks from mood" },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setMusicTab(tab.id)}
                className={cn(
                  "flex-1 py-2 text-xs font-medium transition-all",
                  musicTab === tab.id
                    ? "bg-gold-500/15 text-gold-500"
                    : "text-muted hover:text-white"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Upload tab */}
          {musicTab === "upload" && (
            <div className="space-y-3">
              {!musicFile ? (
                <div
                  onClick={() => musicInputRef.current?.click()}
                  className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-elevated/20 hover:border-gold-500/40 cursor-pointer transition-all py-8"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-500/10 mb-3">
                    <Music2 className="h-5 w-5 text-gold-500" />
                  </div>
                  <p className="text-sm font-medium text-white mb-1">Upload your music track</p>
                  <p className="text-xs text-muted">MP3, WAV, AAC, M4A — up to 50MB</p>
                  <input
                    ref={musicInputRef}
                    type="file"
                    accept=".mp3,.wav,.aac,.m4a,.ogg,.flac"
                    className="hidden"
                    onChange={handleMusicInput}
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-elevated p-4 space-y-3">
                  {/* File info + remove */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gold-500/15">
                        <Music2 className="h-4 w-4 text-gold-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white truncate">{musicFile.name}</p>
                        <p className="text-[10px] text-muted">
                          {musicAnalysis ? `${Math.round(musicAnalysis.duration / 60)}m ${Math.round(musicAnalysis.duration % 60)}s · ~${musicAnalysis.estimatedBpm} BPM` : "Analysing…"}
                        </p>
                      </div>
                    </div>
                    <button onClick={clearMusic} className="text-muted hover:text-ember-500 transition-colors flex-shrink-0 ml-2">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Upload progress */}
                  {musicUploading && (
                    <div>
                      <div className="h-1 w-full rounded-full bg-overlay">
                        <div className="h-1 rounded-full bg-gold-500 transition-all" style={{ width: `${Math.max(musicUploadProgress * 100, 4)}%` }} />
                      </div>
                      <p className="text-[10px] text-muted mt-1">
                        {analyzingMusic ? "Analysing beats…" : `Uploading ${Math.round(musicUploadProgress * 100)}%`}
                      </p>
                    </div>
                  )}

                  {/* Analysis result */}
                  {musicAnalysis && !musicUploading && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted flex items-center gap-1">
                          <AudioWaveform className="h-3 w-3" />
                          Best {targetDuration}s segment
                        </span>
                        <span className="text-gold-500 font-mono">
                          {formatTime(musicAnalysis.bestStartTime)} – {formatTime(musicAnalysis.bestStartTime + targetDuration)}
                        </span>
                      </div>

                      {/* Mini energy chart */}
                      <div className="flex items-end gap-px h-8 rounded-lg bg-overlay px-1.5 py-1 overflow-hidden">
                        {musicAnalysis.energyBars.map((h, i) => {
                          const barTime = (i / musicAnalysis.energyBars.length) * musicAnalysis.duration;
                          const inSeg   = barTime >= musicAnalysis.bestStartTime &&
                                          barTime < musicAnalysis.bestStartTime + targetDuration;
                          return (
                            <div
                              key={i}
                              className={cn("flex-1 rounded-sm", inSeg ? "bg-gold-500" : "bg-white/20")}
                              style={{ height: `${Math.max(10, h * 100)}%` }}
                            />
                          );
                        })}
                      </div>

                      <p className="text-[10px] text-muted">
                        {beatCount} beat{beatCount !== 1 ? "s" : ""} detected in segment
                        {beatCount > readyCount
                          ? ` — enough to sync ${readyCount} clips`
                          : " — will distribute evenly"}
                      </p>

                      {/* Beat sync toggle */}
                      <button
                        onClick={() => setBeatSync(v => !v)}
                        className={cn(
                          "w-full flex items-center justify-between rounded-lg border p-2 transition-all",
                          beatSync ? "border-gold-500/40 bg-gold-500/5" : "border-border bg-elevated/30"
                        )}
                      >
                        <div>
                          <p className="text-xs text-white font-medium text-left">Beat-sync cuts</p>
                          <p className="text-[9px] text-muted">Clip cuts land on music beats</p>
                        </div>
                        <div className={cn("h-4 w-7 rounded-full relative transition-colors", beatSync ? "bg-gold-500" : "bg-overlay")}>
                          <div className={cn("h-3 w-3 rounded-full bg-white absolute top-0.5 transition-transform", beatSync ? "translate-x-3.5" : "translate-x-0.5")} />
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Mood tab */}
          {musicTab === "mood" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {MUSIC_MOODS.map(mood => (
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
                  <span className={cn("text-xs font-medium leading-tight", musicMood === mood.id ? "text-gold-500" : "text-white")}>
                    {mood.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ── Step 3: Duration + Style ── */}
        <section>
          <SectionHeader n={3} title="Length & Style" />
          <div className="space-y-5">

            {/* Target duration */}
            <div>
              <p className="text-[11px] text-muted uppercase tracking-wider font-semibold mb-2">Target reel length</p>
              <div className="flex gap-2">
                {TARGET_DURATIONS.map(d => (
                  <button
                    key={d.value}
                    onClick={() => { setTargetDuration(d.value); setCustomDurStr(""); }}
                    className={cn(
                      "flex-1 flex flex-col items-center rounded-xl border p-3 transition-all",
                      targetDuration === d.value && !customDurStr
                        ? "border-gold-500/50 bg-gold-500/10"
                        : "border-border bg-elevated/40 hover:border-border-strong"
                    )}
                  >
                    <span className={cn("text-sm font-bold", targetDuration === d.value && !customDurStr ? "text-gold-500" : "text-white")}>{d.label}</span>
                    <span className="text-[10px] text-muted">{d.desc}</span>
                  </button>
                ))}
              </div>
              {/* Manual / custom duration input */}
              <div className="mt-2 flex items-center gap-2">
                <label className="text-[11px] text-muted whitespace-nowrap flex-shrink-0">Or type custom:</label>
                <div className="relative flex-1 max-w-[120px]">
                  <input
                    type="number"
                    min={5}
                    max={300}
                    step={1}
                    value={customDurStr}
                    onChange={e => {
                      const raw = e.target.value;
                      setCustomDurStr(raw);
                      const n = parseInt(raw, 10);
                      if (!isNaN(n) && n >= 5 && n <= 300) setTargetDuration(n);
                    }}
                    placeholder={String(targetDuration)}
                    className={cn(
                      "w-full rounded-lg border bg-elevated/60 px-2.5 py-1.5 text-sm text-white placeholder:text-muted focus:outline-none focus:border-gold-500/50 transition-colors",
                      customDurStr ? "border-gold-500/50" : "border-border"
                    )}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-muted pointer-events-none">s</span>
                </div>
                {customDurStr && (
                  <span className="text-[11px] text-gold-500 font-medium">{targetDuration}s selected</span>
                )}
              </div>
            </div>

            {/* Aspect ratio */}
            <div>
              <p className="text-[11px] text-muted uppercase tracking-wider font-semibold mb-2">Aspect ratio</p>
              <div className="flex gap-2">
                {ASPECT_RATIOS.map(ar => (
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

            {/* Transitions */}
            <div>
              <p className="text-[11px] text-muted uppercase tracking-wider font-semibold mb-2">Transitions</p>
              <div className="flex gap-2">
                {TRANSITIONS.map(t => (
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
            onChange={e => setTitle(e.target.value)}
            placeholder={`Reel · ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
            maxLength={80}
            className="w-full rounded-xl border border-border bg-elevated px-4 py-3 text-sm text-white placeholder:text-muted focus:border-gold-500/50 focus:outline-none"
          />
        </section>

        {/* ── Summary + Create ── */}
        <div className="pb-10 space-y-3">
          {canCreate && (
            <div className="rounded-xl border border-border bg-elevated p-3 text-[11px] space-y-1.5">
              <p className="text-muted font-semibold uppercase tracking-wider">Reel summary</p>
              <div className="flex justify-between"><span className="text-muted">Clips</span><span className="text-white">{readyCount}</span></div>
              <div className="flex justify-between"><span className="text-muted">Target length</span><span className="text-white">{targetDuration}s</span></div>
              <div className="flex justify-between"><span className="text-muted">Music</span><span className="text-white">{musicUrl ? musicFile?.name || "Uploaded" : `AI · ${musicMood}`}</span></div>
              {musicAnalysis && beatSync && <div className="flex justify-between"><span className="text-muted">Beat sync</span><span className="text-gold-500">✓ On · {beatCount} beats</span></div>}
              <div className="flex justify-between"><span className="text-muted">Ratio</span><span className="text-white">{aspectRatio}</span></div>
            </div>
          )}

          <Button className="w-full h-12 text-sm gap-2" onClick={createReel} disabled={!canCreate}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {creating
              ? "Creating your reel…"
              : canCreate
                ? `Create Reel`
                : "Upload at least one clip to continue"}
          </Button>
          {canCreate && (
            <p className="text-center text-[11px] text-muted">
              Opens straight in the editor — fine-tune cuts, add captions &amp; export
            </p>
          )}
        </div>

      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function SectionHeader({ n, title, sub }: { n: number; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gold-500 text-white text-[11px] font-bold">{n}</div>
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      {sub && <span className="text-xs text-muted">{sub}</span>}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/utils";
import { toast } from "sonner";
import { FEATURED_VOICES, MUSIC_MOODS } from "@/lib/ai/elevenlabs";
import { cn } from "@/lib/utils";
import { ExportModal } from "./export-modal";
import { VideoPlayer } from "./video-player";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ProTimeline } from "./pro-timeline";
import { AssetUploader, AssetCard } from "./asset-uploader";
import { KeyboardCheatsheet } from "./keyboard-cheatsheet";
import { CaptionTemplatePicker } from "./caption-template-picker";
import { CaptionFindReplace } from "./caption-find-replace";
import { CaptionInspector } from "./caption-inspector";
import { EmphasisStyleEditor } from "./emphasis-style-editor";
import { ClipEffectsPanel } from "./clip-effects-panel";
import { ContextMenu, type ContextMenuItem } from "@/components/ui/context-menu";
import { CAPTION_STYLES, findStyle } from "@/lib/caption-styles";
import { DEFAULT_EMPHASIS_STYLE, type EmphasisStyle } from "@/lib/emphasis-styles";
import {
  ChevronLeft, Download, Share2,
  Play, Pause, Square, Film, Mic2,
  Music2, Type, Sparkles,
  CheckCircle2, Search, RefreshCw,
  Save, RotateCcw, Volume2, VolumeX,
  X, ChevronRight, Zap, Copy, Trash2,
  MessageSquare, Wand2, Gauge,
  Keyboard, Image as ImageIcon, Loader2,
  Check as CheckIcon, Undo2, Redo2,
  Replace as ReplaceIcon, ZoomIn, ZoomOut,
  Scissors as ScissorsIcon,
} from "lucide-react";
import type { Project, TimelineData, TimelineClip } from "@/types";

function GeneratingScreen({ regenerating, projectId }: { regenerating: boolean; projectId: string }) {
  const supabase = createClient();

  useEffect(() => {
    if (regenerating) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("projects")
        .select("status")
        .eq("id", projectId)
        .single();
      if (data?.status === "ready" || data?.status === "exported") {
        window.location.reload();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [regenerating, projectId]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-base">
      <div className="text-center max-w-sm px-6">
        <div className="mx-auto mb-6 h-20 w-20 rounded-3xl bg-gold-500/15 flex items-center justify-center">
          <div className="h-10 w-10 rounded-full border-4 border-gold-500 border-t-transparent animate-spin" />
        </div>
        <h2 className="font-display text-xl font-bold text-white">
          {regenerating ? "Regenerating your video..." : "Video is generating..."}
        </h2>
        <p className="mt-2 text-sm text-subtle">
          {regenerating
            ? "This takes about 30–60 seconds. Please wait."
            : "This page will automatically refresh when your video is ready."}
        </p>
        {!regenerating && (
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted">
            <div className="h-1.5 w-1.5 rounded-full bg-gold-500 animate-pulse" />
            Auto-refreshing every 5 seconds
          </div>
        )}
        {!regenerating && (
          <Button className="mt-6" variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" /> Check now
          </Button>
        )}
      </div>
    </div>
  );
}

const SIDEBAR_TABS = [
  { id: "script", icon: Type, label: "Script" },
  { id: "captions", icon: MessageSquare, label: "Captions" },
  { id: "voice", icon: Mic2, label: "Voice" },
  { id: "broll", icon: Film, label: "B-Roll" },
  { id: "music", icon: Music2, label: "Music" },
  { id: "ai", icon: Sparkles, label: "AI Edit" },
];

interface SearchResult { id: string; url: string; thumbnail: string; duration: number; }

export function ProjectEditor({ project }: { project: Project }) {
  const router = useRouter();
  const timeline = project.timeline_data as TimelineData | null;
  const videoTrack = timeline?.tracks?.find((t) => t.type === "video");
  const captionTrack = timeline?.tracks?.find((t) => t.type === "text");
  const voiceoverTrack = timeline?.tracks?.find((t) => t.id === "voiceover_track");
  const musicTrack = timeline?.tracks?.find((t) => t.id === "music_track");

  const voiceoverUrl = voiceoverTrack?.clips?.[0]?.url || "";
  const musicUrl = musicTrack?.clips?.[0]?.url || "";
  const totalDuration = timeline?.duration || project.duration_seconds || 45;

  // ── Playback ──
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playTime, setPlayTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Phase 15: In/Out points + loop — hoisted early so playback effect can use them
  const [inPoint, setInPoint] = useState<number | null>(null);
  const [outPoint, setOutPoint] = useState<number | null>(null);
  const [loopEnabled, setLoopEnabled] = useState(false);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setPlayTime((t) => {
          // Phase 15: Loop between in/out points if enabled
          if (loopEnabled && outPoint !== null && t + 0.1 >= outPoint) {
            const back = inPoint ?? 0;
            if (audioRef.current) audioRef.current.currentTime = back;
            return back;
          }
          if (t + 0.1 >= totalDuration) { setIsPlaying(false); return 0; }
          return t + 0.1;
        });
      }, 100);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, totalDuration, loopEnabled, inPoint, outPoint]);

  useEffect(() => {
    if (!audioRef.current || !voiceoverUrl) return;
    if (isPlaying) audioRef.current.play().catch(() => {});
    else audioRef.current.pause();
  }, [isPlaying, voiceoverUrl]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = isMuted;
  }, [isMuted]);

  // Derive current clip index from playTime
  const currentClipIndex = (() => {
    const clips = (videoTrack?.clips || []) as TimelineClip[];
    let t = 0;
    for (let i = 0; i < clips.length; i++) {
      if (playTime >= t && playTime < t + clips[i].duration) return i;
      t += clips[i].duration;
    }
    return Math.max(0, clips.length - 1);
  })();

  const currentCaption = (captionTrack?.clips as TimelineClip[] | undefined)?.find(
    (c) => playTime >= c.start_time && playTime < c.start_time + c.duration
  ) ?? null;

  const progressPercent = totalDuration > 0 ? (playTime / totalDuration) * 100 : 0;

  const togglePlay = useCallback(() => {
    if (!isPlaying && playTime >= totalDuration) setPlayTime(0);
    setIsPlaying((p) => !p);
  }, [isPlaying, playTime, totalDuration]);

  function seekTo(ratio: number) {
    const t = ratio * totalDuration;
    setPlayTime(t);
    if (audioRef.current) audioRef.current.currentTime = t;
  }

  const seekBySeconds = useCallback((delta: number) => {
    setPlayTime((t) => {
      const next = Math.max(0, Math.min(totalDuration, t + delta));
      if (audioRef.current) audioRef.current.currentTime = next;
      return next;
    });
  }, [totalDuration]);

  // ── Phase 12: Selected clip (hoisted up for keyboard handler) ──
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  // ── Phase 13: Cheatsheet + auto-save indicator ──
  const [showCheatsheet, setShowCheatsheet] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Show "Saved" briefly after any save
  function flashSaved() {
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 1500);
  }

  // ── Phase 14: Undo/Redo history, context menu, captions, zoom ──
  const undoStackRef = useRef<TimelineData[]>([]);
  const redoStackRef = useRef<TimelineData[]>([]);
  const [historyVersion, setHistoryVersion] = useState(0); // Forces re-render for undo/redo buttons

  function pushHistory(snapshot: TimelineData) {
    undoStackRef.current = [...undoStackRef.current.slice(-19), snapshot];
    redoStackRef.current = []; // Clear redo on new action
    setHistoryVersion((v) => v + 1);
  }

  // Right-click context menu
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; clipId: string } | null>(null);

  // Caption styling
  const [selectedCaptionId, setSelectedCaptionId] = useState<string | null>(null);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [activeCaptionStyleId, setActiveCaptionStyleId] = useState<string | null>(null);

  // Timeline zoom (50% – 300%)
  const [timelineZoom, setTimelineZoom] = useState(100);

  // Phase 15: Emphasis style (project-wide)
  const [emphasisStyle, setEmphasisStyle] = useState<EmphasisStyle>(
    (timeline as unknown as { emphasis_style?: EmphasisStyle })?.emphasis_style || DEFAULT_EMPHASIS_STYLE
  );
  const [showEmphasisEditor, setShowEmphasisEditor] = useState(false);

  // Persist emphasis style on change (debounced)
  const emphasisSaveTimer = useRef<NodeJS.Timeout | null>(null);
  function saveEmphasisStyle(next: EmphasisStyle) {
    setEmphasisStyle(next);
    if (emphasisSaveTimer.current) clearTimeout(emphasisSaveTimer.current);
    emphasisSaveTimer.current = setTimeout(async () => {
      try {
        await fetch(`/api/projects/${project.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            timeline_data: { ...currentTimeline, emphasis_style: next },
          }),
        });
        flashSaved();
      } catch { /* silent */ }
    }, 600);
  }

  // Phase 15: In/Out + loop are hoisted earlier in this file

  // Phase 15: Multi-select clips
  const [selectedClipIds, setSelectedClipIds] = useState<Set<string>>(new Set());

  function handleClipSelect(clipId: string | null, modifiers?: { shift?: boolean; meta?: boolean }) {
    if (!clipId) {
      setSelectedClipId(null);
      setSelectedClipIds(new Set());
      return;
    }
    if (modifiers?.shift || modifiers?.meta) {
      // Toggle in multi-select
      setSelectedClipIds((prev) => {
        const next = new Set(prev);
        if (next.has(clipId)) next.delete(clipId);
        else next.add(clipId);
        return next;
      });
      setSelectedClipId(clipId);
    } else {
      // Single select
      setSelectedClipId(clipId === selectedClipId ? null : clipId);
      setSelectedClipIds(new Set([clipId]));
    }
  }

  async function bulkDeleteSelected() {
    if (selectedClipIds.size === 0 || !videoTrack) return;
    if (brollClips.length - selectedClipIds.size < 1) {
      toast.error("Can't delete all clips — keep at least one");
      return;
    }
    const ids = Array.from(selectedClipIds);
    for (const id of ids) {
      await timelineOp("delete_clip", { trackId: videoTrack.id, clipId: id });
    }
    setSelectedClipId(null);
    setSelectedClipIds(new Set());
    toast.success(`${ids.length} clip${ids.length > 1 ? "s" : ""} deleted`);
  }

  // ── Keyboard shortcuts (Pro-level) ──
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Don't fire when typing in inputs / textareas
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable) return;

      const mod = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl+K → split clip at playhead
      if (mod && e.code === "KeyK") {
        e.preventDefault();
        splitAtPlayhead();
        return;
      }

      // Cmd/Ctrl+Z → undo
      if (mod && !e.shiftKey && e.code === "KeyZ") {
        e.preventDefault();
        undoTimeline();
        return;
      }
      // Cmd/Ctrl+Shift+Z → redo
      if (mod && e.shiftKey && e.code === "KeyZ") {
        e.preventDefault();
        redoTimeline();
        return;
      }
      // Cmd/Ctrl+D → duplicate selected clip
      if (mod && e.code === "KeyD" && selectedClipId && videoTrack) {
        e.preventDefault();
        duplicateClip(videoTrack.id, selectedClipId);
        return;
      }

      // ? → show keyboard cheatsheet
      if (e.key === "?" || (e.shiftKey && e.code === "Slash")) {
        e.preventDefault();
        setShowCheatsheet(true);
        return;
      }

      // I → set In point at playhead, Shift+I → clear
      if (e.code === "KeyI" && !mod) {
        e.preventDefault();
        if (e.shiftKey) {
          setInPoint(null);
          toast.success("In point cleared");
        } else {
          setInPoint(playTime);
          toast.success(`In point set at ${playTime.toFixed(1)}s`);
        }
        return;
      }
      // O → set Out point at playhead, Shift+O → clear
      if (e.code === "KeyO" && !mod) {
        e.preventDefault();
        if (e.shiftKey) {
          setOutPoint(null);
          toast.success("Out point cleared");
        } else {
          setOutPoint(playTime);
          toast.success(`Out point set at ${playTime.toFixed(1)}s`);
        }
        return;
      }

      switch (e.code) {
        case "Space":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekBySeconds(e.shiftKey ? -1 : -5);
          break;
        case "ArrowRight":
          e.preventDefault();
          seekBySeconds(e.shiftKey ? 1 : 5);
          break;
        case "KeyJ":
          // Premiere-style: J = rewind 5s
          e.preventDefault();
          seekBySeconds(-5);
          break;
        case "KeyK":
          // K = pause
          if (!mod) {
            e.preventDefault();
            setIsPlaying(false);
          }
          break;
        case "KeyL":
          // L = play / forward 5s if already playing
          e.preventDefault();
          if (isPlaying) seekBySeconds(5);
          else setIsPlaying(true);
          break;
        case "KeyM":
          e.preventDefault();
          setIsMuted((m) => !m);
          break;
        case "Delete":
        case "Backspace":
          if (selectedClipIds.size > 1 && videoTrack) {
            e.preventDefault();
            bulkDeleteSelected();
          } else if (selectedClipId && videoTrack) {
            e.preventDefault();
            deleteClip(videoTrack.id, selectedClipId);
          }
          break;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [togglePlay, seekBySeconds, isPlaying, selectedClipId, videoTrack]);

  // ── UI state ──
  const [activeTab, setActiveTab] = useState("script");
  const [showExportModal, setShowExportModal] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ── Script ──
  const [editedScript, setEditedScript] = useState(project.script || "");
  const [savingScript, setSavingScript] = useState(false);
  const scriptDirty = editedScript !== (project.script || "");

  async function saveScript() {
    setSavingScript(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: editedScript }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Script saved!");
    } catch { toast.error("Failed to save script"); }
    finally { setSavingScript(false); }
  }

  // ── Captions ──
  const [editedCaptions, setEditedCaptions] = useState<TimelineClip[]>(
    (captionTrack?.clips || []) as TimelineClip[]
  );
  const [savingCaptions, setSavingCaptions] = useState(false);

  async function saveCaptions() {
    setSavingCaptions(true);
    try {
      const updatedTimeline = {
        ...timeline,
        tracks: timeline?.tracks?.map((t) =>
          t.id === "caption_track" ? { ...t, clips: editedCaptions } : t
        ),
      };
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeline_data: updatedTimeline }),
      });
      if (!res.ok) throw new Error();
      toast.success("Captions saved!");
    } catch { toast.error("Failed to save captions"); }
    finally { setSavingCaptions(false); }
  }

  function downloadSRT() {
    if (!editedCaptions.length) {
      toast.error("No captions to export");
      return;
    }
    function toSRTTime(seconds: number) {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      const ms = Math.round((seconds % 1) * 1000);
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
    }
    const srt = editedCaptions
      .map((cap, i) => {
        const start = cap.start_time ?? 0;
        const end = start + (cap.duration ?? 3);
        return `${i + 1}\n${toSRTTime(start)} --> ${toSRTTime(end)}\n${cap.text}\n`;
      })
      .join("\n");
    const blob = new Blob([srt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.title || "captions"}.srt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("SRT downloaded!");
  }

  // ── Voice ──
  const [selectedVoiceId, setSelectedVoiceId] = useState(FEATURED_VOICES[0].voice_id);
  const [regeneratingVoice, setRegeneratingVoice] = useState(false);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const voicePreviewRef = useRef<HTMLAudioElement | null>(null);

  function previewVoice(vId: string) {
    if (voicePreviewRef.current) {
      voicePreviewRef.current.pause();
      voicePreviewRef.current = null;
    }
    if (previewingVoiceId === vId) { setPreviewingVoiceId(null); return; }
    setPreviewingVoiceId(vId);
    const audio = new Audio(`/api/voice-sample?voiceId=${vId}`);
    voicePreviewRef.current = audio;
    audio.onended = () => setPreviewingVoiceId(null);
    audio.onerror = () => { setPreviewingVoiceId(null); toast.error("Preview not available"); };
    audio.play().catch(() => setPreviewingVoiceId(null));
  }

  async function regenerateVoice() {
    setRegeneratingVoice(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/regenerate-voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceId: selectedVoiceId }),
      });
      if (!res.ok) throw new Error("Regeneration failed");
      toast.success("Voiceover regenerated! Refresh to hear it.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setRegeneratingVoice(false); }
  }

  // ── B-roll ──
  const [brollClips, setBrollClips] = useState<TimelineClip[]>(
    (videoTrack?.clips || []) as TimelineClip[]
  );
  const [swapTargetId, setSwapTargetId] = useState<string | null>(null);
  const [brollSearch, setBrollSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [swappingId, setSwappingId] = useState<string | null>(null);

  const searchBroll = useCallback(async () => {
    if (!brollSearch.trim()) return;
    setSearching(true);
    try {
      const orientation = project.aspect_ratio === "16:9" ? "landscape" : project.aspect_ratio === "1:1" ? "square" : "portrait";
      const res = await fetch("/api/search-broll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: brollSearch, orientation }),
      });
      const data = await res.json();
      setSearchResults(data.clips || []);
    } catch { toast.error("Search failed"); }
    finally { setSearching(false); }
  }, [brollSearch, project.aspect_ratio]);

  async function swapClip(clipId: string, newClip: SearchResult) {
    setSwappingId(clipId);
    try {
      const res = await fetch(`/api/projects/${project.id}/swap-broll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clipId, newClip }),
      });
      if (!res.ok) throw new Error();
      setBrollClips((prev) => prev.map((c) => c.id === clipId ? { ...c, url: newClip.url, thumbnail: newClip.thumbnail } : c));
      setSwapTargetId(null); setSearchResults([]); setBrollSearch("");
      toast.success("Clip replaced!");
    } catch { toast.error("Failed to swap clip"); }
    finally { setSwappingId(null); }
  }

  // ── Music ──
  const [selectedMood, setSelectedMood] = useState("upbeat");
  const [changingMusic, setChangingMusic] = useState(false);

  async function changeMusic() {
    setChangingMusic(true);
    try {
      const res = await fetch("/api/projects/" + project.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeline_data: timeline }),
      });
      if (res.ok) toast.success("Music preference saved. Regenerate video to apply.");
    } catch { toast.error("Failed"); }
    finally { setChangingMusic(false); }
  }

  // ── Phase 12: Timeline ops (split, delete, reorder, magic cut) ──
  // selectedClipId hoisted earlier in file
  const [savingTimeline, setSavingTimeline] = useState(false);

  // Local timeline state mirrors server — optimistic updates
  const [currentTimeline, setCurrentTimeline] = useState<TimelineData | null>(timeline);

  async function timelineOp(op: string, payload: Record<string, unknown> = {}, skipHistory = false) {
    // Snapshot current state for undo (unless this IS an undo/redo op)
    if (!skipHistory && currentTimeline) {
      pushHistory(JSON.parse(JSON.stringify(currentTimeline)));
    }

    setSavingTimeline(true);
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/projects/${project.id}/timeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Operation failed");
      setCurrentTimeline(data.timeline_data);
      // Re-derive broll clips from new timeline
      const newVideo = data.timeline_data.tracks.find((t: { type: string }) => t.type === "video");
      if (newVideo) setBrollClips(newVideo.clips);
      flashSaved();
      return data.timeline_data;
    } catch (e) {
      setSaveStatus("idle");
      toast.error(e instanceof Error ? e.message : "Failed");
      return null;
    } finally {
      setSavingTimeline(false);
    }
  }

  async function undoTimeline() {
    if (undoStackRef.current.length === 0 || !currentTimeline) return;
    const prev = undoStackRef.current.pop()!;
    redoStackRef.current = [...redoStackRef.current, JSON.parse(JSON.stringify(currentTimeline))];
    setHistoryVersion((v) => v + 1);
    // Replace timeline via API (skip history)
    await timelineOp("set_full_timeline", { timeline_data: prev }, true);
    toast.success("Undone");
  }

  async function redoTimeline() {
    if (redoStackRef.current.length === 0 || !currentTimeline) return;
    const nextState = redoStackRef.current.pop()!;
    undoStackRef.current = [...undoStackRef.current, JSON.parse(JSON.stringify(currentTimeline))];
    setHistoryVersion((v) => v + 1);
    await timelineOp("set_full_timeline", { timeline_data: nextState }, true);
    toast.success("Redone");
  }

  async function duplicateClip(trackId: string, clipId: string) {
    await timelineOp("duplicate_clip", { trackId, clipId });
    toast.success("Clip duplicated");
  }

  async function insertClipAtPlayhead(url: string, thumbnail?: string) {
    if (!videoTrack) return;
    // Find clip at playhead to insert after
    let t = 0;
    let afterId: string | null = null;
    for (const c of brollClips) {
      if (playTime >= t && playTime < t + c.duration) {
        afterId = c.id;
        break;
      }
      t += c.duration;
    }
    const newClip = {
      id: `clip_inserted_${Date.now()}`,
      url,
      thumbnail,
      start_time: 0,
      duration: 5,
    };
    await timelineOp("insert_clip", {
      trackId: videoTrack.id,
      afterClipId: afterId,
      clip: newClip,
    });
    toast.success("Clip inserted");
  }

  async function insertAssetAtIndex(url: string, atIndex: number) {
    if (!videoTrack) return;
    const afterId = atIndex > 0 && brollClips[atIndex - 1]
      ? brollClips[atIndex - 1].id
      : null;
    const newClip = {
      id: `clip_dropped_${Date.now()}`,
      url,
      thumbnail: url, // for video, browser will pull first frame
      start_time: 0,
      duration: 5,
    };
    await timelineOp("insert_clip", {
      trackId: videoTrack.id,
      afterClipId: afterId,
      clip: newClip,
    });
    toast.success("Asset added to timeline");
  }

  const canUndo = undoStackRef.current.length > 0;
  const canRedo = redoStackRef.current.length > 0;

  async function deleteClip(trackId: string, clipId: string) {
    if (brollClips.length <= 1) {
      toast.error("Can't delete the last clip");
      return;
    }
    await timelineOp("delete_clip", { trackId, clipId });
    setSelectedClipId(null);
    toast.success("Clip deleted");
  }

  async function reorderClips(trackId: string, clipIds: string[]) {
    await timelineOp("reorder_clips", { trackId, clipIds });
    toast.success("Reordered");
  }

  async function splitAtPlayhead() {
    const clips = brollClips;
    let t = 0;
    let target: TimelineClip | null = null;
    for (const c of clips) {
      if (playTime >= t && playTime < t + c.duration) {
        target = c;
        break;
      }
      t += c.duration;
    }
    if (!target) { toast.error("No clip at playhead"); return; }
    if (!videoTrack) return;
    await timelineOp("split_clip", { trackId: videoTrack.id, clipId: target.id, at: playTime });
    toast.success("Clip split");
  }

  async function magicCut() {
    const result = await timelineOp("magic_cut");
    if (result) toast.success("Cuts synced to captions ✨");
  }

  async function trimClip(trackId: string, clipId: string, duration: number) {
    await timelineOp("trim_clip", { trackId, clipId, duration });
  }

  async function setClipSpeed(trackId: string, clipId: string, speed: number) {
    await timelineOp("set_speed", { trackId, clipId, speed });
  }

  // Phase 17 — Cloned voices + caption translation
  type ClonedVoice = { voice_id: string; name: string; description: string | null; accent: string | null; sample_url: string };
  const [clonedVoices, setClonedVoices] = useState<ClonedVoice[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/voice-clone");
        const data = await res.json();
        setClonedVoices(data.voices || []);
      } catch { /* silent */ }
    })();
  }, []);

  const [translating, setTranslating] = useState<string | null>(null); // target language while translating
  async function translateCaptions(targetLanguage: string) {
    if (editedCaptions.length === 0) {
      toast.error("No captions to translate");
      return;
    }
    setTranslating(targetLanguage);
    try {
      const res = await fetch(`/api/projects/${project.id}/translate-captions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_language: targetLanguage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Translation failed");
      // Replace local captions with translated versions
      const newCaptionTrack = data.timeline_data?.tracks?.find((t: { type: string }) => t.type === "text");
      if (newCaptionTrack?.clips) {
        setEditedCaptions(newCaptionTrack.clips as TimelineClip[]);
        setCurrentTimeline(data.timeline_data);
      }
      toast.success(`Captions translated to ${targetLanguage} ✨`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Translation failed");
    } finally {
      setTranslating(null);
    }
  }

  // Phase 16 — Clip visual effects
  async function setClipFilter(trackId: string, clipId: string, filterId: string) {
    await timelineOp("set_clip_effect", { trackId, clipId, field: "filter", value: filterId });
  }
  async function setClipTransition(trackId: string, clipId: string, config: { type: string; duration: number }) {
    await timelineOp("set_clip_effect", { trackId, clipId, field: "transition", value: config });
  }
  async function setClipKenBurns(trackId: string, clipId: string, config: { enabled: boolean; direction: string; intensity: number }) {
    await timelineOp("set_clip_effect", { trackId, clipId, field: "ken_burns", value: config });
  }

  // Show/hide the effects panel below the clip inspector
  const [showEffectsPanel, setShowEffectsPanel] = useState(false);

  // Find the currently selected clip
  const selectedClip = brollClips.find((c) => c.id === selectedClipId) || null;

  // ── Phase 12: Asset uploads ──
  type UploadedAsset = { id: string; type: "video" | "audio" | "image"; url: string; name?: string };
  const [uploadedAssets, setUploadedAssets] = useState<UploadedAsset[]>([]);
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  async function loadAssets() {
    if (assetsLoaded) return;
    try {
      const res = await fetch("/api/assets");
      const data = await res.json();
      const mapped = (data.assets || []).map((a: { id: string; type: string; url: string; metadata?: { original_name?: string } }) => ({
        id: a.id,
        type: a.type as "video" | "audio" | "image",
        url: a.url,
        name: a.metadata?.original_name,
      }));
      setUploadedAssets(mapped);
    } catch {/* silent */}
    finally { setAssetsLoaded(true); }
  }

  useEffect(() => { loadAssets(); }, []);

  function onAssetUploaded(asset: UploadedAsset) {
    setUploadedAssets((prev) => [asset, ...prev]);
  }

  async function deleteAsset(id: string) {
    if (!confirm("Delete this asset? It will be removed permanently.")) return;
    try {
      const res = await fetch(`/api/assets?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setUploadedAssets((prev) => prev.filter((a) => a.id !== id));
      toast.success("Asset deleted");
    } catch { toast.error("Failed to delete"); }
  }

  async function useAssetAsMusic(asset: UploadedAsset) {
    if (asset.type !== "audio") return;
    const result = await timelineOp("replace_music", { url: asset.url });
    if (result) toast.success("Music replaced with your upload");
  }

  async function useAssetAsBroll(asset: UploadedAsset) {
    if (asset.type !== "video") return;
    if (!swapTargetId || !videoTrack) {
      toast.info("Click 'Replace clip' on a B-roll first");
      return;
    }
    await timelineOp("swap_clip", { trackId: videoTrack.id, clipId: swapTargetId, url: asset.url });
    setBrollClips((prev) => prev.map((c) => c.id === swapTargetId ? { ...c, url: asset.url } : c));
    setSwapTargetId(null);
    toast.success("Clip replaced with your footage");
  }

  // ── Phase 12: Per-track volume ──
  const [voiceoverVolume, setVoiceoverVolume] = useState(
    (voiceoverTrack?.clips?.[0]?.volume ?? 1) * 100
  );
  const [musicVolume, setMusicVolume] = useState(
    (musicTrack?.clips?.[0]?.volume ?? 0.2) * 100
  );
  // ── Phase 13: Audio ducking — auto-lower music during voiceover ──
  const [audioDucking, setAudioDucking] = useState(true);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = voiceoverVolume / 100;
  }, [voiceoverVolume]);

  async function saveVoiceoverVolume(value: number) {
    setVoiceoverVolume(value);
    if (voiceoverTrack) {
      await timelineOp("set_volume", { trackId: voiceoverTrack.id, volume: value / 100 });
    }
  }

  async function saveMusicVolume(value: number) {
    setMusicVolume(value);
    if (musicTrack) {
      await timelineOp("set_volume", { trackId: musicTrack.id, volume: value / 100 });
    }
  }

  // ── AI Edit ──
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiWorking, setAiWorking] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

  async function runAiEdit() {
    if (!aiInstruction.trim()) return;
    setAiWorking(true);
    setAiResult(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/ai-edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: aiInstruction }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAiResult(data.improvedScript);
    } catch (e) { toast.error(e instanceof Error ? e.message : "AI edit failed"); }
    finally { setAiWorking(false); }
  }

  async function applyAiEdit() {
    if (!aiResult) return;
    setEditedScript(aiResult);
    setActiveTab("script");
    setAiResult(null);
    setAiInstruction("");
    toast.info("Improved script loaded in Script tab — save it to apply.");
  }

  // ── Project management ──
  async function handleRegenerate() {
    setShowRegenerateConfirm(false);
    setRegenerating(true);
    try {
      // Pass current music mood from timeline so it's preserved on regeneration
      const currentMusicMood = (timeline as Record<string, unknown> | null)?.music_mood as string | undefined;
      const res = await fetch(`/api/projects/${project.id}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voiceId: selectedVoiceId,
          musicMood: currentMusicMood,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Regeneration failed");
      toast.success("Regenerating… you'll be notified when it's ready.");
      // Reload after a brief moment to enter the polling state via GeneratingScreen
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); setRegenerating(false); }
  }

  async function handleDelete() {
    setShowDeleteConfirm(false);
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Project deleted");
      router.push("/projects");
    } catch { toast.error("Failed to delete"); setDeleting(false); }
  }

  async function handleDuplicate() {
    setDuplicating(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/duplicate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error();
      toast.success("Project duplicated!");
      router.push(`/projects/${data.projectId}/edit`);
    } catch { toast.error("Failed to duplicate"); setDuplicating(false); }
  }

  async function handleShare() {
    const url = `${window.location.origin}/share/${project.id}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success("Share link copied!");
      } else {
        throw new Error("Clipboard unavailable");
      }
    } catch {
      // Fallback for older browsers / insecure contexts
      toast.error("Couldn't copy automatically — link: " + url);
    }
  }

  function handleShareWhatsApp() {
    const url = `${window.location.origin}/share/${project.id}`;
    const text = encodeURIComponent(`Watch my new video on Boltcut 🎬 ${url}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  // ── Generating state ──
  if (project.status === "generating" || regenerating) {
    return (
      <GeneratingScreen regenerating={regenerating} projectId={project.id} />
    );
  }

  return (
    <div className="flex h-screen flex-col bg-base overflow-hidden">
      {showExportModal && <ExportModal project={project} onClose={() => setShowExportModal(false)} />}

      {/* Regenerate confirmation */}
      <ConfirmDialog
        open={showRegenerateConfirm}
        onClose={() => setShowRegenerateConfirm(false)}
        onConfirm={handleRegenerate}
        title="Regenerate the entire video?"
        description="This will replace your script, voiceover, B-roll, and captions with fresh AI output. Your current version will be overwritten."
        confirmLabel="Regenerate now"
        costNote="Uses 1 AI credit"
        loading={regenerating}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete this project?"
        description={
          <>
            <strong className="text-white">&ldquo;{project.title || "Untitled"}&rdquo;</strong> will be permanently deleted, including its script, voiceover, and timeline. This cannot be undone.
          </>
        }
        confirmLabel="Delete project"
        variant="destructive"
        loading={deleting}
      />

      {/* Keyboard cheatsheet */}
      <KeyboardCheatsheet open={showCheatsheet} onClose={() => setShowCheatsheet(false)} />

      {/* Find & Replace */}
      <CaptionFindReplace
        open={showFindReplace}
        onClose={() => setShowFindReplace(false)}
        captions={editedCaptions}
        onApply={(updated) => {
          setEditedCaptions(updated);
          toast.success(`Updated ${updated.filter((u, i) => u.text !== editedCaptions[i]?.text).length} captions — click Save to persist`);
        }}
      />

      {/* Right-click context menu on clips */}
      {ctxMenu && videoTrack && (() => {
        const clip = brollClips.find((c) => c.id === ctxMenu.clipId);
        if (!clip) return null;
        const items: ContextMenuItem[] = [
          {
            label: "Split at playhead",
            icon: ScissorsIcon,
            shortcut: "⌘K",
            onClick: () => { setSelectedClipId(clip.id); splitAtPlayhead(); },
          },
          {
            label: "Duplicate clip",
            icon: Copy,
            shortcut: "⌘D",
            onClick: () => duplicateClip(videoTrack.id, clip.id),
          },
          {
            label: "Replace clip…",
            icon: RefreshCw,
            onClick: () => { setSelectedClipId(clip.id); setSwapTargetId(clip.id); setActiveTab("broll"); },
          },
          { divider: true, label: "", onClick: () => {} },
          {
            label: selectedClipIds.size > 1 ? `Delete ${selectedClipIds.size} clips` : "Delete clip",
            icon: Trash2,
            shortcut: "Del",
            destructive: true,
            disabled: brollClips.length <= 1,
            onClick: () => {
              if (selectedClipIds.size > 1) bulkDeleteSelected();
              else deleteClip(videoTrack.id, clip.id);
            },
          },
        ];
        return (
          <ContextMenu
            x={ctxMenu.x}
            y={ctxMenu.y}
            items={items}
            onClose={() => setCtxMenu(null)}
          />
        );
      })()}

      {/* Voiceover audio */}
      {voiceoverUrl && <audio ref={audioRef} src={voiceoverUrl} preload="metadata" />}

      {/* Top bar */}
      <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border bg-surface px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href="/dashboard" aria-label="Back to dashboard"><ChevronLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-sm font-semibold text-white leading-tight truncate max-w-xs">
              {project.title || "Untitled Video"}
            </h1>
            <div className="flex items-center gap-2">
              <Badge variant={project.status === "ready" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                {project.status === "ready" && <CheckCircle2 className="h-2.5 w-2.5 mr-1" />}
                {project.status}
              </Badge>
              <span className="text-xs text-muted">{formatDuration(totalDuration)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Undo/Redo (Phase 14) */}
          <Button
            variant="ghost"
            size="sm"
            onClick={undoTimeline}
            disabled={!canUndo}
            aria-label="Undo"
            title="Undo (⌘Z)"
            data-history={historyVersion}
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={redoTimeline}
            disabled={!canRedo}
            aria-label="Redo"
            title="Redo (⌘⇧Z)"
          >
            <Redo2 className="h-4 w-4" />
          </Button>

          {/* Auto-save indicator */}
          <div className="flex items-center gap-1.5 text-[10px] text-muted min-w-[60px] justify-end mx-2">
            {saveStatus === "saving" && (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Saving…</span>
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <CheckIcon className="h-3 w-3 text-green-400" />
                <span className="text-green-400">Saved</span>
              </>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCheatsheet(true)}
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts (?)"
          >
            <Keyboard className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleShare} aria-label="Copy share link" title="Copy share link">
            <Share2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDuplicate} loading={duplicating} aria-label="Duplicate project" title="Duplicate project">
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowExportModal(true)}>
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left sidebar ── */}
        <aside className="flex w-64 flex-shrink-0 flex-col border-r border-border bg-surface">
          <nav className="flex flex-col gap-0.5 p-2">
            {SIDEBAR_TABS.map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={cn("flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                  activeTab === id ? "bg-gold-500/15 text-gold-500" : "text-subtle hover:bg-elevated hover:text-white"
                )}>
                <Icon className="h-4 w-4 flex-shrink-0" />
                {label}
              </button>
            ))}
          </nav>

          <div className="flex-1 overflow-y-auto border-t border-border">

            {/* ── SCRIPT ── */}
            {activeTab === "script" && (
              <div className="p-3 flex flex-col h-full">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">Script</p>
                  {scriptDirty && (
                    <Button size="sm" onClick={saveScript} loading={savingScript} className="h-6 text-[10px] px-2">
                      <Save className="h-3 w-3" /> Save
                    </Button>
                  )}
                </div>
                <textarea
                  value={editedScript}
                  onChange={(e) => setEditedScript(e.target.value)}
                  className="flex-1 w-full resize-none rounded-xl border border-border bg-elevated px-3 py-2.5 text-xs text-white placeholder:text-muted focus:border-gold-500/50 focus:outline-none leading-relaxed min-h-[200px]"
                  placeholder="Your script appears here after generation."
                  rows={14}
                />
                {scriptDirty ? (
                  <Button variant="ghost" size="sm" className="mt-2 w-full text-xs text-muted"
                    onClick={() => setEditedScript(project.script || "")}>
                    <RotateCcw className="h-3 w-3" /> Discard changes
                  </Button>
                ) : (
                  <p className="mt-2 text-[10px] text-muted text-center">Edit the script above, then save.</p>
                )}
              </div>
            )}

            {/* ── CAPTIONS ── */}
            {activeTab === "captions" && (
              <div className="p-3 space-y-3">
                {/* Phase 17: Auto-translate */}
                {editedCaptions.length > 0 && (
                  <div className="rounded-xl border border-gold-500/20 bg-gold-500/5 p-2.5">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Sparkles className="h-3 w-3 text-gold-500" />
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gold-500">
                        AI Translate
                      </p>
                      {translating && (
                        <span className="ml-auto text-[10px] text-muted flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          {translating}…
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {["Hindi", "Tamil", "Telugu", "Bengali", "Kannada", "Marathi", "Punjabi", "Malayalam", "Gujarati"].map((lang) => (
                        <button
                          key={lang}
                          onClick={() => translateCaptions(lang)}
                          disabled={!!translating}
                          title={`Translate all captions to ${lang}`}
                          className="rounded-md border border-border bg-elevated/30 px-1.5 py-1 text-[10px] text-subtle hover:text-white hover:border-gold-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1.5 text-[9px] text-muted">
                      Translates all {editedCaptions.length} caption{editedCaptions.length !== 1 ? "s" : ""} in the native script
                    </p>
                  </div>
                )}

                {/* Caption style template gallery */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">Style template</p>
                  <CaptionTemplatePicker
                    selectedId={activeCaptionStyleId}
                    onSelect={(style) => {
                      setActiveCaptionStyleId(style.id);
                      setEditedCaptions((prev) => prev.map((c) => ({
                        ...c,
                        color: style.color,
                        font_size: style.font_size,
                        font_family: style.font_family,
                        animation: style.animation,
                        position: { x: style.position_x, y: style.position_y },
                      })));
                      toast.success(`${style.label} applied — click Save`);
                    }}
                    compact
                  />
                </div>

                {/* Word emphasis style — applies to *highlighted* words */}
                <div>
                  <button
                    onClick={() => setShowEmphasisEditor((v) => !v)}
                    className="w-full flex items-center justify-between rounded-lg border border-gold-500/30 bg-gold-500/5 px-2.5 py-2 text-[11px] text-gold-400 hover:bg-gold-500/10 transition-all"
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3" />
                      Word Emphasis Style
                    </span>
                    <span className="text-[9px] text-muted">
                      {showEmphasisEditor ? "Hide" : "Customize"}
                    </span>
                  </button>
                  {showEmphasisEditor && (
                    <div className="mt-2">
                      <EmphasisStyleEditor value={emphasisStyle} onChange={saveEmphasisStyle} />
                      <p className="mt-1.5 text-[9px] text-muted text-center">
                        Wrap words in *asterisks* to apply this style
                      </p>
                    </div>
                  )}
                </div>

                {/* Caption inspector (when one is selected) */}
                {selectedCaptionId && (() => {
                  const cap = editedCaptions.find((c) => c.id === selectedCaptionId);
                  if (!cap) return null;
                  return (
                    <CaptionInspector
                      caption={cap}
                      onChange={(updates) => {
                        setEditedCaptions((prev) => prev.map((c) =>
                          c.id === selectedCaptionId ? { ...c, ...updates } : c
                        ));
                      }}
                      onClose={() => setSelectedCaptionId(null)}
                    />
                  );
                })()}

                {/* Toolbar */}
                <div className="flex items-center justify-between mb-1 border-t border-border pt-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Captions ({editedCaptions.length})
                  </p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setShowFindReplace(true)}
                      disabled={editedCaptions.length === 0}
                      title="Find & replace"
                      className="flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[10px] text-subtle hover:text-white hover:border-gold-500/30 transition-all disabled:opacity-40"
                    >
                      <ReplaceIcon className="h-3 w-3" />
                      F & R
                    </button>
                    <Button size="sm" onClick={saveCaptions} loading={savingCaptions} className="h-6 text-[10px] px-2">
                      <Save className="h-3 w-3" /> Save
                    </Button>
                  </div>
                </div>
                {editedCaptions.length === 0 && (
                  <p className="text-xs text-muted text-center py-4">No captions yet. Generate a video first.</p>
                )}
                <div className="space-y-1.5 max-h-[380px] overflow-y-auto">
                  {editedCaptions.map((cap, i) => (
                    <div
                      key={cap.id}
                      className={cn(
                        "group rounded-lg border bg-elevated/50 p-2 transition-all cursor-pointer",
                        selectedCaptionId === cap.id
                          ? "border-gold-500/60 ring-1 ring-gold-500/20 bg-gold-500/5"
                          : "border-border hover:border-border-strong"
                      )}
                      onClick={() => setSelectedCaptionId(cap.id === selectedCaptionId ? null : cap.id)}
                    >
                      <div className="flex items-start gap-1.5">
                        <span className="text-[10px] text-muted mt-0.5 flex-shrink-0 w-5">{i + 1}.</span>
                        <textarea
                          value={String(cap.text || "")}
                          onChange={(e) => setEditedCaptions((prev) => prev.map((c, j) => j === i ? { ...c, text: e.target.value } : c))}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 bg-transparent text-xs text-white focus:outline-none resize-none leading-relaxed"
                          rows={2}
                        />
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditedCaptions((prev) => prev.filter((_, j) => j !== i)); }}
                          aria-label={`Delete caption ${i + 1}`}
                          className="opacity-0 group-hover:opacity-100 text-muted hover:text-ember-400 transition-all flex-shrink-0"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="text-[9px] text-muted mt-1 ml-6">
                        {cap.start_time.toFixed(1)}s → {(cap.start_time + cap.duration).toFixed(1)}s · click to style
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── VOICE ── */}
            {activeTab === "voice" && (
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">Choose Voice</p>
                  <Link href="/voice-lab" className="text-[9px] text-gold-500 hover:underline">
                    Voice Lab →
                  </Link>
                </div>

                {/* Cloned voices section */}
                {clonedVoices.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gold-500 mb-1.5 flex items-center gap-1">
                      <Sparkles className="h-2.5 w-2.5" />
                      Your Cloned Voices
                    </p>
                    <div className="space-y-1">
                      {clonedVoices.map((v) => (
                        <button
                          key={v.voice_id}
                          onClick={() => setSelectedVoiceId(v.voice_id)}
                          className={cn(
                            "w-full flex items-center gap-2 rounded-lg border p-2 text-left transition-all",
                            selectedVoiceId === v.voice_id
                              ? "border-gold-500/50 bg-gold-500/10"
                              : "border-gold-500/20 bg-gold-500/5 hover:border-gold-500/40"
                          )}
                        >
                          <div className={cn(
                            "h-6 w-6 flex-shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold",
                            selectedVoiceId === v.voice_id ? "bg-gold-500 text-black" : "bg-gold-500/20 text-gold-500"
                          )}>
                            {v.name[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={cn(
                              "text-xs font-medium truncate",
                              selectedVoiceId === v.voice_id ? "text-gold-500" : "text-white"
                            )}>
                              {v.name}
                            </p>
                            <p className="text-[10px] text-muted truncate">
                              {v.accent || "Cloned voice"}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {clonedVoices.length > 0 && (
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5">
                    Featured Voices
                  </p>
                )}
                <div className="space-y-1.5">
                  {FEATURED_VOICES.map((v) => (
                    <button key={v.voice_id} onClick={() => setSelectedVoiceId(v.voice_id)}
                      className={cn("w-full flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all",
                        selectedVoiceId === v.voice_id ? "border-gold-500/50 bg-gold-500/10" : "border-border hover:border-border-strong bg-elevated/50"
                      )}>
                      <div className={cn("h-7 w-7 flex-shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold",
                        selectedVoiceId === v.voice_id ? "bg-gold-500 text-black" : "bg-elevated text-subtle")}>
                        {v.name[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-xs font-semibold truncate", selectedVoiceId === v.voice_id ? "text-gold-500" : "text-white")}>{v.name}</p>
                        <p className="text-[10px] text-muted">{v.style}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); previewVoice(v.voice_id); }}
                        className={cn(
                          "flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center transition-all",
                          previewingVoiceId === v.voice_id ? "bg-gold-500/20 text-gold-500" : "text-muted hover:text-white hover:bg-elevated"
                        )}
                      >
                        {previewingVoiceId === v.voice_id
                          ? <Square className="h-2 w-2 fill-current" />
                          : <Play className="h-2 w-2 fill-current" />
                        }
                      </button>
                    </button>
                  ))}
                </div>
                <Button className="w-full mt-2" size="sm" onClick={regenerateVoice} loading={regeneratingVoice}>
                  <Mic2 className="h-3.5 w-3.5" /> Regenerate Voiceover
                </Button>
                <p className="text-[10px] text-muted text-center">Overwrites current voiceover audio</p>
              </div>
            )}

            {/* ── B-ROLL ── */}
            {activeTab === "broll" && (
              <div className="p-3 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                    B-Roll ({brollClips.length} clips)
                  </p>
                  <button
                    onClick={magicCut}
                    disabled={savingTimeline}
                    className="flex items-center gap-1 rounded-lg border border-gold-500/30 bg-gold-500/5 px-2 py-1 text-[10px] text-gold-400 hover:bg-gold-500/10 transition-all"
                    title="Re-sync cuts to caption boundaries"
                  >
                    <Wand2 className="h-3 w-3" />
                    Magic Cut
                  </button>
                </div>

                {swapTargetId === null ? (
                  <>
                    <div className="space-y-2">
                      {brollClips.map((clip, i) => (
                        <div
                          key={clip.id}
                          className={cn(
                            "rounded-xl border overflow-hidden bg-elevated/50 transition-all",
                            selectedClipId === clip.id ? "border-gold-500/60 ring-1 ring-gold-500/20" : "border-border"
                          )}
                        >
                          {clip.thumbnail && (
                            <button
                              onClick={() => setSelectedClipId(clip.id === selectedClipId ? null : clip.id)}
                              className="relative h-20 w-full overflow-hidden block"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={clip.thumbnail} alt="" className="h-full w-full object-cover" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                              <span className="absolute bottom-1.5 left-2 text-[10px] text-white/80 font-medium">
                                Clip {i + 1} · {clip.duration.toFixed(1)}s
                              </span>
                            </button>
                          )}
                          <div className="flex gap-1 px-2 py-1.5">
                            <button
                              onClick={() => { setSwapTargetId(clip.id); setSearchResults([]); setBrollSearch(""); }}
                              className="flex-1 text-[10px] text-gold-500 hover:text-gold-400 font-medium"
                            >
                              Replace →
                            </button>
                            {brollClips.length > 1 && (
                              <button
                                onClick={() => videoTrack && deleteClip(videoTrack.id, clip.id)}
                                className="text-[10px] text-ember-500/70 hover:text-ember-400"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {!brollClips.length && <p className="text-xs text-muted py-4 text-center">No B-roll clips yet.</p>}
                    </div>

                    {/* Upload your own */}
                    <div className="border-t border-border pt-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">Your Footage</p>
                      <AssetUploader
                        kind="video"
                        onUpload={onAssetUploaded}
                        hint="MP4, MOV, WebM — up to 100MB"
                      />
                      {uploadedAssets.filter((a) => a.type === "video").length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          <p className="text-[9px] text-muted">Click 'Replace' on a clip, then pick from your library:</p>
                          <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-0.5">
                            {uploadedAssets.filter((a) => a.type === "video").map((a) => (
                              <AssetCard
                                key={a.id}
                                asset={a}
                                onClick={() => useAssetAsBroll(a)}
                                onDelete={() => deleteAsset(a.id)}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-white font-medium">Replace clip</p>
                      <button onClick={() => { setSwapTargetId(null); setSearchResults([]); }} aria-label="Close">
                        <X className="h-4 w-4 text-muted hover:text-white" />
                      </button>
                    </div>

                    {/* Use your own footage */}
                    {uploadedAssets.filter((a) => a.type === "video").length > 0 && (
                      <div>
                        <p className="text-[10px] text-muted mb-1.5">From your uploads:</p>
                        <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto mb-3">
                          {uploadedAssets.filter((a) => a.type === "video").map((a) => (
                            <AssetCard key={a.id} asset={a} onClick={() => useAssetAsBroll(a)} />
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-[10px] text-muted">Or search stock footage:</p>
                    <div className="flex gap-1.5">
                      <input value={brollSearch} onChange={(e) => setBrollSearch(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && searchBroll()}
                        placeholder="Search footage..."
                        aria-label="Search footage"
                        className="flex-1 rounded-lg border border-border bg-elevated px-2.5 py-1.5 text-xs text-white placeholder:text-muted focus:border-gold-500/50 focus:outline-none" />
                      <Button size="sm" onClick={searchBroll} loading={searching} className="h-7 w-7 p-0" aria-label="Search">
                        <Search className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {searchResults.length > 0 && (
                      <div className="grid grid-cols-2 gap-1.5 max-h-60 overflow-y-auto">
                        {searchResults.map((r) => (
                          <button key={r.id} onClick={() => swapClip(swapTargetId!, r)}
                            disabled={!!swappingId}
                            className="relative rounded-lg overflow-hidden border border-border hover:border-gold-500/50 transition-all group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={r.thumbnail} alt="" className="h-16 w-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-[10px] text-white font-bold">Use this</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── MUSIC ── */}
            {activeTab === "music" && (
              <div className="p-3 space-y-4">
                {/* Volume controls */}
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Track Volumes</p>

                  {/* Voiceover volume */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1.5 text-xs text-white">
                        <Mic2 className="h-3 w-3 text-gold-500" /> Voiceover
                      </span>
                      <span className="text-[10px] text-muted font-mono">{Math.round(voiceoverVolume)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={voiceoverVolume}
                      onChange={(e) => setVoiceoverVolume(Number(e.target.value))}
                      onMouseUp={(e) => saveVoiceoverVolume(Number((e.target as HTMLInputElement).value))}
                      onTouchEnd={(e) => saveVoiceoverVolume(Number((e.target as HTMLInputElement).value))}
                      aria-label="Voiceover volume"
                      className="w-full accent-gold-500"
                    />
                  </div>

                  {/* Music volume */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1.5 text-xs text-white">
                        <Music2 className="h-3 w-3 text-ember-500" /> Music
                      </span>
                      <span className="text-[10px] text-muted font-mono">{Math.round(musicVolume)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={musicVolume}
                      onChange={(e) => setMusicVolume(Number(e.target.value))}
                      onMouseUp={(e) => saveMusicVolume(Number((e.target as HTMLInputElement).value))}
                      onTouchEnd={(e) => saveMusicVolume(Number((e.target as HTMLInputElement).value))}
                      aria-label="Music volume"
                      className="w-full accent-ember-500"
                    />
                  </div>

                  {/* Audio ducking toggle */}
                  <button
                    onClick={() => setAudioDucking((v) => !v)}
                    className={cn(
                      "w-full flex items-center justify-between rounded-lg border p-2 transition-all",
                      audioDucking
                        ? "border-gold-500/40 bg-gold-500/5"
                        : "border-border bg-elevated/30"
                    )}
                  >
                    <div className="flex flex-col items-start">
                      <span className="text-xs text-white font-medium">Auto-duck music</span>
                      <span className="text-[9px] text-muted">Lowers music when voice plays</span>
                    </div>
                    <div className={cn(
                      "h-4 w-7 rounded-full relative transition-colors",
                      audioDucking ? "bg-gold-500" : "bg-overlay"
                    )}>
                      <div className={cn(
                        "h-3 w-3 rounded-full bg-white absolute top-0.5 transition-transform",
                        audioDucking ? "translate-x-3.5" : "translate-x-0.5"
                      )} />
                    </div>
                  </button>
                </div>

                {/* Upload your own music */}
                <div className="border-t border-border pt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">Upload Music</p>
                  <AssetUploader
                    kind="audio"
                    onUpload={onAssetUploaded}
                    hint="MP3, WAV, M4A — up to 25MB"
                  />
                  {uploadedAssets.filter((a) => a.type === "audio").length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-[9px] text-muted">Your tracks (click to use):</p>
                      {uploadedAssets.filter((a) => a.type === "audio").map((a) => (
                        <div
                          key={a.id}
                          className="group flex items-center gap-2 rounded-lg border border-border bg-elevated/50 p-2 hover:border-gold-500/30 transition-all cursor-pointer"
                          onClick={() => useAssetAsMusic(a)}
                        >
                          <span className="text-base">🎵</span>
                          <span className="flex-1 text-[10px] text-white truncate">{a.name || "Track"}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteAsset(a.id); }}
                            aria-label="Delete track"
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-ember-500"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Mood-based AI music */}
                <div className="border-t border-border pt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">AI Music Mood</p>
                  <div className="space-y-1.5">
                    {MUSIC_MOODS.map((mood) => (
                      <button key={mood.id} onClick={() => setSelectedMood(mood.id)}
                        className={cn("w-full flex items-center gap-2.5 rounded-xl border p-2 text-left transition-all",
                          selectedMood === mood.id ? "border-gold-500/50 bg-gold-500/10" : "border-border hover:border-border-strong bg-elevated/50"
                        )}>
                        <span>{mood.emoji}</span>
                        <p className={cn("text-xs font-medium", selectedMood === mood.id ? "text-gold-500" : "text-white")}>
                          {mood.label}
                        </p>
                      </button>
                    ))}
                  </div>
                  <Button className="w-full mt-2" size="sm" onClick={changeMusic} loading={changingMusic}>
                    <Music2 className="h-3.5 w-3.5" /> Save Mood
                  </Button>
                  <p className="text-[10px] text-muted text-center mt-1">Regenerate video to apply mood</p>
                </div>
              </div>
            )}

            {/* ── AI EDIT ── */}
            {activeTab === "ai" && (
              <div className="p-3 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">AI Script Editor</p>

                {/* Instruction input */}
                <div className="rounded-xl border border-border bg-elevated/50 p-3">
                  <p className="text-xs text-subtle mb-2">Tell AI how to improve the script:</p>
                  <textarea
                    value={aiInstruction}
                    onChange={(e) => setAiInstruction(e.target.value)}
                    className="w-full bg-transparent text-xs text-white placeholder:text-muted focus:outline-none resize-none"
                    rows={3}
                    placeholder="e.g. Make the hook more punchy, add urgency to the CTA, shorten by 10 seconds..."
                  />
                </div>
                <Button size="sm" className="w-full" onClick={runAiEdit} loading={aiWorking}
                  disabled={!aiInstruction.trim()}>
                  <Sparkles className="h-3.5 w-3.5" /> Improve Script
                </Button>

                {/* AI result preview */}
                {aiResult && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gold-500">AI suggestion ready:</p>
                    <div className="rounded-xl border border-gold-500/20 bg-gold-500/5 p-3 max-h-40 overflow-y-auto">
                      <p className="text-xs text-white leading-relaxed whitespace-pre-wrap">{aiResult}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1" onClick={applyAiEdit}>Apply to Script</Button>
                      <Button size="sm" variant="ghost" className="flex-1" onClick={() => setAiResult(null)}>Discard</Button>
                    </div>
                  </div>
                )}

                {/* Quick actions */}
                <div className="rounded-xl border border-border bg-elevated/50 p-3 space-y-1.5">
                  <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-2">Quick actions</p>
                  {[
                    "Make the hook more punchy",
                    "Add a strong CTA at the end",
                    "Make the tone more energetic",
                    "Shorten and tighten the script",
                    "Add more specific examples",
                  ].map((action) => (
                    <button key={action} onClick={() => { setAiInstruction(action); }}
                      className="w-full text-left text-xs text-subtle hover:text-gold-500 py-1 transition-colors">
                      → {action}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ── CENTER PREVIEW ── */}
        <main className="flex flex-1 flex-col items-center justify-center bg-[#050505] gap-4">
          <div className="relative">
            {/* 9:16 */}
            {project.aspect_ratio === "9:16" && (
              <div className="relative h-[480px] w-[270px] rounded-2xl overflow-hidden border border-border shadow-[0_0_80px_rgba(0,0,0,0.9)]">
                <VideoPlayer
                  clips={brollClips}
                  currentClipIndex={currentClipIndex}
                  currentCaption={currentCaption}
                  isPlaying={isPlaying}
                  emphasisStyle={emphasisStyle}
                />
                {/* Controls overlay */}
                <div className="absolute top-3 left-3 z-10">
                  <Badge variant="success" className="text-[10px]">
                    <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Ready
                  </Badge>
                </div>
                <button onClick={() => setIsMuted((m) => !m)}
                  className="absolute top-3 right-3 z-10 h-7 w-7 rounded-full bg-black/40 flex items-center justify-center border border-white/10 hover:bg-black/60">
                  {isMuted ? <VolumeX className="h-3 w-3 text-white" /> : <Volume2 className="h-3 w-3 text-white" />}
                </button>
                <div className="absolute inset-0 z-10 flex items-center justify-center">
                  <button onClick={togglePlay}
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm border border-white/20 hover:bg-black/60 transition-all hover:scale-105">
                    {isPlaying ? <Pause className="h-6 w-6 text-white" /> : <Play className="h-6 w-6 text-white ml-1" />}
                  </button>
                </div>
                <div className="absolute bottom-4 left-4 right-4 z-10">
                  <div className="h-1 w-full rounded-full bg-white/20 cursor-pointer"
                    onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); seekTo((e.clientX - r.left) / r.width); }}>
                    <div className="h-1 rounded-full bg-gold-500 transition-all" style={{ width: `${progressPercent}%` }} />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[10px] text-white/60">
                    <span>{formatDuration(Math.floor(playTime))}</span>
                    <span>{formatDuration(totalDuration)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 16:9 */}
            {project.aspect_ratio === "16:9" && (
              <div className="relative w-[600px] h-[338px] rounded-2xl overflow-hidden border border-border shadow-[0_0_80px_rgba(0,0,0,0.9)]">
                <VideoPlayer clips={brollClips} currentClipIndex={currentClipIndex} currentCaption={currentCaption} isPlaying={isPlaying} emphasisStyle={emphasisStyle} />
                <div className="absolute inset-0 z-10 flex items-center justify-center">
                  <button onClick={togglePlay} className="flex h-16 w-16 items-center justify-center rounded-full bg-black/40 backdrop-blur border border-white/20 hover:bg-black/60 transition-all">
                    {isPlaying ? <Pause className="h-7 w-7 text-white" /> : <Play className="h-7 w-7 text-white ml-1" />}
                  </button>
                </div>
                <div className="absolute bottom-3 left-4 right-4 z-10">
                  <div className="h-1 w-full rounded-full bg-white/20 cursor-pointer"
                    onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); seekTo((e.clientX - r.left) / r.width); }}>
                    <div className="h-1 rounded-full bg-gold-500" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>
              </div>
            )}

            {/* 1:1 */}
            {project.aspect_ratio === "1:1" && (
              <div className="relative w-[380px] h-[380px] rounded-2xl overflow-hidden border border-border shadow-[0_0_80px_rgba(0,0,0,0.9)]">
                <VideoPlayer clips={brollClips} currentClipIndex={currentClipIndex} currentCaption={currentCaption} isPlaying={isPlaying} emphasisStyle={emphasisStyle} />
                <div className="absolute inset-0 z-10 flex items-center justify-center">
                  <button onClick={togglePlay} className="flex h-14 w-14 items-center justify-center rounded-full bg-black/40 backdrop-blur border border-white/20 hover:bg-black/60 transition-all">
                    {isPlaying ? <Pause className="h-6 w-6 text-white" /> : <Play className="h-6 w-6 text-white ml-1" />}
                  </button>
                </div>
                <div className="absolute bottom-3 left-4 right-4 z-10">
                  <div className="h-1 w-full rounded-full bg-white/20 cursor-pointer"
                    onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); seekTo((e.clientX - r.left) / r.width); }}>
                    <div className="h-1 rounded-full bg-gold-500" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted">
              {brollClips.length > 0 ? "Live preview" : "Generate a video to see the preview"}
            </p>
            <div className="hidden xl:flex items-center gap-2 text-[10px] text-muted/60">
              <span className="rounded border border-border px-1 py-0.5 font-mono">Space</span>
              <span>play</span>
              <span className="rounded border border-border px-1 py-0.5 font-mono">J K L</span>
              <span>transport</span>
              <span className="rounded border border-border px-1 py-0.5 font-mono">⌘K</span>
              <span>split</span>
              <span className="rounded border border-border px-1 py-0.5 font-mono">Del</span>
              <span>remove</span>
            </div>
          </div>
        </main>

        {/* ── Right panel ── */}
        <aside className="w-52 flex-shrink-0 border-l border-border bg-surface p-4 space-y-5 overflow-y-auto">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Details</p>
            <div className="space-y-2.5">
              {[
                { label: "Duration", value: formatDuration(totalDuration) },
                { label: "Format", value: project.aspect_ratio },
                { label: "Status", value: project.status },
                { label: "Clips", value: `${brollClips.length} B-roll` },
                { label: "Captions", value: `${editedCaptions.length} lines` },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-xs text-muted">{item.label}</span>
                  <span className="text-xs font-medium text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Export</p>

            {/* Platform label hint */}
            <div className="mb-2 rounded-lg bg-elevated/50 p-2 text-[10px] text-muted">
              <span className="text-gold-500 font-medium">
                {project.aspect_ratio === "9:16" ? "Reels / Shorts / TikTok" :
                 project.aspect_ratio === "16:9" ? "YouTube / Web" : "Instagram Feed / Square"}
              </span>{" "}
              · {project.aspect_ratio}
            </div>

            <button onClick={() => setShowExportModal(true)}
              className="w-full flex items-center justify-between rounded-lg border border-gold-500/30 bg-gold-500/5 p-2.5 text-xs text-gold-400 hover:border-gold-500/60 hover:bg-gold-500/10 transition-all mb-2 font-medium">
              <span>Export video (WebM)</span>
              <Download className="h-3 w-3" />
            </button>
            <button onClick={handleShare}
              className="w-full flex items-center justify-between rounded-lg border border-border p-2.5 text-xs text-subtle hover:border-gold-500/30 hover:text-white transition-all mb-2">
              <span>Copy share link</span>
              <Share2 className="h-3 w-3" />
            </button>
            <button onClick={handleShareWhatsApp}
              className="w-full flex items-center justify-between rounded-lg border border-green-500/30 bg-green-500/5 p-2.5 text-xs text-green-400 hover:bg-green-500/10 transition-all mb-2">
              <span>Share on WhatsApp</span>
              <span className="text-base leading-none">💬</span>
            </button>
            <button onClick={downloadSRT}
              className="w-full flex items-center justify-between rounded-lg border border-border p-2.5 text-xs text-subtle hover:border-gold-500/30 hover:text-white transition-all mb-2">
              <span>Export captions (.srt)</span>
              <Download className="h-3 w-3" />
            </button>
            <button onClick={() => window.open(`/api/projects/${project.id}/export`, "_blank")}
              className="w-full flex items-center justify-between rounded-lg border border-border p-2.5 text-xs text-subtle hover:border-gold-500/30 hover:text-white transition-all mb-4">
              <span>Download JSON</span>
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          <div className="border-t border-border pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Project</p>
            <button onClick={() => setShowRegenerateConfirm(true)}
              className="w-full flex items-center justify-between rounded-lg border border-border p-2.5 text-xs text-subtle hover:border-ember-500/30 hover:text-ember-400 transition-all mb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500">
              <span>Regenerate video</span>
              <Zap className="h-3 w-3" />
            </button>
            <button onClick={handleDuplicate} disabled={duplicating}
              className="w-full flex items-center justify-between rounded-lg border border-border p-2.5 text-xs text-subtle hover:border-gold-500/30 hover:text-white transition-all mb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 disabled:opacity-50">
              <span>{duplicating ? "Duplicating..." : "Duplicate project"}</span>
              <Copy className="h-3 w-3" />
            </button>
            <button onClick={() => setShowDeleteConfirm(true)} disabled={deleting}
              className="w-full flex items-center justify-between rounded-lg border border-ember-500/20 p-2.5 text-xs text-ember-500/70 hover:border-ember-500/50 hover:text-ember-400 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500">
              <span>{deleting ? "Deleting..." : "Delete project"}</span>
              <Trash2 className="h-3 w-3" />
            </button>
          </div>

          <div className="border-t border-border pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">AI stack</p>
            <div className="space-y-1 text-[10px] text-muted">
              <p>✓ Claude — script</p>
              <p>✓ ElevenLabs — voice</p>
              <p>✓ Pexels — B-roll</p>
              <p>✓ Pixabay — music</p>
              <p>✓ Whisper — captions</p>
            </div>
          </div>
        </aside>
      </div>

      {/* ── Clip Inspector (Phase 13) ── */}
      {selectedClip && videoTrack && (
        <div className="flex-shrink-0 border-t border-border bg-surface/80 px-4 py-2.5">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gold-500">
              Clip {brollClips.findIndex((c) => c.id === selectedClipId) + 1}
            </span>

            {/* Trim duration */}
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-muted">Duration:</label>
              <input
                type="range"
                min={0.5}
                max={20}
                step={0.5}
                value={selectedClip.duration}
                onChange={(e) => {
                  // Optimistic UI — update local broll state immediately
                  const d = Number(e.target.value);
                  setBrollClips((prev) => prev.map((c) => c.id === selectedClipId ? { ...c, duration: d } : c));
                }}
                onMouseUp={(e) => trimClip(videoTrack.id, selectedClipId!, Number((e.target as HTMLInputElement).value))}
                onTouchEnd={(e) => trimClip(videoTrack.id, selectedClipId!, Number((e.target as HTMLInputElement).value))}
                className="w-32 accent-gold-500"
                aria-label="Clip duration in seconds"
              />
              <span className="text-[10px] text-white font-mono w-12">{selectedClip.duration.toFixed(1)}s</span>
            </div>

            {/* Speed control */}
            <div className="flex items-center gap-1">
              <Gauge className="h-3 w-3 text-muted" />
              <label className="text-[10px] text-muted mr-1">Speed:</label>
              {[0.5, 1, 1.5, 2].map((speed) => {
                const current = (selectedClip as TimelineClip & { speed?: number }).speed || 1;
                return (
                  <button
                    key={speed}
                    onClick={() => setClipSpeed(videoTrack.id, selectedClipId!, speed)}
                    className={cn(
                      "rounded border px-1.5 py-0.5 text-[10px] font-mono transition-all",
                      current === speed
                        ? "border-gold-500/50 bg-gold-500/15 text-gold-500"
                        : "border-border text-subtle hover:text-white hover:border-border-strong"
                    )}
                  >
                    {speed}x
                  </button>
                );
              })}
            </div>

            <div className="ml-auto flex items-center gap-2">
              {/* Effects toggle */}
              <button
                onClick={() => setShowEffectsPanel((v) => !v)}
                title="Filters, transitions, motion"
                className={cn(
                  "flex items-center gap-1 rounded border px-2 py-1 text-[10px] transition-all",
                  showEffectsPanel
                    ? "border-gold-500/50 bg-gold-500/10 text-gold-500"
                    : "border-border text-subtle hover:text-white hover:border-gold-500/30"
                )}
              >
                <Sparkles className="h-3 w-3" />
                Effects
              </button>
              <button
                onClick={() => deleteClip(videoTrack.id, selectedClipId!)}
                disabled={brollClips.length <= 1}
                className="flex items-center gap-1 rounded border border-ember-500/30 px-2 py-1 text-[10px] text-ember-400 hover:bg-ember-500/10 disabled:opacity-30 transition-all"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
              <button
                onClick={() => { setSelectedClipId(null); setShowEffectsPanel(false); }}
                aria-label="Deselect clip"
                className="text-muted hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Effects panel (expandable) */}
          {showEffectsPanel && selectedClip && videoTrack && (
            <div className="mt-2 max-w-xl">
              <ClipEffectsPanel
                clip={selectedClip}
                onFilterChange={(filterId) => setClipFilter(videoTrack.id, selectedClipId!, filterId)}
                onTransitionChange={(config) => setClipTransition(videoTrack.id, selectedClipId!, config)}
                onKenBurnsChange={(config) => setClipKenBurns(videoTrack.id, selectedClipId!, config)}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Pro Timeline ── */}
      {currentTimeline && brollClips.length > 0 ? (
        <div className="flex-shrink-0">
          <ProTimeline
            timeline={currentTimeline}
            playTime={playTime}
            totalDuration={totalDuration}
            selectedClipId={selectedClipId}
            selectedClipIds={selectedClipIds}
            zoom={timelineZoom}
            inPoint={inPoint}
            outPoint={outPoint}
            loopEnabled={loopEnabled}
            onZoomChange={setTimelineZoom}
            onSeek={(t) => {
              setPlayTime(t);
              if (audioRef.current) audioRef.current.currentTime = t;
            }}
            onSelectClip={handleClipSelect}
            onDeleteClip={deleteClip}
            onSplitAtPlayhead={splitAtPlayhead}
            onReorder={reorderClips}
            onContextMenu={(e, clipId) => setCtxMenu({ x: e.clientX, y: e.clientY, clipId })}
            onLoopToggle={() => setLoopEnabled((v) => !v)}
            onClearInOut={() => { setInPoint(null); setOutPoint(null); }}
            onDropAsset={insertAssetAtIndex}
          />
        </div>
      ) : (
        <div className="flex-shrink-0 border-t border-border bg-surface p-3">
          <div className="h-10 w-full rounded-lg border border-dashed border-border flex items-center justify-center">
            <span className="text-xs text-muted">Timeline will appear after generation</span>
          </div>
        </div>
      )}
    </div>
  );
}

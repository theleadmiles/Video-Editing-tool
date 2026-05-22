"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { cn, formatDuration } from "@/lib/utils";
import { Film, Mic2, Music2, Type, Scissors, Trash2, GripVertical } from "lucide-react";
import type { TimelineData, TimelineClip } from "@/types";

interface ProTimelineProps {
  timeline: TimelineData;
  playTime: number;
  totalDuration: number;
  selectedClipId: string | null;
  selectedClipIds?: Set<string>;
  zoom?: number; // 50–300
  inPoint?: number | null;
  outPoint?: number | null;
  loopEnabled?: boolean;
  onSeek: (t: number) => void;
  onSelectClip: (clipId: string | null, modifiers?: { shift?: boolean; meta?: boolean }) => void;
  onDeleteClip: (trackId: string, clipId: string) => void;
  onSplitAtPlayhead: () => void;
  onReorder: (trackId: string, clipIds: string[]) => void;
  onContextMenu?: (e: React.MouseEvent, clipId: string) => void;
  onZoomChange?: (zoom: number) => void;
  onLoopToggle?: () => void;
  onClearInOut?: () => void;
  onDropAsset?: (assetUrl: string, atIndex: number) => void;
}

/**
 * Premiere-style timeline. Renders 4 tracks (video, voiceover, music, captions)
 * with proportional clip widths, scrubbable playhead, click-to-select, drag-to-reorder.
 */
export function ProTimeline({
  timeline,
  playTime,
  totalDuration,
  selectedClipId,
  selectedClipIds,
  zoom = 100,
  inPoint = null,
  outPoint = null,
  loopEnabled = false,
  onSeek,
  onSelectClip,
  onDeleteClip,
  onSplitAtPlayhead,
  onReorder,
  onContextMenu,
  onZoomChange,
  onLoopToggle,
  onClearInOut,
  onDropAsset,
}: ProTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const [dragClipId, setDragClipId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const videoTrack = timeline.tracks.find((t) => t.type === "video");
  const voiceoverTrack = timeline.tracks.find((t) => t.id === "voiceover_track");
  const musicTrack = timeline.tracks.find((t) => t.id === "music_track");
  const captionTrack = timeline.tracks.find((t) => t.type === "text");

  const videoClips = (videoTrack?.clips || []) as TimelineClip[];
  const captionClips = (captionTrack?.clips || []) as TimelineClip[];

  // Scrubbing logic
  const handleScrub = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      onSeek(ratio * totalDuration);
    },
    [onSeek, totalDuration]
  );

  useEffect(() => {
    if (!scrubbing) return;
    function onMove(e: MouseEvent) { handleScrub(e); }
    function onUp() { setScrubbing(false); }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [scrubbing, handleScrub]);

  const playheadPercent = totalDuration > 0 ? (playTime / totalDuration) * 100 : 0;

  // Build ruler ticks every ~5s
  const tickInterval = totalDuration > 60 ? 10 : totalDuration > 20 ? 5 : 2;
  const ticks = [];
  for (let t = 0; t <= totalDuration; t += tickInterval) {
    ticks.push(t);
  }

  function handleDragStart(e: React.DragEvent, clipId: string) {
    setDragClipId(clipId);
    e.dataTransfer.effectAllowed = "move";
  }
  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }
  function handleDropOnSlot(e: React.DragEvent, targetIndex: number) {
    e.preventDefault();

    // Check for external asset drop first
    const assetData = e.dataTransfer.getData("application/x-boltcut-asset");
    if (assetData) {
      try {
        const asset = JSON.parse(assetData);
        if (asset.type === "video" && onDropAsset) {
          onDropAsset(asset.url, targetIndex);
          setDragOverIndex(null);
          return;
        }
      } catch { /* ignore */ }
    }

    // Otherwise — internal reorder
    if (!dragClipId || !videoTrack) {
      setDragOverIndex(null);
      return;
    }
    const srcIndex = videoClips.findIndex((c) => c.id === dragClipId);
    if (srcIndex < 0 || srcIndex === targetIndex) {
      setDragClipId(null);
      setDragOverIndex(null);
      return;
    }
    const reordered = [...videoClips];
    const [moved] = reordered.splice(srcIndex, 1);
    reordered.splice(targetIndex > srcIndex ? targetIndex - 1 : targetIndex, 0, moved);
    onReorder(videoTrack.id, reordered.map((c) => c.id));
    setDragClipId(null);
    setDragOverIndex(null);
  }

  // Deterministic waveform heights — sine-based, no Math.random() so they
  // stay stable across re-renders and server/client hydration.
  // useMemo ensures the arrays are only computed once per component lifetime.
  const voiceWaveBars = useMemo(() => Array.from({ length: 80 }, (_, i) =>
    Math.max(12, 32 + Math.sin(i * 0.71) * 18 + Math.sin(i * 0.29 + 1.5) * 12 + Math.cos(i * 1.13) * 8)
  ), []);
  const musicWaveBars = useMemo(() => Array.from({ length: 80 }, (_, i) =>
    Math.max(12, 28 + Math.sin(i * 0.53 + 0.3) * 20 + Math.sin(i * 0.87 + 2.1) * 10 + Math.cos(i * 0.41) * 12)
  ), []);

  return (
    <div className="bg-base flex flex-col h-full">
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface/50">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Timeline</span>
          <span className="text-[10px] text-muted">
            {formatDuration(playTime)} / {formatDuration(totalDuration)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Zoom controls */}
          {onZoomChange && (
            <div className="flex items-center gap-0.5 rounded-lg border border-border px-1">
              <button
                onClick={() => onZoomChange(Math.max(50, zoom - 25))}
                aria-label="Zoom out"
                title="Zoom out"
                className="h-5 w-5 flex items-center justify-center text-subtle hover:text-white transition-colors"
              >
                <span className="text-sm leading-none">−</span>
              </button>
              <span className="text-[9px] font-mono text-muted w-9 text-center">{zoom}%</span>
              <button
                onClick={() => onZoomChange(Math.min(300, zoom + 25))}
                aria-label="Zoom in"
                title="Zoom in"
                className="h-5 w-5 flex items-center justify-center text-subtle hover:text-white transition-colors"
              >
                <span className="text-sm leading-none">+</span>
              </button>
            </div>
          )}
          <button
            onClick={onSplitAtPlayhead}
            className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] text-subtle hover:text-white hover:border-gold-500/30 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
            title="Split clip at playhead (Cmd+K)"
          >
            <Scissors className="h-3 w-3" />
            Split
          </button>
          {selectedClipId && (
            <button
              onClick={() => {
                if (videoTrack) onDeleteClip(videoTrack.id, selectedClipId);
              }}
              className="flex items-center gap-1 rounded-lg border border-ember-500/30 px-2 py-1 text-[10px] text-ember-400 hover:bg-ember-500/10 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500"
              title="Delete clip (Del)"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
          )}

          {/* In/Out + Loop controls */}
          {onLoopToggle && (
            <>
              <div className="w-px h-4 bg-border mx-1" />
              <button
                onClick={onLoopToggle}
                aria-pressed={loopEnabled}
                title="Loop between In/Out (Shift+Space)"
                className={cn(
                  "flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] transition-all",
                  loopEnabled
                    ? "border-gold-500/50 bg-gold-500/15 text-gold-500"
                    : "border-border text-subtle hover:text-white hover:border-gold-500/30"
                )}
              >
                🔁 Loop
              </button>
              {(inPoint !== null || outPoint !== null) && (
                <button
                  onClick={onClearInOut}
                  title="Clear In/Out points"
                  className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] text-subtle hover:text-white"
                >
                  Clear I/O
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Time ruler */}
      <div
        ref={containerRef}
        className="relative h-5 border-b border-border bg-surface/30 cursor-ew-resize select-none"
        onMouseDown={(e) => {
          setScrubbing(true);
          handleScrub(e);
        }}
      >
        {ticks.map((t) => (
          <div
            key={t}
            className="absolute top-0 bottom-0 flex items-center"
            style={{ left: `${(t / totalDuration) * 100}%` }}
          >
            <div className="h-full w-px bg-border" />
            <span className="absolute left-1 top-0.5 text-[8px] text-muted font-mono">
              {Math.round(t)}s
            </span>
          </div>
        ))}
        {/* In point marker */}
        {inPoint !== null && (
          <div
            className="absolute top-0 bottom-0 z-20 pointer-events-none"
            style={{ left: `${(inPoint / totalDuration) * 100}%` }}
          >
            <div className="w-px h-full bg-green-500" />
            <div className="absolute -top-0.5 -left-1.5 text-[8px] font-bold text-green-500 bg-black/70 rounded px-0.5">I</div>
          </div>
        )}
        {/* Out point marker */}
        {outPoint !== null && (
          <div
            className="absolute top-0 bottom-0 z-20 pointer-events-none"
            style={{ left: `${(outPoint / totalDuration) * 100}%` }}
          >
            <div className="w-px h-full bg-ember-500" />
            <div className="absolute -top-0.5 -left-1.5 text-[8px] font-bold text-ember-500 bg-black/70 rounded px-0.5">O</div>
          </div>
        )}
        {/* In→Out range highlight */}
        {inPoint !== null && outPoint !== null && outPoint > inPoint && (
          <div
            className="absolute top-0 bottom-0 bg-gold-500/15 z-10 pointer-events-none"
            style={{
              left: `${(inPoint / totalDuration) * 100}%`,
              width: `${((outPoint - inPoint) / totalDuration) * 100}%`,
            }}
          />
        )}
        {/* Playhead on ruler */}
        <div
          className="absolute top-0 bottom-0 w-px bg-gold-500 z-20 pointer-events-none"
          style={{ left: `${playheadPercent}%` }}
        />
      </div>

      {/* Tracks — wrapped in horizontal scroller when zoomed */}
      <div className="overflow-x-auto">
      <div className="relative" style={{ width: `${zoom}%`, minWidth: "100%" }}>
        {/* Playhead line across all tracks */}
        <div
          className="absolute top-0 bottom-0 w-px bg-gold-500 z-30 pointer-events-none"
          style={{ left: `${playheadPercent}%` }}
        >
          <div className="absolute -top-1 -left-1.5 h-3 w-3 rotate-45 bg-gold-500" />
        </div>

        {/* Video track */}
        <TrackLane icon={Film} label="Video" iconColor="text-gold-500">
          <div className="relative flex h-12 w-full">
            {videoClips.map((clip, i) => (
              <div
                key={clip.id}
                className="relative h-full"
                style={{ width: `${(clip.duration / totalDuration) * 100}%` }}
              >
                {/* Drop slot before clip */}
                <div
                  className={cn(
                    "absolute left-0 top-0 bottom-0 w-1 z-10",
                    dragOverIndex === i ? "bg-gold-500" : ""
                  )}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDrop={(e) => handleDropOnSlot(e, i)}
                />
                <button
                  draggable
                  onDragStart={(e) => handleDragStart(e, clip.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectClip(clip.id, { shift: e.shiftKey, meta: e.metaKey || e.ctrlKey });
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onSelectClip(clip.id);
                    if (onContextMenu) onContextMenu(e, clip.id);
                  }}
                  className={cn(
                    "group relative h-full w-full overflow-hidden border-r border-base text-left transition-all",
                    selectedClipIds?.has(clip.id) || selectedClipId === clip.id
                      ? "ring-2 ring-gold-500 ring-inset z-10"
                      : "hover:brightness-125",
                    selectedClipIds && selectedClipIds.size > 1 && selectedClipIds.has(clip.id) && "ring-ember-500"
                  )}
                >
                  {clip.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={clip.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-gold-500/30 to-ember-500/30" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

                  {/* Drag handle */}
                  <span className="absolute left-1 top-1/2 -translate-y-1/2 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="h-3 w-3" />
                  </span>

                  {/* Clip number */}
                  <span className="absolute top-1 right-1 text-[9px] font-bold text-white bg-black/60 rounded px-1">
                    {i + 1}
                  </span>

                  {/* Duration */}
                  <span className="absolute bottom-1 left-1 text-[8px] text-white/90 font-mono">
                    {clip.duration.toFixed(1)}s
                  </span>
                </button>
              </div>
            ))}
            {/* Drop zone at end */}
            <div
              className={cn(
                "absolute right-0 top-0 bottom-0 w-2 z-10",
                dragOverIndex === videoClips.length ? "bg-gold-500" : ""
              )}
              onDragOver={(e) => handleDragOver(e, videoClips.length)}
              onDrop={(e) => handleDropOnSlot(e, videoClips.length)}
            />
          </div>
        </TrackLane>

        {/* Voiceover track */}
        <TrackLane icon={Mic2} label="Voice" iconColor="text-gold-500">
          <div className="h-7 w-full bg-gold-500/10 border border-gold-500/20 rounded relative overflow-hidden">
            {voiceoverTrack?.clips?.[0]?.url ? (
              <>
                {/* Stable deterministic waveform — fills full width */}
                <div className="absolute inset-0 flex items-end px-0.5 pb-0.5 gap-px overflow-hidden">
                  {voiceWaveBars.map((h, i) => (
                    <div key={i} className="flex-1 bg-gold-500/50 rounded-sm" style={{ height: `${h}%` }} />
                  ))}
                </div>
                <span className="absolute left-1 top-0.5 text-[8px] text-gold-400 font-semibold">AI Voiceover</span>
              </>
            ) : (
              <span className="absolute left-1 top-1 text-[8px] text-muted">No voiceover</span>
            )}
          </div>
        </TrackLane>

        {/* Music track */}
        <TrackLane icon={Music2} label="Music" iconColor="text-ember-500">
          <div className="h-7 w-full bg-ember-500/10 border border-ember-500/20 rounded relative overflow-hidden">
            {musicTrack?.clips?.[0]?.url ? (
              <>
                {/* Stable deterministic waveform — fills full width */}
                <div className="absolute inset-0 flex items-end px-0.5 pb-0.5 gap-px overflow-hidden">
                  {musicWaveBars.map((h, i) => (
                    <div key={i} className="flex-1 bg-ember-500/45 rounded-sm" style={{ height: `${h}%` }} />
                  ))}
                </div>
                <span className="absolute left-1 top-0.5 text-[8px] text-ember-400 font-semibold">Music</span>
              </>
            ) : (
              <span className="absolute left-1 top-1 text-[8px] text-muted">No music</span>
            )}
          </div>
        </TrackLane>

        {/* Captions track */}
        <TrackLane icon={Type} label="Captions" iconColor="text-subtle">
          <div className="relative h-7 w-full">
            {captionClips.map((cap) => (
              <div
                key={cap.id}
                className="absolute top-0 bottom-0 rounded bg-white/10 border border-white/20 overflow-hidden flex items-center"
                style={{
                  left: `${(cap.start_time / totalDuration) * 100}%`,
                  width: `${(cap.duration / totalDuration) * 100}%`,
                }}
                title={cap.text}
              >
                <span className="px-1.5 text-[9px] text-white truncate">{cap.text}</span>
              </div>
            ))}
          </div>
        </TrackLane>
      </div>
      </div>

      {/* Hint bar */}
      <div className="px-3 py-1.5 border-t border-border bg-surface/30 flex items-center justify-between text-[9px] text-muted/70">
        <span>Click a clip to select · Right-click for menu · Drag to reorder · Cmd+K split · Del remove</span>
        <span>{videoClips.length} clip{videoClips.length !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}

interface TrackLaneProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  iconColor: string;
  children: React.ReactNode;
}

function TrackLane({ icon: Icon, label, iconColor, children }: TrackLaneProps) {
  return (
    <div className="flex items-center border-b border-border last:border-b-0">
      <div className="flex w-20 flex-shrink-0 items-center gap-1.5 px-2.5 py-1.5 border-r border-border bg-surface/30">
        <Icon className={cn("h-3 w-3", iconColor)} />
        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted">{label}</span>
      </div>
      <div className="flex-1 px-1 py-1.5">{children}</div>
    </div>
  );
}

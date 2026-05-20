"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  COLOR_FILTERS,
  TRANSITIONS,
  KEN_BURNS_DIRECTIONS,
  findFilter,
  findTransition,
} from "@/lib/visual-effects";
import { Filter, Wand2, MoveRight, Sparkles } from "lucide-react";
import type { TimelineClip } from "@/types";

type ClipWithEffects = TimelineClip & {
  filter?: string;
  transition?: { type: string; duration: number };
  ken_burns?: { enabled: boolean; direction: string; intensity: number };
};

interface Props {
  clip: ClipWithEffects;
  onFilterChange: (filterId: string) => void;
  onTransitionChange: (config: { type: string; duration: number }) => void;
  onKenBurnsChange: (config: { enabled: boolean; direction: string; intensity: number }) => void;
}

export function ClipEffectsPanel({
  clip,
  onFilterChange,
  onTransitionChange,
  onKenBurnsChange,
}: Props) {
  const [tab, setTab] = useState<"filter" | "transition" | "motion">("filter");

  const currentFilter = findFilter(clip.filter);
  const currentTransition = findTransition(clip.transition?.type);
  const transitionDuration = clip.transition?.duration ?? currentTransition.default_duration;
  const kenBurns = clip.ken_burns || { enabled: false, direction: "zoom_in", intensity: 1.15 };

  return (
    <div className="rounded-xl border border-gold-500/30 bg-surface overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-gold-500/5">
        <Sparkles className="h-3 w-3 text-gold-500" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gold-500">
          Clip Effects
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {([
          { id: "filter", icon: Filter, label: "Filter" },
          { id: "transition", icon: MoveRight, label: "Transition" },
          { id: "motion", icon: Wand2, label: "Motion" },
        ] as const).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-medium border-b-2 transition-colors",
              tab === id
                ? "border-gold-500 text-gold-500"
                : "border-transparent text-muted hover:text-white"
            )}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        ))}
      </div>

      <div className="p-3 space-y-3">
        {/* ── FILTER ── */}
        {tab === "filter" && (
          <div>
            <p className="mb-2 text-[10px] text-muted">
              Current: <span className="text-white font-medium">{currentFilter.label}</span>
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {COLOR_FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => onFilterChange(f.id)}
                  title={f.description}
                  className={cn(
                    "group relative rounded-lg overflow-hidden border-2 transition-all aspect-square",
                    clip.filter === f.id || (!clip.filter && f.id === "none")
                      ? "border-gold-500 ring-2 ring-gold-500/20"
                      : "border-transparent hover:border-border-strong"
                  )}
                >
                  {/* Filter preview thumbnail — clip's thumbnail with filter applied */}
                  {clip.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={clip.thumbnail}
                      alt={f.label}
                      className="absolute inset-0 h-full w-full object-cover"
                      style={{ filter: f.css }}
                    />
                  ) : (
                    <div
                      className="absolute inset-0"
                      style={{ backgroundColor: f.swatch }}
                    />
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-black/70 px-1 py-0.5">
                    <span className="text-[8px] text-white font-medium block truncate text-center">
                      {f.label}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── TRANSITION ── */}
        {tab === "transition" && (
          <div className="space-y-3">
            <div>
              <p className="text-[10px] text-muted mb-1.5">Transition into this clip</p>
              <div className="grid grid-cols-4 gap-1.5">
                {TRANSITIONS.map((t) => {
                  const isActive = (clip.transition?.type || "cut") === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => onTransitionChange({
                        type: t.id,
                        duration: t.default_duration,
                      })}
                      title={t.description}
                      className={cn(
                        "rounded-lg border px-1.5 py-2 text-[10px] transition-all",
                        isActive
                          ? "border-gold-500/50 bg-gold-500/10 text-gold-500"
                          : "border-border text-subtle hover:text-white hover:border-gold-500/30"
                      )}
                    >
                      <p className="font-semibold">{t.label}</p>
                      <p className="text-[8px] text-muted mt-0.5 truncate">{t.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {clip.transition && clip.transition.type !== "cut" && (
              <div>
                <label className="text-[10px] text-muted flex items-center justify-between mb-1">
                  <span>Duration</span>
                  <span className="font-mono text-white">{transitionDuration.toFixed(2)}s</span>
                </label>
                <input
                  type="range"
                  min={0.1}
                  max={2}
                  step={0.05}
                  value={transitionDuration}
                  onChange={(e) => onTransitionChange({
                    type: clip.transition!.type,
                    duration: Number(e.target.value),
                  })}
                  aria-label="Transition duration"
                  className="w-full accent-gold-500"
                />
              </div>
            )}
          </div>
        )}

        {/* ── KEN BURNS / MOTION ── */}
        {tab === "motion" && (
          <div className="space-y-3">
            <button
              onClick={() => onKenBurnsChange({ ...kenBurns, enabled: !kenBurns.enabled })}
              className={cn(
                "w-full flex items-center justify-between rounded-lg border p-2 transition-all",
                kenBurns.enabled
                  ? "border-gold-500/40 bg-gold-500/5"
                  : "border-border bg-elevated/30"
              )}
            >
              <div className="flex flex-col items-start">
                <span className="text-xs text-white font-medium">Ken Burns motion</span>
                <span className="text-[9px] text-muted">Smooth zoom/pan</span>
              </div>
              <div className={cn(
                "h-4 w-7 rounded-full relative transition-colors",
                kenBurns.enabled ? "bg-gold-500" : "bg-overlay"
              )}>
                <div className={cn(
                  "h-3 w-3 rounded-full bg-white absolute top-0.5 transition-transform",
                  kenBurns.enabled ? "translate-x-3.5" : "translate-x-0.5"
                )} />
              </div>
            </button>

            {kenBurns.enabled && (
              <>
                <div>
                  <p className="text-[10px] text-muted mb-1.5">Direction</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {KEN_BURNS_DIRECTIONS.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => onKenBurnsChange({ ...kenBurns, direction: d.id })}
                        title={d.description}
                        className={cn(
                          "rounded-lg border px-1.5 py-1.5 text-[10px] transition-all flex flex-col items-center gap-0.5",
                          kenBurns.direction === d.id
                            ? "border-gold-500/50 bg-gold-500/10 text-gold-500"
                            : "border-border text-subtle hover:text-white hover:border-gold-500/30"
                        )}
                      >
                        <span className="text-sm">{d.icon}</span>
                        <span className="font-medium">{d.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-muted flex items-center justify-between mb-1">
                    <span>Intensity</span>
                    <span className="font-mono text-white">{kenBurns.intensity.toFixed(2)}x</span>
                  </label>
                  <input
                    type="range"
                    min={1.02}
                    max={1.4}
                    step={0.02}
                    value={kenBurns.intensity}
                    onChange={(e) => onKenBurnsChange({ ...kenBurns, intensity: Number(e.target.value) })}
                    aria-label="Ken Burns intensity"
                    className="w-full accent-gold-500"
                  />
                  <div className="flex justify-between text-[8px] text-muted mt-0.5">
                    <span>Subtle</span>
                    <span>Strong</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

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
import { Filter, Wand2, MoveRight, Sparkles, Palette, Gauge } from "lucide-react";
import type { TimelineClip } from "@/types";

export interface ColorGrade {
  brightness: number;  // 0.5 – 1.5, default 1
  contrast: number;    // 0.5 – 1.5, default 1
  saturation: number;  // 0   – 2,   default 1
}

const DEFAULT_GRADE: ColorGrade = { brightness: 1, contrast: 1, saturation: 1 }

interface GradePreset {
  id: string;
  label: string;
  description: string;
  grade: ColorGrade;
}

/**
 * 12 tasteful color-grade presets for social/short-form video.
 * Values are intentionally subtle — no blown-out saturation or crushed blacks.
 */
export const GRADE_PRESETS: GradePreset[] = [
  {
    id:          "natural",
    label:       "Natural",
    description: "No adjustments",
    grade: { brightness: 1.00, contrast: 1.00, saturation: 1.00 },
  },
  {
    id:          "clean_pop",
    label:       "Clean Pop",
    description: "Crisp, social-ready lift",
    grade: { brightness: 1.03, contrast: 1.10, saturation: 1.12 },
  },
  {
    id:          "bright_airy",
    label:       "Bright & Airy",
    description: "Open, high-key lifestyle feel",
    grade: { brightness: 1.14, contrast: 0.88, saturation: 0.95 },
  },
  {
    id:          "warm_glow",
    label:       "Warm Glow",
    description: "Gentle warmth, feels golden",
    grade: { brightness: 1.06, contrast: 1.08, saturation: 1.08 },
  },
  {
    id:          "cinematic",
    label:       "Cinematic",
    description: "Film-like, slightly muted",
    grade: { brightness: 0.94, contrast: 1.22, saturation: 0.82 },
  },
  {
    id:          "matte_film",
    label:       "Matte Film",
    description: "Lifted blacks, indie look",
    grade: { brightness: 1.06, contrast: 0.83, saturation: 0.88 },
  },
  {
    id:          "deep_rich",
    label:       "Deep Rich",
    description: "Punchy, rich, dramatic",
    grade: { brightness: 0.91, contrast: 1.28, saturation: 1.10 },
  },
  {
    id:          "studio",
    label:       "Studio",
    description: "Clean contrast, neutral look",
    grade: { brightness: 1.00, contrast: 1.14, saturation: 1.00 },
  },
  {
    id:          "vivid",
    label:       "Vivid",
    description: "Punchy colours, not overdone",
    grade: { brightness: 1.02, contrast: 1.10, saturation: 1.32 },
  },
  {
    id:          "faded",
    label:       "Faded",
    description: "Soft, washed-out, dreamy",
    grade: { brightness: 1.09, contrast: 0.78, saturation: 0.72 },
  },
  {
    id:          "moody",
    label:       "Moody",
    description: "Dark, desaturated, emotional",
    grade: { brightness: 0.87, contrast: 1.18, saturation: 0.78 },
  },
  {
    id:          "golden_hour",
    label:       "Golden Hr.",
    description: "Warm outdoor/sunset feel",
    grade: { brightness: 1.07, contrast: 1.10, saturation: 1.05 },
  },
]

function gradeMatchesPreset(g: ColorGrade, p: ColorGrade): boolean {
  return (
    Math.abs(g.brightness - p.brightness) < 0.015 &&
    Math.abs(g.contrast   - p.contrast)   < 0.015 &&
    Math.abs(g.saturation - p.saturation) < 0.015
  );
};

type ClipWithEffects = TimelineClip & {
  filter?: string;
  transition?: { type: string; duration: number };
  ken_burns?: { enabled: boolean; direction: string; intensity: number };
  color_grade?: ColorGrade;
  speed?: number;
};

interface Props {
  clip: ClipWithEffects;
  onFilterChange: (filterId: string) => void;
  onTransitionChange: (config: { type: string; duration: number }) => void;
  onKenBurnsChange: (config: { enabled: boolean; direction: string; intensity: number }) => void;
  onColorGradeChange?: (grade: ColorGrade) => void;
  onSpeedChange?: (speed: number) => void;
}

const SPEED_PRESETS = [
  { label: "0.5×", value: 0.5 },
  { label: "0.75×", value: 0.75 },
  { label: "1×",   value: 1 },
  { label: "1.5×", value: 1.5 },
  { label: "2×",   value: 2 },
];

export function ClipEffectsPanel({
  clip,
  onFilterChange,
  onTransitionChange,
  onKenBurnsChange,
  onColorGradeChange,
  onSpeedChange,
}: Props) {
  const [tab, setTab] = useState<"filter" | "grade" | "transition" | "motion">("filter");

  const currentFilter = findFilter(clip.filter);
  const currentTransition = findTransition(clip.transition?.type);
  const transitionDuration = clip.transition?.duration ?? currentTransition.default_duration;
  const kenBurns = clip.ken_burns || { enabled: false, direction: "zoom_in", intensity: 1.15 };
  const grade: ColorGrade = clip.color_grade ?? DEFAULT_GRADE;
  const speed = clip.speed ?? 1;

  function updateGrade(partial: Partial<ColorGrade>) {
    onColorGradeChange?.({ ...grade, ...partial });
  }

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
          { id: "filter",     icon: Filter,    label: "Filter" },
          { id: "grade",      icon: Palette,   label: "Grade" },
          { id: "transition", icon: MoveRight, label: "Trans." },
          { id: "motion",     icon: Wand2,     label: "Motion" },
        ] as const).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1 py-2 text-[9px] font-medium border-b-2 transition-colors",
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
                  {clip.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={clip.thumbnail}
                      alt={f.label}
                      className="absolute inset-0 h-full w-full object-cover"
                      style={{ filter: f.css }}
                    />
                  ) : (
                    <div className="absolute inset-0" style={{ backgroundColor: f.swatch }} />
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

        {/* ── GRADE ── */}
        {tab === "grade" && (
          <div className="space-y-4">
            {/* Preset swatches */}
            <div>
              <p className="mb-2 text-[10px] text-muted">
                Preset:{" "}
                <span className="text-white font-medium">
                  {GRADE_PRESETS.find((p) => gradeMatchesPreset(grade, p.grade))?.label ?? "Custom"}
                </span>
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                {GRADE_PRESETS.map((preset) => {
                  const active = gradeMatchesPreset(grade, preset.grade);
                  const filterStr = `brightness(${preset.grade.brightness}) contrast(${preset.grade.contrast}) saturate(${preset.grade.saturation})`;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => onColorGradeChange?.(preset.grade)}
                      title={preset.description}
                      className={cn(
                        "group relative rounded-lg overflow-hidden border-2 transition-all",
                        active
                          ? "border-gold-500 ring-2 ring-gold-500/20"
                          : "border-transparent hover:border-border-strong"
                      )}
                      style={{ aspectRatio: "1" }}
                    >
                      {clip.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={clip.thumbnail}
                          alt={preset.label}
                          className="absolute inset-0 h-full w-full object-cover"
                          style={{ filter: filterStr }}
                        />
                      ) : (
                        <div className="absolute inset-0 bg-elevated" />
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-black/70 px-0.5 py-0.5">
                        <span className="text-[8px] text-white font-medium block truncate text-center leading-tight">
                          {preset.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live preview of active grade */}
            {clip.thumbnail && (
              <div className="relative rounded-lg overflow-hidden" style={{ aspectRatio: "16/9" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={clip.thumbnail}
                  alt="Grade preview"
                  className="w-full h-full object-cover"
                  style={{
                    filter: `brightness(${grade.brightness}) contrast(${grade.contrast}) saturate(${grade.saturation})`,
                  }}
                />
                <div className="absolute bottom-1 right-1">
                  <span className="text-[8px] bg-black/60 text-white rounded px-1 py-0.5">Live preview</span>
                </div>
              </div>
            )}

            {/* Fine-tune sliders */}
            <div className="space-y-3">
              <p className="text-[10px] text-muted font-medium">Fine-tune</p>

              {/* Brightness */}
              <div>
                <label className="text-[10px] text-muted flex items-center justify-between mb-1">
                  <span>Brightness</span>
                  <span className="font-mono text-white">{grade.brightness.toFixed(2)}</span>
                </label>
                <input
                  type="range" min={0.5} max={1.5} step={0.01}
                  value={grade.brightness}
                  onChange={(e) => updateGrade({ brightness: Number(e.target.value) })}
                  aria-label="Brightness"
                  className="w-full accent-gold-500"
                />
                <div className="flex justify-between text-[8px] text-muted mt-0.5">
                  <span>Dark</span><span>Bright</span>
                </div>
              </div>

              {/* Contrast */}
              <div>
                <label className="text-[10px] text-muted flex items-center justify-between mb-1">
                  <span>Contrast</span>
                  <span className="font-mono text-white">{grade.contrast.toFixed(2)}</span>
                </label>
                <input
                  type="range" min={0.5} max={1.5} step={0.01}
                  value={grade.contrast}
                  onChange={(e) => updateGrade({ contrast: Number(e.target.value) })}
                  aria-label="Contrast"
                  className="w-full accent-gold-500"
                />
                <div className="flex justify-between text-[8px] text-muted mt-0.5">
                  <span>Flat</span><span>Punchy</span>
                </div>
              </div>

              {/* Saturation */}
              <div>
                <label className="text-[10px] text-muted flex items-center justify-between mb-1">
                  <span>Saturation</span>
                  <span className="font-mono text-white">{grade.saturation.toFixed(2)}</span>
                </label>
                <input
                  type="range" min={0} max={2} step={0.01}
                  value={grade.saturation}
                  onChange={(e) => updateGrade({ saturation: Number(e.target.value) })}
                  aria-label="Saturation"
                  className="w-full accent-gold-500"
                />
                <div className="flex justify-between text-[8px] text-muted mt-0.5">
                  <span>B&amp;W</span><span>Vivid</span>
                </div>
              </div>
            </div>

            {/* Reset */}
            <button
              onClick={() => onColorGradeChange?.(DEFAULT_GRADE)}
              className="w-full rounded-lg border border-border py-1.5 text-[10px] text-muted hover:text-white hover:border-border-strong transition-colors"
            >
              Reset to Natural
            </button>
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
                      onClick={() => onTransitionChange({ type: t.id, duration: t.default_duration })}
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
                  type="range" min={0.1} max={2} step={0.05}
                  value={transitionDuration}
                  onChange={(e) => onTransitionChange({ type: clip.transition!.type, duration: Number(e.target.value) })}
                  aria-label="Transition duration"
                  className="w-full accent-gold-500"
                />
              </div>
            )}
          </div>
        )}

        {/* ── KEN BURNS / MOTION ── */}
        {tab === "motion" && (
          <div className="space-y-4">
            {/* Speed */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Gauge className="h-3 w-3 text-gold-500" />
                <p className="text-[10px] text-muted font-medium">Playback Speed</p>
              </div>
              <div className="flex gap-1">
                {SPEED_PRESETS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => onSpeedChange?.(s.value)}
                    className={cn(
                      "flex-1 rounded-lg border py-1.5 text-[10px] font-medium transition-all",
                      Math.abs(speed - s.value) < 0.01
                        ? "border-gold-500/50 bg-gold-500/10 text-gold-500"
                        : "border-border text-subtle hover:text-white hover:border-gold-500/30"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              {speed !== 1 && (
                <p className="mt-1 text-[9px] text-muted text-center">
                  {speed < 1 ? `Slow motion — ${speed}×` : `Fast forward — ${speed}×`}
                </p>
              )}
            </div>

            <div className="border-t border-border/50 pt-3">
              {/* Ken Burns */}
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
                  <div className="mt-3">
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

                  <div className="mt-3">
                    <label className="text-[10px] text-muted flex items-center justify-between mb-1">
                      <span>Intensity</span>
                      <span className="font-mono text-white">{kenBurns.intensity.toFixed(2)}x</span>
                    </label>
                    <input
                      type="range" min={1.02} max={1.4} step={0.02}
                      value={kenBurns.intensity}
                      onChange={(e) => onKenBurnsChange({ ...kenBurns, intensity: Number(e.target.value) })}
                      aria-label="Ken Burns intensity"
                      className="w-full accent-gold-500"
                    />
                    <div className="flex justify-between text-[8px] text-muted mt-0.5">
                      <span>Subtle</span><span>Strong</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

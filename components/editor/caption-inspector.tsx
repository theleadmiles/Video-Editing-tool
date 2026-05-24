"use client";

import { useState, useRef, useCallback } from "react";
import { Type, Palette, MoveVertical, Sparkles, X, Check,
         ArrowUp, ArrowDown, AlignCenter, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimelineClip } from "@/types";

interface Props {
  caption: TimelineClip;
  onChange: (updates: Partial<TimelineClip>) => void;
  onClose: () => void;
}

const FONTS = [
  { value: "Inter",         label: "Inter",         hint: "Clean",    cssVar: "var(--font-inter)"         },
  { value: "Montserrat",    label: "Montserrat",    hint: "Modern",   cssVar: "var(--font-montserrat)"    },
  { value: "Oswald",        label: "Oswald",        hint: "Condensed",cssVar: "var(--font-oswald)"        },
  { value: "Bebas Neue",    label: "Bebas Neue",    hint: "Impact",   cssVar: "var(--font-bebas-neue)"    },
  { value: "Space Grotesk", label: "Space Grotesk", hint: "Brand",    cssVar: "var(--font-space-grotesk)" },
];

// Animation definitions with CSS class name for live preview
const ANIMATIONS = [
  { value: "fade",       label: "Fade",    previewClass: "animate-[capFade_0.5s_ease_infinite_alternate]" },
  { value: "pop",        label: "Pop",     previewClass: "animate-[capPop_0.6s_cubic-bezier(0.34,1.56,0.64,1)_infinite_alternate]" },
  { value: "slide_up",   label: "Slide ↑", previewClass: "animate-[capSlideUp_0.5s_ease_infinite_alternate]" },
  { value: "slide_down", label: "Slide ↓", previewClass: "animate-[capSlideDown_0.5s_ease_infinite_alternate]" },
  { value: "type",       label: "Type",    previewClass: "animate-[capType_1s_steps(8,end)_infinite_alternate]" },
  { value: "karaoke",    label: "Karaoke", previewClass: "animate-[kaIn_0.4s_ease_infinite_alternate]" },
  { value: "none",       label: "None",    previewClass: "" },
];

const PRESET_COLORS = [
  { hex: "#FFFFFF", label: "White" },
  { hex: "#F0A500", label: "Gold" },
  { hex: "#FF4D4D", label: "Red" },
  { hex: "#10B981", label: "Green" },
  { hex: "#3B82F6", label: "Blue" },
  { hex: "#8B5CF6", label: "Purple" },
  { hex: "#F97316", label: "Orange" },
  { hex: "#000000", label: "Black" },
];

const POSITION_PRESETS = [
  { label: "Top",    x: 50, y: 10,  icon: ArrowUp },
  { label: "Center", x: 50, y: 50,  icon: AlignCenter },
  { label: "Lower",  x: 50, y: 75,  icon: ArrowDown },
  { label: "Bottom", x: 50, y: 90,  icon: Minus },
];

const BACKGROUNDS = [
  { id: "none",   label: "None",    preview: "border border-dashed border-white/20",
    background_css: undefined, bg_padding: undefined },
  { id: "pill",   label: "Pill",    preview: "bg-black/80 rounded-full",
    background_css: "rgba(0,0,0,0.8)", bg_padding: "4px 16px" },
  { id: "box",    label: "Box",     preview: "bg-black/75 rounded-md",
    background_css: "rgba(0,0,0,0.75)", bg_padding: "4px 8px" },
  { id: "gold",   label: "Gold",    preview: "bg-gradient-to-r from-amber-500 to-yellow-400 rounded-md",
    background_css: "linear-gradient(90deg,#F0A500,#FFB923)", bg_padding: "4px 10px" },
  { id: "frost",  label: "Frost",   preview: "bg-white/10 backdrop-blur rounded-md border border-white/10",
    background_css: "rgba(255,255,255,0.12)", bg_padding: "4px 10px" },
  { id: "shadow", label: "Shadow",  preview: "drop-shadow-lg",
    background_css: undefined, bg_padding: undefined },
] as const;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted mb-2.5 flex items-center gap-1.5">
      {children}
    </p>
  );
}

function Divider() {
  return <div className="border-t border-border/40 my-3" />;
}

export function CaptionInspector({ caption, onChange, onClose }: Props) {
  const [tab, setTab] = useState<"text" | "style" | "layout">("style");
  const gridRef = useRef<HTMLDivElement>(null);

  const currentAnimation   = caption.animation || "fade";
  const currentColor       = caption.color || "#FFFFFF";
  const currentFontSize    = caption.font_size || 36;
  const currentFontWeight  = caption.font_weight || 600;
  const currentFont        = caption.font_family || "Inter";
  const currentStrokeColor = caption.stroke_color || "#000000";
  const currentStrokeWidth = caption.stroke_width ?? 0;

  // Draggable position grid
  const handleGridDrag = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;
    const onMove = (moveEvent: MouseEvent) => {
      const x = Math.max(0, Math.min(100, ((moveEvent.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((moveEvent.clientY - rect.top) / rect.height) * 100));
      onChange({ position: { x: Math.round(x), y: Math.round(y) } });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    onMove(e.nativeEvent);
  }, [onChange]);

  // Copy hex to clipboard
  const copyHex = () => {
    navigator.clipboard.writeText(currentColor.toUpperCase()).catch(() => {});
  };

  const bgId = (() => {
    if (!caption.background_css && (caption.stroke_width ?? 0) >= 8) return "shadow";
    if (!caption.background_css) return "none";
    for (const bg of BACKGROUNDS) {
      if (bg.id !== "none" && bg.id !== "shadow" && bg.background_css === caption.background_css) return bg.id;
    }
    return "none";
  })();

  return (
    <div className="rounded-xl border border-gold-500/25 bg-surface shadow-card overflow-hidden w-full panel-enter">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border bg-gradient-to-r from-gold-500/8 to-transparent">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-gold-500/15">
            <Sparkles className="h-3 w-3 text-gold-500" />
          </div>
          <span className="text-xs font-semibold text-white tracking-tight">
            Caption Style
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close inspector"
          className="rounded-md p-1 text-muted hover:text-white hover:bg-elevated transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex border-b border-border bg-elevated/50">
        {([
          { id: "style",  icon: Palette,      label: "Style" },
          { id: "text",   icon: Type,         label: "Text" },
          { id: "layout", icon: MoveVertical, label: "Position" },
        ] as const).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium transition-all relative",
              tab === id
                ? "text-gold-400"
                : "text-muted hover:text-subtle"
            )}
          >
            <Icon className="h-3 w-3" />
            {label}
            {tab === id && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gold-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="p-3.5 space-y-4 max-h-[520px] overflow-y-auto scroll-thin">

        {/* ── STYLE TAB ── */}
        {tab === "style" && (
          <>
            {/* Font picker — visual Aa cards */}
            <div>
              <SectionLabel>Font</SectionLabel>
              <div className="grid grid-cols-2 gap-1.5">
                {FONTS.slice(0, 4).map((f) => (
                  <button
                    key={f.value}
                    onClick={() => onChange({ font_family: f.value })}
                    className={cn(
                      "group relative flex flex-col items-center justify-center rounded-xl border py-3 px-2 transition-all overflow-hidden",
                      currentFont === f.value
                        ? "border-gold-500/60 bg-gold-500/10"
                        : "border-border bg-elevated hover:border-border-strong hover:bg-surface"
                    )}
                  >
                    <span
                      style={{ fontFamily: f.cssVar, fontWeight: 700 }}
                      className={cn(
                        "text-2xl leading-none transition-colors mb-1",
                        currentFont === f.value ? "text-gold-400" : "text-white/80 group-hover:text-white"
                      )}
                    >
                      Aa
                    </span>
                    <span className="text-[9px] font-medium text-muted truncate w-full text-center">
                      {f.label}
                    </span>
                    {currentFont === f.value && (
                      <span className="absolute top-1.5 right-1.5">
                        <Check className="h-2.5 w-2.5 text-gold-400" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {/* 5th font — full width */}
              <button
                onClick={() => onChange({ font_family: FONTS[4].value })}
                className={cn(
                  "group relative mt-1.5 w-full flex items-center gap-3 rounded-xl border py-2.5 px-3 transition-all",
                  currentFont === FONTS[4].value
                    ? "border-gold-500/60 bg-gold-500/10"
                    : "border-border bg-elevated hover:border-border-strong hover:bg-surface"
                )}
              >
                <span
                  style={{ fontFamily: FONTS[4].cssVar, fontWeight: 700 }}
                  className={cn(
                    "text-xl leading-none transition-colors",
                    currentFont === FONTS[4].value ? "text-gold-400" : "text-white/80"
                  )}
                >
                  Aa
                </span>
                <span className="text-xs font-medium text-subtle">{FONTS[4].label}</span>
                <span className="ml-auto text-[9px] text-muted">{FONTS[4].hint}</span>
                {currentFont === FONTS[4].value && <Check className="h-3 w-3 text-gold-400" />}
              </button>
            </div>

            <Divider />

            {/* Size */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <SectionLabel>Size</SectionLabel>
                <span className="text-xs font-semibold text-white tabular-nums">{currentFontSize}px</span>
              </div>
              <input
                type="range"
                min={16}
                max={80}
                value={currentFontSize}
                onChange={(e) => onChange({ font_size: Number(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-[9px] text-muted mt-1.5">
                <span>Small</span><span>Medium</span><span>Large</span>
              </div>
            </div>

            <Divider />

            {/* Font weight */}
            <div>
              <SectionLabel>Weight</SectionLabel>
              <div className="grid grid-cols-4 gap-1.5">
                {([
                  { w: 300, label: "Light" },
                  { w: 400, label: "Normal" },
                  { w: 700, label: "Bold" },
                  { w: 900, label: "Black" },
                ] as const).map(({ w, label }) => (
                  <button
                    key={w}
                    onClick={() => onChange({ font_weight: w })}
                    style={{ fontWeight: w }}
                    className={cn(
                      "rounded-lg border py-2 text-xs transition-all",
                      currentFontWeight === w
                        ? "border-gold-500/60 bg-gold-500/10 text-gold-400"
                        : "border-border bg-elevated text-subtle hover:text-white hover:border-border-strong"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <Divider />

            {/* Text colour */}
            <div>
              <SectionLabel>Text colour</SectionLabel>
              <div className="grid grid-cols-8 gap-1.5 mb-2.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => onChange({ color: c.hex })}
                    title={c.label}
                    className={cn(
                      "relative h-7 w-full rounded-md border-2 transition-all hover:scale-110",
                      currentColor === c.hex
                        ? "border-white ring-2 ring-white/25"
                        : "border-transparent hover:border-white/20"
                    )}
                    style={{ backgroundColor: c.hex }}
                  >
                    {currentColor === c.hex && (
                      <Check className={cn(
                        "absolute inset-0 m-auto h-3.5 w-3.5",
                        c.hex === "#FFFFFF" || c.hex === "#F0A500" ? "text-black" : "text-white"
                      )} />
                    )}
                  </button>
                ))}
              </div>
              {/* Hex display + custom picker */}
              <div className="flex items-center gap-2">
                <label
                  title="Custom colour"
                  className="relative flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-border hover:border-gold-500/40 transition-colors"
                  style={{ backgroundColor: currentColor }}
                >
                  <input
                    type="color"
                    value={currentColor}
                    onChange={(e) => onChange({ color: e.target.value })}
                    className="sr-only"
                  />
                </label>
                <button
                  onClick={copyHex}
                  className="flex-1 flex items-center gap-1.5 rounded-lg border border-border bg-elevated px-2.5 py-1.5 font-mono text-xs text-subtle hover:text-white transition-colors"
                  title="Copy hex"
                >
                  {currentColor.toUpperCase()}
                </button>
              </div>
            </div>

            <Divider />

            {/* Background */}
            <div>
              <SectionLabel>Background</SectionLabel>
              <div className="grid grid-cols-3 gap-1.5">
                {BACKGROUNDS.map((opt) => {
                  const isActive = bgId === opt.id;
                  return (
                    <button
                      key={opt.id}
                      title={opt.label}
                      onClick={() => {
                        if (opt.id === "none") {
                          onChange({ background_css: undefined, bg_padding: undefined });
                        } else if (opt.id === "shadow") {
                          onChange({ background_css: undefined, bg_padding: undefined, stroke_color: "#000000", stroke_width: 10 });
                        } else if (opt.id === "gold") {
                          onChange({ background_css: opt.background_css, bg_padding: opt.bg_padding, color: "#000000" });
                        } else {
                          onChange({ background_css: opt.background_css, bg_padding: opt.bg_padding });
                        }
                      }}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-xl border p-2.5 transition-all",
                        isActive
                          ? "border-gold-500/60 bg-gold-500/10"
                          : "border-border bg-elevated hover:border-border-strong"
                      )}
                    >
                      {/* Visual preview */}
                      <div className={cn("flex h-6 w-full items-center justify-center rounded text-[10px] font-bold text-white", opt.preview)}>
                        <span style={{ filter: opt.id === "shadow" ? "drop-shadow(0 2px 4px #000)" : undefined }}>Aa</span>
                      </div>
                      <span className={cn("text-[9px] font-medium", isActive ? "text-gold-400" : "text-muted")}>
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Divider />

            {/* Text outline */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <SectionLabel>Outline</SectionLabel>
                <span className="text-xs font-semibold text-white tabular-nums">{currentStrokeWidth}px</span>
              </div>
              <div className="flex items-center gap-3">
                <label
                  title="Outline colour"
                  className="relative flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-border hover:border-gold-500/40 transition-colors"
                  style={{ backgroundColor: currentStrokeColor }}
                >
                  <input
                    type="color"
                    value={currentStrokeColor}
                    onChange={(e) => onChange({ stroke_color: e.target.value })}
                    className="sr-only"
                  />
                </label>
                <input
                  type="range"
                  min={0}
                  max={12}
                  step={1}
                  value={currentStrokeWidth}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    onChange({ stroke_width: v, stroke_color: v > 0 ? currentStrokeColor : undefined });
                  }}
                  className="flex-1"
                />
              </div>
            </div>

            <Divider />

            {/* Animation picker */}
            <div>
              <SectionLabel>Entrance animation</SectionLabel>
              <div className="grid grid-cols-4 gap-1.5">
                {ANIMATIONS.map((a) => (
                  <button
                    key={a.value}
                    onClick={() => onChange({ animation: a.value })}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-all overflow-hidden",
                      currentAnimation === a.value
                        ? "border-gold-500/60 bg-gold-500/10"
                        : "border-border bg-elevated hover:border-border-strong"
                    )}
                  >
                    <div className="flex h-7 w-full items-center justify-center overflow-hidden">
                      <span
                        className={cn(
                          "text-sm font-bold",
                          currentAnimation === a.value ? "text-gold-400" : "text-white/70",
                          a.previewClass
                        )}
                      >
                        Aa
                      </span>
                    </div>
                    <span className={cn("text-[8px] font-medium leading-tight text-center",
                      currentAnimation === a.value ? "text-gold-400" : "text-muted")}>
                      {a.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── TEXT TAB ── */}
        {tab === "text" && (
          <>
            <div>
              <SectionLabel>Caption text</SectionLabel>
              <textarea
                value={String(caption.text || "")}
                onChange={(e) => onChange({ text: e.target.value })}
                rows={4}
                className="w-full rounded-xl border border-border bg-elevated px-3 py-2.5 text-sm text-white placeholder:text-muted focus:border-gold-500/50 focus:outline-none resize-none leading-relaxed"
                placeholder="Caption text…"
              />
              <p className="mt-2 text-[10px] text-muted leading-relaxed">
                Wrap words in{" "}
                <code className="rounded bg-gold-500/10 px-1 py-0.5 text-gold-400">*asterisks*</code>{" "}
                to <span className="font-bold text-gold-400">highlight</span> them.
              </p>
            </div>

            <Divider />

            <div>
              <SectionLabel>Timing</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "start_time" as const, label: "Start (sec)", min: 0, step: 0.1 },
                  { key: "duration" as const,   label: "Duration (sec)", min: 0.3, step: 0.1 },
                ].map(({ key, label, min, step }) => (
                  <div key={key}>
                    <label className="text-[10px] text-muted block mb-1.5">{label}</label>
                    <input
                      type="number"
                      step={step}
                      min={min}
                      value={caption[key] as number}
                      onChange={(e) => onChange({ [key]: Number(e.target.value) })}
                      className="w-full rounded-xl border border-border bg-elevated px-3 py-2 text-sm text-white focus:border-gold-500/50 focus:outline-none tabular-nums"
                    />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── LAYOUT TAB ── */}
        {tab === "layout" && (
          <>
            {/* Quick presets */}
            <div>
              <SectionLabel>Quick presets</SectionLabel>
              <div className="grid grid-cols-4 gap-1.5">
                {POSITION_PRESETS.map((p) => {
                  const active = caption.position?.x === p.x && caption.position?.y === p.y;
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.label}
                      onClick={() => onChange({ position: { x: p.x, y: p.y } })}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-xl border py-2.5 px-1 text-center transition-all",
                        active
                          ? "border-gold-500/60 bg-gold-500/10 text-gold-400"
                          : "border-border bg-elevated text-muted hover:text-white hover:border-border-strong"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="text-[9px] font-medium">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Divider />

            {/* Sliders */}
            {[
              { label: "Vertical", key: "y" as const, from: "Top", to: "Bottom" },
              { label: "Horizontal", key: "x" as const, from: "Left", to: "Right" },
            ].map(({ label, key, from, to }) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-2.5">
                  <SectionLabel>{label}</SectionLabel>
                  <span className="text-xs font-semibold text-white tabular-nums">
                    {caption.position?.[key] ?? (key === "y" ? 80 : 50)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={caption.position?.[key] ?? (key === "y" ? 80 : 50)}
                  onChange={(e) =>
                    onChange({
                      position: {
                        x: caption.position?.x ?? 50,
                        y: caption.position?.y ?? 80,
                        [key]: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-[9px] text-muted mt-1.5">
                  <span>{from}</span><span>{to}</span>
                </div>
              </div>
            ))}

            <Divider />

            {/* Draggable position grid */}
            <div>
              <SectionLabel>Drag to position</SectionLabel>
              <div
                ref={gridRef}
                onMouseDown={handleGridDrag}
                className="relative w-full rounded-xl border border-border bg-elevated cursor-crosshair overflow-hidden select-none"
                style={{ aspectRatio: "9/16", maxHeight: 160 }}
              >
                {/* Grid lines */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="border border-border/20" />
                  ))}
                </div>
                <span className="absolute inset-0 flex items-center justify-center text-[8px] text-muted/30 pointer-events-none select-none">
                  video frame
                </span>
                {/* Draggable dot */}
                <div
                  className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-500 ring-4 ring-gold-500/20 shadow-[0_0_8px_rgba(16,200,216,0.6)] pointer-events-none"
                  style={{
                    left: `${caption.position?.x ?? 50}%`,
                    top:  `${caption.position?.y ?? 80}%`,
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

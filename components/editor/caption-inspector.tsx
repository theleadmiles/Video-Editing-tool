"use client";

import { useState } from "react";
import { Type, Palette, MoveVertical, Sparkles, X, AlignCenter, AlignLeft, AlignRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimelineClip } from "@/types";

interface Props {
  caption: TimelineClip;
  onChange: (updates: Partial<TimelineClip>) => void;
  onClose: () => void;
}

const FONTS = [
  { value: "Inter", label: "Inter" },
  { value: "Geist Sans", label: "Geist" },
  { value: "Geist Mono", label: "Mono" },
];

const ANIMATIONS = [
  { value: "fade",       label: "Fade",     emoji: "✦" },
  { value: "pop",        label: "Pop",      emoji: "💥" },
  { value: "slide_up",   label: "Slide ↑",  emoji: "⬆" },
  { value: "slide_down", label: "Slide ↓",  emoji: "⬇" },
  { value: "type",       label: "Type",     emoji: "⌨" },
  { value: "karaoke",    label: "Karaoke",  emoji: "🎤" },
  { value: "none",       label: "None",     emoji: "—" },
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
  { label: "Top",    x: 50, y: 10 },
  { label: "Center", x: 50, y: 50 },
  { label: "Lower",  x: 50, y: 75 },
  { label: "Bottom", x: 50, y: 90 },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted mb-2">
      {children}
    </p>
  );
}

function Divider() {
  return <div className="border-t border-border/60 my-1" />;
}

export function CaptionInspector({ caption, onChange, onClose }: Props) {
  const [tab, setTab] = useState<"text" | "style" | "layout">("text");

  const currentAnimation = caption.animation || "fade";
  const currentColor = caption.color || "#FFFFFF";
  const currentFontSize = caption.font_size || 36;
  const currentFont = caption.font_family || "Inter";

  return (
    <div className="rounded-xl border border-gold-500/30 bg-surface shadow-card overflow-hidden w-full">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-gold-500/5">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-gold-500" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gold-500">
            Caption Inspector
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close inspector"
          className="rounded p-0.5 text-muted hover:text-white hover:bg-elevated transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex border-b border-border">
        {([
          { id: "text",   icon: Type,       label: "Text" },
          { id: "style",  icon: Palette,    label: "Style" },
          { id: "layout", icon: MoveVertical, label: "Position" },
        ] as const).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-medium border-b-2 transition-colors",
              tab === id
                ? "border-gold-500 text-gold-500 bg-gold-500/5"
                : "border-transparent text-muted hover:text-white"
            )}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="p-4 space-y-4 max-h-[480px] overflow-y-auto">

        {/* ── TEXT TAB ── */}
        {tab === "text" && (
          <>
            <div>
              <SectionLabel>Caption text</SectionLabel>
              <textarea
                value={String(caption.text || "")}
                onChange={(e) => onChange({ text: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-white placeholder:text-muted focus:border-gold-500/50 focus:outline-none focus:ring-1 focus:ring-gold-500/20 resize-none leading-relaxed"
                placeholder="Caption text…"
              />
              <p className="mt-1.5 text-[10px] text-muted">
                Wrap words in <span className="font-mono text-gold-500">*asterisks*</span> to{" "}
                <span className="font-bold text-gold-500">highlight</span> them.
              </p>
            </div>

            <Divider />

            <div>
              <SectionLabel>Timing</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted block mb-1">Start (sec)</label>
                  <input
                    type="number"
                    step={0.1}
                    min={0}
                    value={caption.start_time}
                    onChange={(e) => onChange({ start_time: Number(e.target.value) })}
                    className="w-full rounded-lg border border-border bg-elevated px-3 py-1.5 text-sm text-white focus:border-gold-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted block mb-1">Duration (sec)</label>
                  <input
                    type="number"
                    step={0.1}
                    min={0.3}
                    value={caption.duration}
                    onChange={(e) => onChange({ duration: Number(e.target.value) })}
                    className="w-full rounded-lg border border-border bg-elevated px-3 py-1.5 text-sm text-white focus:border-gold-500/50 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── STYLE TAB ── */}
        {tab === "style" && (
          <>
            {/* Font */}
            <div>
              <SectionLabel>Font</SectionLabel>
              <div className="grid grid-cols-3 gap-2">
                {FONTS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => onChange({ font_family: f.value })}
                    style={{ fontFamily: f.value }}
                    className={cn(
                      "rounded-lg border py-2 text-xs font-medium transition-all",
                      currentFont === f.value
                        ? "border-gold-500/60 bg-gold-500/10 text-gold-400"
                        : "border-border bg-elevated text-subtle hover:text-white hover:border-border-strong"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <Divider />

            {/* Size */}
            <div>
              <SectionLabel>
                Size —{" "}
                <span className="font-mono text-white normal-case tracking-normal">
                  {currentFontSize}px
                </span>
              </SectionLabel>
              <input
                type="range"
                min={16}
                max={80}
                value={currentFontSize}
                onChange={(e) => onChange({ font_size: Number(e.target.value) })}
                className="w-full accent-gold-500 h-1.5 rounded-full"
              />
              <div className="flex justify-between text-[9px] text-muted mt-1">
                <span>Small</span>
                <span>Medium</span>
                <span>Large</span>
              </div>
            </div>

            <Divider />

            {/* Colour */}
            <div>
              <SectionLabel>Text colour</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => onChange({ color: c.hex })}
                    title={c.label}
                    aria-label={c.label}
                    className={cn(
                      "h-8 w-8 rounded-lg border-2 transition-all hover:scale-110",
                      currentColor === c.hex
                        ? "border-white ring-2 ring-white/30 scale-110"
                        : "border-border/50 hover:border-white/30"
                    )}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
                {/* Custom picker */}
                <label
                  title="Custom colour"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-gold-500/50 cursor-pointer transition-all overflow-hidden"
                >
                  <input
                    type="color"
                    value={currentColor}
                    onChange={(e) => onChange({ color: e.target.value })}
                    className="sr-only"
                  />
                  <span className="text-[10px] text-muted">+</span>
                </label>
              </div>
              {/* Colour preview swatch */}
              <div
                className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-elevated px-3 py-2"
              >
                <div
                  className="h-4 w-4 rounded-sm flex-shrink-0 border border-white/10"
                  style={{ backgroundColor: currentColor }}
                />
                <span className="font-mono text-xs text-white">{currentColor.toUpperCase()}</span>
              </div>
            </div>

            <Divider />

            {/* Animation */}
            <div>
              <SectionLabel>Entrance animation</SectionLabel>
              <div className="grid grid-cols-2 gap-1.5">
                {ANIMATIONS.map((a) => (
                  <button
                    key={a.value}
                    onClick={() => onChange({ animation: a.value })}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all text-left",
                      currentAnimation === a.value
                        ? "border-gold-500/60 bg-gold-500/10 text-gold-400"
                        : "border-border bg-elevated text-subtle hover:text-white hover:border-border-strong"
                    )}
                  >
                    <span className="text-sm">{a.emoji}</span>
                    {a.label}
                  </button>
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
              <div className="grid grid-cols-2 gap-2">
                {POSITION_PRESETS.map((p) => {
                  const active =
                    caption.position?.x === p.x && caption.position?.y === p.y;
                  return (
                    <button
                      key={p.label}
                      onClick={() => onChange({ position: { x: p.x, y: p.y } })}
                      className={cn(
                        "rounded-lg border py-2.5 text-xs font-medium transition-all",
                        active
                          ? "border-gold-500/60 bg-gold-500/10 text-gold-400"
                          : "border-border bg-elevated text-subtle hover:text-white hover:border-border-strong"
                      )}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <Divider />

            {/* Vertical slider */}
            <div>
              <SectionLabel>
                Vertical —{" "}
                <span className="font-mono text-white normal-case tracking-normal">
                  {caption.position?.y ?? 80}%
                </span>
              </SectionLabel>
              <input
                type="range"
                min={0}
                max={100}
                value={caption.position?.y ?? 80}
                onChange={(e) =>
                  onChange({
                    position: { x: caption.position?.x ?? 50, y: Number(e.target.value) },
                  })
                }
                className="w-full accent-gold-500 h-1.5 rounded-full"
              />
              <div className="flex justify-between text-[9px] text-muted mt-1">
                <span>Top</span>
                <span>Middle</span>
                <span>Bottom</span>
              </div>
            </div>

            {/* Horizontal slider */}
            <div>
              <SectionLabel>
                Horizontal —{" "}
                <span className="font-mono text-white normal-case tracking-normal">
                  {caption.position?.x ?? 50}%
                </span>
              </SectionLabel>
              <input
                type="range"
                min={0}
                max={100}
                value={caption.position?.x ?? 50}
                onChange={(e) =>
                  onChange({
                    position: { x: Number(e.target.value), y: caption.position?.y ?? 80 },
                  })
                }
                className="w-full accent-gold-500 h-1.5 rounded-full"
              />
              <div className="flex justify-between text-[9px] text-muted mt-1">
                <span>Left</span>
                <span>Center</span>
                <span>Right</span>
              </div>
            </div>

            <Divider />

            {/* Visual position grid */}
            <div>
              <SectionLabel>Fine-tune position</SectionLabel>
              <div className="relative aspect-[9/16] max-h-36 w-full rounded-lg border border-border bg-elevated overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[8px] text-muted/40 select-none">video frame</span>
                </div>
                <div
                  className="absolute h-3 w-3 rounded-full bg-gold-500 ring-2 ring-gold-500/30 cursor-pointer -translate-x-1/2 -translate-y-1/2 shadow-glow-gold-sm"
                  style={{
                    left: `${caption.position?.x ?? 50}%`,
                    top: `${caption.position?.y ?? 80}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-[9px] text-muted text-center">
                Use the sliders above to move the dot
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

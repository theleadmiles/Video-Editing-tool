"use client";

import { useState } from "react";
import { Type, Palette, MoveVertical, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimelineClip } from "@/types";

interface Props {
  caption: TimelineClip;
  onChange: (updates: Partial<TimelineClip>) => void;
  onClose: () => void;
}

const FONTS = ["Inter", "Geist Sans", "Geist Mono"];
const ANIMATIONS = ["fade", "pop", "slide_up", "slide_down", "type", "karaoke", "none"];

export function CaptionInspector({ caption, onChange, onClose }: Props) {
  const [tab, setTab] = useState<"text" | "style" | "layout">("text");

  return (
    <div className="rounded-xl border border-gold-500/30 bg-surface shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-gold-500/5">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-gold-500" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gold-500">
            Caption Inspector
          </span>
        </div>
        <button onClick={onClose} aria-label="Close inspector" className="text-muted hover:text-white">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {([
          { id: "text", icon: Type, label: "Text" },
          { id: "style", icon: Palette, label: "Style" },
          { id: "layout", icon: MoveVertical, label: "Position" },
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
        {tab === "text" && (
          <>
            <div>
              <label className="text-[10px] text-muted uppercase tracking-wider">Caption text</label>
              <textarea
                value={String(caption.text || "")}
                onChange={(e) => onChange({ text: e.target.value })}
                rows={3}
                className="mt-1 w-full rounded-lg border border-border bg-elevated px-2.5 py-1.5 text-xs text-white focus:border-gold-500/50 focus:outline-none resize-none"
              />
              <p className="mt-1 text-[9px] text-muted">
                Tip: Wrap words in *asterisks* to <span className="text-gold-500 font-bold">highlight</span> them.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted">Start (s)</label>
                <input
                  type="number"
                  step={0.1}
                  value={caption.start_time}
                  onChange={(e) => onChange({ start_time: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-border bg-elevated px-2 py-1 text-xs text-white focus:border-gold-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted">Duration (s)</label>
                <input
                  type="number"
                  step={0.1}
                  min={0.3}
                  value={caption.duration}
                  onChange={(e) => onChange({ duration: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-border bg-elevated px-2 py-1 text-xs text-white focus:border-gold-500/50 focus:outline-none"
                />
              </div>
            </div>
          </>
        )}

        {tab === "style" && (
          <>
            <div>
              <label className="text-[10px] text-muted uppercase tracking-wider">Font</label>
              <select
                value={caption.font_family || "Inter"}
                onChange={(e) => onChange({ font_family: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border bg-elevated px-2 py-1.5 text-xs text-white focus:border-gold-500/50 focus:outline-none"
              >
                {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-muted flex items-center justify-between">
                <span>Size</span>
                <span className="font-mono text-white">{caption.font_size || 36}px</span>
              </label>
              <input
                type="range"
                min={16}
                max={80}
                value={caption.font_size || 36}
                onChange={(e) => onChange({ font_size: Number(e.target.value) })}
                className="w-full accent-gold-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-muted uppercase tracking-wider">Color</label>
              <div className="mt-1 flex gap-1.5 flex-wrap">
                {["#FFFFFF", "#F0A500", "#FF4D4D", "#10B981", "#3B82F6", "#8B5CF6", "#000000"].map((c) => (
                  <button
                    key={c}
                    onClick={() => onChange({ color: c })}
                    aria-label={`Color ${c}`}
                    className={cn(
                      "h-6 w-6 rounded-md border-2 transition-all",
                      caption.color === c ? "border-white scale-110" : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="color"
                  value={caption.color || "#FFFFFF"}
                  onChange={(e) => onChange({ color: e.target.value })}
                  className="h-6 w-8 rounded-md cursor-pointer bg-transparent border border-border"
                  aria-label="Custom color"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-muted uppercase tracking-wider">Animation</label>
              <select
                value={caption.animation || "fade"}
                onChange={(e) => onChange({ animation: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border bg-elevated px-2 py-1.5 text-xs text-white focus:border-gold-500/50 focus:outline-none"
              >
                {ANIMATIONS.map((a) => (
                  <option key={a} value={a}>{a.replace("_", " ")}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {tab === "layout" && (
          <>
            <div>
              <label className="text-[10px] text-muted flex items-center justify-between">
                <span>Vertical position</span>
                <span className="font-mono text-white">{caption.position?.y ?? 80}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={caption.position?.y ?? 80}
                onChange={(e) => onChange({
                  position: { x: caption.position?.x ?? 50, y: Number(e.target.value) },
                })}
                className="w-full accent-gold-500"
              />
              <div className="flex justify-between text-[8px] text-muted mt-0.5">
                <span>Top</span>
                <span>Center</span>
                <span>Bottom</span>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-muted flex items-center justify-between">
                <span>Horizontal position</span>
                <span className="font-mono text-white">{caption.position?.x ?? 50}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={caption.position?.x ?? 50}
                onChange={(e) => onChange({
                  position: { x: Number(e.target.value), y: caption.position?.y ?? 80 },
                })}
                className="w-full accent-gold-500"
              />
            </div>

            {/* Quick position presets */}
            <div>
              <label className="text-[10px] text-muted uppercase tracking-wider">Quick presets</label>
              <div className="mt-1 grid grid-cols-3 gap-1">
                {[
                  { label: "Top", x: 50, y: 15 },
                  { label: "Middle", x: 50, y: 50 },
                  { label: "Lower", x: 50, y: 80 },
                  { label: "TL", x: 20, y: 15 },
                  { label: "TR", x: 80, y: 15 },
                  { label: "Bottom", x: 50, y: 92 },
                ].map((p) => (
                  <button
                    key={p.label}
                    onClick={() => onChange({ position: { x: p.x, y: p.y } })}
                    className="rounded-lg border border-border bg-elevated/50 py-1 text-[10px] text-subtle hover:text-white hover:border-gold-500/30 transition-all"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

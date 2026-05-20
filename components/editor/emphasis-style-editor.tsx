"use client";

import { useState } from "react";
import { Sparkles, Palette, Zap, Square as SquareIcon, Sparkle, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type EmphasisStyle,
  EMPHASIS_PRESETS,
  emphasisToCss,
  emphasisAnimationClass,
  DEFAULT_EMPHASIS_STYLE,
} from "@/lib/emphasis-styles";

interface Props {
  value: EmphasisStyle;
  onChange: (next: EmphasisStyle) => void;
}

const ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

export function EmphasisStyleEditor({ value, onChange }: Props) {
  const [tab, setTab] = useState<"presets" | "color" | "glow" | "type" | "anim">("presets");

  function update<K extends keyof EmphasisStyle>(key: K, val: EmphasisStyle[K]) {
    onChange({ ...value, [key]: val });
  }

  return (
    <div className="rounded-xl border border-gold-500/30 bg-surface overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-gold-500/5">
        <Sparkles className="h-3 w-3 text-gold-500" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gold-500">
          Emphasis Style
        </span>
      </div>

      {/* Live preview */}
      <div className="border-b border-border bg-black/60 px-4 py-5 flex items-center justify-center">
        <p className="text-sm font-bold text-white text-center">
          This is{" "}
          <span
            className={emphasisAnimationClass(value.animation)}
            style={emphasisToCss(value)}
          >
            powerful
          </span>{" "}
          text
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {([
          { id: "presets", icon: Sparkle, label: "Presets" },
          { id: "color", icon: Palette, label: "Color" },
          { id: "glow", icon: Zap, label: "Glow" },
          { id: "type", icon: Type, label: "Type" },
          { id: "anim", icon: SquareIcon, label: "Animate" },
        ] as const).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium border-b-2 transition-colors",
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

      <div className="p-3 space-y-3 max-h-[60vh] overflow-y-auto">
        {/* ── Presets ── */}
        {tab === "presets" && (
          <div className="grid grid-cols-2 gap-2">
            {EMPHASIS_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => onChange(p.style)}
                className={cn(
                  "rounded-lg border bg-elevated/40 px-2 py-2 text-left transition-all",
                  JSON.stringify(value) === JSON.stringify(p.style)
                    ? "border-gold-500/60 ring-1 ring-gold-500/20"
                    : "border-border hover:border-border-strong"
                )}
              >
                <div className="bg-black/40 rounded p-2 mb-1 flex items-center justify-center">
                  <span
                    className={cn("text-base font-bold", emphasisAnimationClass(p.style.animation))}
                    style={emphasisToCss(p.style)}
                  >
                    {p.label}
                  </span>
                </div>
                <p className="text-[10px] font-semibold text-white truncate">{p.label}</p>
                <p className="text-[9px] text-muted truncate">{p.description}</p>
              </button>
            ))}
            <button
              onClick={() => onChange(DEFAULT_EMPHASIS_STYLE)}
              className="rounded-lg border border-dashed border-border px-2 py-2 text-[10px] text-muted hover:text-white hover:border-gold-500/30 transition-all"
            >
              Reset to default
            </button>
          </div>
        )}

        {/* ── Color ── */}
        {tab === "color" && (
          <>
            <div className="flex gap-1.5">
              {(["solid", "gradient"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => update("color_mode", m)}
                  className={cn(
                    "flex-1 rounded-lg border py-1.5 text-[10px] font-medium capitalize transition-all",
                    value.color_mode === m
                      ? "border-gold-500/50 bg-gold-500/10 text-gold-500"
                      : "border-border text-subtle hover:text-white"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>

            {value.color_mode === "solid" && (
              <ColorRow
                label="Color"
                value={value.color}
                onChange={(c) => update("color", c)}
              />
            )}

            {value.color_mode === "gradient" && (
              <>
                <ColorRow
                  label="From"
                  value={value.gradient_from || "#F0A500"}
                  onChange={(c) => update("gradient_from", c)}
                />
                <ColorRow
                  label="To"
                  value={value.gradient_to || "#FF4D4D"}
                  onChange={(c) => update("gradient_to", c)}
                />
                <div>
                  <label className="text-[10px] text-muted block mb-1">Angle: {value.gradient_angle ?? 90}°</label>
                  <div className="flex gap-1 flex-wrap">
                    {ANGLES.map((a) => (
                      <button
                        key={a}
                        onClick={() => update("gradient_angle", a)}
                        className={cn(
                          "h-7 w-7 rounded border text-[10px] font-mono transition-all",
                          (value.gradient_angle ?? 90) === a
                            ? "border-gold-500/50 bg-gold-500/10 text-gold-500"
                            : "border-border text-subtle hover:text-white"
                        )}
                      >
                        {a}°
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <ToggleRow
              label="Background highlight"
              hint="Like a marker pen"
              checked={value.background_enabled}
              onChange={(b) => update("background_enabled", b)}
            />
            {value.background_enabled && (
              <>
                <ColorRow
                  label="Background"
                  value={value.background_color}
                  onChange={(c) => update("background_color", c)}
                />
                <SliderRow
                  label="Padding"
                  value={value.background_padding}
                  min={0}
                  max={16}
                  unit="px"
                  onChange={(n) => update("background_padding", n)}
                />
              </>
            )}
          </>
        )}

        {/* ── Glow ── */}
        {tab === "glow" && (
          <>
            <ToggleRow
              label="Glow effect"
              checked={value.glow_enabled}
              onChange={(b) => update("glow_enabled", b)}
            />
            {value.glow_enabled && (
              <>
                <ColorRow
                  label="Glow color"
                  value={value.glow_color}
                  onChange={(c) => update("glow_color", c)}
                />
                <SliderRow
                  label="Glow blur"
                  value={value.glow_blur}
                  min={0}
                  max={40}
                  unit="px"
                  onChange={(n) => update("glow_blur", n)}
                />
              </>
            )}

            <div className="pt-3 border-t border-border">
              <ToggleRow
                label="Drop shadow"
                checked={value.shadow_enabled}
                onChange={(b) => update("shadow_enabled", b)}
              />
              {value.shadow_enabled && (
                <>
                  <ColorRow
                    label="Shadow color"
                    value={value.shadow_color}
                    onChange={(c) => update("shadow_color", c)}
                  />
                  <SliderRow
                    label="Shadow blur"
                    value={value.shadow_blur}
                    min={0}
                    max={30}
                    unit="px"
                    onChange={(n) => update("shadow_blur", n)}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <SliderRow
                      label="X offset"
                      value={value.shadow_offset_x}
                      min={-20}
                      max={20}
                      unit="px"
                      onChange={(n) => update("shadow_offset_x", n)}
                    />
                    <SliderRow
                      label="Y offset"
                      value={value.shadow_offset_y}
                      min={-20}
                      max={20}
                      unit="px"
                      onChange={(n) => update("shadow_offset_y", n)}
                    />
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* ── Type ── */}
        {tab === "type" && (
          <>
            <div>
              <label className="text-[10px] text-muted block mb-1">Weight: {value.font_weight}</label>
              <div className="flex gap-1 flex-wrap">
                {[400, 500, 600, 700, 800, 900].map((w) => (
                  <button
                    key={w}
                    onClick={() => update("font_weight", w)}
                    className={cn(
                      "rounded border px-2 py-1 text-[10px] font-mono transition-all",
                      value.font_weight === w
                        ? "border-gold-500/50 bg-gold-500/10 text-gold-500"
                        : "border-border text-subtle hover:text-white"
                    )}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => update("font_style", value.font_style === "italic" ? "normal" : "italic")}
                className={cn(
                  "rounded-lg border py-1.5 text-[11px] italic transition-all",
                  value.font_style === "italic"
                    ? "border-gold-500/50 bg-gold-500/10 text-gold-500"
                    : "border-border text-subtle hover:text-white"
                )}
              >
                Italic
              </button>
              <button
                onClick={() => update("text_decoration", value.text_decoration === "underline" ? "none" : "underline")}
                className={cn(
                  "rounded-lg border py-1.5 text-[11px] transition-all",
                  value.text_decoration === "underline"
                    ? "border-gold-500/50 bg-gold-500/10 text-gold-500 underline"
                    : "border-border text-subtle hover:text-white"
                )}
              >
                Underline
              </button>
            </div>

            <SliderRow
              label="Size scale"
              value={value.scale}
              min={0.8}
              max={1.5}
              step={0.05}
              unit="x"
              onChange={(n) => update("scale", n)}
            />
          </>
        )}

        {/* ── Animation ── */}
        {tab === "anim" && (
          <div className="grid grid-cols-2 gap-2">
            {(["none", "pulse", "shimmer", "bounce", "wiggle"] as const).map((a) => (
              <button
                key={a}
                onClick={() => update("animation", a)}
                className={cn(
                  "rounded-lg border py-2 text-[11px] capitalize transition-all",
                  value.animation === a
                    ? "border-gold-500/50 bg-gold-500/10 text-gold-500"
                    : "border-border text-subtle hover:text-white"
                )}
              >
                {a}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] text-muted block mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value.startsWith("rgb") || value === "inherit" || value === "transparent" ? "#F0A500" : value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-8 rounded-md cursor-pointer bg-transparent border border-border"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-md border border-border bg-elevated px-2 py-1 text-[11px] font-mono text-white focus:border-gold-500/50 focus:outline-none"
        />
      </div>
    </div>
  );
}

function SliderRow({
  label, value, min, max, step = 1, unit = "", onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <label className="text-[10px] text-muted flex items-center justify-between mb-0.5">
        <span>{label}</span>
        <span className="font-mono text-white">{Number.isInteger(value) ? value : value.toFixed(2)}{unit}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-gold-500"
      />
    </div>
  );
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (b: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        "w-full flex items-center justify-between rounded-lg border p-2 transition-all",
        checked ? "border-gold-500/40 bg-gold-500/5" : "border-border bg-elevated/30"
      )}
    >
      <div className="flex flex-col items-start">
        <span className="text-xs text-white font-medium">{label}</span>
        {hint && <span className="text-[9px] text-muted">{hint}</span>}
      </div>
      <div className={cn(
        "h-4 w-7 rounded-full relative transition-colors",
        checked ? "bg-gold-500" : "bg-overlay"
      )}>
        <div className={cn(
          "h-3 w-3 rounded-full bg-white absolute top-0.5 transition-transform",
          checked ? "translate-x-3.5" : "translate-x-0.5"
        )} />
      </div>
    </button>
  );
}

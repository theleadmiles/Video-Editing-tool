"use client";

import { CAPTION_STYLES, type CaptionStyle } from "@/lib/caption-styles";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Props {
  selectedId: string | null;
  onSelect: (style: CaptionStyle) => void;
  compact?: boolean;
}

/**
 * 2-column gallery of caption templates with mini-preview thumbnails.
 * Used in: wizard step 2, editor captions tab.
 */
export function CaptionTemplatePicker({ selectedId, onSelect, compact = false }: Props) {
  return (
    <div className={cn("grid gap-2", compact ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4")}>
      {CAPTION_STYLES.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(s)}
          aria-pressed={selectedId === s.id}
          className={cn(
            "group relative rounded-xl border overflow-hidden text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500",
            selectedId === s.id
              ? "border-gold-500/60 ring-2 ring-gold-500/20"
              : "border-border hover:border-border-strong"
          )}
        >
          {/* Mini preview */}
          <CaptionMiniPreview style={s} compact={compact} />

          {/* Label */}
          <div className={cn("px-2 py-1.5 bg-surface border-t border-border", compact && "px-1.5 py-1")}>
            <p className={cn("font-semibold text-white truncate", compact ? "text-[10px]" : "text-xs")}>
              {s.label}
            </p>
            {!compact && (
              <p className="mt-0.5 text-[10px] text-muted line-clamp-1">{s.description}</p>
            )}
          </div>

          {selectedId === s.id && (
            <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-gold-500 flex items-center justify-center shadow-glow-gold-sm">
              <Check className="h-3 w-3 text-black" />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

function CaptionMiniPreview({ style, compact }: { style: CaptionStyle; compact: boolean }) {
  const sampleText = "BOLTCUT";

  return (
    <div
      className={cn(
        "relative w-full bg-gradient-to-br flex items-center justify-center",
        compact ? "h-14" : "h-20",
        style.id === "tiktok_bold" ? "from-pink-500/30 to-purple-500/30" :
        style.id === "news_ticker" ? "from-blue-500/30 to-cyan-500/30" :
        style.id === "cinematic" ? "from-gray-700/40 to-gray-900/40" :
        style.id === "highlight" ? "from-gold-500/20 to-ember-500/20" :
        style.id === "karaoke" ? "from-purple-500/20 to-pink-500/20" :
        style.id === "pop_reveal" ? "from-gold-500/20 to-orange-500/30" :
        style.id === "subtitle" ? "from-slate-800/40 to-slate-900/40" :
        "from-gold-500/10 to-ember-500/10"
      )}
    >
      <span
        style={{
          fontFamily: style.font_family,
          fontWeight: style.font_weight,
          color: style.color,
          fontSize: compact ? Math.min(style.font_size / 3.2, 14) : Math.min(style.font_size / 2.8, 18),
          textShadow: style.stroke_color
            ? `0 0 ${(style.stroke_width || 4) / 2}px ${style.stroke_color}, 0 0 ${(style.stroke_width || 4)}px ${style.stroke_color}`
            : undefined,
          background: style.background,
          padding: style.background ? "2px 6px" : undefined,
          borderRadius: style.background ? 3 : undefined,
          textTransform: style.text_transform,
          letterSpacing: style.letter_spacing,
        }}
      >
        {sampleText}
      </span>
      {/* Animation badge */}
      {style.animation === "karaoke" && (
        <div className="absolute bottom-0.5 right-1 text-[7px] text-gold-400 font-bold">KARAOKE</div>
      )}
      {style.animation === "pop" && (
        <div className="absolute bottom-0.5 right-1 text-[7px] text-ember-400 font-bold">POP</div>
      )}
    </div>
  );
}

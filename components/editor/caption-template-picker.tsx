"use client";

import { useEffect, useState, useCallback } from "react";
import { CAPTION_STYLES, type CaptionStyle } from "@/lib/caption-styles";
import { cn } from "@/lib/utils";
import { Check, Bookmark, Trash2, Loader2, X, Plus } from "lucide-react";
import { toast } from "sonner";
import type { SavedCaptionPreset } from "@/types";

interface Props {
  selectedId: string | null;
  onSelect: (style: CaptionStyle) => void;
  /** Full CaptionStyle of the currently active template — used to save as preset */
  activeStyle?: CaptionStyle | null;
  compact?: boolean;
}

/**
 * 2-column gallery of built-in caption templates + user's saved presets.
 * Used in: wizard step 2, editor captions tab.
 */
export function CaptionTemplatePicker({ selectedId, onSelect, activeStyle, compact = false }: Props) {
  const [presets, setPresets]           = useState<SavedCaptionPreset[]>([]);
  const [loadingPresets, setLoading]    = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName]         = useState("");
  const [saveBrand, setSaveBrand]       = useState("");
  const [saving, setSaving]             = useState(false);
  const [deletingId, setDeletingId]     = useState<string | null>(null);

  const loadPresets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/caption-presets");
      if (res.ok) {
        const data = await res.json() as { presets: SavedCaptionPreset[] };
        setPresets(data.presets ?? []);
      }
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadPresets(); }, [loadPresets]);

  const handleSavePreset = async () => {
    if (!saveName.trim()) { toast.error("Give the preset a name"); return; }
    if (!activeStyle)     { toast.error("No active style to save"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/caption-presets", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          name:      saveName.trim(),
          brand_tag: saveBrand.trim() || null,
          style:     activeStyle,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Preset saved!");
      setShowSaveModal(false);
      setSaveName(""); setSaveBrand("");
      await loadPresets();
    } catch {
      toast.error("Could not save preset — try again");
    } finally { setSaving(false); }
  };

  const handleDeletePreset = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch(`/api/caption-presets/${id}`, { method: "DELETE" });
      setPresets((p) => p.filter((x) => x.id !== id));
      toast.success("Preset deleted");
    } catch {
      toast.error("Delete failed");
    } finally { setDeletingId(null); }
  };

  return (
    <div className="space-y-3">
      {/* ── Built-in templates ── */}
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
            <CaptionMiniPreview style={s} compact={compact} />
            <div className={cn("px-2 py-1.5 bg-surface border-t border-border", compact && "px-1 py-0.5")}>
              <p className={cn("font-semibold text-white truncate", compact ? "text-[9px]" : "text-xs")}>
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

      {/* ── Save current style as preset ── */}
      {activeStyle && (
        <button
          onClick={() => setShowSaveModal(true)}
          className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-gold-500/40 py-2 text-[11px] text-gold-400 hover:bg-gold-500/5 hover:border-gold-500/70 transition-all"
        >
          <Plus className="h-3 w-3" />
          Save current style as preset
        </button>
      )}

      {/* ── Saved presets ── */}
      {(loadingPresets || presets.length > 0) && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted mb-2 flex items-center gap-1.5">
            <Bookmark className="h-3 w-3" />
            Saved presets
          </p>

          {loadingPresets ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted" />
            </div>
          ) : (
            <div className="space-y-1.5">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className={cn(
                    "group flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-all",
                    selectedId === `preset:${preset.id}`
                      ? "border-gold-500/60 bg-gold-500/10"
                      : "border-border bg-elevated hover:border-border-strong"
                  )}
                  onClick={() => onSelect(preset.style)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && onSelect(preset.style)}
                >
                  {/* Colour swatch */}
                  <div
                    className="h-5 w-5 flex-shrink-0 rounded border border-white/10"
                    style={{ backgroundColor: preset.style.color || "#fff" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{preset.name}</p>
                    {preset.brand_tag && (
                      <p className="text-[9px] text-muted truncate">{preset.brand_tag}</p>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeletePreset(preset.id); }}
                    className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-muted hover:text-red-400 transition-all"
                    title="Delete preset"
                    aria-label="Delete preset"
                  >
                    {deletingId === preset.id
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <Trash2 className="h-3 w-3" />
                    }
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Save preset modal ── */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-gold-500/30 bg-surface shadow-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-white text-sm">Save caption preset</h3>
              <button
                onClick={() => setShowSaveModal(false)}
                className="rounded p-1 text-muted hover:text-white hover:bg-elevated transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-muted block mb-1.5">
                  Preset name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="e.g. My Gold Bold"
                  className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-white placeholder:text-muted focus:border-gold-500/50 focus:outline-none focus:ring-1 focus:ring-gold-500/20"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleSavePreset()}
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted block mb-1.5">
                  Brand tag <span className="text-muted/50">(optional)</span>
                </label>
                <input
                  type="text"
                  value={saveBrand}
                  onChange={(e) => setSaveBrand(e.target.value)}
                  placeholder="e.g. Nike, Brand A"
                  className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-white placeholder:text-muted focus:border-gold-500/50 focus:outline-none focus:ring-1 focus:ring-gold-500/20"
                />
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 rounded-lg border border-border py-2 text-sm text-subtle hover:text-white hover:border-border-strong transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePreset}
                disabled={saving || !saveName.trim()}
                className="flex-1 rounded-lg bg-gold-500 py-2 text-sm font-semibold text-black hover:bg-gold-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bookmark className="h-3.5 w-3.5" />}
                Save preset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CaptionMiniPreview({ style, compact }: { style: CaptionStyle; compact: boolean }) {
  const isBold = style.font_weight && style.font_weight >= 700;
  const sampleText = isBold ? "Bold text" : "Hello world";

  // Pick animation class name based on style.animation
  const animClass =
    style.animation === "pop"       ? `preview-anim-pop-${style.id}`       :
    style.animation === "karaoke"   ? `preview-anim-karaoke-${style.id}`   :
    style.animation === "word_pop"  ? `preview-anim-wordpop-${style.id}`   :
    style.animation === "slide_up"  ? `preview-anim-slideup-${style.id}`   :
    style.animation === "fade"      ? `preview-anim-fade-${style.id}`      :
    "";

  const safeId = style.id.replace(/[^a-z0-9_-]/gi, "_");

  return (
    <div
      className={cn(
        "relative w-full bg-gradient-to-br flex items-center justify-center overflow-hidden",
        compact ? "h-9" : "h-16",
        style.id === "tiktok_bold"  ? "from-pink-500/30 to-purple-500/30" :
        style.id === "news_ticker"  ? "from-blue-500/30 to-cyan-500/30"   :
        style.id === "cinematic"    ? "from-gray-700/40 to-gray-900/40"   :
        style.id === "highlight"    ? "from-gold-500/20 to-ember-500/20"  :
        style.id === "karaoke"      ? "from-purple-500/20 to-pink-500/20" :
        style.id === "pop_reveal"   ? "from-gold-500/20 to-orange-500/30" :
        style.id === "subtitle"     ? "from-slate-800/40 to-slate-900/40" :
        "from-gold-500/10 to-ember-500/10"
      )}
    >
      {/* Keyframe animations injected per-style */}
      {style.animation === "pop" && (
        <style jsx>{`
          @keyframes preview-pop-${safeId} {
            0%, 100% { transform: scale(1); }
            30% { transform: scale(0.9); }
            60% { transform: scale(1.05); }
            80% { transform: scale(1); }
          }
          .${animClass} { animation: preview-pop-${safeId} 2s ease-in-out infinite; }
        `}</style>
      )}
      {style.animation === "slide_up" && (
        <style jsx>{`
          @keyframes preview-slideup-${safeId} {
            0% { transform: translateY(12px); opacity: 0; }
            25% { transform: translateY(0); opacity: 1; }
            75% { transform: translateY(0); opacity: 1; }
            100% { transform: translateY(-4px); opacity: 0; }
          }
          .${animClass} { animation: preview-slideup-${safeId} 2s ease-in-out infinite; }
        `}</style>
      )}
      {style.animation === "fade" && (
        <style jsx>{`
          @keyframes preview-fade-${safeId} {
            0%, 100% { opacity: 0.2; }
            40%, 60% { opacity: 1; }
          }
          .${animClass} { animation: preview-fade-${safeId} 2s ease-in-out infinite; }
        `}</style>
      )}

      {style.animation === "karaoke" ? (
        // Karaoke: cycle through 3 "highlighted" word states
        <KaraokePreview style={style} compact={compact} animClass={animClass} safeId={safeId} />
      ) : style.animation === "word_pop" ? (
        // Word-pop: pulse colour
        <WordPopPreview style={style} compact={compact} safeId={safeId} />
      ) : (
        <span
          className={animClass}
          style={{
            fontFamily:    style.font_family,
            fontWeight:    style.font_weight,
            color:         style.color,
            fontSize:      compact ? Math.min(style.font_size / 3.2, 14) : Math.min(style.font_size / 2.8, 18),
            textShadow:    style.stroke_color
              ? `0 0 ${(style.stroke_width || 4) / 2}px ${style.stroke_color}, 0 0 ${(style.stroke_width || 4)}px ${style.stroke_color}`
              : undefined,
            background:    style.background,
            padding:       style.background ? "2px 6px" : undefined,
            borderRadius:  style.background ? 3 : undefined,
            textTransform: style.text_transform,
            letterSpacing: style.letter_spacing ? `${style.letter_spacing}em` : undefined,
          }}
        >
          {sampleText}
        </span>
      )}
    </div>
  );
}

function KaraokePreview({
  style,
  compact,
  safeId,
}: {
  style: CaptionStyle;
  compact: boolean;
  animClass: string;
  safeId: string;
}) {
  const words = ["Hello", "world", "!"];
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActiveIdx((v) => (v + 1) % words.length), 650);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fs = compact ? Math.min(style.font_size / 3.2, 14) : Math.min(style.font_size / 2.8, 18);

  return (
    <>
      <style jsx>{`
        @keyframes karaoke-word-${safeId} {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
      <span style={{ fontSize: fs, fontFamily: style.font_family, fontWeight: style.font_weight, letterSpacing: style.letter_spacing ? `${style.letter_spacing}em` : undefined }}>
        {words.map((w, i) => (
          <span
            key={i}
            style={{
              color: i === activeIdx ? (style.word_pop_color || "#FFE600") : (style.color || "#fff"),
              animation: i === activeIdx ? `karaoke-word-${safeId} 0.3s ease-in-out` : undefined,
              display: "inline-block",
              marginRight: "2px",
            }}
          >
            {w}
          </span>
        ))}
      </span>
    </>
  );
}

function WordPopPreview({
  style,
  compact,
  safeId,
}: {
  style: CaptionStyle;
  compact: boolean;
  safeId: string;
}) {
  const fs = compact ? Math.min(style.font_size / 3.2, 14) : Math.min(style.font_size / 2.8, 18);
  const accentColor = style.word_pop_color || "#FFE600";

  return (
    <>
      <style jsx>{`
        @keyframes wordpop-${safeId} {
          0%, 100% { color: ${style.color || "#fff"}; }
          50% { color: ${accentColor}; }
        }
        .wordpop-span-${safeId} {
          animation: wordpop-${safeId} 1.5s ease-in-out infinite;
          font-family: ${style.font_family || "inherit"};
          font-weight: ${style.font_weight || 600};
          font-size: ${fs}px;
          text-transform: ${style.text_transform || "none"};
        }
      `}</style>
      <span className={`wordpop-span-${safeId}`}>Hello world</span>
    </>
  );
}

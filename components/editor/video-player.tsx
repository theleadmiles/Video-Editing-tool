"use client";

import { useRef, useEffect, useState } from "react";
import { parseCaptionText } from "@/lib/caption-styles";
import {
  type EmphasisStyle,
  DEFAULT_EMPHASIS_STYLE,
  emphasisToCss,
  emphasisAnimationClass,
} from "@/lib/emphasis-styles";
import { findFilter, findTransition } from "@/lib/visual-effects";
import { cn } from "@/lib/utils";
import type { TimelineClip } from "@/types";

interface VideoPlayerProps {
  clips: TimelineClip[];
  currentClipIndex: number;
  currentCaption: TimelineClip | null;
  isPlaying: boolean;
  isMuted?: boolean;
  emphasisStyle?: EmphasisStyle;
  /** Global playhead time (seconds) — required for karaoke word highlighting */
  playTime?: number;
  onTimeUpdate?: (globalTime: number) => void;
}

export function VideoPlayer({
  clips,
  currentClipIndex,
  currentCaption,
  isPlaying,
  isMuted = false,
  emphasisStyle,
  playTime = 0,
  onTimeUpdate,
}: VideoPlayerProps) {
  const effectiveEmphasis = emphasisStyle || DEFAULT_EMPHASIS_STYLE;
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());

  // Sync muted state — React's `muted` prop doesn't always update the DOM attribute
  useEffect(() => {
    videoRefs.current.forEach((v) => {
      if (v) v.muted = isMuted;
    });
  }, [isMuted]);

  // Play / pause the active video
  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return;
      if (i === currentClipIndex) {
        if (isPlaying) v.play().catch(() => {});
        else v.pause();
      } else {
        v.pause();
      }
    });
  }, [currentClipIndex, isPlaying]);

  // Restart the clip from 0 whenever it becomes active + apply per-clip playback rate
  useEffect(() => {
    const v = videoRefs.current[currentClipIndex];
    if (!v) return;
    v.currentTime = 0;
    const clip = clips[currentClipIndex];
    if (clip?.speed) v.playbackRate = clip.speed;
    if (isPlaying) v.play().catch(() => {});
  }, [currentClipIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!clips.length) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-gold-500/10 to-ember-500/10" />
    );
  }

  return (
    <>
      {clips.map((clip, i) => {
        const active = i === currentClipIndex;
        const failed = failedIds.has(clip.id);

        // Filter (LUT) + color grade combined
        const lutCss = findFilter(clip.filter).css;
        const grade = (clip as TimelineClip & { color_grade?: { brightness: number; contrast: number; saturation: number } }).color_grade;
        const gradeCss = grade
          ? `brightness(${grade.brightness}) contrast(${grade.contrast}) saturate(${grade.saturation})`
          : "";
        const filterCss = [lutCss, gradeCss].filter(Boolean).join(" ") || undefined;

        // Per-clip enter transition (applied to incoming clip)
        const transition = clip.transition;
        const transitionDur = transition?.duration ?? 0.5;
        const transitionAnim = transition && transition.type !== "cut"
          ? findTransition(transition.type).enter_animation
          : null;

        // Ken Burns
        const kb = clip.ken_burns;
        const kbStyle: React.CSSProperties = kb?.enabled
          ? {
              animation: `kb-${kb.direction.replace(/_/g, "-")} ${clip.duration}s ease-out forwards`,
              transformOrigin: "center",
              ["--kb-scale" as string]: String(kb.intensity || 1.15),
            }
          : {};

        // Outer wrapper handles opacity + enter transition animation
        // Inner media element gets filter + Ken Burns transform
        const wrapperStyle: React.CSSProperties = active && transitionAnim
          ? { animation: `${transitionAnim} ${transitionDur}s ease-out forwards` }
          : {};

        return (
          <div
            key={clip.id}
            className={`absolute inset-0 transition-opacity ${active ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            style={{
              transitionDuration: `${(active && transition?.type === "fade" ? transitionDur : 0.5)}s`,
              ...wrapperStyle,
            }}
          >
            {!failed && clip.url ? (
              <video
                ref={(el) => { videoRefs.current[i] = el; }}
                src={clip.url}
                className="absolute inset-0 h-full w-full object-cover"
                style={{
                  filter: filterCss || undefined,
                  ...kbStyle,
                }}
                playsInline
                loop
                preload={i <= 1 ? "auto" : "none"}
                onError={() =>
                  setFailedIds((prev) => new Set([...prev, clip.id]))
                }
                onTimeUpdate={() => {
                  if (i === currentClipIndex && onTimeUpdate) {
                    const v = videoRefs.current[i];
                    if (!v) return;
                    const accum = clips.slice(0, i).reduce((sum, c) => sum + c.duration, 0);
                    onTimeUpdate(accum + v.currentTime);
                  }
                }}
              />
            ) : clip.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={clip.thumbnail}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                style={{
                  filter: filterCss || undefined,
                  ...kbStyle,
                }}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-gold-500/10 to-ember-500/10" />
            )}
          </div>
        );
      })}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/65 pointer-events-none" />

      {/* Caption overlay — word_pop · word_burst · karaoke · gradient · speaker colors */}
      {currentCaption?.text && (() => {
        const text          = String(currentCaption.text);
        const posY          = currentCaption.position?.y ?? 80;
        const posX          = currentCaption.position?.x ?? 50;
        const color         = currentCaption.color || "#FFFFFF";
        const fontSize      = currentCaption.font_size || 36;
        const fontWeight    = currentCaption.font_weight || 600;
        const fontFamily    = `${currentCaption.font_family || "Inter"}, system-ui, sans-serif`;
        const animation     = currentCaption.animation || "fade";
        const textTransform = currentCaption.text_transform ?? "none";
        const letterSpacing = currentCaption.letter_spacing ?? 0;
        const strokeColor   = currentCaption.stroke_color;
        const strokeWidth   = currentCaption.stroke_width ?? 0;
        const bgCss         = currentCaption.background_css;
        const bgPad         = currentCaption.bg_padding;
        const maxWidthPct   = currentCaption.max_width_pct ?? 85;
        const wordPopColor  = currentCaption.word_pop_color || "#FFE600";
        const burstSize     = currentCaption.word_burst_size || 2;
        const gradFrom      = currentCaption.gradient_from;
        const gradTo        = currentCaption.gradient_to;
        const gradAngle     = currentCaption.gradient_angle ?? 135;

        // Font scale: styles authored at ~1.8× preview frame height
        const previewFontSize = fontSize / 1.8;

        // Stroke or text-shadow fallback
        const strokeStyle: React.CSSProperties = strokeColor && strokeWidth > 0
          ? {
              WebkitTextStroke: `${(strokeWidth * 0.25).toFixed(1)}px ${strokeColor}`,
              paintOrder: "stroke fill" as React.CSSProperties["paintOrder"],
            }
          : { textShadow: "0 2px 8px rgba(0,0,0,0.95), 0 0 3px rgba(0,0,0,0.7)" };

        // Gradient fill (overrides solid color if both from/to are set)
        const gradientStyle: React.CSSProperties = gradFrom && gradTo
          ? {
              background:             `linear-gradient(${gradAngle}deg, ${gradFrom}, ${gradTo})`,
              WebkitBackgroundClip:   "text",
              backgroundClip:         "text",
              WebkitTextFillColor:    "transparent",
              color:                  "transparent",
            }
          : {};

        const wrapperStyle: React.CSSProperties = {
          top:       `${posY}%`,
          left:      `${posX}%`,
          transform: "translate(-50%, -50%)",
          maxWidth:  `${maxWidthPct}%`,
        };

        const baseTextStyle: React.CSSProperties = {
          fontFamily,
          fontSize:      previewFontSize,
          fontWeight,
          lineHeight:    1.25,
          textAlign:     "center",
          whiteSpace:    "normal",
          wordBreak:     "break-word",
          textTransform: textTransform !== "none" ? textTransform : undefined,
          letterSpacing: letterSpacing ? `${letterSpacing}em` : undefined,
          background:    bgCss || undefined,
          padding:       bgCss && bgPad ? bgPad : undefined,
          borderRadius:  bgCss ? 4 : undefined,
          color,
          ...strokeStyle,
          ...gradientStyle,
        };

        // ── WORD POP — each word punches in one by one, stays on screen ────
        if (animation === "word_pop" && currentCaption.word_timings?.length) {
          const timings = currentCaption.word_timings;
          return (
            <div key={currentCaption.id} className="absolute pointer-events-none" style={wrapperStyle}>
              <p style={{ ...baseTextStyle, display: "flex", flexWrap: "wrap", gap: "0.2em", justifyContent: "center" }}>
                {timings.map((wt, idx) => {
                  const active = playTime >= wt.start && playTime < wt.end;
                  const past   = playTime >= wt.end;
                  const future = playTime < wt.start;
                  return (
                    <span
                      key={idx}
                      style={{
                        display:    "inline-block",
                        color:      active ? wordPopColor : past ? color : `${color}28`,
                        fontWeight: active ? 900 : past ? fontWeight : fontWeight,
                        transform:  active ? "scale(1.18) translateY(-2px)" : past ? "scale(1)" : "scale(0.88)",
                        opacity:    future ? 0.22 : 1,
                        transition: "all 0.12s cubic-bezier(0.34, 1.56, 0.64, 1)",
                        textShadow: active ? `0 0 16px ${wordPopColor}cc, 0 2px 6px rgba(0,0,0,0.9)` : undefined,
                        // For gradient text, override WebkitTextFillColor per-word
                        ...(gradFrom && gradTo && active
                          ? { background: `linear-gradient(${gradAngle}deg, ${wordPopColor}, ${wordPopColor})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }
                          : {}),
                        ...strokeStyle,
                      }}
                    >
                      {wt.word}
                    </span>
                  );
                })}
              </p>
            </div>
          );
        }

        // ── WORD BURST — 2-word groups explode in, replace each other ──────
        if (animation === "word_burst" && currentCaption.word_timings?.length) {
          const timings = currentCaption.word_timings;
          // Split into burst groups
          const groups: typeof timings[] = [];
          for (let i = 0; i < timings.length; i += burstSize) {
            groups.push(timings.slice(i, i + burstSize));
          }
          // Find active group
          const activeGroupIdx = groups.findIndex((g) =>
            g.length > 0 && playTime >= g[0].start && playTime < g[g.length - 1].end + 0.1
          );
          if (activeGroupIdx < 0) return null;
          const group = groups[activeGroupIdx];
          const burstText = group.map((w) => w.word).join(" ");

          return (
            // Key on group index so React remounts → re-triggers CSS animation
            <div key={`burst-${currentCaption.id}-${activeGroupIdx}`} className="absolute pointer-events-none" style={wrapperStyle}>
              <p
                className="cap-burst"
                style={{
                  ...baseTextStyle,
                  color: wordPopColor,
                  ...(gradFrom && gradTo ? {
                    background: `linear-gradient(${gradAngle}deg, ${gradFrom}, ${gradTo})`,
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  } : {}),
                }}
              >
                {burstText}
              </p>
              <style jsx>{`
                .cap-burst { animation: capBurst 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
                @keyframes capBurst {
                  0%   { transform: scale(0.55) rotate(-3deg); opacity: 0; }
                  70%  { transform: scale(1.08) rotate(0.5deg); opacity: 1; }
                  100% { transform: scale(1)    rotate(0deg); }
                }
              `}</style>
            </div>
          );
        }

        // ── KARAOKE — word-by-word progressive highlight ───────────────────
        if (animation === "karaoke" && currentCaption.word_timings?.length) {
          const timings = currentCaption.word_timings;
          const activeIdx = timings.reduce((found, wt, idx) =>
            playTime >= wt.start && playTime < wt.end ? idx : found, -1
          );
          return (
            <div key={currentCaption.id} className="absolute pointer-events-none" style={wrapperStyle}>
              <p style={{ ...baseTextStyle, display: "flex", flexWrap: "wrap", gap: "0.25em", justifyContent: "center", color: `${color}55` }}>
                {timings.map((wt, idx) => {
                  const active = idx === activeIdx;
                  const past   = activeIdx >= 0 && idx < activeIdx;
                  return (
                    <span key={idx} style={{
                      display:    "inline-block",
                      color:      active ? (effectiveEmphasis.color || "#F0A500") : past ? color : `${color}55`,
                      fontWeight: active ? 900 : fontWeight,
                      transform:  active ? "scale(1.12)" : "scale(1)",
                      transition: "color 0.08s ease, transform 0.08s ease",
                      textShadow: active ? `0 0 12px ${effectiveEmphasis.glow_color || "#F0A500"}` : undefined,
                      ...strokeStyle,
                    }}>
                      {wt.word}
                    </span>
                  );
                })}
              </p>
            </div>
          );
        }

        // ── STANDARD — emphasis markers, gradient, all entrance animations ─
        const segments = parseCaptionText(text);

        return (
          <div key={currentCaption.id} className="absolute pointer-events-none" style={wrapperStyle}>
            <p
              className={
                animation === "pop"        ? "cap-pop"        :
                animation === "slide_up"   ? "cap-slide"      :
                animation === "slide_down" ? "cap-slide-down" :
                animation === "type"       ? "cap-type"       :
                "cap-fade"
              }
              style={baseTextStyle}
            >
              {segments.map((seg, i) => (
                seg.emphasis ? (
                  <span key={i} className={cn(emphasisAnimationClass(effectiveEmphasis.animation))} style={emphasisToCss(effectiveEmphasis)}>
                    {seg.text}
                  </span>
                ) : (
                  <span key={i}>{seg.text}</span>
                )
              ))}
            </p>

            <style jsx>{`
              .cap-fade       { animation: capFade      0.3s  ease-out both; }
              .cap-pop        { animation: capPop       0.4s  cubic-bezier(0.34, 1.56, 0.64, 1) both; }
              .cap-slide      { animation: capSlideUp   0.35s ease-out both; }
              .cap-slide-down { animation: capSlideDown 0.35s ease-out both; }
              .cap-type       { animation: capType      0.45s steps(20, end) both; }
              @keyframes capFade      { from { opacity: 0; } to { opacity: 1; } }
              @keyframes capPop {
                0%   { transform: scale(0.6) translateY(8px); opacity: 0; }
                65%  { transform: scale(1.07); opacity: 1; }
                100% { transform: scale(1); }
              }
              @keyframes capSlideUp   { from { transform: translateY(16px);  opacity: 0; } to { transform: translateY(0); opacity: 1; } }
              @keyframes capSlideDown { from { transform: translateY(-16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
              @keyframes capType      { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0% 0 0); } }
            `}</style>
          </div>
        );
      })()}
    </>
  );
}

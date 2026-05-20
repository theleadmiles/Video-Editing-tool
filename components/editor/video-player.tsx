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
  emphasisStyle?: EmphasisStyle;
}

export function VideoPlayer({
  clips,
  currentClipIndex,
  currentCaption,
  isPlaying,
  emphasisStyle,
}: VideoPlayerProps) {
  const effectiveEmphasis = emphasisStyle || DEFAULT_EMPHASIS_STYLE;
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());

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

        // Filter (LUT)
        const filterCss = findFilter(clip.filter).css;

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
                muted
                playsInline
                loop
                preload={i <= 1 ? "auto" : "none"}
                onError={() =>
                  setFailedIds((prev) => new Set([...prev, clip.id]))
                }
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

      {/* Caption overlay — respects position, color, font, animation, emphasis */}
      {currentCaption?.text && (() => {
        const text = String(currentCaption.text);
        const segments = parseCaptionText(text);
        const posY = currentCaption.position?.y ?? 80;
        const posX = currentCaption.position?.x ?? 50;
        const color = currentCaption.color || "#FFFFFF";
        const fontSize = currentCaption.font_size || 36;
        const fontFamily = currentCaption.font_family || "Inter";
        const animation = currentCaption.animation || "fade";

        // Scale font size to fit preview frame (16-pixel base maps to ~36px source)
        const previewFontSize = Math.min(fontSize / 2.5, 22);

        return (
          <div
            key={currentCaption.id}
            className="absolute left-0 right-0 pointer-events-none"
            style={{
              top: `${posY}%`,
              transform: `translate(-50%, -50%)`,
              left: `${posX}%`,
              width: "auto",
              maxWidth: "85%",
            }}
          >
            <p
              className={
                animation === "pop" ? "caption-pop" :
                animation === "slide_up" ? "caption-slide-up" :
                "caption-fade"
              }
              style={{
                fontFamily,
                fontSize: previewFontSize,
                color,
                fontWeight: 700,
                lineHeight: 1.2,
                textAlign: "center",
                textShadow: "0 2px 10px rgba(0,0,0,0.95), 0 0 4px rgba(0,0,0,0.8)",
                whiteSpace: "normal",
                wordBreak: "break-word",
              }}
            >
              {segments.map((seg, i) => (
                seg.emphasis ? (
                  <span
                    key={i}
                    className={cn(emphasisAnimationClass(effectiveEmphasis.animation))}
                    style={emphasisToCss(effectiveEmphasis)}
                  >
                    {seg.text}
                  </span>
                ) : (
                  <span key={i}>{seg.text}</span>
                )
              ))}
            </p>

            <style jsx>{`
              .caption-fade { animation: capFade 0.3s ease-out; }
              .caption-pop { animation: capPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
              .caption-slide-up { animation: capSlide 0.4s ease-out; }
              @keyframes capFade { from { opacity: 0; } to { opacity: 1; } }
              @keyframes capPop {
                0% { transform: scale(0.7); opacity: 0; }
                60% { transform: scale(1.08); opacity: 1; }
                100% { transform: scale(1); }
              }
              @keyframes capSlide {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
              }
            `}</style>
          </div>
        );
      })()}
    </>
  );
}

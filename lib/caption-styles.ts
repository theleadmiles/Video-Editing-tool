/**
 * Caption style presets — visual + behavioral configs.
 * Used in: new-project wizard, editor caption tab, runtime preview rendering.
 */

export interface CaptionStyle {
  id: string;
  label: string;
  description: string;
  // Display config
  font_family: string;
  font_size: number;
  font_weight: number;
  color: string;
  stroke_color?: string;
  stroke_width?: number;
  background?: string; // CSS background string
  padding?: string;
  text_transform?: "uppercase" | "lowercase" | "none";
  letter_spacing?: number;
  // Layout
  position_y: number;  // % from top (0–100)
  position_x: number;  // % from left (0–100), centered horizontally
  max_width?: number;  // % of frame width
  // Animation
  animation: "fade" | "pop" | "slide_up" | "slide_down" | "type" | "karaoke" | "none";
  // Emoji enhancement
  auto_emoji?: boolean;
  // Demo emoji for preview thumbnail
  preview_emoji: string;
}

export const CAPTION_STYLES: CaptionStyle[] = [
  {
    id: "minimal",
    label: "Minimal",
    description: "Clean white text. Subtle, professional.",
    font_family: "Inter",
    font_size: 36,
    font_weight: 600,
    color: "#FFFFFF",
    stroke_color: "rgba(0,0,0,0.7)",
    stroke_width: 4,
    position_y: 80,
    position_x: 50,
    max_width: 80,
    animation: "fade",
    preview_emoji: "✨",
  },
  {
    id: "tiktok_bold",
    label: "TikTok Bold",
    description: "Big chunky text. Stops the scroll.",
    font_family: "Inter",
    font_size: 52,
    font_weight: 900,
    color: "#FFFFFF",
    stroke_color: "#000000",
    stroke_width: 8,
    text_transform: "uppercase",
    letter_spacing: -0.5,
    position_y: 60,
    position_x: 50,
    max_width: 90,
    animation: "pop",
    preview_emoji: "🔥",
  },
  {
    id: "highlight",
    label: "Highlight",
    description: "White text on gold word-by-word highlight.",
    font_family: "Inter",
    font_size: 44,
    font_weight: 800,
    color: "#FFFFFF",
    stroke_color: "#000000",
    stroke_width: 4,
    position_y: 75,
    position_x: 50,
    max_width: 85,
    animation: "karaoke",
    preview_emoji: "💫",
  },
  {
    id: "news_ticker",
    label: "News Ticker",
    description: "Gold banner. Authority, headlines.",
    font_family: "Inter",
    font_size: 32,
    font_weight: 700,
    color: "#000000",
    background: "linear-gradient(90deg, #F0A500, #FFB923)",
    padding: "8px 16px",
    position_y: 85,
    position_x: 50,
    max_width: 90,
    animation: "slide_up",
    preview_emoji: "📺",
  },
  {
    id: "cinematic",
    label: "Cinematic",
    description: "Subtle bottom subtitles, movie-style.",
    font_family: "Inter",
    font_size: 28,
    font_weight: 500,
    color: "#FFFFFF",
    stroke_color: "rgba(0,0,0,0.85)",
    stroke_width: 3,
    position_y: 88,
    position_x: 50,
    max_width: 75,
    animation: "fade",
    preview_emoji: "🎬",
  },
  {
    id: "pop_reveal",
    label: "Pop Reveal",
    description: "Scale-in bounce. Energetic, fun.",
    font_family: "Inter",
    font_size: 48,
    font_weight: 900,
    color: "#F0A500",
    stroke_color: "#000000",
    stroke_width: 6,
    position_y: 70,
    position_x: 50,
    max_width: 80,
    animation: "pop",
    auto_emoji: true,
    preview_emoji: "⚡",
  },
  {
    id: "subtitle",
    label: "Subtitle",
    description: "Standard YouTube subtitle look.",
    font_family: "Inter",
    font_size: 30,
    font_weight: 500,
    color: "#FFFFFF",
    background: "rgba(0,0,0,0.75)",
    padding: "4px 10px",
    position_y: 90,
    position_x: 50,
    max_width: 80,
    animation: "fade",
    preview_emoji: "💬",
  },
  {
    id: "karaoke",
    label: "Karaoke",
    description: "Word-by-word reveal with timing.",
    font_family: "Inter",
    font_size: 44,
    font_weight: 800,
    color: "rgba(255,255,255,0.4)",
    stroke_color: "#000000",
    stroke_width: 4,
    position_y: 72,
    position_x: 50,
    max_width: 85,
    animation: "karaoke",
    preview_emoji: "🎤",
  },
];

export function findStyle(id: string | undefined | null): CaptionStyle {
  return CAPTION_STYLES.find((s) => s.id === id) || CAPTION_STYLES[0];
}

/**
 * Apply every property of a CaptionStyle onto a TimelineClip,
 * producing a new clip object with all rendering fields set.
 * Used when the user picks a template or restores a saved preset.
 */
export function applyStyleToClip<T extends {
  color?: string; font_size?: number; font_family?: string;
  font_weight?: number; animation?: string;
  position?: { x: number; y: number };
  text_transform?: "uppercase" | "lowercase" | "none";
  letter_spacing?: number; stroke_color?: string; stroke_width?: number;
  background_css?: string; bg_padding?: string; max_width_pct?: number;
}>(clip: T, style: CaptionStyle): T {
  return {
    ...clip,
    color:          style.color,
    font_size:      style.font_size,
    font_family:    style.font_family,
    font_weight:    style.font_weight,
    animation:      style.animation,
    position:       { x: style.position_x, y: style.position_y },
    text_transform: style.text_transform ?? "none",
    letter_spacing: style.letter_spacing ?? 0,
    stroke_color:   style.stroke_color,
    stroke_width:   style.stroke_width,
    background_css: style.background,
    bg_padding:     style.padding,
    max_width_pct:  style.max_width,
  };
}

/**
 * Parse caption text for *emphasis* markers and return segments.
 * Example: "This is *huge*" → [{text:"This is "}, {text:"huge", emphasis:true}]
 */
export function parseCaptionText(text: string): Array<{ text: string; emphasis?: boolean }> {
  const segments: Array<{ text: string; emphasis?: boolean }> = [];
  const regex = /\*([^*]+)\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index) });
    }
    segments.push({ text: match[1], emphasis: true });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex) });
  }
  return segments.length > 0 ? segments : [{ text }];
}

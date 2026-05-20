/**
 * Per-clip visual effects: filters (LUTs), transitions, Ken Burns motion.
 * Stored as fields on TimelineClip. Applied by VideoPlayer.
 */

// ── Color filters / LUTs ────────────────────────────────────────────────
export interface ColorFilter {
  id: string;
  label: string;
  description: string;
  /** CSS filter string applied to the video/image element */
  css: string;
  /** Approx swatch color for the picker thumbnail */
  swatch: string;
}

export const COLOR_FILTERS: ColorFilter[] = [
  { id: "none", label: "Original", description: "No filter", css: "", swatch: "#FFFFFF" },
  { id: "vintage", label: "Vintage", description: "Warm sepia tone", css: "sepia(0.45) contrast(1.1) saturate(1.2) brightness(1.02)", swatch: "#C39060" },
  { id: "bw", label: "B&W", description: "Pure black & white", css: "grayscale(1) contrast(1.15)", swatch: "#7A7A7A" },
  { id: "vibrant", label: "Vibrant", description: "Punchy, saturated", css: "saturate(1.55) contrast(1.15) brightness(1.05)", swatch: "#FF4D8B" },
  { id: "cinematic", label: "Cinematic", description: "Teal-orange film look", css: "saturate(0.85) contrast(1.25) hue-rotate(-8deg) brightness(0.95)", swatch: "#3F5F7A" },
  { id: "warm", label: "Warm", description: "Sunset glow", css: "sepia(0.18) saturate(1.25) hue-rotate(-12deg) brightness(1.04)", swatch: "#F0A500" },
  { id: "cool", label: "Cool", description: "Blue tones", css: "saturate(1.1) hue-rotate(15deg) brightness(0.96)", swatch: "#3B82F6" },
  { id: "fade", label: "Fade", description: "Washed out, dreamy", css: "contrast(0.88) brightness(1.08) saturate(0.78)", swatch: "#D6CBB7" },
  { id: "dramatic", label: "Dramatic", description: "Crushed blacks", css: "contrast(1.35) saturate(1.25) brightness(0.92)", swatch: "#222222" },
  { id: "moody", label: "Moody", description: "Low-light film", css: "contrast(1.15) saturate(0.9) brightness(0.88) hue-rotate(8deg)", swatch: "#5B4B6A" },
];

export function findFilter(id: string | undefined | null): ColorFilter {
  return COLOR_FILTERS.find((f) => f.id === id) || COLOR_FILTERS[0];
}

// ── Transitions ─────────────────────────────────────────────────────────
export interface TransitionDef {
  id: string;
  label: string;
  description: string;
  /** Default duration in seconds when this transition is picked */
  default_duration: number;
  /** CSS animation name (defined in globals.css) for the INCOMING clip */
  enter_animation?: string;
}

export const TRANSITIONS: TransitionDef[] = [
  { id: "cut", label: "Cut", description: "Hard switch, no animation", default_duration: 0 },
  { id: "fade", label: "Fade", description: "Fade through black", default_duration: 0.5, enter_animation: "trans-fade" },
  { id: "dissolve", label: "Dissolve", description: "Soft crossfade", default_duration: 0.6, enter_animation: "trans-dissolve" },
  { id: "slide_left", label: "Slide ←", description: "New clip slides from right", default_duration: 0.4, enter_animation: "trans-slide-left" },
  { id: "slide_right", label: "Slide →", description: "New clip slides from left", default_duration: 0.4, enter_animation: "trans-slide-right" },
  { id: "slide_up", label: "Slide ↑", description: "New clip slides from below", default_duration: 0.4, enter_animation: "trans-slide-up" },
  { id: "zoom", label: "Zoom", description: "New clip zooms in", default_duration: 0.5, enter_animation: "trans-zoom" },
  { id: "wipe", label: "Wipe", description: "Reveal from left", default_duration: 0.5, enter_animation: "trans-wipe" },
];

export function findTransition(id: string | undefined | null): TransitionDef {
  return TRANSITIONS.find((t) => t.id === id) || TRANSITIONS[0];
}

export interface TransitionConfig {
  type: string;          // id from TRANSITIONS
  duration: number;      // seconds (overrides default)
}

// ── Ken Burns motion ────────────────────────────────────────────────────
export interface KenBurnsConfig {
  enabled: boolean;
  direction: string;     // id from KEN_BURNS_DIRECTIONS
  intensity: number;     // 1.0 – 1.4 (scale at end of motion)
}

export const KEN_BURNS_DIRECTIONS = [
  { id: "zoom_in", label: "Zoom In", icon: "🔍", description: "Slow zoom toward center" },
  { id: "zoom_out", label: "Zoom Out", icon: "🔭", description: "Slow pull back" },
  { id: "pan_left", label: "Pan Left", icon: "←", description: "Slowly slide left" },
  { id: "pan_right", label: "Pan Right", icon: "→", description: "Slowly slide right" },
  { id: "pan_up", label: "Pan Up", icon: "↑", description: "Slowly slide up" },
  { id: "pan_down", label: "Pan Down", icon: "↓", description: "Slowly slide down" },
];

/**
 * Generate inline style for a Ken Burns motion that lasts `duration` seconds.
 * Uses CSS animation defined in globals.css (kb-{direction}).
 */
export function kenBurnsStyle(config: KenBurnsConfig | undefined, duration: number): React.CSSProperties {
  if (!config?.enabled || !duration) return {};
  const intensity = config.intensity || 1.15;
  return {
    animation: `kb-${config.direction.replace("_", "-")} ${duration}s ease-out forwards`,
    transformOrigin: "center",
    "--kb-scale": String(intensity),
  } as React.CSSProperties;
}

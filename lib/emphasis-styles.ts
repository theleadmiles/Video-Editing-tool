/**
 * Word Emphasis style system.
 *
 * Words wrapped in *asterisks* render with the active emphasis style.
 * Style is stored at `timeline_data.emphasis_style` (project-wide default).
 * Users can pick a preset OR customize every property.
 */

export interface EmphasisStyle {
  // Color
  color_mode: "solid" | "gradient";
  color: string;            // solid color or fallback
  gradient_from?: string;
  gradient_to?: string;
  gradient_angle?: number;  // 0–360 deg

  // Glow effect
  glow_enabled: boolean;
  glow_color: string;
  glow_blur: number;        // 0–40 px

  // Drop shadow
  shadow_enabled: boolean;
  shadow_color: string;
  shadow_blur: number;
  shadow_offset_x: number;
  shadow_offset_y: number;

  // Background highlight
  background_enabled: boolean;
  background_color: string;
  background_padding: number; // px

  // Typography
  font_weight: number;       // 400–900
  font_style: "normal" | "italic";
  text_decoration: "none" | "underline";
  scale: number;             // 0.8 – 1.5 (relative size multiplier)

  // Animation
  animation: "none" | "pulse" | "shimmer" | "bounce" | "wiggle";
}

export const DEFAULT_EMPHASIS_STYLE: EmphasisStyle = {
  color_mode: "solid",
  color: "#F0A500",
  glow_enabled: true,
  glow_color: "#F0A500",
  glow_blur: 12,
  shadow_enabled: true,
  shadow_color: "rgba(0,0,0,0.9)",
  shadow_blur: 8,
  shadow_offset_x: 0,
  shadow_offset_y: 2,
  background_enabled: false,
  background_color: "#FFEE00",
  background_padding: 4,
  font_weight: 900,
  font_style: "normal",
  text_decoration: "none",
  scale: 1.0,
  animation: "none",
};

export const EMPHASIS_PRESETS: Array<{ id: string; label: string; description: string; style: EmphasisStyle }> = [
  {
    id: "gold_glow",
    label: "Gold Glow",
    description: "Classic gold with warm glow",
    style: { ...DEFAULT_EMPHASIS_STYLE },
  },
  {
    id: "red_fire",
    label: "Red Fire",
    description: "Bright red with ember glow",
    style: {
      ...DEFAULT_EMPHASIS_STYLE,
      color_mode: "gradient",
      color: "#FF4D4D",
      gradient_from: "#FFB923",
      gradient_to: "#FF4D4D",
      gradient_angle: 180,
      glow_color: "#FF4D4D",
      glow_blur: 16,
    },
  },
  {
    id: "ice_cool",
    label: "Ice Cool",
    description: "Cyan to white gradient",
    style: {
      ...DEFAULT_EMPHASIS_STYLE,
      color_mode: "gradient",
      color: "#06B6D4",
      gradient_from: "#06B6D4",
      gradient_to: "#FFFFFF",
      gradient_angle: 135,
      glow_color: "#06B6D4",
      glow_blur: 14,
    },
  },
  {
    id: "highlighter",
    label: "Highlighter",
    description: "Yellow marker pen behind text",
    style: {
      ...DEFAULT_EMPHASIS_STYLE,
      color: "#000000",
      glow_enabled: false,
      shadow_enabled: false,
      background_enabled: true,
      background_color: "#FFEE00",
      background_padding: 6,
    },
  },
  {
    id: "rainbow",
    label: "Rainbow",
    description: "Bold multi-color gradient",
    style: {
      ...DEFAULT_EMPHASIS_STYLE,
      color_mode: "gradient",
      gradient_from: "#FF4D4D",
      gradient_to: "#F0A500",
      gradient_angle: 90,
      glow_enabled: false,
      animation: "shimmer",
      scale: 1.05,
    },
  },
  {
    id: "subtle_bold",
    label: "Subtle Bold",
    description: "Just bolder, no color change",
    style: {
      ...DEFAULT_EMPHASIS_STYLE,
      color: "inherit",
      glow_enabled: false,
      shadow_enabled: false,
      font_weight: 900,
      scale: 1.1,
    },
  },
  {
    id: "underline",
    label: "Underlined",
    description: "Gold with underline",
    style: {
      ...DEFAULT_EMPHASIS_STYLE,
      glow_enabled: false,
      text_decoration: "underline",
    },
  },
  {
    id: "cinema",
    label: "Cinema",
    description: "Italic, white, soft drop shadow",
    style: {
      ...DEFAULT_EMPHASIS_STYLE,
      color: "#FFFFFF",
      glow_enabled: false,
      font_style: "italic",
      shadow_blur: 14,
      shadow_offset_y: 4,
    },
  },
  {
    id: "pulse_pop",
    label: "Pulse Pop",
    description: "Gold with pulse animation",
    style: {
      ...DEFAULT_EMPHASIS_STYLE,
      animation: "pulse",
      scale: 1.1,
    },
  },
];

/**
 * Generate inline CSS for an emphasis style. Returns a style object that
 * can be applied to a <span> wrapping emphasized text.
 */
export function emphasisToCss(style: EmphasisStyle): React.CSSProperties {
  const css: React.CSSProperties = {
    fontWeight: style.font_weight,
    fontStyle: style.font_style,
    textDecoration: style.text_decoration,
    display: "inline-block",
    transform: `scale(${style.scale})`,
    transformOrigin: "center",
    transition: "all 0.2s ease-out",
  };

  // Color or gradient
  if (style.color_mode === "gradient" && style.gradient_from && style.gradient_to) {
    css.background = `linear-gradient(${style.gradient_angle ?? 90}deg, ${style.gradient_from}, ${style.gradient_to})`;
    css.WebkitBackgroundClip = "text";
    css.backgroundClip = "text";
    css.WebkitTextFillColor = "transparent";
    css.color = "transparent";
  } else if (style.color && style.color !== "inherit") {
    css.color = style.color;
  }

  // Background highlight
  if (style.background_enabled) {
    css.backgroundColor = style.background_color;
    css.padding = `0 ${style.background_padding}px`;
    css.borderRadius = 3;
    // Background highlight + gradient text doesn't mix; force solid color
    if (style.color_mode === "gradient") {
      css.WebkitTextFillColor = style.color;
      css.color = style.color;
    }
  }

  // Build shadow string (glow + shadow combined)
  const shadows: string[] = [];
  if (style.glow_enabled) {
    shadows.push(`0 0 ${style.glow_blur}px ${style.glow_color}`);
    shadows.push(`0 0 ${style.glow_blur * 2}px ${style.glow_color}`);
  }
  if (style.shadow_enabled) {
    shadows.push(`${style.shadow_offset_x}px ${style.shadow_offset_y}px ${style.shadow_blur}px ${style.shadow_color}`);
  }
  if (shadows.length > 0) {
    // For gradient text, glow goes on the wrapper, not on text-shadow
    if (style.color_mode === "gradient") {
      css.filter = `drop-shadow(${shadows[0]})`;
    } else {
      css.textShadow = shadows.join(", ");
    }
  }

  return css;
}

/**
 * Returns the className for animations that aren't doable with inline styles.
 * The animation keyframes are defined in app/globals.css.
 */
export function emphasisAnimationClass(animation: EmphasisStyle["animation"]): string {
  if (animation === "none") return "";
  return `emphasis-${animation}`;
}

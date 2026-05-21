import type { Config } from "tailwindcss";

// Ocean-teal palette derived from the wave/ocean imagery:
//   "gold"  → Ocean Teal  (#10C8D8) — primary brand/CTA
//   "ember" → Warm Coral  (#F26E50) — accent/destructive
// Class names stay the same everywhere — only hex values changed.

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Ocean Teal — shimmering surface water
        gold: {
          DEFAULT: "#10C8D8",
          50:  "#E0FAFB",
          100: "#BFF5F8",
          200: "#80EBF2",
          300: "#40E0EB",
          400: "#1CD5E2",
          500: "#10C8D8",   // primary — bright ocean surface
          600: "#0DA8B5",
          700: "#0A8892",
          800: "#07606F",
          900: "#04303A",
        },
        // Warm Coral — contrast / destructive / highlight
        ember: {
          DEFAULT: "#F26E50",
          50:  "#FEF1ED",
          100: "#FDE3DA",
          200: "#FAC7B5",
          300: "#F8AB8F",
          400: "#F58F6A",
          500: "#F26E50",   // warm coral
          600: "#D0563A",
          700: "#9E3F2B",
          800: "#6C2A1D",
          900: "#3A150E",
        },
        // ── Backgrounds — deep ocean dark ──────────────────────
        // Each step is a controlled +lightness so surfaces feel cohesive.
        base:     "#040C0F",   // deepest — near-black with cold ocean tint
        surface:  "#071419",   // main app panels
        elevated: "#0C1E25",   // cards, sidebars
        overlay:  "#112A32",   // dropdowns, tooltips
        // ── Borders ────────────────────────────────────────────
        border: {
          DEFAULT: "#1A3840",  // subtle teal border
          strong:  "#255C68",  // more visible on hover/active
        },
        // ── Text ───────────────────────────────────────────────
        muted:  "#3D6A72",     // deep teal — tertiary labels
        subtle: "#76B4BC",     // mid teal  — secondary text
      },
      fontFamily: {
        sans:    ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono:    ["var(--font-geist-mono)", "monospace"],
      },
      backgroundImage: {
        // Ocean depth gradient — bright surface → deep teal
        "gradient-gold":
          "linear-gradient(135deg, #10C8D8 0%, #076880 100%)",
        // Radial glow used on hero sections, cards
        "gradient-radial-gold":
          "radial-gradient(ellipse at center, rgba(16,200,216,0.14) 0%, transparent 70%)",
        // Hero ambient — like light filtering through ocean water
        "gradient-hero":
          "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(16,200,216,0.09) 0%, transparent 60%)",
        // Subtle card shine
        "gradient-card":
          "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)",
      },
      animation: {
        "fade-up":    "fadeUp 0.5s ease-out",
        "fade-in":    "fadeIn 0.4s ease-out",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
        "shimmer":    "shimmer 2s linear infinite",
        "float":      "float 3s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(16,200,216,0.30)" },
          "50%":       { boxShadow: "0 0 45px rgba(16,200,216,0.60)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-8px)" },
        },
      },
      boxShadow: {
        "glow-gold":    "0 0 30px rgba(16,200,216,0.28)",
        "glow-gold-sm": "0 0 14px rgba(16,200,216,0.20)",
        "glow-ember":   "0 0 30px rgba(242,110,80,0.28)",
        "card":         "0 1px 3px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.035)",
        "card-hover":   "0 4px 20px rgba(0,0,0,0.7), 0 0 0 1px rgba(16,200,216,0.18)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;

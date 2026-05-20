import type { Config } from "tailwindcss";

// Brand palette:
//   "gold"  = Electric Blue  (#0057FF) — primary brand/CTA
//   "ember" = Cayenne        (#FF3D00) — accent/destructive
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
        // Electric Blue — replaces gold/yellow
        gold: {
          DEFAULT: "#0057FF",
          50:  "#E6EEFF",
          100: "#CCDCFF",
          200: "#99BAFF",
          300: "#6697FF",
          400: "#3375FF",
          500: "#0057FF",   // primary electric blue
          600: "#0046CC",
          700: "#003499",
          800: "#002366",
          900: "#001133",
        },
        // Cayenne — replaces ember/red
        ember: {
          DEFAULT: "#FF3D00",
          50:  "#FFF0EC",
          100: "#FFE0D9",
          200: "#FFC2B3",
          300: "#FFA38C",
          400: "#FF7052",
          500: "#FF3D00",   // cayenne
          600: "#CC3100",
          700: "#992500",
          800: "#661800",
          900: "#330C00",
        },
        // Backgrounds — deep dark with very subtle cool tint
        base:     "#080810",
        surface:  "#10101A",
        elevated: "#18182A",
        overlay:  "#202033",
        // Borders
        border: {
          DEFAULT: "#1E1E30",
          strong:  "#2E2E46",
        },
        // Text
        muted:  "#5C5C7A",
        subtle: "#8A8AAA",
      },
      fontFamily: {
        sans:    ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono:    ["var(--font-geist-mono)", "monospace"],
      },
      backgroundImage: {
        // Electric Blue → Cayenne gradient
        "gradient-gold":
          "linear-gradient(135deg, #0057FF 0%, #FF3D00 100%)",
        "gradient-radial-gold":
          "radial-gradient(ellipse at center, rgba(0,87,255,0.15) 0%, transparent 70%)",
        "gradient-hero":
          "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,87,255,0.10) 0%, transparent 60%)",
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
          "0%, 100%": { boxShadow: "0 0 20px rgba(0,87,255,0.35)" },
          "50%":       { boxShadow: "0 0 40px rgba(0,87,255,0.65)" },
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
        "glow-gold":    "0 0 30px rgba(0,87,255,0.30)",
        "glow-gold-sm": "0 0 15px rgba(0,87,255,0.22)",
        "glow-ember":   "0 0 30px rgba(255,61,0,0.30)",
        "card":         "0 1px 3px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
        "card-hover":   "0 4px 20px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,87,255,0.20)",
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

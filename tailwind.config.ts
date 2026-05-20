import type { Config } from "tailwindcss";

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
        // Brand colors
        gold: {
          DEFAULT: "#F0A500",
          50: "#FFF8E6",
          100: "#FFEFC0",
          200: "#FFE099",
          300: "#FFD166",
          400: "#FFC233",
          500: "#F0A500",
          600: "#C88B00",
          700: "#A07000",
          800: "#785400",
          900: "#503800",
        },
        ember: {
          DEFAULT: "#FF4D4D",
          50: "#FFF0F0",
          100: "#FFE0E0",
          200: "#FFC0C0",
          300: "#FF9999",
          400: "#FF6666",
          500: "#FF4D4D",
          600: "#E63333",
          700: "#CC1A1A",
          800: "#B30000",
          900: "#800000",
        },
        // Backgrounds
        base: "#0A0A0A",
        surface: "#141414",
        elevated: "#1C1C1C",
        overlay: "#242424",
        // Borders
        border: {
          DEFAULT: "#242424",
          strong: "#3A3A3A",
        },
        // Text
        muted: "#6B6B6B",
        subtle: "#9A9A9A",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      backgroundImage: {
        "gradient-gold": "linear-gradient(135deg, #F0A500 0%, #FF4D4D 100%)",
        "gradient-radial-gold":
          "radial-gradient(ellipse at center, rgba(240,165,0,0.15) 0%, transparent 70%)",
        "gradient-hero":
          "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(240,165,0,0.12) 0%, transparent 60%)",
        "gradient-card":
          "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)",
      },
      animation: {
        "fade-up": "fadeUp 0.5s ease-out",
        "fade-in": "fadeIn 0.4s ease-out",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "float": "float 3s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(240,165,0,0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(240,165,0,0.6)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      boxShadow: {
        "glow-gold": "0 0 30px rgba(240,165,0,0.25)",
        "glow-gold-sm": "0 0 15px rgba(240,165,0,0.2)",
        "glow-ember": "0 0 30px rgba(255,77,77,0.25)",
        "card": "0 1px 3px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
        "card-hover": "0 4px 20px rgba(0,0,0,0.6), 0 0 0 1px rgba(240,165,0,0.15)",
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

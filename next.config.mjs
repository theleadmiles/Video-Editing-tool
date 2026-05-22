/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── Images ────────────────────────────────────────────────────────────────
  images: {
    // Auto-serve AVIF / WebP where the browser supports it
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "pub-*.r2.dev" },
    ],
    // Wider device sizes for better responsive srcsets
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // ── Bundle optimisation ────────────────────────────────────────────────────
  experimental: {
    // Tree-shake heavy icon / component packages at the import level.
    // Prevents the entire lucide-react barrel (600+ icons) landing in one chunk.
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
    ],
  },

  // Remove the default X-Powered-By header
  poweredByHeader: false,

  // ── Security / perf HTTP headers ──────────────────────────────────────────
  async headers() {
    return [
      {
        // Long-lived cache for everything in /_next/static (hashed filenames)
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Cache favicon + public assets for 1 day
        source: "/:file(favicon.ico|robots.txt|sitemap.xml)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=3600" },
        ],
      },
      {
        // All pages: allow browser to cache briefly but always revalidate
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;

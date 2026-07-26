import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,

  /*
   * Images (Phase 10, Task 8). The brand mark is now served through the
   * optimizer instead of as a 578 KB raw SVG, so it is worth telling the
   * optimizer to do its best work:
   *
   *   - AVIF first. For the flat, few-colour hexagon mark it is dramatically
   *     smaller than WebP; browsers that cannot take it fall back automatically.
   *   - A long immutable TTL. These assets are content-addressed by the
   *     optimizer, so a year is safe and means the mark is fetched once, ever.
   */
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000,
  },

  /*
   * Next.js will not serve a `public/` path whose segment starts with a dot, so
   * `public/.well-known/security.txt` deployed but 404'd — while the footer and
   * /legal/security both linked to it. The route handler generates it from
   * lib/org-email.ts instead; this makes it reachable at the RFC 9116 location.
   */
  async rewrites() {
    return [
      { source: "/.well-known/security.txt", destination: "/api/security-txt" },
    ];
  },

  experimental: {
    /*
     * framer-motion is imported by a dozen components, most of which want two or
     * three exports. Without this, a barrel import pulls the whole package into
     * every chunk that touches it. lucide-react is listed defensively — the
     * reference components reach for it and a future one may.
     */
    optimizePackageImports: ["framer-motion", "lucide-react"],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // HSTS (R4): browsers only honor this over HTTPS; harmless in dev.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

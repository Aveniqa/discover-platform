import type { NextConfig } from "next";

// Security headers are defined in public/_headers (authoritative for Cloudflare Pages).
// Do NOT duplicate them here — next.config.ts headers only apply during `next dev`
// and diverge from the production CF Pages config. See public/_headers for the full CSP,
// HSTS, Permissions-Policy, and other security headers.

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

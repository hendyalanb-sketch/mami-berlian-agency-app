import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Standalone output only for the VPS build (GitHub Actions); Vercel build unchanged.
  output: process.env.BUILD_STANDALONE ? "standalone" : undefined,
  async headers() {
    // Runtime MediaPipe disalin per versi (scripts/copy-mediapipe-wasm.mjs), jadi aman di-cache permanen.
    return [{ source: "/vendor/mediapipe/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] }];
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;

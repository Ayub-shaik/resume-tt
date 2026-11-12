import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@tomorrowtools/resume-brain"],
  serverExternalPackages: [
    "better-sqlite3",
    "better-sqlite3-multiple-ciphers",
    "@cursor/sdk",
    "unpdf",
    "mammoth",
    "@firecrawl/anydoc",
  ],
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  poweredByHeader: false,
  // lets a build go to another folder (NEXT_DIST_DIR=.next-new) while the running site keeps serving from .next
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // image optimizer (/_next/image) had unauthenticated RCE advisories; the app only serves local static images
  images: { unoptimized: true },
  async rewrites() {
    return [
      // Next strips trailing slashes from /downloads/ → /downloads, which is not a static file.
      { source: "/downloads", destination: "/downloads/index.html" },
    ];
  },
};

export default nextConfig;

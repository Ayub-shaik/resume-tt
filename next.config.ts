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
  async rewrites() {
    return [
      // Next strips trailing slashes from /downloads/ → /downloads, which is not a static file.
      { source: "/downloads", destination: "/downloads/index.html" },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "@cursor/sdk", "unpdf", "mammoth"],
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  poweredByHeader: false,
};

export default nextConfig;

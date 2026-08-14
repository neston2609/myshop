import type { NextConfig } from "next";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

function commandOrFallback(command: string, fallback: string) {
  try {
    return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || fallback;
  } catch {
    return fallback;
  }
}

const packageVersion = JSON.parse(readFileSync("package.json", "utf8")).version || "0.0.0";
const commitHash = commandOrFallback("git rev-parse --short HEAD", "dev");
const sourceLastUpdated = commandOrFallback("git log -1 --format=%cI", new Date().toISOString());

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["ssh2-sftp-client", "ssh2", "basic-ftp", "pdfkit"],
  env: {
    NEXT_PUBLIC_BUILD_VERSION: `${packageVersion}+${commitHash}`,
    NEXT_PUBLIC_SOURCE_LAST_UPDATED: sourceLastUpdated,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "plus.unsplash.com",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;

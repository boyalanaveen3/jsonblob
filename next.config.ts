import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default async function config() {
  if (process.env.NODE_ENV === "development") {
    try {
      const { setupDevPlatform } = await import("@cloudflare/next-on-pages/next-dev");
      await setupDevPlatform();
      console.log("Successfully initialized Cloudflare dev platform emulation.");
    } catch (err) {
      console.error("Failed to initialize Cloudflare dev platform emulation:", err);
    }
  }
  return nextConfig;
}

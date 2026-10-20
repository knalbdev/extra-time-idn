import type { NextConfig } from "next";
import path from "node:path";

const browserStub = "./src/lib/browser-node-unavailable.ts";
const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/sw.js", headers: [
      { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
      { key: "Content-Type", value: "application/javascript; charset=utf-8" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
    ] }];
  },
  turbopack: {
    resolveAlias: {
      "node:fs": { browser: browserStub },
      "node:fs/promises": { browser: browserStub },
      "node:https": { browser: browserStub },
    },
  },
  webpack(config, { isServer, webpack }) {
    if (!isServer) config.plugins.push(new webpack.NormalModuleReplacementPlugin(
      /^node:(?:fs(?:\/promises)?|https)$/,
      path.resolve(process.cwd(), browserStub),
    ));
    return config;
  },
};

export default nextConfig;

import type { NextConfig } from "next";
import path from "node:path";

const browserStub = "./src/lib/browser-node-unavailable.ts";
const nextConfig: NextConfig = {
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

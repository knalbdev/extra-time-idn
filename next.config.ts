import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  distDir: "extratime-app/out",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

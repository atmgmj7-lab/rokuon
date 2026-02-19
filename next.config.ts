import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb", // テレアポ音声用に上限を50MBに引き上げ
    },
  },
};

export default nextConfig;

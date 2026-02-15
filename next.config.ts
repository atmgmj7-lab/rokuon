import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 以下の experimental ブロックを丸ごと追加します
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb', // テレアポ音声用に上限を50MBに引き上げ
    },
  },
};

export default nextConfig;

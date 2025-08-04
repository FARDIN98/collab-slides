import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@mdxeditor/editor'],
  webpack: (config) => {
    // this will override the experiments
    config.experiments = { ...config.experiments, topLevelAwait: true }
    return config
  }
};

export default nextConfig;

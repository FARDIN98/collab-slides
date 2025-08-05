import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@mdxeditor/editor'],
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-slot',
      '@radix-ui/react-tooltip',
      'lucide-react',
      'class-variance-authority',
      'clsx',
      'tailwind-merge'
    ]
  },
  webpack: (config) => {
    // this will override the experiments
    config.experiments = { ...config.experiments, topLevelAwait: true }
    return config
  }
};

export default nextConfig;

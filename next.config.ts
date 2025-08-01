import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer, dev }) => {
    // Only apply webpack config when not using Turbopack
    if (!dev || process.env.NODE_ENV === 'production') {
      // Handle MDXEditor's Vite client references
      if (!isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
          path: false,
          os: false,
        };
      }
    }
    return config;
  },
  // Suppress the @vite/client 404 warnings
  async rewrites() {
    return [
      {
        source: '/@vite/client',
        destination: '/api/vite-client-stub',
      },
    ];
  },
};

export default nextConfig;

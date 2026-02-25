import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(process.cwd(), '../../'),
  experimental: {
    devtoolSegmentExplorer: false
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // Avoid intermittent ENOENT/manifest corruption from filesystem pack cache on Windows.
      config.cache = false;
    }

    return config;
  }
};

export default nextConfig;

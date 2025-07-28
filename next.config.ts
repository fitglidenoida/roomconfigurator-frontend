import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  experimental: {
    optimizePackageImports: ['recharts'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://backend.sandyy.dev/api',
    NEXT_PUBLIC_DEMO_MODE: 'true',
    NEXT_PUBLIC_FRONTEND_URL: 'https://sandyy.dev',
  },
};

export default nextConfig;

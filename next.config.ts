import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: [],
  // @ts-ignore - Some versions of Next.js expect this directly, others in experimental
  allowedDevOrigins: ['172.15.10.209'],
  experimental: {
    serverActions: {
      allowedOrigins: ['172.15.10.209:3000', 'localhost:3000']
    }
  }
};

export default nextConfig;

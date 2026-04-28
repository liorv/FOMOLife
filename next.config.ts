import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  transpilePackages: ['@myorg/ui', '@myorg/utils', '@myorg/types', '@myorg/storage'],
  allowedDevOrigins: ['192.168.1.2'],
};

export default nextConfig;

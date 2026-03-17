import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  transpilePackages: ['@myorg/ui', '@myorg/utils', '@myorg/types', '@myorg/storage'],
};

export default nextConfig;

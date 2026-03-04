import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@myorg/ui', '@myorg/utils', '@myorg/types', '@myorg/api-client'],
};

export default nextConfig;
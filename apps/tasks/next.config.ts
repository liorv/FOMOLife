import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@myorg/ui', '@myorg/utils', '@myorg/types', '@myorg/api-client', '@myorg/storage', '@myorg/storage-client'],
};

export default nextConfig;
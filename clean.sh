#!/bin/bash

echo "Cleaning temporary files and cache..."

# Remove Next.js caches
echo "Cleaning .next caches..."
rm -rf ./.next 2>/dev/null || true

# Remove Turborepo cache
echo "Cleaning .turbo cache..."
rm -rf .turbo 2>/dev/null || true

# Remove Typescript build files cache
echo "Cleaning TypeScript build info..."
find . -name "*.tsbuildinfo" -type f -delete 2>/dev/null || true

# Clear pnpm store/cache
echo "Pruning pnpm store..."
pnpm store prune 2>/dev/null || true

echo "Clean complete."

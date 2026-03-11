#!/bin/bash

echo "Cleaning temporary files and cache..."

# Remove .next directories (Next.js cache), preserving types/ to avoid TS errors
find . -name ".next" -type d | while read dir; do
  find "$dir" -mindepth 1 -maxdepth 1 ! -name "types" -exec rm -rf {} + 2>/dev/null || true
done

# Remove .turbo cache (Turborepo cache)
rm -rf .turbo 2>/dev/null || true

# Clear pnpm store/cache
pnpm store prune 2>/dev/null || true

echo "Clean complete."
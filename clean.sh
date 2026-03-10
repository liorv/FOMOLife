#!/bin/bash

echo "Cleaning temporary files and cache..."

# Remove .next directories (Next.js cache)
find . -name ".next" -type d -exec rm -rf {} + 2>/dev/null || true

# Remove .turbo cache (Turborepo cache)
rm -rf .turbo 2>/dev/null || true

# Clear pnpm store/cache
pnpm store prune 2>/dev/null || true

echo "Clean complete."
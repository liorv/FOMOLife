#!/bin/bash

echo "Cleaning temporary files and cache..."

# Remove node_modules directories
find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true

# Remove .next directories (Next.js cache)
find . -name ".next" -type d -exec rm -rf {} + 2>/dev/null || true

# Remove coverage directories (Jest coverage)
find . -name "coverage" -type d -exec rm -rf {} + 2>/dev/null || true

# Remove .turbo cache (Turborepo cache)
rm -rf .turbo 2>/dev/null || true

# Clear pnpm store/cache
pnpm store prune 2>/dev/null || true

# Remove log files
find . -name "*.log" -type f -delete 2>/dev/null || true

# Remove dist and build directories
find . -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true
find . -name "build" -type d -exec rm -rf {} + 2>/dev/null || true

echo "Clean complete."
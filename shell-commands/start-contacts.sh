#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/_common.sh"

ensure_cmd pnpm
echo "Starting contacts on http://localhost:3002"
run_from_root pnpm --filter contacts dev

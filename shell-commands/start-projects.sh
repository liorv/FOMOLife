#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/_common.sh"

ensure_cmd pnpm
echo "Starting projects on http://localhost:3003"
run_from_root pnpm --filter projects dev

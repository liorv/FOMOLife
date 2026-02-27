#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/_common.sh"

ensure_cmd pnpm
echo "Starting tasks on http://localhost:3004"
run_from_root pnpm --filter tasks dev

#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/_common.sh"

ensure_cmd pnpm
echo "Starting all apps via turbo"
run_from_root pnpm dev:mono

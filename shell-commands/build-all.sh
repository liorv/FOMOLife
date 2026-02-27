#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/_common.sh"

ensure_cmd pnpm
run_from_root pnpm turbo build --filter=contacts --filter=projects --filter=tasks

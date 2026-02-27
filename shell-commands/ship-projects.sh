#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/_common.sh"

ensure_cmd vercel
run_from_root vercel link --project fomo-life-projects --yes
run_from_root vercel --prod --yes

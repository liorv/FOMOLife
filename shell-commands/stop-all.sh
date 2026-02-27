#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/_common.sh"

stop_port 3002
stop_port 3003
stop_port 3004

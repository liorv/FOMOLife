#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

ensure_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required command: $cmd" >&2
    exit 1
  fi
}

run_from_root() {
  cd "$REPO_ROOT"
  "$@"
}

stop_port() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    local pids
    pids="$(lsof -ti tcp:"$port" || true)"
    if [[ -n "$pids" ]]; then
      echo "$pids" | xargs kill -9
      echo "Stopped process(es) on port $port"
    else
      echo "No listener on port $port"
    fi
    return
  fi

  if command -v netstat >/dev/null 2>&1; then
    local pids
    pids="$(netstat -ano 2>/dev/null | awk -v p=":$port" '$4 ~ p && $6 == "LISTENING" {print $5}' | sort -u)"
    if [[ -n "$pids" ]]; then
      while IFS= read -r pid; do
        [[ -z "$pid" ]] && continue
        if command -v taskkill >/dev/null 2>&1; then
          taskkill //PID "$pid" //F >/dev/null 2>&1 || true
        else
          kill -9 "$pid" >/dev/null 2>&1 || true
        fi
      done <<< "$pids"
      echo "Stopped process(es) on port $port"
    else
      echo "No listener on port $port"
    fi
    return
  fi

  echo "Unable to stop port $port: no supported tooling found (lsof/netstat)." >&2
  exit 1
}

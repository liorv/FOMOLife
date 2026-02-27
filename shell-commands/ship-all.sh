#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/_common.sh"

"$(dirname "$0")/ship-contacts.sh"
"$(dirname "$0")/ship-projects.sh"
"$(dirname "$0")/ship-tasks.sh"

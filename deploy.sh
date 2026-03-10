#!/bin/bash

# Deploy one or all Next.js apps under the 'apps' folder to Vercel.
# Converted from PowerShell script.

APP=""
FORCE=""

while getopts "a:f" opt; do
    case $opt in
        a) APP="$OPTARG" ;;
        f) FORCE="--force" ;;
        *) echo "Usage: $0 [-a app] [-f]" >&2; exit 1 ;;
    esac
done

BASE="apps"
if [ ! -d "$BASE" ]; then
    echo "Error: $BASE folder not found; run this from the repo root." >&2
    exit 1
fi

# Validate single-app name if provided
if [ -n "$APP" ]; then
    if [ ! -d "$BASE/$APP" ]; then
        available=$(ls "$BASE" | tr '\n' ', ')
        echo "Error: App '$APP' not found. Available apps: $available" >&2
        exit 1
    fi
fi

flags="--prod"
if [ -n "$FORCE" ]; then
    flags="$flags $FORCE"
fi

if [ -n "$APP" ]; then
    dirs="$BASE/$APP"
else
    dirs=$(ls -d "$BASE"/*/)
fi

for dir in $dirs; do
    appname=$(basename "$dir")
    linkfile="$dir.vercel/project.json"
    if [ -f "$linkfile" ]; then
        echo -e "\n=== deploying $appname ==="

        # Read project + org IDs from the .vercel/project.json link file
        org_id=$(python3 -c "import json; print(json.load(open('$linkfile'))['orgId'])" 2>/dev/null)
        proj_id=$(python3 -c "import json; print(json.load(open('$linkfile'))['projectId'])" 2>/dev/null)

        if [ -z "$org_id" ] || [ -z "$proj_id" ]; then
            echo "Error: Could not read orgId or projectId from $linkfile" >&2
            continue
        fi

        export VERCEL_ORG_ID="$org_id"
        export VERCEL_PROJECT_ID="$proj_id"

        # Run from the repo root; Vercel uses rootDirectory to locate the right sub-folder
        vercel $flags
        code=$?

        # Clean up env vars
        unset VERCEL_ORG_ID
        unset VERCEL_PROJECT_ID

        if [ $code -ne 0 ]; then
            echo "Warning: deployment of $appname failed (exit $code)" >&2
            exit $code
        fi
    fi
done

echo -e "\nall deployments finished."
#!/bin/bash

# Deploy Next.js monolith to Vercel.

FORCE=""

while getopts "f" opt; do
    case $opt in
        f) FORCE="--force" ;;
        *) echo "Usage: $0 [-f]" >&2; exit 1 ;;
    esac
done

flags="--prod"
if [ -n "$FORCE" ]; then
    flags="$flags $FORCE"
fi

linkfile=".vercel/project.json"

if [ -f "$linkfile" ]; then
    echo -e "\n=== deploying monolith ==="

    # Read project + org IDs from the .vercel/project.json link file
    org_id=$(python3 -c "import json; print(json.load(open('$linkfile'))['orgId'])" 2>/dev/null)
    proj_id=$(python3 -c "import json; print(json.load(open('$linkfile'))['projectId'])" 2>/dev/null)
    if [ -z "$org_id" ] || [ -z "$proj_id" ]; then
        echo "Error: Could not read orgId or projectId from $linkfile" >&2      
        exit 1
    fi

    export VERCEL_ORG_ID="$org_id"
    export VERCEL_PROJECT_ID="$proj_id"

    # Run deployment inside the root folder
    npx vercel $flags
    code=$?

    # Clean up env vars
    unset VERCEL_ORG_ID
    unset VERCEL_PROJECT_ID

    if [ $code -ne 0 ]; then
        echo "Warning: deployment failed (exit $code)" >&2
        exit $code
    fi
else
    echo "Error: Vercel project configuration not found at $linkfile. Please link the project first running: npx vercel link"                                                               
    exit 1
fi

echo -e "\nDeployment finished."

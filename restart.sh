#!/bin/bash

# Kill processes listening on Next.js ports
for port in 3001 3002 3003 3004; do
    pid=$(netstat -ano 2>/dev/null | grep ":$port " | awk '{print $5}' | head -1)
    if [ -n "$pid" ] && [ "$pid" != "0" ]; then
        taskkill /PID $pid /F 2>/dev/null
    fi
done

pnpm dlx @turbo/codemod@latest update

pnpm dev:mono
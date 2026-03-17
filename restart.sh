#!/bin/bash

# Kill processes listening on Next.js ports
echo "Killing processes on ports 3001-3009..."
powershell -Command "
\$ports = 3001,3002,3003,3004,3005,3006,3007,3008,3009
foreach (\$port in \$ports) {
    \$connections = Get-NetTCPConnection -LocalPort \$port -State Listen -ErrorAction SilentlyContinue
    if (\$connections) {
        foreach (\$conn in \$connections) {
            \$processId = \$conn.OwningProcess
            if (\$processId -and \$processId -ne 0) {
                Write-Host \"Killing process \$processId on port \$port\"
                Stop-Process -Id \$processId -Force -ErrorAction SilentlyContinue
            }
        }
    }
}
"

pnpm dlx @turbo/codemod@latest update . --force

pnpm dev:mono

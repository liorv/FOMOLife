#!/bin/bash

echo "Killing processes on ports 3000-3009..."
for port in {3000..3009}; do
    pid=$(netstat -ano 2>/dev/null | awk -v port="$port" '$2 ~ ":"port"$" {print $5}' | head -1)
    if [ -n "$pid" ] && [ "$pid" != "0" ]; then
        echo "Killing process $pid on port $port"
        taskkill //PID $pid //F 2>/dev/null
    fi
done
echo "Stopped old processes."

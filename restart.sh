#!/bin/bash

# Stop old processes
bash ./stop.sh

# Start the application
echo "Starting application..."
pnpm dev

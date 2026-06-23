#!/usr/bin/env bash
set -e

cd frontend/web

# Install dependencies
npm install --legacy-peer-deps

# Build
npm run build

echo "Build complete. Output: .next/"

#!/usr/bin/env bash
set -euo pipefail

# Use this script with SKIP_DEPENDENCY_INSTALL=true if Cloudflare's automatic
# npm clean-install step fails inside npm before the ArcBinder build begins.
npm install --no-audit --no-fund --progress=false --prefer-online
npm run build

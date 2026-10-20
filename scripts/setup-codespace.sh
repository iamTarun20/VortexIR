#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm ci
if [ ! -d .emsdk ]; then git clone --depth 1 https://github.com/emscripten-core/emsdk.git .emsdk; fi
.emsdk/emsdk install 4.0.15
.emsdk/emsdk activate 4.0.15
source .emsdk/emsdk_env.sh
npm run build:wasm
npm test
npm run build
printf '\nReady. Run npm run dev and open forwarded port 5173.\n'

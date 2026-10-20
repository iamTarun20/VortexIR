#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
command -v em++ >/dev/null || { echo 'Emscripten missing. Follow README setup instructions.' >&2; exit 1; }
mkdir -p public/wasm
em++ engine/src/search_engine.cpp engine/src/bridge.cpp -Iengine/include -std=c++17 -O2 -fexceptions \
 -sDISABLE_EXCEPTION_CATCHING=0 -sMODULARIZE=1 -sEXPORT_ES6=1 -sENVIRONMENT=web,node \
 -sALLOW_MEMORY_GROWTH=1 -sMAXIMUM_MEMORY=268435456 \
 -sEXPORTED_FUNCTIONS='["_load_catalogue","_last_error","_search_resources","_extract_keywords"]' \
 -sEXPORTED_RUNTIME_METHODS='["ccall"]' -o public/wasm/vortex.mjs

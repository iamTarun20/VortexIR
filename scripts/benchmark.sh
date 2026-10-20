#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p build
c++ -std=c++17 -O2 -Iengine/include engine/src/search_engine.cpp engine/src/benchmark.cpp -o build/benchmark
./build/benchmark data/resources.tsv

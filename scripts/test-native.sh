#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p build
c++ -std=c++17 -O2 -Wall -Wextra -Wpedantic -Iengine/include engine/src/search_engine.cpp engine/tests/test_engine.cpp -o build/engine_tests
./build/engine_tests data/resources.tsv
c++ -std=c++17 -O2 -Wall -Wextra -Wpedantic -Iengine/include engine/src/search_engine.cpp engine/src/main.cpp -o build/vortexir

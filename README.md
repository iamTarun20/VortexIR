# VortexIR

**A C++ learning resource search engine for computer science students.**

Ask a question, paste lecture notes, or select a text-based PDF. Review the extracted keywords and discover ranked links across **DSA, OOP in C++, DBMS and Operating Systems**.

VortexIR searches a **curated catalogue of 44 external resources**, not the entire internet. It indexes original short descriptions and keywords, not complete articles. No generated answers, paid AI APIs, accounts or backend database are required.

## Features

- One C++17 engine shared by the native CLI and browser WebAssembly module.
- Tokenization, explicit word aliases, an inverted index and BM25 ranking.
- Questions, pasted notes and text-based PDF inputs with editable keywords.
- Subject filters, ranked original links, responsive interface and pagination.
- Local PDF processing, progress indicators, cancellation and useful error messages.
- Native tests, WebAssembly and PDF integration checks, reproducible benchmarks.
- Codespaces configuration, CI and a GitHub Pages deployment workflow.

## Start with GitHub Codespaces

1. Open **Code → Codespaces → Create codespace on main**.
2. Wait for setup to install dependencies, compile C++ to WebAssembly and build the interface.
3. Run `npm run dev` in the terminal.
4. Open forwarded port **5173** from the **Ports** tab.

If setup was interrupted, rerun `bash scripts/setup-codespace.sh`. After changing C++ code, run `source .emsdk/emsdk_env.sh`, then `npm run build:wasm`, and reload the page.

Codespaces is for development and is subject to your account's included quota. Stop the Codespace when finished and avoid enabling paid usage unless intended. A deployed GitHub Pages demo does not depend on your laptop or Codespace remaining on.

## Local development

Requires **Node.js 22.13+**, npm, Python 3, a C++17 compiler and **Emscripten 4.0.15**. The scripts use Bash; Windows users can use WSL or Codespaces.

```bash
npm ci
git clone --depth 1 https://github.com/emscripten-core/emsdk.git ../emsdk
../emsdk/emsdk install 4.0.15
../emsdk/emsdk activate 4.0.15
source ../emsdk/emsdk_env.sh
npm run build:wasm
npm test
npm run check:wasm
npm run dev
```

`npm run build` produces the static site in `dist/`. The build checks that WebAssembly exists; there is no silent JavaScript ranking fallback. PDF worker, CMaps and standard fonts are included in the site.

### Native C++ only

No npm, Emscripten or browser needed:

```bash
bash scripts/test-native.sh
./build/vortexir data/resources.tsv "How does deadlock occur?" OS
./build/vortexir data/resources.tsv "binary search" DSA
```

Alternatively, with CMake:

```bash
cmake -S . -B build/cmake -DCMAKE_BUILD_TYPE=Release
cmake --build build/cmake
ctest --test-dir build/cmake --output-on-failure
./build/cmake/vortexir data/resources.tsv "transaction isolation" DBMS
```

## Deploy on GitHub Pages

1. Open **Settings → Pages** and select **GitHub Actions** as the source.
2. Open **Actions → Deploy GitHub Pages → Run workflow** on `main`.
3. After success, use the URL shown in the deployment job or Settings → Pages.

The workflow compiles C++, runs native and Wasm checks, builds React and deploys the static output. It is manually triggered so routine source pushes do not unexpectedly publish a demo. Repeat it for updates you wish to release.

The existence of this workflow does **not** mean the site is already live. Repository visibility and account eligibility determine Pages availability. No application server or API key is required; platform quotas and outages still apply.

## Learn the code in this order

1. `engine/include/search_engine.h`: simple records, postings and engine methods.
2. `SearchEngine::tokenize`: lowercase text, discard common words, normalize aliases.
3. `SearchEngine::load`: read TSV and build word-to-document lists.
4. `SearchEngine::search`: visit matches, sum BM25 scores and sort.
5. `SearchEngine::extractKeywords`: rank known words by frequency and rarity.
6. `engine/src/main.cpp`: file loading and native CLI output.
7. `engine/src/bridge.cpp`: a separate C-compatible WebAssembly boundary.
8. `web/src/engine.ts`, `pdf.ts`, `main.tsx`: integration, document extraction and UI.

The engine uses ordinary strings, loops, functions, structs, vectors, hash maps/sets and sort comparisons. It does not implement custom memory allocation, lock-free algorithms, threading, advanced templates or inheritance hierarchies. The WebAssembly toolchain is a separate integration topic.

## Validation

```bash
npm test
npm run check:wasm  # after compiling WebAssembly
npm run check:pdf
npm run benchmark
python3 scripts/evaluate.py
npm run build
```

[Measured benchmark and relevance results](docs/BENCHMARKS.md) distinguish native timings, synthetic scaling and a small developer-authored relevance set. They are not production-scale performance or general accuracy claims.

## Limits

- English lexical matching only; no OCR, semantic search, spell correction or internet-wide discovery.
- PDF inputs: at most **15 MB, 200 pages and 200,000 extracted characters**. These bound typical browser work; they do not guarantee support for every PDF or device.
- Pasted notes: 200,000 characters. Questions/edited keywords: 500 characters.
- Password-protected, scanned, damaged or unusually encoded PDFs may not yield usable text. Multi-column reading order can be imperfect.
- BM25 values are ranking scores, not confidence percentages or proof of educational quality.
- Links can move or disappear; coverage is limited to the catalogue.
- The index is rebuilt in memory at startup. Catalogue persistence uses TSV files, not a serialized on-disk index.
- Selected documents are processed locally and their text is not transmitted or persisted. Pasted notes stay in component state until reload/close. External article links visit other websites. Google Fonts supplies UI typography without receiving document text.

## Add resources

Edit `data/resources.tsv`; every row has seven literal tab-separated fields:

```text
id    subject    title    https_url    original_description    keywords    source
```

Use unique positive IDs, HTTPS links and subjects `DSA`, `OOPS`, `DBMS` or `OS`. Fields cannot contain tabs or newlines. Write original descriptions rather than copying articles. Rebuild and rerun tests after edits. Both native and browser builds use this one catalogue.

Read [the architecture and BM25 explanation](docs/ARCHITECTURE.md) and [source acknowledgements](docs/SOURCES.md).

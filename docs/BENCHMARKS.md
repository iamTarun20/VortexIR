# Measured performance and relevance

Measured on 2026-10-20 after restoring the project. These results replace the earlier session's measurements because catalogue descriptions were reconstructed. Values are observations, not service guarantees.

## Method

- Linux x86_64; c++ (Ubuntu 13.3.0-6ubuntu2~24.04) 13.3.0; C++17 with `-O2`.
- Single native process/thread; steady clock; microsecond query measurements.
- Eight queries: deadlock; binary search; virtual functions; transaction isolation; bfs; semaphore; index; graph.
- 20 warm-up batches then 100 measured batches: 800 samples per path/dataset.
- Median and empirical p95 cover the mixed query set, not each query separately.
- Includes query tokenization, matching, scoring, allocations and sorting. Excludes startup, file reading, PDF parsing, browser rendering and Wasm bridge overhead.
- Both paths use the same BM25 formula and precomputed frequencies. Full scan visits every document's frequency map; it does not repeatedly tokenize raw text.
- Ranking/score parity is verified before timing. Index construction is a single observation.
- The 4,400-record dataset repeats the 44 catalogue records 100 times with new IDs. It is a synthetic scaling experiment, not diverse real-world coverage.
- Shared-container scheduling and cache effects can materially change the results, particularly short microsecond observations.

## Results

| Dataset | Records | Build ms | Indexed median / p95 µs | Full scan median / p95 µs |
|---|---:|---:|---:|---:|
| Curated catalogue | 44 | 3.453 | 0.418 / 0.905 | 1.098 / 2.081 |
| Synthetic 100× repetition | 4400 | 98.935 | 69.302 / 186.322 | 498.732 / 1421.972 |

No percentage improvement is asserted; raw values and reproduction instructions are provided. These are native engine timings, not browser end-to-end latency.

## Relevance sanity set

Sixteen developer-authored queries use subject filters and expected resource IDs from `data/relevance.tsv`. Hit@3 asks whether a labelled relevant resource appears within three results. MRR averages the reciprocal of its first rank (zero when missing). Labels are non-exhaustive, so precision is not reported.

| Query | Subject | First relevant rank |
|---|---|---:|
| How does deadlock occur? | OS | 1 |
| Find the shortest path in an unweighted graph | DSA | 1 |
| How do I use memoization and tabulation? | DSA | 1 |
| What is a binary indexed tree? | DSA | 1 |
| What is dynamic dispatch? | OOPS | 1 |
| How do I hide class data? | OOPS | 4 |
| When is an object destructor called? | OOPS | 1 |
| How do I create an abstract class? | OOPS | 1 |
| How can I inspect a SQL query plan? | DBMS | 1 |
| How does write ahead logging help recovery? | DBMS | 1 |
| What is transaction isolation? | DBMS | 1 |
| How do primary and foreign keys work? | DBMS | 1 |
| How are virtual pages mapped to physical frames? | OS | 1 |
| How do semaphores coordinate threads? | OS | 1 |
| Compare CPU scheduling policies | OS | 1 |
| How does page replacement work? | OS | 1 |

Hit@3: 15/16. Mean reciprocal rank: 0.953.

Editorial labels are narrow and non-exhaustive; this is not independent evaluation.

The encapsulation query placed its expected reference fourth. This is a limitation of lexical matching and the small catalogue, and is retained in the report. Do not describe the measured Hit@3 as general search accuracy; this set is not independent user evaluation.

## Verified scope

- Native tests: tokenization, aliases, filtering, positive finite scores, empty/unknown terms, repeated query terms, keyword extraction, malformed records, duplicate IDs and reload safety.
- 40 query/filter combinations compare indexed and full-scan ranking and scores.
- WebAssembly checks: initialization, native top-result parity across four subjects, keywords and invalid-load recovery.
- PDF smoke check: generated text PDF → PDF.js → C++ keywords → relevant resources, plus blank and invalid input behavior. This uses PDF.js's Node-compatible legacy entry point; the browser uses the standard entry point.
- TypeScript and production Vite build pass.
- Production dependency audit reported zero vulnerabilities with PDF.js 6.2.108 at validation time. Audits are point-in-time checks, not security guarantees.
- The 44 source URLs were checked in the earlier session; all returned HTTP 200 after correcting the overload-resolution URL. The restored catalogue uses the same URLs. Links can change later.
- Real-browser visual/interactive QA was unavailable. Responsive layout, drag-and-drop, cancellation timing, and operation on GitHub Pages need a browser smoke check after deployment.

## Reproduce

```bash
npm test
npm run benchmark
python3 scripts/evaluate.py
# After compiling WebAssembly:
npm run check:wasm
npm run check:pdf
npm run build
```

The UI reports local search plus bridge/JSON time; do not compare it directly with native timings.

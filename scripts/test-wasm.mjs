import createEngine from "../public/wasm/vortex.mjs";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
const engine = await createEngine();
const catalogue = readFileSync("data/resources.tsv", "utf8");
const rows = catalogue
  .split("\n")
  .filter((r) => r && !r.startsWith("#"))
  .map((r) => r.split("\t"));
assert.equal(
  engine.ccall("load_catalogue", "number", ["string"], [catalogue]),
  rows.length,
);
for (const [query, subject] of [
  ["deadlock", "OS"],
  ["binary search", "DSA"],
  ["virtual functions", "OOPS"],
  ["transaction isolation", "DBMS"],
]) {
  const results = JSON.parse(
    engine.ccall(
      "search_resources",
      "string",
      ["string", "string"],
      [query, subject],
    ),
  );
  assert.ok(results.length);
  const title = rows.find((row) => Number(row[0]) === results[0].id)[2];
  const native = execFileSync(
    "build/vortexir",
    ["data/resources.tsv", query, subject],
    { encoding: "utf8" },
  );
  assert.ok(native.split("\n")[1].includes(title));
}
assert.deepEqual(
  JSON.parse(
    engine.ccall(
      "search_resources",
      "string",
      ["string", "string"],
      ["unknownxyz", ""],
    ),
  ),
  [],
);
assert.ok(
  JSON.parse(
    engine.ccall(
      "extract_keywords",
      "string",
      ["string"],
      ["deadlock process synchronization"],
    ),
  ).includes("deadlock"),
);
assert.equal(
  engine.ccall("load_catalogue", "number", ["string"], ["broken"]),
  -1,
);
assert.ok(engine.ccall("last_error", "string", [], []).includes("TSV"));
assert.ok(
  JSON.parse(
    engine.ccall(
      "search_resources",
      "string",
      ["string", "string"],
      ["deadlock", "OS"],
    ),
  ).length,
);
console.log(
  "PASS: WebAssembly initialization, native top-result parity, keyword extraction and invalid-load recovery",
);

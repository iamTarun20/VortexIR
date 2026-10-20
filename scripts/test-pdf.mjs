// Integration smoke check, not a replacement for real-browser UI testing.
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import createEngine from "../public/wasm/vortex.mjs";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
function fixture(text) {
  const stream = `BT /F1 12 Tf 30 100 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 800 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf +=
    "xref\n0 6\n0000000000 65535 f \n" +
    offsets.map((n) => String(n).padStart(10, "0") + " 00000 n \n").join("") +
    `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
async function extract(data) {
  const task = getDocument({
    data,
    useWasm: false,
    standardFontDataUrl: new URL(
      "../node_modules/pdfjs-dist/standard_fonts/",
      import.meta.url,
    ).pathname,
  });
  try {
    const pdf = await task.promise;
    const page = await pdf.getPage(1);
    const text = (await page.getTextContent()).items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    page.cleanup();
    return text;
  } finally {
    await task.destroy();
  }
}
const text = await extract(
  fixture("Deadlock process synchronization threads and semaphores"),
);
assert.match(text, /Deadlock process synchronization threads and semaphores/);
assert.equal((await extract(fixture(""))).trim(), "");
await assert.rejects(() =>
  extract(new TextEncoder().encode("not a valid PDF")),
);
const engine = await createEngine();
engine.ccall(
  "load_catalogue",
  "number",
  ["string"],
  [readFileSync("data/resources.tsv", "utf8")],
);
const words = JSON.parse(
  engine.ccall("extract_keywords", "string", ["string"], [text]),
);
assert.ok(words.includes("deadlock"));
const results = JSON.parse(
  engine.ccall(
    "search_resources",
    "string",
    ["string", "string"],
    [words.join(" "), "OS"],
  ),
);
assert.ok(results.some((r) => r.id === 42));
assert.ok(results.slice(0, 3).some((r) => [38, 39, 40, 41].includes(r.id)));
console.log(
  "PASS: PDF text → C++ keywords → relevant resources; blank and invalid PDF behavior",
);

import { cpSync, mkdirSync, existsSync } from "node:fs";
for (const directory of ["cmaps", "standard_fonts"]) {
  mkdirSync("public/pdfjs", { recursive: true });
  cpSync(`node_modules/pdfjs-dist/${directory}`, `public/pdfjs/${directory}`, {
    recursive: true,
  });
}
if (!existsSync("public/wasm/vortex.wasm"))
  throw new Error("Build the C++ engine first: npm run build:wasm");

// Copia o worker do pdf.js para public/, na mesma versão da biblioteca instalada.
// Roda sozinho depois do npm install (inclusive na Vercel).
import { copyFileSync, existsSync } from "node:fs";

const from = "node_modules/pdfjs-dist/build/pdf.worker.min.mjs";
if (existsSync(from)) {
  copyFileSync(from, "public/pdf.worker.min.mjs");
  console.log("pdf.worker.min.mjs copiado para public/");
}

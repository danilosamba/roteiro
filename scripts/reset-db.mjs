// Apaga o arquivo local data/roteiro.db para o app recriar o roteiro original na próxima abertura.
import { rmSync } from "node:fs";

for (const f of ["data/roteiro.db", "data/roteiro.db-journal", "data/roteiro.db-wal", "data/roteiro.db-shm"]) {
  rmSync(f, { force: true });
}
console.log("Banco local apagado. Rode `npm run dev` para recriar o roteiro original.");

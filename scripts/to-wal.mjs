// Converte data/roteiro.db para journal_mode=WAL (exigido pelo turso db create --from-file).
import { createClient } from "@libsql/client";

const c = createClient({ url: "file:data/roteiro.db" });
const r = await c.execute("PRAGMA journal_mode=WAL");
const n = await c.execute("SELECT COUNT(*) AS n FROM items");
console.log("journal_mode:", r.rows[0].journal_mode, "| itens:", n.rows[0].n);
c.close();

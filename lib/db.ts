import { createClient, type Client, type Row } from "@libsql/client";
import { SEED } from "./seed";
import type { Item, ItemInput } from "./types";

// Local: arquivo SQLite em data/roteiro.db
// Vercel: banco Turso (SQLite na nuvem) via TURSO_DATABASE_URL + TURSO_AUTH_TOKEN
const url = process.env.TURSO_DATABASE_URL || "file:data/roteiro.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

let client: Client | null = null;
let ready: Promise<void> | null = null;

function db(): Client {
  if (!client) client = createClient({ url, authToken });
  return client;
}

const COLS = [
  "date", "time", "period", "title", "subtitle", "status", "category", "place",
  "description", "image_url", "gallery", "links", "rating", "reviews", "notes", "sort",
] as const;

function toArgs(i: ItemInput) {
  return COLS.map((c) => {
    const v = i[c];
    return Array.isArray(v) ? JSON.stringify(v) : (v ?? "");
  });
}

function parse<T>(s: unknown, fallback: T): T {
  try {
    return s ? (JSON.parse(String(s)) as T) : fallback;
  } catch {
    return fallback;
  }
}

function fromRow(r: Row): Item {
  return {
    id: Number(r.id),
    date: String(r.date),
    time: String(r.time ?? ""),
    period: String(r.period ?? "") as Item["period"],
    title: String(r.title),
    subtitle: String(r.subtitle ?? ""),
    status: String(r.status) as Item["status"],
    category: String(r.category) as Item["category"],
    place: String(r.place ?? ""),
    description: String(r.description ?? ""),
    image_url: String(r.image_url ?? ""),
    gallery: parse<string[]>(r.gallery, []),
    links: parse(r.links, []),
    rating: String(r.rating ?? ""),
    reviews: String(r.reviews ?? ""),
    notes: String(r.notes ?? ""),
    sort: Number(r.sort ?? 0),
  };
}

async function init() {
  const c = db();
  await c.execute(`CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL, time TEXT DEFAULT '', period TEXT DEFAULT '',
    title TEXT NOT NULL, subtitle TEXT DEFAULT '', status TEXT NOT NULL,
    category TEXT NOT NULL, place TEXT DEFAULT '', description TEXT DEFAULT '',
    image_url TEXT DEFAULT '', gallery TEXT DEFAULT '[]', links TEXT DEFAULT '[]',
    rating TEXT DEFAULT '', reviews TEXT DEFAULT '', notes TEXT DEFAULT '',
    sort INTEGER DEFAULT 0
  )`);
  const { rows } = await c.execute("SELECT COUNT(*) AS n FROM items");
  if (Number(rows[0].n) === 0) {
    await c.batch(
      SEED.map((s) => ({
        sql: `INSERT INTO items (${COLS.join(",")}) VALUES (${COLS.map(() => "?").join(",")})`,
        args: toArgs(s),
      })),
      "write",
    );
  }
}

async function ensure() {
  if (!ready) ready = init().catch((e) => { ready = null; throw e; });
  await ready;
}

export async function listItems(): Promise<Item[]> {
  await ensure();
  const { rows } = await db().execute(
    "SELECT * FROM items ORDER BY date, sort, id",
  );
  return rows.map(fromRow);
}

export async function createItem(i: ItemInput): Promise<Item> {
  await ensure();
  const r = await db().execute({
    sql: `INSERT INTO items (${COLS.join(",")}) VALUES (${COLS.map(() => "?").join(",")}) RETURNING *`,
    args: toArgs(i),
  });
  return fromRow(r.rows[0]);
}

export async function updateItem(id: number, i: ItemInput): Promise<Item | null> {
  await ensure();
  const r = await db().execute({
    sql: `UPDATE items SET ${COLS.map((c) => `${c} = ?`).join(",")} WHERE id = ? RETURNING *`,
    args: [...toArgs(i), id],
  });
  return r.rows[0] ? fromRow(r.rows[0]) : null;
}

export async function deleteItem(id: number): Promise<void> {
  await ensure();
  await db().execute({ sql: "DELETE FROM items WHERE id = ?", args: [id] });
}

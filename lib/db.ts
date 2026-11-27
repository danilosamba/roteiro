import { createClient, type Client, type Row } from "@libsql/client";
import { SEED } from "./seed";
import type { Attachment, Item, ItemInput } from "./types";

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

function fromRow(r: Row, attachments: Attachment[] = []): Item {
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
    attachments,
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
  // ingressos guardados no próprio banco (PDF ou imagem)
  await c.execute(`CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    item_id INTEGER NOT NULL,
    name TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL,
    data BLOB NOT NULL,
    created_at INTEGER NOT NULL
  )`);
  await c.execute("CREATE INDEX IF NOT EXISTS attachments_item ON attachments(item_id)");
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

const META = "id, item_id, name, mime, size";

function metaFromRow(r: Row): Attachment {
  return {
    id: String(r.id),
    item_id: Number(r.item_id),
    name: String(r.name),
    mime: String(r.mime),
    size: Number(r.size),
  };
}

async function attachmentsOf(itemId: number): Promise<Attachment[]> {
  const { rows } = await db().execute({
    sql: `SELECT ${META} FROM attachments WHERE item_id = ? ORDER BY created_at`,
    args: [itemId],
  });
  return rows.map(metaFromRow);
}

export async function listItems(): Promise<Item[]> {
  await ensure();
  const [items, att] = await Promise.all([
    db().execute("SELECT * FROM items ORDER BY date, sort, id"),
    db().execute(`SELECT ${META} FROM attachments ORDER BY created_at`),
  ]);
  const byItem = new Map<number, Attachment[]>();
  for (const r of att.rows) {
    const a = metaFromRow(r);
    byItem.set(a.item_id, [...(byItem.get(a.item_id) || []), a]);
  }
  return items.rows.map((r) => fromRow(r, byItem.get(Number(r.id))));
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
  return r.rows[0] ? fromRow(r.rows[0], await attachmentsOf(id)) : null;
}

export async function deleteItem(id: number): Promise<void> {
  await ensure();
  await db().batch(
    [
      { sql: "DELETE FROM attachments WHERE item_id = ?", args: [id] },
      { sql: "DELETE FROM items WHERE id = ?", args: [id] },
    ],
    "write",
  );
}

export async function itemExists(id: number): Promise<boolean> {
  await ensure();
  const { rows } = await db().execute({ sql: "SELECT 1 FROM items WHERE id = ?", args: [id] });
  return rows.length > 0;
}

export async function addAttachment(
  itemId: number,
  file: { name: string; mime: string; data: Uint8Array },
): Promise<Attachment> {
  await ensure();
  const id = crypto.randomUUID();
  await db().execute({
    sql: "INSERT INTO attachments (id, item_id, name, mime, size, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: [id, itemId, file.name, file.mime, file.data.byteLength, file.data, Date.now()],
  });
  return { id, item_id: itemId, name: file.name, mime: file.mime, size: file.data.byteLength };
}

export async function getAttachment(id: string): Promise<(Attachment & { data: Uint8Array }) | null> {
  await ensure();
  const { rows } = await db().execute({
    sql: `SELECT ${META}, data FROM attachments WHERE id = ?`,
    args: [id],
  });
  if (!rows[0]) return null;
  const raw = rows[0].data as ArrayBuffer | Uint8Array;
  return { ...metaFromRow(rows[0]), data: raw instanceof Uint8Array ? raw : new Uint8Array(raw) };
}

export async function deleteAttachment(id: string): Promise<void> {
  await ensure();
  await db().execute({ sql: "DELETE FROM attachments WHERE id = ?", args: [id] });
}

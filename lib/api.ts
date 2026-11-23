import { NextResponse } from "next/server";
import type { ItemInput } from "./types";

// Se APP_PIN estiver definido, só quem souber o PIN consegue editar.
export function checkPin(req: Request): NextResponse | null {
  const pin = process.env.APP_PIN;
  if (!pin) return null;
  if (req.headers.get("x-pin") === pin) return null;
  return NextResponse.json({ error: "PIN incorreto" }, { status: 401 });
}

const STATUS = ["reservado", "planejado", "sugestao"];
const PERIOD = ["", "manha", "tarde", "noite"];
const CATEGORY = ["passeio", "hotel", "comida", "vinho", "doce", "transporte", "livre"];

const str = (v: unknown, max = 2000) => (typeof v === "string" ? v.slice(0, max) : "");

export function cleanInput(b: Record<string, unknown>): ItemInput | string {
  const date = str(b.date, 10);
  const title = str(b.title, 120).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "Data inválida";
  if (!title) return "Dê um nome ao item";
  const time = str(b.time, 5);
  if (time && !/^\d{2}:\d{2}$/.test(time)) return "Horário inválido";
  const pick = <T extends string>(v: unknown, list: string[], d: T) =>
    (list.includes(v as string) ? v : d) as T;
  const urls = (v: unknown) =>
    Array.isArray(v) ? v.filter((x) => typeof x === "string" && /^https?:\/\//.test(x)).slice(0, 8) : [];
  const links = Array.isArray(b.links)
    ? (b.links as unknown[])
        .filter((l): l is { label: string; url: string } =>
          !!l && typeof l === "object" && /^https?:\/\//.test(str((l as { url: unknown }).url)))
        .map((l) => ({ label: str(l.label, 60) || "Link", url: str(l.url, 600) }))
        .slice(0, 6)
    : [];
  const img = str(b.image_url, 600);
  return {
    date,
    time,
    period: pick(b.period, PERIOD, ""),
    title,
    subtitle: str(b.subtitle, 160),
    status: pick(b.status, STATUS, "planejado"),
    category: pick(b.category, CATEGORY, "passeio"),
    place: str(b.place, 200),
    description: str(b.description, 3000),
    image_url: /^https?:\/\//.test(img) ? img : "",
    gallery: urls(b.gallery),
    links,
    rating: str(b.rating, 6),
    reviews: str(b.reviews, 10),
    notes: str(b.notes, 2000),
    sort: Number.isFinite(Number(b.sort)) ? Number(b.sort) : 999,
  };
}

import type { Item, ItemInput } from "./types";
import { TRIP } from "./types";

export const DAY_TITLES: Record<string, string> = {
  "2026-12-05": "Bondinhos, vinho e o centrinho",
  "2026-12-06": "Lago Negro e neve de verdade",
  "2026-12-07": "Jardins, oliveiras e cânions",
  "2026-12-08": "Trem Maria Fumaça",
  "2026-12-09": "Tour Italiano Premium",
  "2026-12-10": "Até logo, serra",
};

export function tripDays(): string[] {
  const out: string[] = [];
  const d = new Date(TRIP.start + "T12:00:00");
  const end = new Date(TRIP.end + "T12:00:00");
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

const asDate = (iso: string) => new Date(iso + "T12:00:00");

export const weekdayShort = (iso: string) =>
  asDate(iso).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
export const dayNum = (iso: string) => asDate(iso).getDate();
export const longDate = (iso: string) =>
  asDate(iso).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

export function todayISO(): string {
  const n = new Date();
  return new Date(n.getTime() - n.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

const PERIOD_MIN: Record<string, number> = { "": 12 * 60, manha: 10 * 60, tarde: 15 * 60, noite: 20 * 60 };

export function minutesOf(i: Item): number {
  if (i.time) {
    const [h, m] = i.time.split(":").map(Number);
    return h * 60 + m;
  }
  return PERIOD_MIN[i.period] ?? 720;
}

export function sortDay(items: Item[]): Item[] {
  return [...items].sort((a, b) => minutesOf(a) - minutesOf(b) || a.sort - b.sort || a.id - b.id);
}

export function countdownLabel(): string {
  const t = asDate(todayISO()).getTime();
  const s = asDate(TRIP.start).getTime();
  const e = asDate(TRIP.end).getTime();
  const day = 86400000;
  if (t < s) {
    const n = Math.round((s - t) / day);
    return n === 1 ? "falta 1 dia 💗" : `faltam ${n} dias`;
  }
  if (t <= e) return `dia ${Math.round((t - s) / day) + 1} de ${Math.round((e - s) / day) + 1} ✨`;
  return "que saudade 💭";
}

export const googleMapsUrl = (q: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}&travelmode=driving`;
export const wazeUrl = (q: string) => `https://waze.com/ul?q=${encodeURIComponent(q)}&navigate=yes`;

// ───────── API
const PIN_KEY = "roteiro-pin";

export function getPin(): string {
  try {
    return localStorage.getItem(PIN_KEY) || "";
  } catch {
    return "";
  }
}

export function setPin(p: string) {
  try {
    localStorage.setItem(PIN_KEY, p);
  } catch {}
}

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", "x-pin": getPin(), ...(init?.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error || "Algo deu errado") as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return body as T;
}

export const api = {
  list: () => req<Item[]>("/api/items", { cache: "no-store" }),
  create: (i: ItemInput) => req<Item>("/api/items", { method: "POST", body: JSON.stringify(i) }),
  update: (id: number, i: ItemInput) =>
    req<Item>(`/api/items/${id}`, { method: "PUT", body: JSON.stringify(i) }),
  remove: (id: number) => req<{ ok: true }>(`/api/items/${id}`, { method: "DELETE" }),
  authInfo: () => req<{ required: boolean }>("/api/auth"),
  checkPin: (pin: string) =>
    fetch("/api/auth", { method: "POST", body: JSON.stringify({ pin }) }).then((r) => r.ok),
};

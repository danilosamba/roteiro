// Modo offline: calcula o tamanho, baixa tudo para o cache do service worker
// (public/sw.js) e mantém os ingressos novos guardados enquanto estiver ligado.
import type { Item } from "./types";
import { attachmentUrl } from "./client";

const CACHE = "roteiro-offline-v1"; // o mesmo nome do public/sw.js
const FLAG = "roteiro-offline";

export interface OfflineInfo {
  savedAt: number;
  bytes: number;
}

export interface Plan {
  app: { url: string; size: number }[];
  photos: { url: string; size: number }[];
  files: { url: string; size: number }[];
  total: number;
}

export const offlineSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "caches" in window;

export function offlineInfo(): OfflineInfo | null {
  try {
    const v = localStorage.getItem(FLAG);
    return v ? (JSON.parse(v) as OfflineInfo) : null;
  } catch {
    return null;
  }
}

function setInfo(v: OfflineInfo | null) {
  try {
    if (v) localStorage.setItem(FLAG, JSON.stringify(v));
    else localStorage.removeItem(FLAG);
  } catch {}
}

// as fotos são usadas em 600, 1200 e 1400 px; guardamos só a de 1200 (o sw.js faz o mesmo)
export function photoKey(url: string): string {
  const u = new URL(url);
  u.searchParams.set("w", "1200");
  return u.toString();
}

const STATIC_FILES = [
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/pdf.worker.min.mjs",
];

// arquivos do próprio app que esta página já carregou (JS, CSS, fontes)
function loadedAppFiles(): string[] {
  const out = new Set<string>();
  for (const e of performance.getEntriesByType("resource")) {
    const u = new URL(e.name);
    if (u.origin === location.origin && u.pathname.startsWith("/_next/static/")) out.add(u.pathname + u.search);
  }
  document.querySelectorAll<HTMLScriptElement | HTMLLinkElement>("script[src], link[href]").forEach((el) => {
    const raw = "src" in el && el.src ? el.src : (el as HTMLLinkElement).href;
    if (!raw) return;
    const u = new URL(raw, location.href);
    if (u.origin === location.origin && u.pathname.startsWith("/_next/static/")) out.add(u.pathname + u.search);
  });
  return [...out];
}

async function sizeOf(url: string, init?: RequestInit): Promise<number> {
  const entry = performance.getEntriesByName(new URL(url, location.href).href)[0] as
    | PerformanceResourceTiming
    | undefined;
  if (entry?.decodedBodySize) return entry.decodedBodySize;
  try {
    const head = await fetch(url, { ...init, method: "HEAD" });
    const len = Number(head.headers.get("content-length"));
    if (len) return len;
    const res = await fetch(url, init);
    return (await res.blob()).size;
  } catch {
    return 0;
  }
}

function photoUrls(items: Item[]): string[] {
  const out = new Set<string>();
  for (const i of items) for (const p of [i.image_url, ...i.gallery]) if (p) out.add(photoKey(p));
  return [...out];
}

// monta a lista do que será baixado, com o tamanho de cada parte
export async function planDownload(items: Item[]): Promise<Plan> {
  // o leitor de PDF só carrega quando abre um PDF; carrega agora para entrar na conta
  await import("pdfjs-dist").catch(() => null);
  const appUrls = ["/", "/api/items", ...STATIC_FILES, ...loadedAppFiles()];
  const pUrls = photoUrls(items);
  const [app, photos] = await Promise.all([
    Promise.all(appUrls.map(async (url) => ({ url, size: await sizeOf(url) }))),
    Promise.all(pUrls.map(async (url) => ({ url, size: await sizeOf(url, { mode: "cors", credentials: "omit" }) }))),
  ]);
  const files = items.flatMap((i) => i.attachments.map((a) => ({ url: attachmentUrl(a.id), size: a.size })));
  const total = [...app, ...photos, ...files].reduce((s, f) => s + f.size, 0);
  return { app, photos, files, total };
}

async function store(cache: Cache, url: string) {
  const external = url.startsWith("http");
  const res = await fetch(url, external ? { mode: "cors", credentials: "omit" } : { cache: "no-store" });
  if (!res.ok) throw new Error(`Falhou: ${url}`);
  await cache.put(url, res);
}

// baixa tudo; onProgress recebe (feitos, total)
export async function downloadAll(plan: Plan, onProgress: (done: number, total: number) => void) {
  await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  navigator.storage?.persist?.().catch(() => {});

  const cache = await caches.open(CACHE);
  const all = [...plan.app, ...plan.files, ...plan.photos];
  let done = 0;
  const failed: string[] = [];
  const queue = [...all];
  const worker = async () => {
    for (let f = queue.shift(); f; f = queue.shift()) {
      try {
        await store(cache, f.url);
      } catch {
        failed.push(f.url);
      }
      onProgress(++done, all.length);
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));

  // fotos que o site de origem não entregou não impedem o uso offline
  const essential = failed.filter((u) => !u.startsWith("http"));
  if (essential.length) {
    throw new Error("Não consegui baixar tudo. Confira a internet e tente de novo.");
  }
  setInfo({ savedAt: Date.now(), bytes: plan.total });
  return failed.length;
}

// desliga o modo offline e apaga o que estava guardado
export async function removeOffline() {
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.map((r) => r.unregister()));
  await caches.delete(CACHE);
  setInfo(null);
}

// com o modo ligado e internet, guarda ingressos e fotos novos que ainda não estão no celular
export async function syncOffline(items: Item[]) {
  if (!offlineInfo() || !offlineSupported() || !navigator.onLine) return;
  navigator.serviceWorker.register("/sw.js").catch(() => {});
  const cache = await caches.open(CACHE);
  const wanted = [
    ...items.flatMap((i) => i.attachments.map((a) => attachmentUrl(a.id))),
    ...photoUrls(items),
  ];
  let added = 0;
  for (const url of wanted) {
    if (await cache.match(url, { ignoreVary: true })) continue;
    await store(cache, url)
      .then(async () => (added += (await (await cache.match(url))?.blob())?.size || 0))
      .catch(() => {});
  }
  const info = offlineInfo();
  if (added && info) setInfo({ ...info, bytes: info.bytes + added });
  // carrega o leitor de PDF para a versão nova do app também ficar guardada
  import("pdfjs-dist").catch(() => {});
}

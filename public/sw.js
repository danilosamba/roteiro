// Service worker do modo offline. Só é registrado depois que a pessoa baixa o
// roteiro na guia Nós. Tudo fica num único cache, que lib/offline.ts preenche.
const CACHE = "roteiro-offline-v1";
const PHOTO_HOST = "dynamic-media-cdn.tripadvisor.com";
const NET_TIMEOUT = 3500; // sinal fraco na serra: depois disso usa o que está guardado

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// as fotos são usadas em 600, 1200 e 1400 px; guardamos só a de 1200
const photoKey = (url) => {
  const u = new URL(url);
  u.searchParams.set("w", "1200");
  return u.toString();
};

function timeout(ms) {
  return new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms));
}

// rede primeiro (com limite de tempo); sem rede, o que está no cache
async function networkFirst(req, key) {
  const cache = await caches.open(CACHE);
  try {
    const res = await Promise.race([fetch(req), timeout(NET_TIMEOUT)]);
    if (res.ok) cache.put(key, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(key, { ignoreVary: true });
    if (hit) return hit;
    throw err;
  }
}

// cache primeiro; o que vier da rede também fica guardado
async function cacheFirst(req, key, store = true) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(key, { ignoreVary: true });
  if (hit) return hit;
  const res = await fetch(req);
  if (store && res.ok) cache.put(key, res.clone());
  return res;
}

// ingresso: abre do cache; "Baixar" devolve o mesmo arquivo como download
async function attachment(url) {
  const view = url.origin + url.pathname;
  if (!url.searchParams.has("download")) return cacheFirst(view, view);
  try {
    return await fetch(url.toString());
  } catch (err) {
    const hit = await caches.match(view, { ignoreVary: true });
    if (!hit) throw err;
    const headers = new Headers(hit.headers);
    headers.set("content-disposition", (headers.get("content-disposition") || "").replace(/^inline/, "attachment"));
    return new Response(await hit.blob(), { headers });
  }
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.hostname === PHOTO_HOST) {
    const key = photoKey(req.url);
    e.respondWith(
      caches.match(key, { ignoreVary: true }).then((hit) => hit || fetch(req)),
    );
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    e.respondWith(networkFirst(req, "/"));
  } else if (url.pathname === "/api/items") {
    e.respondWith(networkFirst(req, "/api/items"));
  } else if (url.pathname.startsWith("/api/attachments/")) {
    e.respondWith(attachment(url));
  } else if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/pdf.worker.min.mjs" ||
    url.pathname === "/manifest.webmanifest" ||
    /^\/(icon|apple-touch-icon)/.test(url.pathname)
  ) {
    e.respondWith(cacheFirst(req, url.pathname + url.search));
  }
});

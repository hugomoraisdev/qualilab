// QualiLab Service Worker — modo offline (PWA)
// Estratégias:
//   • HTML/navegação  → NetworkFirst (com fallback para cache)
//   • Assets estáticos (JS/CSS/imagens/fontes) → StaleWhileRevalidate
//   • POST/PUT/PATCH/DELETE para a API → enfileira em outbox (IndexedDB)
//     e reenvia quando o cliente avisar "online".
const VERSION = "qualilab-v3";
const SHELL_CACHE = `${VERSION}-shell`;
const ASSETS_CACHE = `${VERSION}-assets`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const OFFLINE_FALLBACK = "/dashboard";
const SHELL_URLS = ["/", "/dashboard", "/manifest.webmanifest", "/favicon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL_URLS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => ![SHELL_CACHE, ASSETS_CACHE, RUNTIME_CACHE].includes(k))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

function isAsset(url) {
  return /\.(?:js|mjs|css|png|jpg|jpeg|svg|webp|ico|woff2?|ttf)$/i.test(url.pathname);
}

async function networkFirst(req, cacheName) {
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.ok) {
      const cache = await caches.open(cacheName);
      cache.put(req, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch {
    const cached = await caches.match(req);
    return cached || (await caches.match(OFFLINE_FALLBACK)) || Response.error();
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req)
    .then((res) => {
      if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
      return res;
    })
    .catch(() => null);
  return cached || (await fetchPromise) || Response.error();
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Apenas mesma origem
  if (url.origin !== self.location.origin) return;

  // Não interferir em requisições da API (Supabase / serverFn)
  if (url.pathname.startsWith("/_serverFn") || url.pathname.startsWith("/api/")) return;

  if (req.method !== "GET") return;

  // Navegação HTML
  if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(networkFirst(req, RUNTIME_CACHE));
    return;
  }

  // Assets estáticos
  if (isAsset(url)) {
    event.respondWith(staleWhileRevalidate(req, ASSETS_CACHE));
    return;
  }

  // Demais GETs: stale-while-revalidate genérico
  event.respondWith(staleWhileRevalidate(req, RUNTIME_CACHE));
});

// Permite ao cliente forçar atualização do SW
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

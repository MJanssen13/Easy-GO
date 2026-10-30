/*
 * Service worker do Easy-GO.
 * - Arquivos estáticos (/_next/static, ícones, imagens do partograma): cache.
 * - Páginas: sempre da rede. Sem conexão, só as FERRAMENTAS que funcionam no
 *   próprio aparelho (Pré-Natal, Receita, Documentos, CTG) abrem do cache;
 *   páginas de pacientes NÃO são servidas desatualizadas — mostram /offline.
 * - Nada que não seja GET (ex.: Server Actions) passa pelo cache.
 */
const VERSION = "easygo-v1";
const STATIC = `${VERSION}-static`;
const PAGES = `${VERSION}-pages`;
const OFFLINE_TOOLS = ["/pre-natal", "/ferramentas", "/ferramentas/receita", "/ferramentas/documentos", "/ferramentas/cardiotocografia", "/psgo/admissao"];
const PRECACHE = ["/offline", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Estáticos com hash no nome: cache primeiro.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/partograma/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Navegação: rede primeiro; offline → ferramenta em cache ou página /offline.
  if (req.mode === "navigate") {
    const isTool = OFFLINE_TOOLS.includes(url.pathname);
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (isTool && res.ok) {
            const copy = res.clone();
            caches.open(PAGES).then((c) => c.put(url.pathname, copy));
          }
          return res;
        })
        .catch(async () => (isTool && (await caches.match(url.pathname))) || (await caches.match("/offline")) || Response.error()),
    );
  }
});

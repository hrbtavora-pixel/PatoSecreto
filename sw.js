/* ===========================================================================
   Service Worker — Pato Secreto
   Estratégia:
     • HTML/navegação: network-first (online sempre traz a versão mais nova;
       offline cai no index.html em cache).
     • Mesmo domínio (ícones, manifest): cache-first.
     • Terceiros (fontes do Google): tenta rede e guarda; offline usa o cache.
   IMPORTANTE: ao publicar uma nova versão dos arquivos, troque CACHE_VERSION
   abaixo (ex.: v2) para forçar a atualização nos aparelhos já instalados.
   =========================================================================== */
const CACHE_VERSION = 'pato-secreto-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_VERSION)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

  // HTML -> network-first
  if (isHTML) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // mesmo domínio -> cache-first
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then((r) => r || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
        return res;
      }))
    );
    return;
  }

  // terceiros (fontes) -> rede e guarda; cai no cache se offline
  e.respondWith(
    fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req))
  );
});

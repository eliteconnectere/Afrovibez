const CACHE_NAME = "afrovibez-shell-v3";
const SHELL_URLS = ["/", "/settings", "/manifest.webmanifest"];
const FLAG_ORIGIN = "https://flagcdn.com";
async function cacheShellPage(cache, path) {
  try {
    const response = await fetch(new Request(path, { cache: "reload" }));
    if (!response.ok) return;
    await cache.put(path, response.clone());
    if (path === "/manifest.webmanifest") return;
    const html = await response.clone().text();
    const assets = Array.from(html.matchAll(/(?:src|href)=["']([^"']+)["']/g))
      .map(match => match[1]).filter(asset => asset.includes("/_next/static/"))
      .map(asset => new URL(asset, self.location.origin).href);
    await Promise.all(Array.from(new Set(assets)).map(async asset => {
      try { const assetResponse = await fetch(new Request(asset, { cache: "reload" })); if (assetResponse.ok) await cache.put(asset, assetResponse.clone()); } catch (_) {}
    }));
  } catch (_) {}
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(SHELL_URLS.map(path => cacheShellPage(cache, path)));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("afrovibez-") && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin === FLAG_ORIGIN && url.pathname.startsWith("/w40/")) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request.url);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok || response.type === "opaque") await cache.put(request.url, response.clone());
        return response;
      } catch (_) { return (await cache.match(request.url)) || Response.error(); }
    })());
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(url.pathname === "/settings" ? "/settings" : "/", response.clone());
        }
        return response;
      } catch (_) {
        return (await caches.match(request)) || (await caches.match(url.pathname === "/settings" ? "/settings" : "/"));
      }
    })());
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || ["/manifest.webmanifest"].includes(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch (_) { return cached || Response.error(); }
    })());
  }
});
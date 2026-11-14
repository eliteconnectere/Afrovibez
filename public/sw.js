const CACHE_NAME = "afrovibez-shell-v2";
const SHELL_URLS = ["/", "/settings", "/manifest.webmanifest"];
const FLAG_ORIGIN = "https://flagcdn.com";
const FLAG_CODES = "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(" ");

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

async function cacheCountryFlags(cache) {
  for (let index = 0; index < FLAG_CODES.length; index += 12) {
    await Promise.all(FLAG_CODES.slice(index, index + 12).map(async code => {
      const url = `${FLAG_ORIGIN}/w40/${code.toLowerCase()}.png`;
      try {
        if (await cache.match(url)) return;
        const response = await fetch(new Request(url, { mode: "no-cors", cache: "force-cache" }));
        if (response && (response.ok || response.type === "opaque")) await cache.put(url, response);
      } catch (_) {}
    }));
  }
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(SHELL_URLS.map(path => cacheShellPage(cache, path)));
    await cacheCountryFlags(cache);
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
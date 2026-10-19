/* Servicio de fondo de la app: la hace instalable, la abre rápido y recibe los avisos */
const CACHE = "legends-cup-v2";
self.addEventListener("install", e => { self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin || u.pathname.startsWith("/api/")) return;   // Firebase y el resto, directos
  const img = /\.(webp|png|jpg|svg)$/.test(u.pathname);
  if (img) {   // fotos: primero la copia guardada (llevan ?v= para renovarse)
    e.respondWith(caches.open(CACHE).then(async c => { const hit = await c.match(r); if (hit) return hit;
      try { const res = await fetch(r); if (res.ok) c.put(r, res.clone()); return res; } catch (_) { return hit || Response.error(); } }));
    return;
  }
  // código: primero la red, así siempre se ve la última versión; si no hay red, la copia guardada
  e.respondWith(fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); } return res; })
    .catch(() => caches.match(r).then(h => h || (r.mode === "navigate" ? caches.match("./") : Response.error()))));
});
self.addEventListener("push", e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (_) { d = { title: "Legends Cup", body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || "Americana Legends Cup", {
    body: d.body || "", tag: d.tag || "liga", icon: "icon-192.png", badge: "icon-192.png", data: { url: d.url || "./" }, renotify: !!d.tag
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "./", self.registration.scope).href;
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const c of list) if ("focus" in c) { c.navigate && c.navigate(url); return c.focus(); }
    return clients.openWindow(url);
  }));
});

// SW disabled — auto-unregister on activate so stale frontend cache can't trap users.
self.addEventListener("install", (e) => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    try {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      for (const c of clients) {
        try { c.navigate(c.url); } catch (e) {}
      }
    } catch (e) { console.error("sw self-unregister:", e); }
  })());
});

// Pass-through: never intercept fetch
self.addEventListener("fetch", () => {});

// Network-first for the app shell so updates arrive; cache is the offline fallback. API calls are never cached.
const CACHE_NAME = "carl-shell-v10";
const SHELL_FILES = [
  "/", "/index.html", "/manifest.json", "/icon-192.png", "/icon-512.png",
  "/assets/css/tokens.css", "/assets/css/app.css",
  "/assets/js/main.js", "/assets/js/core/dom.js", "/assets/js/core/state.js", "/assets/js/core/api.js", "/assets/js/core/router.js",
  "/assets/js/ui/geometry.js", "/assets/js/ui/toast.js",
  "/assets/js/features/lines.js", "/assets/js/features/modes.js", "/assets/js/features/wins.js", "/assets/js/features/deadlines.js",
  "/assets/js/features/today.js", "/assets/js/features/ai.js", "/assets/js/features/focus.js", "/assets/js/features/timer.js",
  "/assets/js/features/braindump.js", "/assets/js/features/remind.js", "/assets/js/features/settings.js", "/assets/js/features/insights.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_FILES)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
    return;
  }
  event.respondWith(
    fetch(event.request)
      .then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true }).then(cached => cached || caches.match("/index.html")))
  );
});

self.addEventListener("push", event => {
  let data = { title: "Carl", body: "You have a reminder." };
  try { data = event.data.json(); } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title || "Don't forget", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      vibrate: [200, 100, 200],
      tag: "fuckadhd-reminder-" + Date.now(),
      requireInteraction: true
    })
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }
      return clients.openWindow("/");
    })
  );
});

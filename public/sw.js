/* Notifications only: never cache private pages, Auth responses or API requests. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("push", event => {
  let payload;
  try { payload = event.data?.json(); } catch { /* Still show a visible fallback. */ }
  const title = typeof payload?.title === "string" ? payload.title : "Jadwal ekstrakurikuler";
  event.waitUntil(self.registration.showNotification(title, {
    body: typeof payload?.body === "string" ? payload.body : "Buka portal untuk melihat jadwal kegiatan.",
    icon: "/push-icon-192.png",
    tag: typeof payload?.tag === "string" ? payload.tag : "jadwal-ekstrakurikuler",
    data: { url: typeof payload?.url === "string" ? payload.url : "/?view=dashboard" },
  }));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  let url = new URL("/?view=dashboard", self.location.origin);
  try {
    const requested = new URL(event.notification.data?.url || "/?view=dashboard", self.location.origin);
    if (requested.origin === self.location.origin) url = requested;
  } catch { /* Ignore malformed notification links. */ }
  // Preserve unfinished assessment/report forms in existing tabs.
  event.waitUntil(self.clients.openWindow(url.href));
});

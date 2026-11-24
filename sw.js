const CACHE = "misul-v3";
const SHELL = ["./", "index.html", "styles.css", "app.js", "i18n.js", "api.js", "push.js", "config.js", "icons/logo.jpg"];

// 푸시 알림: 앱이 꺼져 있을 때 도착한 메시지를 표시
try {
  importScripts("config.js", "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js", "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");
  const F = self.APP_CONFIG && self.APP_CONFIG.FIREBASE;
  if (F && F.apiKey) {
    firebase.initializeApp(F);
    firebase.messaging().onBackgroundMessage((p) => {
      const d = p.data || {};
      self.registration.showNotification(d.title || "미술시간", { body: d.body || "", icon: "icons/logo.jpg", badge: "icons/logo.jpg" });
    });
  }
} catch (e) {}

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    const c = list.find((w) => w.url.startsWith(self.registration.scope));
    return c ? c.focus() : clients.openWindow(self.registration.scope);
  }));
});

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 앱 파일은 네트워크 우선(항상 최신), 실패 시 캐시. API 요청은 건드리지 않음.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req))
  );
});

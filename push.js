// 푸시 알림(FCM) 클라이언트. 설정이 비어 있거나 지원하지 않는 환경이면 조용히 꺼져 있어요.
(() => {
  const cfg = self.APP_CONFIG || {};
  const F = cfg.FIREBASE || {};
  const configured = !!(cfg.API_URL && F.apiKey && F.projectId && F.messagingSenderId && F.appId && cfg.VAPID_KEY);
  const hasPush = "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const FB = "https://www.gstatic.com/firebasejs/10.12.2/";
  let messaging;

  const load = (src) => new Promise((ok, no) => {
    const s = document.createElement("script");
    s.src = src; s.onload = ok; s.onerror = () => no(new Error("알림 모듈을 불러오지 못했어요."));
    document.head.appendChild(s);
  });

  async function getMessaging() {
    if (messaging) return messaging;
    if (!window.firebase) { await load(FB + "firebase-app-compat.js"); await load(FB + "firebase-messaging-compat.js"); }
    if (!firebase.apps.length) firebase.initializeApp(F);
    messaging = firebase.messaging();
    messaging.onMessage(async (p) => {
      const d = p.data || {};
      const reg = await navigator.serviceWorker.ready;
      reg.showNotification(d.title || "미술시간", { body: d.body || "", icon: "icons/logo.jpg" });
    });
    return messaging;
  }

  async function token() {
    const reg = await navigator.serviceWorker.ready;
    return (await getMessaging()).getToken({ vapidKey: cfg.VAPID_KEY, serviceWorkerRegistration: reg });
  }

  window.PUSH = {
    configured,
    supported: configured && hasPush,
    needsInstall: configured && !hasPush && ios,
    enabled: () => !!localStorage.getItem("push_token") && hasPush && Notification.permission === "granted",
    async enable() {
      if (await Notification.requestPermission() !== "granted") throw new Error("알림이 차단돼 있어요. 기기 설정에서 허용해 주세요.");
      const t = await token();
      if (!t) throw new Error("알림을 켜지 못했어요. 잠시 후 다시 시도해 주세요.");
      await api("pushRegister", { token: t });
      localStorage.setItem("push_token", t);
    },
    disable() {
      const t = localStorage.getItem("push_token");
      localStorage.removeItem("push_token");
      return t ? api("pushUnregister", { token: t }).catch(() => {}) : Promise.resolve();
    },
    async sync() {
      if (!this.enabled()) return;
      const t = await token();
      if (t && t !== localStorage.getItem("push_token")) { await api("pushRegister", { token: t }); localStorage.setItem("push_token", t); }
    },
  };
})();

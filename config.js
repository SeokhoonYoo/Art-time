// Apps Script 웹 앱 배포 URL을 넣으면 실제 구글 시트와 연결됩니다.
// 비워두면 브라우저 안의 체험용(데모) 데이터로 동작합니다.
// FIREBASE / VAPID_KEY 를 채우면 푸시 알림을 쓸 수 있어요. (비워두면 알림 메뉴가 숨겨져요)
self.APP_CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbxVnuczBrA_ktcAyV43ZiqK4W1yLo81nLjny0v52dZY9O_XO7akm0S8eL5XVIZfWqQluQ/exec",
  FIREBASE: {
    apiKey: "AIzaSyCSiybSySWXsrFvwgQILiI4o9FX9NVGl2A",
    authDomain: "arttime-c1b93.firebaseapp.com",
    projectId: "arttime-c1b93",
    messagingSenderId: "359083547246",
    appId: "1:359083547246:web:641856e859ece976afe47f"
  },
  VAPID_KEY: "BEuIxJH6qMFz-eCfix80MN9mB6MHkk-1l3WOy73I4MiS-IwQ_wAdrFBFIFysL7uO3FSeE_SfR3m3Imb19MeZxEA"
};

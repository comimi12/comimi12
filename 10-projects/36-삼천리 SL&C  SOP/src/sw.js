/* 오프라인 지원: 앱 껍데기와 자료를 캐시에 두고, 사진은 열어본 것만 담아 둔다.
   매장 와이파이가 끊겨도 학습을 이어갈 수 있게 하는 것이 목적. */
var V = 'slnc-sop-v1';
var SHELL = ['./', './index.html', './style.css', './app.js', './data.json', './manifest.webmanifest'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(V).then(function (c) { return c.addAll(SHELL); }).then(function () {
    return self.skipWaiting();
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== V; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // 앱 파일은 네트워크 우선(배포 즉시 반영), 실패하면 캐시
  if (SHELL.some(function (p) { return req.url.indexOf(p.replace('./', '')) >= 0; })) {
    e.respondWith(fetch(req).then(function (r) {
      var cp = r.clone();
      caches.open(V).then(function (c) { c.put(req, cp); });
      return r;
    }).catch(function () { return caches.match(req); }));
    return;
  }
  // 사진은 캐시 우선
  e.respondWith(caches.match(req).then(function (hit) {
    return hit || fetch(req).then(function (r) {
      var cp = r.clone();
      caches.open(V).then(function (c) { c.put(req, cp); });
      return r;
    });
  }));
});

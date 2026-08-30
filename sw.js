/* 토닥+ 서비스워커
 *
 * 목적은 하나 — 학교 와이파이가 끊겨도 앱이 열리게 하는 것.
 *
 * 화면(HTML)은 network-first: 온라인이면 항상 최신을 보여주고, 끊기면 캐시로 넘어간다.
 * 아이콘·매니페스트는 cache-first: 바뀔 일이 없으니 매번 받을 이유가 없다.
 *
 * 주의: 서비스워커는 https 또는 localhost에서만 등록된다.
 *      index.html을 file://로 직접 열면 등록이 조용히 건너뛰어지고,
 *      앱은 서비스워커 없이 그대로 동작한다 (데이터는 localStorage에 있다).
 *
 * 앱을 고친 뒤에는 CACHE 값을 올려야 이전 캐시가 정리된다.
 */
const CACHE = 'todak-v9';

const ASSETS = [
  './',
  './index.html',
  './app.html',
  './manifest.webmanifest',
  './manifest-app.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-64.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      // 하나가 404여도 설치 자체는 끝나야 한다 — 아이콘 하나 때문에 앱이 안 깔리면 곤란하다
      .then(cache => Promise.allSettled(ASSETS.map(url => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function putInCache(request, response) {
  if (!response || !response.ok) return;
  if (new URL(request.url).origin !== self.location.origin) return;
  const copy = response.clone();
  caches.open(CACHE).then(cache => cache.put(request, copy));
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  // 화면 이동: 최신 우선, 실패하면 캐시된 앱을 띄운다
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => { putInCache(request, response); return response; })
        .catch(() => caches.match(request).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  // 그 밖의 정적 파일: 캐시 우선
  event.respondWith(
    caches.match(request).then(hit =>
      hit || fetch(request).then(response => { putInCache(request, response); return response; })
    )
  );
});

// オフラインで使えるよう、アプリ一式をキャッシュする。コードや教材を変えたら CACHE の番号を上げる。
const CACHE = 'inu-shoku-v1';
const FILES = [
  './',
  'index.html',
  'css/style.css',
  'manifest.json',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'js/app.js',
  'js/lib/safestorage.js',
  'js/lib/progress.js',
  'js/lib/content.js',
  'js/lib/markup.js',
  'js/lib/srs.js',
  'js/lib/quiz.js',
  'js/lib/calc.js',
  'js/data/part1.js',
  'js/data/part2.js',
  'js/data/part3.js',
  'js/data/cases.js',
  'js/views/read.js',
  'js/views/cards.js',
  'js/views/test.js',
  'js/views/cases.js',
  'js/views/tools.js',
];

self.addEventListener('install', (ev) => {
  // HTTP キャッシュに残った古いファイルを拾わないよう、取り直して入れる
  ev.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (ev) => {
  if (ev.request.method !== 'GET') return;
  ev.respondWith(caches.match(ev.request, { ignoreSearch: true }).then((hit) => hit || fetch(ev.request)));
});

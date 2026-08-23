const CACHE_NAME = 'kinokonun-cache-v1';

// アプリの起動に必須な最小限のファイルだけを事前キャッシュする
// (画像・音声などの大容量アセットはアクセス時にキャッシュする)
const CORE_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './js/libs/pixi.js',
    './js/libs/pixi-tilemap.js',
    './js/libs/pixi-picture.js',
    './js/libs/fpsmeter.js',
    './js/libs/lz-string.js',
    './js/libs/iphone-inline-video.browser.js',
    './js/rpg_core.js',
    './js/rpg_managers.js',
    './js/rpg_objects.js',
    './js/rpg_scenes.js',
    './js/rpg_sprites.js',
    './js/rpg_windows.js',
    './js/plugins.js',
    './js/plugins/TouchControls.js',
    './js/main.js',
    './fonts/gamefont.css',
    './icon/icon-192.png',
    './icon/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

// キャッシュ優先、なければネットワークから取得して以後キャッシュする
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;

            return fetch(event.request)
                .then((response) => {
                    if (
                        response &&
                        response.status === 200 &&
                        response.type === 'basic'
                    ) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => cached);
        })
    );
});

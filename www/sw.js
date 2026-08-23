const CACHE_NAME = 'kinokonun-cache-v2';

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
    './js/plugins/MobileEnhancements.js',
    './js/plugins/MobileEnhancements2.js',
    './js/main.js',
    './fonts/gamefont.css',
    './icon/icon-192.png',
    './icon/icon-512.png'
];

// コード系ファイル（HTML/JS/JSON/CSS）は「常に最新を優先」する。
// 更新のたびにブラウザ側の古いキャッシュを掴み続ける問題を防ぐため。
const NETWORK_FIRST_EXTENSIONS = ['.html', '.js', '.json', '.css'];

function isNetworkFirst(url) {
    return NETWORK_FIRST_EXTENSIONS.some((ext) => url.pathname.endsWith(ext)) ||
        url.pathname.endsWith('/');
}

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

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);

    if (isNetworkFirst(url)) {
        // ネットワーク優先: まずサーバーから最新を取りに行き、
        // 取れた場合はキャッシュを更新。オフライン時のみキャッシュを使う。
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response && response.status === 200 && response.type === 'basic') {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // 画像・音声などの重いアセットはキャッシュ優先（オフライン再生・高速化のため）
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


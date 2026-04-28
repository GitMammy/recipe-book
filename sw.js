// ===== sw.js =====
// Service Worker for おかしなぺぇじ PWA
// キャッシュバージョン（更新時はここを変える）
const CACHE_VERSION = 'v2';
const CACHE_NAME = `okashi-page-${CACHE_VERSION}`;

// キャッシュするファイル一覧（アプリの骨格）
const PRECACHE_URLS = [
  '/recipe-book/',
  '/recipe-book/index.html',
  '/recipe-book/js/config.js',
  '/recipe-book/js/utils.js',
  '/recipe-book/js/storage.js',
  '/recipe-book/js/notes.js',
  '/recipe-book/js/recipe_edit.js',
  '/recipe-book/js/tips.js',
  '/recipe-book/js/recipes.js',
  '/recipe-book/js/ui.js',
  '/recipe-book/icon-192.png',
  '/recipe-book/icon-512.png',
];

// インストール時：静的ファイルをキャッシュ
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// アクティベート時：古いキャッシュを削除
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// フェッチ時のキャッシュ戦略
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Supabase へのリクエスト（レシピデータ・写真）はネット優先
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // オフライン時はキャッシュから返す（なければエラー）
        return caches.match(event.request);
      })
    );
    return;
  }

  // CDN（Supabase JS SDK など）もネット優先
  if (url.hostname.includes('jsdelivr.net') || url.hostname.includes('cdn.')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // アプリ本体のファイル：キャッシュ優先（オフライン対応）
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        // 正常レスポンスはキャッシュに追加
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return res;
      });
    })
  );
});

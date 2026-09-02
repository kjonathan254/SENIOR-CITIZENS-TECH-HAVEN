// Senior Citizens Tech Haven — Service Worker (v6)
const CACHE_NAME = 'seniors-tech-haven-v7';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icon/icon-192x192.png',
  '/icon/icon-512x512.png',
  '/favicon.ico'
];

const PRECACHE_IMAGES = [
  '/images/homepage-couple-learning.webp',
  '/images/homepage-family-whatsapp.webp'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll([...PRECACHE_URLS, ...PRECACHE_IMAGES]))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Only handle same-origin http(s) requests. Let the browser handle
  // everything else natively (browser-extension requests, cross-origin
  // third-party scripts like AdSense, etc.) — the Cache API throws on
  // unsupported schemes like chrome-extension:, and intercepting
  // cross-origin ad/analytics requests here just breaks them.
  let url;
  try {
    url = new URL(req.url);
  } catch (e) {
    return;
  }
  if (!/^https?:$/.test(url.protocol)) return;
  if (url.origin !== self.location.origin) return;

  const isHTMLPage = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

  if (isHTMLPage) {
    event.respondWith(
      fetch(req).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        return res;
      }).catch(() => caches.match('/offline.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return networkResponse;
      }).catch(() => {
        if (req.destination === 'image') return caches.match('/icon/icon-192x192.png');
        return new Response('', { status: 504, statusText: 'Offline' });
      });
    })
  );
});

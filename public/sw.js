/* Home Care service worker: app shell + static asset caching. API calls are never cached. */
const VERSION = 'hc-v3';
const SHELL = `${VERSION}-shell`;
const ASSETS = `${VERSION}-assets`;
const PRECACHE = ['/', '/offline.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/brand/logo.png', '/brand/emblem.png'];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
            .then(() => self.clients.claim()),
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);

    // Live data and private documents always go to the network.
    if (url.origin === location.origin && (url.pathname.startsWith('/api/') || url.pathname === '/up')) return;

    // Page navigations: network first (fresh HTML / asset hashes), cached shell when offline.
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req)
                .then((res) => {
                    const copy = res.clone();
                    caches.open(SHELL).then((c) => c.put('/', copy));
                    return res;
                })
                .catch(async () => (await caches.match('/')) || caches.match('/offline.html')),
        );
        return;
    }

    // Hashed build files, icons and fonts: cache first.
    const cacheable =
        (url.origin === location.origin && (url.pathname.startsWith('/build/') || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/brand/'))) ||
        url.hostname === 'fonts.googleapis.com' ||
        url.hostname === 'fonts.gstatic.com';
    if (!cacheable) return;

    event.respondWith(
        caches.match(req).then(
            (hit) =>
                hit ||
                fetch(req).then((res) => {
                    if (res.ok || res.type === 'opaque') {
                        const copy = res.clone();
                        caches.open(ASSETS).then((c) => c.put(req, copy));
                    }
                    return res;
                }),
        ),
    );
});

/* Web Push: show the notification even when the app is closed. */
self.addEventListener('push', (event) => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch {
        data = { title: 'Yours Home Healthcare', body: event.data ? event.data.text() : '' };
    }
    event.waitUntil(
        self.registration.showNotification(data.title || 'Yours Home Healthcare', {
            body: data.body || '',
            icon: data.icon || '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            tag: data.tag,
            renotify: !!data.tag,
            vibrate: [120, 60, 120],
            data: { url: data.url || '/' },
        }),
    );
});

/* Tap on a notification: focus an open app window (and go to the page) or open a new one. */
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
            for (const w of wins) {
                if (w.url.startsWith(self.location.origin) && 'focus' in w) {
                    w.navigate(url);
                    return w.focus();
                }
            }
            return self.clients.openWindow(url);
        }),
    );
});

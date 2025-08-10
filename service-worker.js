// service-worker.js

let CACHE_NAME; // Will be set dynamically from app-config.json

const urlsToCache = [
    '/mcore/',
    '/mcore/index.html',
    '/mcore/css/style.css',
    '/mcore/js/app.js',
    '/mcore/data/events.json',
    '/mcore/data/acronyms.json',
    '/mcore/data/resources.json',
    '/mcore/manifest.json',
    '/mcore/data/app-config.json',
    '/mcore/icons/mcore-logo.png',
    '/mcore/icons/mcore-logo-fallback.png',
    '/mcore/icons/android-chrome-192x192.png',
    '/mcore/icons/android-chrome-512x512.png',
    '/mcore/icons/apple-touch-icon.png',
    '/mcore/icons/favicon-32x32.png',
    '/mcore/icons/favicon-16x16.png',
    '/mcore/favicon.ico',
    '/mcore/icons/us.png',
    '/mcore/icons/money-stack250.png',
    '/mcore/icons/light-mode.png',
    '/mcore/icons/dark-mode.png',
    // Holiday Icons
    '/mcore/icons/new-year-day.png',
    '/mcore/icons/martin-luther-king-jr-day.png',
    '/mcore/icons/washingtons-birthday-day.png',
    '/mcore/icons/memorial-day.png',
    '/mcore/icons/juneteenth-day.png',
    '/mcore/icons/independence-day.png',
    '/mcore/icons/labor-day.png',
    '/mcore/icons/columbus-day.png',
    '/mcore/icons/veterans-day.png',
    '/mcore/icons/thanksgiving-day.png',
    '/mcore/icons/christmas-day.png',
    // Season Icons
    '/mcore/icons/spring.png',
    '/mcore/icons/summer.png',
    '/mcore/icons/fall.png',
    '/mcore/icons/winter.png',
    // Other Event Icons
    '/mcore/icons/summer-sol.png',
    '/mcore/icons/winter-sol.png',
    '/mcore/icons/saving.png',
    '/mcore/icons/food-drive.png'
];

// Listen for a message from the client to skip waiting.
self.addEventListener('message', (event) => {
    if (event.data && event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});

self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    // The cache name is now set via a query parameter on the SW file itself
    const url = new URL(location);
    const version = url.searchParams.get('v');
    if (version) {
        CACHE_NAME = `mcore-cache-v${version}`;
    }

    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log(`Service Worker: Caching App Shell for version ${version}`);
            return cache.addAll(urlsToCache);
        }).then(() => {
            // Force the waiting service worker to become the active service worker.
            return self.skipWaiting();
        })
    );
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            ).then(() => {
                // Tell the active service worker to take control of the page immediately.
                return self.clients.claim();
            });
        })
    );
});

self.addEventListener('fetch', (event) => {
    // Use a cache-first strategy.
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request).then((fetchResponse) => {
                // Optionally, you could add non-essential assets to the cache here as they are requested.
                return fetchResponse;
            });
        }).catch(() => {
            // Fallback for navigation requests when offline.
            if (event.request.mode === 'navigate') {
                return caches.match('/mcore/index.html');
            }
        })
    );
});

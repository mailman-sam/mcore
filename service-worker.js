// service-worker.js

let CACHE_NAME; // Will be set dynamically from app-config.json

const urlsToCache = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/app.js',
    '/data/events.json',
    '/data/acronyms.json',
    '/data/resources.json',
    '/manifest.json',
    '/data/app-config.json',
    '/icons/mcore-logo.png',
    '/icons/mcore-logo-fallback.png',
    '/icons/android-chrome-192x192.png',
    '/icons/android-chrome-512x512.png',
    '/icons/apple-touch-icon.png',
    '/icons/favicon-32x32.png',
    '/icons/favicon-16x16.png',
    '/favicon.ico',
    '/icons/us.png',
    '/icons/money-stack250.png',
    '/icons/light-mode.png',
    '/icons/dark-mode.png',
    // Holiday Icons
    '/icons/new-year-day.png',
    '/icons/martin-luther-king-jr-day.png',
    '/icons/washingtons-birthday-day.png',
    '/icons/memorial-day.png',
    '/icons/juneteenth-day.png',
    '/icons/independence-day.png',
    '/icons/labor-day.png',
    '/icons/columbus-day.png',
    '/icons/veterans-day.png',
    '/icons/thanksgiving-day.png',
    '/icons/christmas-day.png',
    // Season Icons
    '/icons/spring.png',
    '/icons/summer.png',
    '/icons/fall.png',
    '/icons/winter.png',
    // Other Event Icons
    '/icons/summer-sol.png',
    '/icons/winter-sol.png',
    '/icons/saving.png',
    '/icons/food-drive.png'
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
                return caches.match('/index.html');
            }
        })
    );
});

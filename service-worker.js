// Define a cache name for your application assets
const CACHE_NAME = 'mcore-cache-v11'; // UPDATED: Increment cache version for manifest consolidation and icon paths

// List of URLs to cache during installation
// Ensure these paths are correct relative to the service-worker.js file (root of 'mcore/')
const urlsToCache = [
    '/mcore/', // Caches the index.html served from /mcore/
    '/mcore/index.html',
    '/mcore/css/style.css',
    '/mcore/js/app.js',
    '/mcore/data/holidays.json',
    '/mcore/manifest.json', // UPDATED: Path to consolidated manifest
    'https://cdn.tailwindcss.com', // Tailwind CSS CDN
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap', // Inter font CSS
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css', // Font Awesome CSS
    '/mcore/icons/mcore-logo.png',
    '/mcore/icons/android-chrome-192x192.png',
    '/mcore/icons/android-chrome-512x512.png',
    '/mcore/icons/apple-touch-icon.png',
    '/mcore/icons/favicon-32x32.png',
    '/mcore/icons/favicon-16x16.png',
    '/mcore/favicon.ico' // Favicon.ico
];

// --- Install Event ---
// This event is fired when the service worker is first registered.
// It's used to populate the cache with essential app shell assets.
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching App Shell');
                const filteredUrlsToCache = urlsToCache.filter(url => url !== '/mcore/service-worker.js' && url !== 'service-worker.js');
                return cache.addAll(filteredUrlsToCache);
            })
            .catch(error => {
                console.error('Service Worker: Cache addAll failed', error);
            })
    );
});

// --- Activate Event ---
// This event is fired when the service worker is activated.
// It's typically used to clean up old caches.
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
            );
        })
    );
    return self.clients.claim();
});

// --- Fetch Event ---
// This event intercepts network requests and serves content from the cache if available.
self.addEventListener('fetch', (event) => {
    if (event.request.url.startsWith('http') || event.request.url.startsWith('https')) {
        event.respondWith(
            caches.match(event.request)
                .then((response) => {
                    if (response) {
                        return response;
                    }
                    return fetch(event.request)
                        .then((networkResponse) => {
                            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                                return networkResponse;
                            }
                            const responseToCache = networkResponse.clone();

                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(event.request, responseToCache);
                                });

                            return networkResponse;
                        })
                        .catch(() => {
                            if (event.request.mode === 'navigate' || event.request.destination === 'document') {
                                return new Response('<h1>You are offline!</h1><p>Please check your internet connection.</p>', {
                                    headers: { 'Content-Type': 'text/html' }
                                });
                            }
                            return new Response(null, { status: 503, statusText: 'Service Unavailable - Offline' });
                        });
                })
        );
    }
});

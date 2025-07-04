// Define a cache name for your application assets
// This value is dynamically pulled from app-config.json
let CACHE_NAME = 'mcore-cache-dynamic'; // Default, will be updated on fetch

const urlsToCache = [
    '/mcore/', // Caches the base URL for the app
    '/mcore/index.html',
    '/mcore/css/style.css',
    '/mcore/js/app.js',
    '/mcore/data/holidays.json',
    '/mcore/data/acronyms.json',
    '/mcore/data/nalc-resources.json',
    '/mcore/manifest.json',
    '/mcore/data/app-config.json', 
    'https://cdn.tailwindcss.com', // External CDN
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap', // External CDN
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css', // External CDN
    '/mcore/icons/mcore-logo.png',
    '/mcore/icons/android-chrome-192x192.png',
    '/mcore/icons/android-chrome-512x512.png',
    '/mcore/icons/apple-touch-icon.png',
    '/mcore/icons/favicon-32x32.png',
    '/mcore/icons/favicon-16x16.png',
    '/mcore/favicon.ico'
];

// --- Install Event ---
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        // Fetch app-config.json to get the dynamic cache version
        fetch('/mcore/data/app-config.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(config => {
                CACHE_NAME = `mcore-cache-v${config.cacheVersion}`;
                console.log(`Service Worker: Using dynamic cache name: ${CACHE_NAME}`);
                return caches.open(CACHE_NAME);
            })
            .then((cache) => {
                console.log('Service Worker: Caching App Shell');
                const filteredUrlsToCache = urlsToCache.filter(url => 
                    !url.includes('service-worker.js')
                );
                return cache.addAll(filteredUrlsToCache);
            })
            .catch(error => {
                console.error('Service Worker: Cache install failed:', error);
                // Fallback to a default cache name if config fetch fails
                CACHE_NAME = 'mcore-cache-fallback';
                return caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache.filter(url => !url.includes('service-worker.js'))));
            })
    );
});

// --- Activate Event ---
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

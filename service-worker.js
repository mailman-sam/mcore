// Define a cache name for your application assets
const CACHE_NAME = 'mcore-cache-v8'; // No change needed for this specific update

// List of URLs to cache during installation
// Ensure these paths are correct relative to the service-worker.js file (root of 'mcore/')
const urlsToCache = [
    '/', // Caches the index.html
    'index.html',
    'css/style.css',
    'js/app.js',
    'data/holidays.json',
    '/manifest.json',
    'https://cdn.tailwindcss.com', // Tailwind CSS CDN
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap', // Inter font CSS
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css', // Font Awesome CSS
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    '/icons/mcore-logo.png'
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
                // Filter out the service worker itself if it were accidentally listed explicitly
                const filteredUrlsToCache = urlsToCache.filter(url => url !== 'service-worker.js' && url !== '/service-worker.js');
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
                    if (cacheName !== CACHE_NAME) { // Delete old caches that don't match the current CACHE_NAME
                        console.log('Service Worker: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // Ensure that the service worker takes control of the page as soon as it's activated
    return self.clients.claim();
});

// --- Fetch Event ---
// This event intercepts network requests and serves content from the cache if available.
self.addEventListener('fetch', (event) => {
    // Only handle HTTP/HTTPS requests, not chrome-extension:// or other protocols
    if (event.request.url.startsWith('http') || event.request.url.startsWith('https')) {
        event.respondWith(
            caches.match(event.request)
                .then((response) => {
                    // Cache hit - return response from cache
                    if (response) {
                        return response;
                    }
                    // No cache hit - fetch from network
                    return fetch(event.request)
                        .then((networkResponse) => {
                            // Check if we received a valid response
                            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                                return networkResponse;
                            }
                            // IMPORTANT: Clone the response.
                            const responseToCache = networkResponse.clone();

                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(event.request, responseToCache);
                                });

                            return networkResponse;
                        })
                        .catch(() => {
                            // Fallback for when both cache and network fail (e.g., offline)
                            // If the request is for an HTML page, serve a generic offline page.
                            // For other assets, the browser's default offline behavior might suffice.
                            if (event.request.mode === 'navigate' || event.request.destination === 'document') {
                                return new Response('<h1>You are offline!</h1><p>Please check your internet connection.</p>', {
                                    headers: { 'Content-Type': 'text/html' }
                                });
                            }
                            // For other types of requests (e.g., CSS, JS), return a rejected Promise or a network error.
                            return new Response(null, { status: 503, statusText: 'Service Unavailable - Offline' });
                        });
                })
        );
    }
});

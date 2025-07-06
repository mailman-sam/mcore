// Define a cache name for your application assets
// This value is dynamically pulled from app-config.json
let CACHE_NAME = 'mcore-cache-dynamic'; // Default, will be updated on fetch

// List of URLs to cache (app shell).
// Paths are now relative to the service worker's scope, which is the base of the app.
const urlsToCache = [
    './', // Represents the root of your application (e.g., /mcore/)
    './index.html',
    './css/style.css',
    './js/app.js',
    './data/holidays.json',
    './data/acronyms.json',
    './data/nalc-resources.json',
    './manifest.json',
    './data/app-config.json',
    './fontawesome/css/all.min.css',
    './icons/mcore-logo.png',
    './icons/android-chrome-192x192.png',
    './icons/android-chrome-512x512.png',
    './icons/apple-touch-icon.png',
    './icons/favicon-32x32.png',
    './icons/favicon-16x16.png',
    './favicon.ico'
];

// --- Install Event ---
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        // Fetch app-config.json to get the dynamic cache version
        // Path is now relative to the service worker's location
        fetch('data/app-config.json')
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
                // Filter out the service worker itself from being cached by itself
                const filteredUrlsToCache = urlsToCache.filter(url => 
                    !url.includes('service-worker.js')
                );
                return cache.addAll(filteredUrlsToCache);
            })
            .catch(error => {
                console.error('Service Worker: Cache install failed:', error);
                // Fallback to a default cache name if config fetch fails or network issues
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
                    // Delete old caches that do not match the current CACHE_NAME
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // Ensure the service worker takes control of clients immediately
    return self.clients.claim();
});

// --- Fetch Event ---
self.addEventListener('fetch', (event) => {
    // Only handle http(s) requests, ignore chrome-extension:// and other non-standard requests
    if (event.request.url.startsWith('http') || event.request.url.startsWith('https')) {
        event.respondWith(
            caches.match(event.request) // Try to find the request in the cache
                .then((response) => {
                    if (response) {
                        // If found in cache, return it
                        return response;
                    }
                    // If not in cache, fetch from network
                    return fetch(event.request)
                        .then((networkResponse) => {
                            // Check if the network response is valid
                            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                                return networkResponse;
                            }
                            // Clone the response because it's a stream and can only be consumed once
                            const responseToCache = networkResponse.clone();

                            // Open the current cache and put the network response into it
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(event.request, responseToCache);
                                });

                            // Return the original network response
                            return networkResponse;
                        })
                        .catch(() => {
                            // If network fetch fails (e.g., offline)
                            // For navigation requests (HTML pages), serve an offline page
                            if (event.request.mode === 'navigate' || event.request.destination === 'document') {
                                return new Response('<h1>You are offline!</h1><p>Please check your internet connection.</p>', {
                                    headers: { 'Content-Type': 'text/html' }
                                });
                            }
                            // For other requests (e.g., assets), return a service unavailable response
                            return new Response(null, { status: 503, statusText: 'Service Unavailable - Offline' });
                        });
                })
        );
    }
});

// service-worker.js

// --- Cache Setup ---
let CACHE_NAME = 'mcore-cache-dynamic';
const urlsToCache = [
    '/mcore/',
	'/mcore/index.html',
    '/mcore/css/style.css',
    '/mcore/js/app.js',
    '/mcore/data/events.json',
    '/mcore/data/user-control.json',
    '/mcore/data/acronyms.json',
    '/mcore/data/resources.json',
    '/mcore/manifest.json',
    '/mcore/data/app-config.json',
    '/mcore/fontawesome/css/all.min.css',
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
	'/mcore/icons/download-sm.png',
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

// --- Install Event ---
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        fetch(`/mcore/data/app-config.json?_=${new Date().getTime()}`)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const configResponse = response.clone();
                return configResponse.json().then(config => {
                    CACHE_NAME = `mcore-cache-v${config.cacheVersion}`;
                    console.log(`Service Worker: Using dynamic cache name: ${CACHE_NAME}`);
                    return caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, response);
                        return cache;
                    });
                });
            })
            .then((cache) => {
                console.log('Service Worker: Caching App Shell');
                const filteredUrlsToCache = urlsToCache.filter(url => !url.includes('service-worker.js'));
                return Promise.allSettled(
                    filteredUrlsToCache.map(url => {
                        return fetch(url, { cache: 'no-cache' }).then(response => {
                            if (!response.ok) {
                                console.warn(`Service Worker: Failed to fetch ${url} (Status: ${response.status})`);
                                return Promise.reject(new Error(`Failed to fetch ${url}`));
                            }
                            const responseToCache = response.clone();
                            return cache.put(url, responseToCache);
                        }).then(() => {
                            console.log(`Service Worker: Successfully cached ${url}`);
                        }).catch(error => {
                            console.error(`Service Worker: Failed to cache ${url}:`, error);
                            return Promise.reject(error);
                        });
                    })
                ).then(results => {
                    results.forEach(result => {
                        if (result.status === 'rejected') {
                            console.error('Service Worker: Caching item rejected:', result.reason);
                        }
                    });
                });
            })
            .catch(error => {
                console.error('Service Worker: Overall Cache install failed:', error);
                CACHE_NAME = 'mcore-cache-fallback-v1';
                console.warn('Service Worker: Attempting fallback cache due to previous failure.');
                return caches.open(CACHE_NAME).then(cache => {
                    return Promise.allSettled(
                        urlsToCache.filter(url => !url.includes('service-worker.js')).map(url => {
                            return fetch(url, { cache: 'no-cache' }).then(response => {
                                if (!response.ok) {
                                    console.warn(`Service Worker: Fallback cache failed to fetch ${url} (Status: ${response.status})`);
                                    return Promise.reject(new Error(`Fallback: Failed to fetch ${url}`));
                                }
                                const responseToCache = response.clone();
                                return cache.put(url, responseToCache);
                            }).then(() => {
                                console.log(`Service Worker: Fallback: Successfully cached ${url}`);
                            }).catch(error => {
                                console.error(`Service Worker: Fallback: Failed to cache ${url}:`, error);
                                return Promise.reject(error);
                            });
                        })
                    );
                });
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
                    if (response) return response;
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

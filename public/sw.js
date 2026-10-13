// Enhanced PWA Service Worker for WebNegosyo Management
// Provides offline-first experience with smart caching strategies
const CACHE_VERSION = 'v3';
const CACHE_SHELL = `webnegosyo-shell-${CACHE_VERSION}`;
const CACHE_STATIC = `webnegosyo-static-${CACHE_VERSION}`;
const CACHE_DYNAMIC = `webnegosyo-dynamic-${CACHE_VERSION}`;

// Core app shell files that need to be available offline
const SHELL_FILES = [
    '/',
    '/manifest.webmanifest',
    '/logo-mark.png',
    '/logo-full.png',
    '/favicon.png',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/icon-maskable-512.png',
    '/icons/apple-touch-icon.png'
];

// External resources that should never be cached (Supabase, APIs)
const NETWORK_ONLY = [
    'supabase.co',
    'supabase.io',
    'api.',
    '/api/'
];

// Install event: cache core app shell
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    event.waitUntil(
        caches.open(CACHE_SHELL)
            .then((cache) => {
                console.log('[SW] Caching app shell');
                return cache.addAll(SHELL_FILES);
            })
            .then(() => self.skipWaiting())
            .catch((err) => console.error('[SW] Installation failed:', err))
    );
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name.startsWith('webnegosyo-') && !name.includes(CACHE_VERSION))
                        .map((name) => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => self.clients.claim())
            .catch((err) => console.error('[SW] Activation failed:', err))
    );
});

// Fetch event: implement caching strategies
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Only handle GET requests from same origin
    if (request.method !== 'GET') return;

    // Network-only for external APIs (Supabase, etc)
    if (NETWORK_ONLY.some((pattern) => url.href.includes(pattern))) {
        event.respondWith(fetch(request));
        return;
    }

    // For cross-origin requests, just fetch
    if (url.origin !== self.location.origin) {
        event.respondWith(fetch(request));
        return;
    }

    // Navigation requests (HTML pages): Network first, fallback to shell
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Clone and cache successful responses
                    if (response.ok) {
                        const responseClone = response.clone();
                        caches.open(CACHE_DYNAMIC).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Offline: try cache, then fall back to app shell
                    return caches.match(request).then((cached) => {
                        return cached || caches.match('/');
                    });
                })
        );
        return;
    }

    // Static assets (JS, CSS, images, fonts): Cache first, update in background
    if (
        request.destination === 'script' ||
        request.destination === 'style' ||
        request.destination === 'image' ||
        request.destination === 'font'
    ) {
        event.respondWith(
            caches.match(request).then((cached) => {
                // Return cached version immediately if available
                if (cached) {
                    // Update cache in background
                    fetch(request)
                        .then((response) => {
                            if (response.ok) {
                                caches.open(CACHE_STATIC).then((cache) => {
                                    cache.put(request, response);
                                });
                            }
                        })
                        .catch(() => { /* Network failed, cached version is good */ });
                    return cached;
                }

                // Not in cache: fetch and cache
                return fetch(request).then((response) => {
                    if (response.ok) {
                        const responseClone = response.clone();
                        caches.open(CACHE_STATIC).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                });
            })
        );
        return;
    }

    // Default: Network first with cache fallback
    event.respondWith(
        fetch(request)
            .then((response) => {
                if (response.ok) {
                    const responseClone = response.clone();
                    caches.open(CACHE_DYNAMIC).then((cache) => {
                        cache.put(request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(request);
            })
    );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => caches.delete(cacheName))
                );
            })
        );
    }
});

// Background sync (for future implementation)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-data') {
        event.waitUntil(
            // Implement your data sync logic here
            Promise.resolve()
        );
    }
});

console.log('[SW] Service Worker loaded successfully');

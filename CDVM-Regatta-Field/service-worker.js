const CACHE_NAME = 'cdvm-regatta-field-v4-3-fields-gpx-kml';

const FILES_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './css/styles.css',
    './js/app.js',
    './js/area.js',
    './js/constants.js',
    './js/course-la.js',
    './js/course-trapezoid.js',
    './js/course-twa.js',
    './js/default-areas.js',
    './js/export.js',
    './js/field-storage.js',
    './js/geo.js',
    './js/map.js',
    './js/racecourse.js',
    './js/report.js',
    './js/state.js',
    './js/ui.js',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(FILES_TO_CACHE))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request)
            .then(cached => {
                if (cached) return cached;

                return fetch(event.request).then(response => {
                    return response;
                });
            })
    );
});

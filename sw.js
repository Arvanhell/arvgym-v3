const CACHE_NAME = 'arv-gym-v3-cache-v1';

// Lista plików do zapamiętania (muszą się zgadzać z Twoimi nazwami!)
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './script.js',
    'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap',
    'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'
];

// 1. INSTALACJA: Zapisujemy pliki do pamięci podręcznej
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('SW: Buforowanie zasobów GYM...');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

// 2. AKTYWACJA: Usuwamy stare wersje cache, jeśli zrobisz aktualizację kodu
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('SW: Usuwanie starego cache...');
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

// 3. OBSŁUGA ZAPYTAŃ (Fetch): Jeśli nie ma sieci, bierz z cache
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            // Zwróć plik z cache lub pobierz z sieci (i zapisz go na przyszłość)
            return response || fetch(event.request);
        })
    );
});

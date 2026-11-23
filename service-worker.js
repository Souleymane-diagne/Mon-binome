const CACHE_NAME = 'mon-binome-v2.0.1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/storage.js',
  './js/audio.js',
  './js/notifications.js',
  './js/prayers.js',
  './js/courses.js',
  './js/tasks.js',
  './js/auth.js',
  './js/admin.js',
  './js/ai.js',
  './images/logo-official.png',
  './images/logo-monbinom.png',
  './images/robot-hero-full.png',
  './images/robot-mascot.png',
  './images/five-pillars.png',
  './images/balance-books-lantern.png',
  './images/dashboard-preview.png',
  './images/cta-banner-bg.png',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js',
  'https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.js'
];

// Install: Cache initial shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use catch for each to prevent failure if CDN is temporarily unavailable
      return Promise.allSettled(
        ASSETS_TO_CACHE.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[SW] Could not cache: ${url}`, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network first with Cache fallback for freshness + offline resilience
self.addEventListener('fetch', (event) => {
  // Ignore non-GET requests or chrome-extension URLs
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  // For Aladhan API: try network, cache response for offline
  if (event.request.url.includes('api.aladhan.com')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Network First : privilégier le serveur pour avoir le dernier design immédiatement
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});

// Push notification event (Web Push)
self.addEventListener('push', (event) => {
  let data = {
    title: 'Mon Assistant',
    body: 'Rappel important pour vos études et prières.',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    tag: 'assistant-notification',
    data: {}
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || './icons/icon-192.png',
    badge: data.badge || './icons/icon-192.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || 'general-reminder',
    renotify: true,
    requireInteraction: true,
    data: data.data || {},
    actions: [
      { action: 'open', title: 'Ouvrir l\'application' },
      { action: 'dismiss', title: 'Ignorer' }
    ]
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Click on notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window or open new one
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('./');
      }
    })
  );
});

// Message listener from foreground pages to schedule or trigger background notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, data } = event.data;
    self.registration.showNotification(title, {
      body,
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      tag: tag || 'foreground-alert',
      renotify: true,
      vibrate: [200, 100, 200],
      data: data || {},
      actions: [
        { action: 'open', title: 'Voir les détails' }
      ]
    });
  }
});

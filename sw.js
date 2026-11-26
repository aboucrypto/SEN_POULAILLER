const CACHE = 'sadikh-poulailler-v3';

const CORE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest'
];

// INSTALLATION
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(async cache => {
        for (const file of CORE) {
          try {
            const response = await fetch(file);
            if (response.ok) {
              await cache.put(file, response);
            }
          } catch (error) {
            console.log('Fichier non disponible :', file);
          }
        }
      })
      .then(() => self.skipWaiting())
  );
});

// ACTIVATION
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith('sadikh-poulailler-') && key !== CACHE)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// MODE HORS LIGNE
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin
  ) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => {
            cache.put(request, copy);
          });
        }
        return response;
      })
      .catch(async () => {
        const saved = await caches.match(request);
        if (saved) return saved;

        return caches.match('./index.html');
      })
  );
});

// RECEPTION DES NOTIFICATIONS PUSH
self.addEventListener('push', event => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    data = {
      title: 'SADIKH SERVICES',
      body: 'Nouvelle alerte du poulailler.'
    };
  }

  event.waitUntil(
    self.registration.showNotification(
      data.title || 'SADIKH SERVICES',
      {
        body: data.body || 'Consultez votre bulletin du poulailler.',
        icon: './assets/logo.jpg',
        badge: './assets/logo.jpg',
        tag: data.tag || 'sadikh-poulailler',
        data: { url: './' }
      }
    )
  );
});

// CLIC SUR UNE NOTIFICATION
self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(windowClients => {
      for (const client of windowClients) {
        if ('focus' in client) {
          return client.focus();
        }
      }

      return clients.openWindow('./');
    })
  );
});

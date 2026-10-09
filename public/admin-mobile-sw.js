// Service Worker for La Moulinière Admin Mobile PWA — Web Push notifications

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Every push must display a notification (iOS revokes the subscription otherwise)
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'La Moulinière';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      tag: data.tag,
      icon: '/admin-icon-192.png',
      badge: '/admin-icon-192.png',
      data: { url: data.url || '/admin-mobile' },
    })
  );
});

// Open (or focus) the app on the reservation's day
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/admin-mobile', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client) return client.navigate(url);
          return;
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

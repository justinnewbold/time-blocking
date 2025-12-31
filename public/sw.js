const CACHE_NAME = 'frog-v3';
const urlsToCache = [
  '/',
  '/offline',
  '/manifest.json',
  '/icons/icon.svg'
];

// Scheduled notifications storage
const scheduledNotifications = new Map();

// Install event - cache essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) return response;
        
        return fetch(event.request)
          .then((response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(event.request, responseToCache));
            
            return response;
          })
          .catch(() => {
            if (event.request.destination === 'document') {
              return caches.match('/offline');
            }
          });
      })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[Frog SW] Push received:', event);
  
  let data = {
    title: '🐸 Frog',
    body: 'Time to eat your frog!',
    icon: '/icons/icon.svg',
    badge: '/icons/icon.svg',
    tag: 'frog-notification',
    data: { url: '/' }
  };
  
  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon.svg',
    badge: data.badge || '/icons/icon.svg',
    tag: data.tag || 'frog-notification',
    vibrate: [100, 50, 100],
    data: data.data || { url: '/' },
    actions: data.actions || [
      { action: 'open', title: 'Open Frog' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    requireInteraction: data.requireInteraction || false
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[Frog SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'dismiss') return;
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.postMessage({
              type: 'NOTIFICATION_CLICKED',
              action: event.action,
              data: event.notification.data
            });
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[Frog SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-tasks') {
    event.waitUntil(syncTasks());
  }
});

async function syncTasks() {
  console.log('[Frog SW] Syncing tasks...');
}

// Message handler for communication with main app
self.addEventListener('message', (event) => {
  console.log('[Frog SW] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Schedule notification with delay
  if (event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { id, delay, notification } = event.data;
    
    // Clear any existing scheduled notification with same ID
    if (id && scheduledNotifications.has(id)) {
      clearTimeout(scheduledNotifications.get(id));
    }
    
    const timeoutId = setTimeout(() => {
      self.registration.showNotification(notification.title, {
        body: notification.body,
        icon: notification.icon || '/icons/icon.svg',
        badge: notification.badge || '/icons/icon.svg',
        tag: notification.tag,
        vibrate: [100, 50, 100],
        data: notification.data || { url: '/' },
        actions: [
          { action: 'open', title: 'Open Frog' },
          { action: 'dismiss', title: 'Dismiss' }
        ]
      });
      if (id) scheduledNotifications.delete(id);
    }, delay);
    
    if (id) scheduledNotifications.set(id, timeoutId);
    
    // Confirm scheduling
    event.source?.postMessage({
      type: 'NOTIFICATION_SCHEDULED',
      id: id,
      scheduledFor: Date.now() + delay
    });
  }
  
  // Cancel scheduled notification
  if (event.data.type === 'CANCEL_NOTIFICATION') {
    const { id } = event.data;
    if (id && scheduledNotifications.has(id)) {
      clearTimeout(scheduledNotifications.get(id));
      scheduledNotifications.delete(id);
    }
  }
  
  // Show immediate notification
  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { notification } = event.data;
    self.registration.showNotification(notification.title, {
      body: notification.body,
      icon: notification.icon || '/icons/icon.svg',
      badge: notification.badge || '/icons/icon.svg',
      tag: notification.tag,
      vibrate: [100, 50, 100],
      data: notification.data || { url: '/' }
    });
  }
});

// Periodic background sync for daily reminders (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'daily-checkin') {
    event.waitUntil(showDailyCheckinReminder());
  }
});

async function showDailyCheckinReminder() {
  const now = new Date();
  const hour = now.getHours();
  
  // Only show between 7am and 10am
  if (hour >= 7 && hour <= 10) {
    await self.registration.showNotification('🐸 Good Morning!', {
      body: "Time to check your energy and pick today's frog!",
      icon: '/icons/icon.svg',
      badge: '/icons/icon.svg',
      tag: 'daily-checkin',
      vibrate: [100, 50, 100],
      data: { url: '/', action: 'checkin' },
      actions: [
        { action: 'checkin', title: "Let's Go!" },
        { action: 'dismiss', title: 'Later' }
      ]
    });
  }
}

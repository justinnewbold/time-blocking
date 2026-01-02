const CACHE_NAME = 'frog-v5';
const urlsToCache = [
  '/',
  '/offline',
  '/stats',
  '/calendar',
  '/achievements',
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
    vibrate: [200, 100, 200, 100, 200],
    data: data.data || { url: '/' },
    actions: data.actions || [
      { action: 'open', title: 'Open Frog' },
      { action: 'snooze', title: 'Snooze 30m' }
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
  
  // Handle snooze action
  if (event.action === 'snooze') {
    const snoozeDelay = 30 * 60 * 1000; // 30 minutes
    const notification = event.notification;
    
    setTimeout(() => {
      self.registration.showNotification(notification.title, {
        body: notification.body + ' (snoozed)',
        icon: '/icons/icon.svg',
        badge: '/icons/icon.svg',
        tag: notification.tag + '-snoozed',
        vibrate: [100, 50, 100],
        data: notification.data
      });
    }, snoozeDelay);
    
    return;
  }
  
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
    
    // Determine vibration pattern based on notification type
    let vibrate = [100, 50, 100];
    let actions = [
      { action: 'open', title: 'Open Frog' },
      { action: 'snooze', title: 'Snooze' }
    ];
    
    if (notification.tag === 'focus-end') {
      vibrate = [200, 100, 200, 100, 200, 100, 400];
      actions = [
        { action: 'celebrate', title: '🎉 Done!' },
        { action: 'open', title: 'Open App' }
      ];
    } else if (notification.tag === 'morning_checkin') {
      vibrate = [100, 50, 100, 50, 200];
      actions = [
        { action: 'checkin', title: "Let's Go!" },
        { action: 'snooze', title: '30 min' }
      ];
    } else if (notification.tag === 'streak_protection') {
      vibrate = [200, 100, 200];
      actions = [
        { action: 'open', title: 'Save Streak!' },
        { action: 'dismiss', title: 'Later' }
      ];
    }
    
    const timeoutId = setTimeout(() => {
      self.registration.showNotification(notification.title, {
        body: notification.body,
        icon: notification.icon || '/icons/icon.svg',
        badge: notification.badge || '/icons/icon.svg',
        tag: notification.tag,
        vibrate: vibrate,
        data: notification.data || { url: '/' },
        actions: actions,
        requireInteraction: ['focus-end', 'morning_checkin'].includes(notification.tag)
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
    
    let vibrate = [100, 50, 100];
    if (notification.tag === 'focus-end') {
      vibrate = [200, 100, 200, 100, 200, 100, 400];
    }
    
    self.registration.showNotification(notification.title, {
      body: notification.body,
      icon: notification.icon || '/icons/icon.svg',
      badge: notification.badge || '/icons/icon.svg',
      tag: notification.tag,
      vibrate: vibrate,
      data: notification.data || { url: '/' },
      requireInteraction: notification.tag === 'focus-end'
    });
  }
  
  // Schedule daily check-in for specific time
  if (event.data.type === 'SCHEDULE_DAILY_CHECKIN') {
    const { time, message } = event.data;
    const [hours, minutes] = time.split(':').map(Number);
    
    const now = new Date();
    const scheduledTime = new Date(now);
    scheduledTime.setHours(hours, minutes, 0, 0);
    
    // If time has passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }
    
    const delay = scheduledTime.getTime() - now.getTime();
    
    // Clear existing daily checkin
    if (scheduledNotifications.has('daily-checkin')) {
      clearTimeout(scheduledNotifications.get('daily-checkin'));
    }
    
    const timeoutId = setTimeout(() => {
      self.registration.showNotification('🐸 Good Morning!', {
        body: message || "Time to check your energy and pick today's frog!",
        icon: '/icons/icon.svg',
        badge: '/icons/icon.svg',
        tag: 'morning_checkin',
        vibrate: [100, 50, 100, 50, 200],
        data: { url: '/', action: 'checkin' },
        actions: [
          { action: 'checkin', title: "Let's Go!" },
          { action: 'snooze', title: '30 min' }
        ],
        requireInteraction: true
      });
      scheduledNotifications.delete('daily-checkin');
      
      // Reschedule for next day
      event.source?.postMessage({
        type: 'RESCHEDULE_DAILY_CHECKIN',
        time: time
      });
    }, delay);
    
    scheduledNotifications.set('daily-checkin', timeoutId);
    
    console.log(`[Frog SW] Daily check-in scheduled for ${scheduledTime}`);
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
        { action: 'snooze', title: 'Later' }
      ]
    });
  }
}

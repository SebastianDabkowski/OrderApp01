// Service Worker for Web Push Notifications
// Version: 1.0.0

const CACHE_NAME = 'mercato-v1';

// Install event - called when service worker is first installed
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    // Skip waiting to activate immediately
    self.skipWaiting();
});

// Activate event - called when service worker takes control
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    // Claim all clients immediately
    event.waitUntil(self.clients.claim());
});

// Push event - called when a push notification is received
self.addEventListener('push', (event) => {
    console.log('[Service Worker] Push received:', event);

    // Default notification options
    const defaultOptions = {
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        vibrate: [200, 100, 200],
        requireInteraction: false,
        data: {
            url: '/',
            timestamp: Date.now()
        }
    };

    let notificationData = { ...defaultOptions };

    // Parse the push notification payload
    if (event.data) {
        try {
            const payload = event.data.json();
            notificationData = {
                ...defaultOptions,
                ...payload,
                data: { ...defaultOptions.data, ...payload.data }
            };
            console.log('[Service Worker] Parsed notification data:', notificationData);
        } catch (e) {
            console.error('[Service Worker] Error parsing push data:', e);
            notificationData.title = 'New notification';
            notificationData.body = event.data.text();
        }
    } else {
        notificationData.title = 'Mercato';
        notificationData.body = 'You have a new notification';
    }

    // Show the notification
    event.waitUntil(
        self.registration.showNotification(notificationData.title, {
            body: notificationData.body,
            icon: notificationData.icon,
            badge: notificationData.badge,
            vibrate: notificationData.vibrate,
            requireInteraction: notificationData.requireInteraction,
            data: notificationData.data,
            tag: notificationData.tag || 'default',
            renotify: notificationData.renotify || false
        })
    );
});

// Notification click event - called when user clicks on a notification
self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker] Notification clicked:', event);

    // Close the notification
    event.notification.close();

    // Get the URL to open from the notification data
    const urlToOpen = event.notification.data?.url || '/';

    // Open or focus the URL
    event.waitUntil(
        self.clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then((clientList) => {
            // Check if there's already a window open with the target URL
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url === new URL(urlToOpen, self.location.origin).href && 'focus' in client) {
                    return client.focus();
                }
            }

            // If no window is open, open a new one
            if (self.clients.openWindow) {
                return self.clients.openWindow(urlToOpen);
            }
        })
    );
});

// Notification close event - called when notification is dismissed
self.addEventListener('notificationclose', (event) => {
    console.log('[Service Worker] Notification closed:', event);
    // Could track analytics here
});

// Fetch event - handle network requests (optional, for offline support)
self.addEventListener('fetch', (event) => {
    // For now, just pass through to network
    // Could add caching strategy here if needed for offline support
});

// Message event - handle messages from the main thread
self.addEventListener('message', (event) => {
    console.log('[Service Worker] Message received:', event.data);

    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

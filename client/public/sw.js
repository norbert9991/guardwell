// GuardWell Service Worker for Push Notifications

const CACHE_NAME = 'guardwell-v1';

// Install event
self.addEventListener('install', (event) => {
    console.log('📱 Service Worker: Installing...');
    self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
    console.log('📱 Service Worker: Activated');
    event.waitUntil(clients.claim());
});

// Push notification event
self.addEventListener('push', (event) => {
    console.log('📱 Service Worker: Push received');

    let data = {
        title: 'GuardWell Alert',
        body: 'You have a new notification',
        icon: '/favicon.ico',
        badge: '/favicon.ico'
    };

    try {
        if (event.data) {
            data = { ...data, ...event.data.json() };
        }
    } catch (e) {
        console.error('Error parsing push data:', e);
    }

    const options = {
        body: data.body,
        icon: data.icon || '/favicon.ico',
        badge: data.badge || '/favicon.ico',
        tag: data.tag || 'guardwell-notification',
        requireInteraction: data.requireInteraction || false,
        data: data.data || {},
        actions: data.actions || [
            { action: 'view', title: 'View' },
            { action: 'dismiss', title: 'Dismiss' }
        ],
        vibrate: [200, 100, 200]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
    console.log('📱 Service Worker: Notification clicked');

    event.notification.close();

    const action = event.action;
    const notificationData = event.notification.data || {};

    if (action === 'dismiss') {
        return;
    }

    // Determine which URL to open
    let urlToOpen = '/';
    if (notificationData.url) {
        urlToOpen = notificationData.url;
    } else if (notificationData.type === 'emergency') {
        urlToOpen = '/live-monitoring';
    } else if (notificationData.type === 'alert') {
        urlToOpen = '/alerts';
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Check if already open
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.navigate(urlToOpen);
                        return client.focus();
                    }
                }
                // Open new window
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

// Background sync for offline support (optional)
self.addEventListener('sync', (event) => {
    console.log('📱 Service Worker: Background sync', event.tag);
});

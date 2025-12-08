// Push Notification Utilities for GuardWell Client

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Check if push notifications are supported
export const isPushSupported = () => {
    return 'serviceWorker' in navigator && 'PushManager' in window;
};

// Register service worker
export const registerServiceWorker = async () => {
    if (!isPushSupported()) {
        console.warn('Push notifications not supported');
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('📱 Service Worker registered:', registration.scope);
        return registration;
    } catch (error) {
        console.error('Service Worker registration failed:', error);
        return null;
    }
};

// Get VAPID public key from server
export const getVapidPublicKey = async () => {
    try {
        const response = await fetch(`${API_URL}/api/push/vapid-public-key`);
        if (!response.ok) {
            const data = await response.json();
            console.warn('VAPID key not available:', data.hint || data.error);
            return null;
        }
        const data = await response.json();
        return data.publicKey;
    } catch (error) {
        console.error('Failed to get VAPID public key:', error);
        return null;
    }
};

// Convert URL-safe base64 to Uint8Array
const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
};

// Subscribe to push notifications
export const subscribeToPush = async (userId = null) => {
    if (!isPushSupported()) {
        return { success: false, error: 'Push not supported' };
    }

    try {
        // Get service worker registration
        const registration = await navigator.serviceWorker.ready;

        // Get VAPID public key
        const vapidPublicKey = await getVapidPublicKey();
        if (!vapidPublicKey) {
            return { success: false, error: 'VAPID key not configured on server' };
        }

        // Check existing subscription
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            // Create new subscription
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
            });
            console.log('📱 Created new push subscription');
        }

        // Send subscription to server
        const response = await fetch(`${API_URL}/api/push/subscribe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                subscription: subscription.toJSON(),
                userId
            })
        });

        if (!response.ok) {
            throw new Error('Failed to save subscription on server');
        }

        const result = await response.json();
        console.log('📱 Push subscription saved:', result);
        return { success: true, subscription };

    } catch (error) {
        console.error('Push subscription failed:', error);
        return { success: false, error: error.message };
    }
};

// Unsubscribe from push notifications
export const unsubscribeFromPush = async () => {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            // Unsubscribe locally
            await subscription.unsubscribe();

            // Remove from server
            await fetch(`${API_URL}/api/push/unsubscribe`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    endpoint: subscription.endpoint
                })
            });

            console.log('📱 Push subscription removed');
            return { success: true };
        }

        return { success: true, message: 'No subscription to remove' };
    } catch (error) {
        console.error('Push unsubscribe failed:', error);
        return { success: false, error: error.message };
    }
};

// Request notification permission
export const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
        return 'unsupported';
    }

    if (Notification.permission === 'granted') {
        return 'granted';
    }

    if (Notification.permission === 'denied') {
        return 'denied';
    }

    const permission = await Notification.requestPermission();
    return permission;
};

// Initialize push notifications
export const initializePushNotifications = async (userId = null) => {
    // Request permission
    const permission = await requestNotificationPermission();

    if (permission !== 'granted') {
        console.warn('Notification permission:', permission);
        return { success: false, error: `Permission ${permission}` };
    }

    // Register service worker
    const registration = await registerServiceWorker();
    if (!registration) {
        return { success: false, error: 'Service worker registration failed' };
    }

    // Subscribe to push
    const result = await subscribeToPush(userId);
    return result;
};

export default {
    isPushSupported,
    registerServiceWorker,
    subscribeToPush,
    unsubscribeFromPush,
    requestNotificationPermission,
    initializePushNotifications
};

const webpush = require('web-push');

let isInitialized = false;

// Initialize web-push with VAPID keys
const initWebPush = () => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;

    if (publicKey && privateKey && subject &&
        publicKey !== 'your-vapid-public-key-here' &&
        privateKey !== 'your-vapid-private-key-here') {

        webpush.setVapidDetails(subject, publicKey, privateKey);
        isInitialized = true;
        console.log('✅ Web Push initialized with VAPID keys');
        return true;
    } else {
        console.warn('⚠️ VAPID keys not configured - web push notifications disabled');
        console.warn('   Generate keys with: npx web-push generate-vapid-keys');
        return false;
    }
};

// Check if web push is configured
const isConfigured = () => isInitialized;

// Get public VAPID key (needed by client to subscribe)
const getPublicKey = () => {
    return process.env.VAPID_PUBLIC_KEY;
};

// Send push notification to a single subscription
const sendNotification = async (subscription, payload) => {
    if (!isInitialized) {
        console.warn('Web Push not initialized, skipping notification');
        return { success: false, error: 'Web Push not configured' };
    }

    const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth
        }
    };

    try {
        await webpush.sendNotification(
            pushSubscription,
            JSON.stringify(payload)
        );
        console.log('📱 Push notification sent to:', subscription.endpoint.substring(0, 50) + '...');
        return { success: true };
    } catch (error) {
        console.error('❌ Push notification error:', error.message);

        // Return info about whether subscription should be removed
        if (error.statusCode === 410 || error.statusCode === 404) {
            return { success: false, error: error.message, expired: true };
        }
        return { success: false, error: error.message };
    }
};

// Send notification to all subscriptions
const sendToAll = async (payload) => {
    if (!isInitialized) {
        console.warn('Web Push not initialized, skipping bulk notification');
        return { success: false, sent: 0, failed: 0 };
    }

    const PushSubscription = require('../models/PushSubscription');
    const subscriptions = await PushSubscription.findAll();

    let sent = 0;
    let failed = 0;
    const expiredIds = [];

    for (const sub of subscriptions) {
        const result = await sendNotification(sub, payload);
        if (result.success) {
            sent++;
        } else {
            failed++;
            if (result.expired) {
                expiredIds.push(sub.id);
            }
        }
    }

    // Clean up expired subscriptions
    if (expiredIds.length > 0) {
        await PushSubscription.destroy({ where: { id: expiredIds } });
        console.log(`🧹 Removed ${expiredIds.length} expired push subscriptions`);
    }

    console.log(`📱 Push notifications: ${sent} sent, ${failed} failed`);
    return { success: true, sent, failed };
};

// Send emergency alert notification
const sendEmergencyNotification = async ({ workerName, alertType, deviceId, timestamp }) => {
    const payload = {
        title: '🚨 EMERGENCY ALERT',
        body: `${workerName || 'Unknown Worker'}: ${alertType}`,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'emergency-' + Date.now(),
        requireInteraction: true,
        data: {
            type: 'emergency',
            deviceId,
            timestamp,
            url: '/live-monitoring'
        },
        actions: [
            { action: 'view', title: 'View Details' },
            { action: 'dismiss', title: 'Dismiss' }
        ]
    };

    return await sendToAll(payload);
};

// Send threshold alert notification
const sendAlertNotification = async ({ workerName, alertType, severity, value }) => {
    const severityIcons = {
        Critical: '🔴',
        High: '🟠',
        Medium: '🟡',
        Low: '🔵'
    };

    const payload = {
        title: `${severityIcons[severity] || '⚠️'} ${severity} Alert`,
        body: `${workerName || 'Worker'}: ${alertType} - ${value}`,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'alert-' + Date.now(),
        data: {
            type: 'alert',
            severity,
            url: '/alerts'
        }
    };

    return await sendToAll(payload);
};

module.exports = {
    initWebPush,
    isConfigured,
    getPublicKey,
    sendNotification,
    sendToAll,
    sendEmergencyNotification,
    sendAlertNotification
};

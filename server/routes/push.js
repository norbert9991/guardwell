const express = require('express');
const router = express.Router();
const { PushSubscription, User } = require('../models');
const pushService = require('../services/pushService');

// GET /api/push/vapid-public-key - Get public VAPID key for client subscription
router.get('/vapid-public-key', (req, res) => {
    const publicKey = pushService.getPublicKey();
    if (publicKey && publicKey !== 'your-vapid-public-key-here') {
        res.json({ publicKey });
    } else {
        res.status(503).json({
            error: 'Push notifications not configured',
            hint: 'Generate VAPID keys with: npx web-push generate-vapid-keys'
        });
    }
});

// GET /api/push/status - Check if push is configured
router.get('/status', (req, res) => {
    res.json({
        configured: pushService.isConfigured(),
        publicKey: pushService.isConfigured() ? pushService.getPublicKey() : null
    });
});

// POST /api/push/subscribe - Store new push subscription
router.post('/subscribe', async (req, res) => {
    try {
        const { subscription, userId } = req.body;

        if (!subscription || !subscription.endpoint || !subscription.keys) {
            return res.status(400).json({ error: 'Invalid subscription data' });
        }

        // Check if subscription already exists
        const existing = await PushSubscription.findOne({
            where: { endpoint: subscription.endpoint }
        });

        if (existing) {
            // Update existing subscription
            await existing.update({
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
                userId: userId || existing.userId,
                userAgent: req.get('User-Agent')
            });
            console.log('📱 Push subscription updated');
            return res.json({ success: true, message: 'Subscription updated', id: existing.id });
        }

        // Create new subscription
        const newSubscription = await PushSubscription.create({
            endpoint: subscription.endpoint,
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
            userId: userId || null,
            userAgent: req.get('User-Agent')
        });

        console.log('📱 New push subscription created');
        res.json({ success: true, message: 'Subscription created', id: newSubscription.id });
    } catch (error) {
        console.error('Error saving push subscription:', error);
        res.status(500).json({ error: 'Failed to save subscription' });
    }
});

// DELETE /api/push/unsubscribe - Remove push subscription
router.delete('/unsubscribe', async (req, res) => {
    try {
        const { endpoint } = req.body;

        if (!endpoint) {
            return res.status(400).json({ error: 'Endpoint required' });
        }

        const deleted = await PushSubscription.destroy({
            where: { endpoint }
        });

        if (deleted) {
            console.log('📱 Push subscription removed');
            res.json({ success: true, message: 'Subscription removed' });
        } else {
            res.status(404).json({ error: 'Subscription not found' });
        }
    } catch (error) {
        console.error('Error removing push subscription:', error);
        res.status(500).json({ error: 'Failed to remove subscription' });
    }
});

// POST /api/push/test - Send a test notification (for debugging)
router.post('/test', async (req, res) => {
    try {
        if (!pushService.isConfigured()) {
            return res.status(503).json({ error: 'Push notifications not configured' });
        }

        const result = await pushService.sendToAll({
            title: '🧪 Test Notification',
            body: 'GuardWell push notifications are working!',
            icon: '/favicon.ico',
            tag: 'test-' + Date.now()
        });

        res.json({
            success: true,
            sent: result.sent,
            failed: result.failed
        });
    } catch (error) {
        console.error('Error sending test notification:', error);
        res.status(500).json({ error: 'Failed to send test notification' });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { Alert, Worker } = require('../models');

// Get all alerts
router.get('/', async (req, res) => {
    try {
        const { status, severity, includeArchived } = req.query;
        const where = {};
        if (status) where.status = status;
        if (severity) where.severity = severity;
        if (includeArchived !== 'true') where.archived = false;

        const alerts = await Alert.findAll({
            where,
            include: [{ model: Worker, as: 'worker' }],
            order: [['createdAt', 'DESC']]
        });
        res.json(alerts);
    } catch (error) {
        console.error('Error fetching alerts:', error);
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
});

// Get single alert
router.get('/:id', async (req, res) => {
    try {
        const alert = await Alert.findByPk(req.params.id, {
            include: [{ model: Worker, as: 'worker' }]
        });
        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        res.json(alert);
    } catch (error) {
        console.error('Error fetching alert:', error);
        res.status(500).json({ error: 'Failed to fetch alert' });
    }
});

// Acknowledge alert
router.post('/:id/acknowledge', async (req, res) => {
    try {
        const { acknowledgedBy } = req.body;
        const [updated] = await Alert.update(
            {
                status: 'Acknowledged',
                acknowledgedBy: acknowledgedBy || 'System',
                acknowledgedAt: new Date()
            },
            { where: { id: req.params.id } }
        );
        if (!updated) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        const alert = await Alert.findByPk(req.params.id);

        // Broadcast update
        req.io.emit('alert_updated', {
            alertId: req.params.id,
            status: 'Acknowledged'
        });

        res.json(alert);
    } catch (error) {
        console.error('Error acknowledging alert:', error);
        res.status(500).json({ error: 'Failed to acknowledge alert' });
    }
});

// Resolve alert
router.post('/:id/resolve', async (req, res) => {
    try {
        const { notes } = req.body;
        const [updated] = await Alert.update(
            {
                status: 'Resolved',
                resolvedAt: new Date(),
                notes
            },
            { where: { id: req.params.id } }
        );
        if (!updated) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        const alert = await Alert.findByPk(req.params.id);

        // Broadcast update
        req.io.emit('alert_updated', {
            alertId: req.params.id,
            status: 'Resolved'
        });

        res.json(alert);
    } catch (error) {
        console.error('Error resolving alert:', error);
        res.status(500).json({ error: 'Failed to resolve alert' });
    }
});

// Archive alert
router.post('/:id/archive', async (req, res) => {
    try {
        const [updated] = await Alert.update(
            { archived: true },
            { where: { id: req.params.id } }
        );
        if (!updated) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        res.json({ message: 'Alert archived successfully' });
    } catch (error) {
        console.error('Error archiving alert:', error);
        res.status(500).json({ error: 'Failed to archive alert' });
    }
});

// Restore alert
router.post('/:id/restore', async (req, res) => {
    try {
        const [updated] = await Alert.update(
            { archived: false },
            { where: { id: req.params.id } }
        );
        if (!updated) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        res.json({ message: 'Alert restored successfully' });
    } catch (error) {
        console.error('Error restoring alert:', error);
        res.status(500).json({ error: 'Failed to restore alert' });
    }
});

module.exports = router;


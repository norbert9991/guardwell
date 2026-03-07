const express = require('express');
const router = express.Router();
const { Alert, Worker } = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

// Get all alerts (excluding archived by default)
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

// Get active emergencies (Pending, Acknowledged, Responding - not Resolved)
router.get('/active', async (req, res) => {
    try {
        const alerts = await Alert.findAll({
            where: {
                status: { [Op.in]: ['Pending', 'Acknowledged', 'Responding'] },
                archived: false
            },
            include: [{ model: Worker, as: 'worker' }],
            order: [
                ['priority', 'ASC'],           // Priority 1 first
                ['status', 'ASC'],             // Pending before Acknowledged
                ['createdAt', 'DESC']          // Newest first
            ]
        });
        res.json(alerts);
    } catch (error) {
        console.error('Error fetching active emergencies:', error);
        res.status(500).json({ error: 'Failed to fetch active emergencies' });
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

// Acknowledge alert (with response time tracking and optional notes)
router.post('/:id/acknowledge', async (req, res) => {
    try {
        const { acknowledgedBy, notes } = req.body;

        // First get the alert to calculate response time
        const existingAlert = await Alert.findByPk(req.params.id);
        if (!existingAlert) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        // Calculate response time in milliseconds
        const acknowledgedAt = new Date();
        const responseTimeMs = acknowledgedAt - new Date(existingAlert.createdAt);

        await Alert.update(
            {
                status: 'Acknowledged',
                acknowledgedBy: acknowledgedBy || 'System',
                acknowledgedAt,
                responseTimeMs,
                notes: notes || existingAlert.notes // Keep existing notes if none provided
            },
            { where: { id: req.params.id } }
        );

        const alert = await Alert.findByPk(req.params.id, {
            include: [{ model: Worker, as: 'worker' }]
        });

        // Broadcast update
        req.io.emit('emergency_status_updated', {
            alertId: req.params.id,
            status: 'Acknowledged',
            acknowledgedBy: alert.acknowledgedBy,
            acknowledgedAt: alert.acknowledgedAt,
            responseTimeMs: alert.responseTimeMs,
            alert
        });

        res.json(alert);
    } catch (error) {
        console.error('Error acknowledging alert:', error);
        res.status(500).json({ error: 'Failed to acknowledge alert' });
    }
});

// Batch acknowledge multiple alerts (with response time tracking)
router.post('/batch-acknowledge', async (req, res) => {
    try {
        const { alertIds, acknowledgedBy, notes } = req.body;

        if (!alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
            return res.status(400).json({ error: 'alertIds array is required' });
        }

        const acknowledgedAt = new Date();

        // Get all alerts to calculate response times individually
        const existingAlerts = await Alert.findAll({
            where: { id: { [Op.in]: alertIds } }
        });

        // Update each alert with its own response time
        for (const existingAlert of existingAlerts) {
            const responseTimeMs = acknowledgedAt - new Date(existingAlert.createdAt);
            await Alert.update(
                {
                    status: 'Acknowledged',
                    acknowledgedBy: acknowledgedBy || 'System',
                    acknowledgedAt,
                    responseTimeMs,
                    notes: notes || undefined
                },
                { where: { id: existingAlert.id } }
            );
        }

        const alerts = await Alert.findAll({
            where: { id: { [Op.in]: alertIds } },
            include: [{ model: Worker, as: 'worker' }]
        });

        // Broadcast updates for each
        alerts.forEach(alert => {
            req.io.emit('emergency_status_updated', {
                alertId: alert.id,
                status: 'Acknowledged',
                acknowledgedBy: alert.acknowledgedBy,
                responseTimeMs: alert.responseTimeMs,
                alert
            });
        });

        res.json({ message: `${alerts.length} alerts acknowledged`, alerts });
    } catch (error) {
        console.error('Error batch acknowledging alerts:', error);
        res.status(500).json({ error: 'Failed to batch acknowledge alerts' });
    }
});

// Assign alert to officer
router.post('/:id/assign', async (req, res) => {
    try {
        const { assignedTo } = req.body;
        const [updated] = await Alert.update(
            { assignedTo },
            { where: { id: req.params.id } }
        );
        if (!updated) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        const alert = await Alert.findByPk(req.params.id, {
            include: [{ model: Worker, as: 'worker' }]
        });

        // Broadcast update
        req.io.emit('emergency_status_updated', {
            alertId: req.params.id,
            assignedTo,
            alert
        });

        res.json(alert);
    } catch (error) {
        console.error('Error assigning alert:', error);
        res.status(500).json({ error: 'Failed to assign alert' });
    }
});

// Update alert notes
router.patch('/:id/notes', async (req, res) => {
    try {
        const { notes } = req.body;
        const [updated] = await Alert.update(
            { notes },
            { where: { id: req.params.id } }
        );
        if (!updated) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        const alert = await Alert.findByPk(req.params.id, {
            include: [{ model: Worker, as: 'worker' }]
        });
        res.json(alert);
    } catch (error) {
        console.error('Error updating alert notes:', error);
        res.status(500).json({ error: 'Failed to update notes' });
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
        const alert = await Alert.findByPk(req.params.id, {
            include: [{ model: Worker, as: 'worker' }]
        });

        // Broadcast update
        req.io.emit('emergency_resolved', {
            alertId: req.params.id,
            status: 'Resolved',
            alert
        });

        res.json(alert);
    } catch (error) {
        console.error('Error resolving alert:', error);
        res.status(500).json({ error: 'Failed to resolve alert' });
    }
});

// Archive alert (soft delete)
router.patch('/:id/archive', async (req, res) => {
    try {
        const alert = await Alert.findByPk(req.params.id);
        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        await alert.update({ archived: true });
        res.json({ message: 'Alert archived successfully', alert });
    } catch (error) {
        console.error('Error archiving alert:', error);
        res.status(500).json({ error: 'Failed to archive alert' });
    }
});

module.exports = router;


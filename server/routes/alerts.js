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
        const alert = await Alert.findByPk(req.params.id, {
            include: [{ model: Worker, as: 'worker' }]
        });

        // Broadcast update
        req.io.emit('emergency_status_updated', {
            alertId: req.params.id,
            status: 'Acknowledged',
            acknowledgedBy: alert.acknowledgedBy,
            acknowledgedAt: alert.acknowledgedAt,
            alert
        });

        res.json(alert);
    } catch (error) {
        console.error('Error acknowledging alert:', error);
        res.status(500).json({ error: 'Failed to acknowledge alert' });
    }
});

// Batch acknowledge multiple alerts
router.post('/batch-acknowledge', async (req, res) => {
    try {
        const { alertIds, acknowledgedBy } = req.body;

        if (!alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
            return res.status(400).json({ error: 'alertIds array is required' });
        }

        await Alert.update(
            {
                status: 'Acknowledged',
                acknowledgedBy: acknowledgedBy || 'System',
                acknowledgedAt: new Date()
            },
            { where: { id: { [Op.in]: alertIds } } }
        );

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

// Mark as responding
router.post('/:id/respond', async (req, res) => {
    try {
        const { respondingBy, responseNotes } = req.body;
        const alertId = req.params.id;

        // First check if alert exists
        const existingAlert = await Alert.findByPk(alertId);
        if (!existingAlert) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        // Build update object - only include status and assignedTo (guaranteed fields)
        const updateData = {
            status: 'Responding'
        };

        // Only add assignedTo if provided
        if (respondingBy) {
            updateData.assignedTo = respondingBy;
        }

        // Try to add responseNotes - this might fail if column doesn't exist
        // We'll handle that gracefully
        if (responseNotes) {
            try {
                // Check if responseNotes column exists
                const tableDesc = await sequelize.getQueryInterface().describeTable('alerts');
                if (tableDesc.responseNotes) {
                    updateData.responseNotes = responseNotes;
                }
            } catch (descErr) {
                // Column check failed, skip responseNotes
                console.log('Note: responseNotes column check failed, skipping field');
            }
        }

        await Alert.update(updateData, { where: { id: alertId } });

        const alert = await Alert.findByPk(alertId, {
            include: [{ model: Worker, as: 'worker' }]
        });

        // Broadcast update
        req.io.emit('emergency_status_updated', {
            alertId: alertId,
            status: 'Responding',
            assignedTo: alert.assignedTo || respondingBy,
            alert
        });

        res.json(alert);
    } catch (error) {
        console.error('Error marking alert as responding:', error.message, error.stack);
        res.status(500).json({ error: 'Failed to mark alert as responding', details: error.message });
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


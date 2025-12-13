const express = require('express');
const router = express.Router();
const { Incident, Worker } = require('../models');

// Get all incidents (excluding archived by default)
router.get('/', async (req, res) => {
    try {
        const { status, severity, includeArchived } = req.query;
        const where = {};
        if (status) where.status = status;
        if (severity) where.severity = severity;
        if (includeArchived !== 'true') where.archived = false;

        const incidents = await Incident.findAll({
            where,
            include: [{ model: Worker, as: 'worker' }],
            order: [['createdAt', 'DESC']]
        });
        res.json(incidents);
    } catch (error) {
        console.error('Error fetching incidents:', error);
        res.status(500).json({ error: 'Failed to fetch incidents' });
    }
});

// Get single incident
router.get('/:id', async (req, res) => {
    try {
        const incident = await Incident.findByPk(req.params.id, {
            include: [{ model: Worker, as: 'worker' }]
        });
        if (!incident) {
            return res.status(404).json({ error: 'Incident not found' });
        }
        res.json(incident);
    } catch (error) {
        console.error('Error fetching incident:', error);
        res.status(500).json({ error: 'Failed to fetch incident' });
    }
});

// Create incident
router.post('/', async (req, res) => {
    try {
        const incident = await Incident.create(req.body);
        res.status(201).json(incident);
    } catch (error) {
        console.error('Error creating incident:', error);
        res.status(500).json({ error: 'Failed to create incident' });
    }
});

// Update incident
router.put('/:id', async (req, res) => {
    try {
        const [updated] = await Incident.update(req.body, {
            where: { id: req.params.id }
        });
        if (!updated) {
            return res.status(404).json({ error: 'Incident not found' });
        }
        const incident = await Incident.findByPk(req.params.id);
        res.json(incident);
    } catch (error) {
        console.error('Error updating incident:', error);
        res.status(500).json({ error: 'Failed to update incident' });
    }
});

// Resolve incident
router.post('/:id/resolve', async (req, res) => {
    try {
        const { resolution } = req.body;
        const [updated] = await Incident.update(
            {
                status: 'Resolved',
                resolution,
                resolvedAt: new Date()
            },
            { where: { id: req.params.id } }
        );
        if (!updated) {
            return res.status(404).json({ error: 'Incident not found' });
        }
        const incident = await Incident.findByPk(req.params.id);
        res.json(incident);
    } catch (error) {
        console.error('Error resolving incident:', error);
        res.status(500).json({ error: 'Failed to resolve incident' });
    }
});

// Archive incident (soft delete)
router.patch('/:id/archive', async (req, res) => {
    try {
        const incident = await Incident.findByPk(req.params.id);
        if (!incident) {
            return res.status(404).json({ error: 'Incident not found' });
        }
        await incident.update({ archived: true });
        res.json({ message: 'Incident archived successfully', incident });
    } catch (error) {
        console.error('Error archiving incident:', error);
        res.status(500).json({ error: 'Failed to archive incident' });
    }
});

// Update worker status (for emergency outcomes)
router.patch('/:id/worker-status', async (req, res) => {
    try {
        const { workerStatus } = req.body;
        const incident = await Incident.findByPk(req.params.id);
        if (!incident) {
            return res.status(404).json({ error: 'Incident not found' });
        }
        await incident.update({ workerStatus });
        res.json({ message: 'Worker status updated successfully', incident });
    } catch (error) {
        console.error('Error updating worker status:', error);
        res.status(500).json({ error: 'Failed to update worker status' });
    }
});

// Add note to incident
router.post('/:id/note', async (req, res) => {
    try {
        const { note, addedBy } = req.body;
        const incident = await Incident.findByPk(req.params.id, {
            include: [{ model: Worker, as: 'worker' }]
        });
        if (!incident) {
            return res.status(404).json({ error: 'Incident not found' });
        }

        const notes = incident.notes || [];
        notes.push({
            id: Date.now(),
            note,
            addedBy: addedBy || 'System',
            timestamp: new Date().toISOString()
        });

        await incident.update({ notes });
        res.json(incident);
    } catch (error) {
        console.error('Error adding note:', error);
        res.status(500).json({ error: 'Failed to add note' });
    }
});

// Add action to incident
router.post('/:id/action', async (req, res) => {
    try {
        const { action, performedBy } = req.body;
        const incident = await Incident.findByPk(req.params.id, {
            include: [{ model: Worker, as: 'worker' }]
        });
        if (!incident) {
            return res.status(404).json({ error: 'Incident not found' });
        }

        const actionsTaken = incident.actionsTaken || [];
        actionsTaken.push({
            id: Date.now(),
            action,
            performedBy: performedBy || 'System',
            timestamp: new Date().toISOString()
        });

        await incident.update({ actionsTaken });
        res.json(incident);
    } catch (error) {
        console.error('Error adding action:', error);
        res.status(500).json({ error: 'Failed to add action' });
    }
});

// Close incident
router.post('/:id/close', async (req, res) => {
    try {
        const { resolution } = req.body;
        const incident = await Incident.findByPk(req.params.id, {
            include: [{ model: Worker, as: 'worker' }]
        });
        if (!incident) {
            return res.status(404).json({ error: 'Incident not found' });
        }

        await incident.update({
            status: 'Closed',
            resolution,
            resolvedAt: new Date()
        });

        res.json(incident);
    } catch (error) {
        console.error('Error closing incident:', error);
        res.status(500).json({ error: 'Failed to close incident' });
    }
});

// Delete incident (hard delete)
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await Incident.destroy({
            where: { id: req.params.id }
        });
        if (!deleted) {
            return res.status(404).json({ error: 'Incident not found' });
        }
        res.json({ message: 'Incident deleted successfully' });
    } catch (error) {
        console.error('Error deleting incident:', error);
        res.status(500).json({ error: 'Failed to delete incident' });
    }
});

module.exports = router;


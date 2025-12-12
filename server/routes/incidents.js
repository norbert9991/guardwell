const express = require('express');
const router = express.Router();
const { Incident, Worker } = require('../models');

// Get all incidents
router.get('/', async (req, res) => {
    try {
        const { status, severity } = req.query;
        const where = {};
        if (status) where.status = status;
        if (severity) where.severity = severity;

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

// Delete incident
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

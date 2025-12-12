const express = require('express');
const router = express.Router();
const { Worker, Device } = require('../models');

// Get all workers
router.get('/', async (req, res) => {
    try {
        const workers = await Worker.findAll({
            include: [{ model: Device, as: 'device' }],
            order: [['createdAt', 'DESC']]
        });
        res.json(workers);
    } catch (error) {
        console.error('Error fetching workers:', error);
        res.status(500).json({ error: 'Failed to fetch workers' });
    }
});

// Get single worker
router.get('/:id', async (req, res) => {
    try {
        const worker = await Worker.findByPk(req.params.id, {
            include: [{ model: Device, as: 'device' }]
        });
        if (!worker) {
            return res.status(404).json({ error: 'Worker not found' });
        }
        res.json(worker);
    } catch (error) {
        console.error('Error fetching worker:', error);
        res.status(500).json({ error: 'Failed to fetch worker' });
    }
});

// Create worker
router.post('/', async (req, res) => {
    try {
        const worker = await Worker.create(req.body);
        res.status(201).json(worker);
    } catch (error) {
        console.error('Error creating worker:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: 'Employee number already exists' });
        }
        res.status(500).json({ error: 'Failed to create worker' });
    }
});

// Update worker
router.put('/:id', async (req, res) => {
    try {
        const [updated] = await Worker.update(req.body, {
            where: { id: req.params.id }
        });
        if (!updated) {
            return res.status(404).json({ error: 'Worker not found' });
        }
        const worker = await Worker.findByPk(req.params.id);
        res.json(worker);
    } catch (error) {
        console.error('Error updating worker:', error);
        res.status(500).json({ error: 'Failed to update worker' });
    }
});

// Delete worker
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await Worker.destroy({
            where: { id: req.params.id }
        });
        if (!deleted) {
            return res.status(404).json({ error: 'Worker not found' });
        }
        res.json({ message: 'Worker deleted successfully' });
    } catch (error) {
        console.error('Error deleting worker:', error);
        res.status(500).json({ error: 'Failed to delete worker' });
    }
});

module.exports = router;

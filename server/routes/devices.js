const express = require('express');
const router = express.Router();
const { Device, Worker } = require('../models');

// Get all devices (excluding archived by default)
router.get('/', async (req, res) => {
    try {
        const includeArchived = req.query.includeArchived === 'true';
        const whereClause = includeArchived ? {} : { archived: false };

        const devices = await Device.findAll({
            where: whereClause,
            include: [{ model: Worker, as: 'worker' }],
            order: [['createdAt', 'DESC']]
        });
        res.json(devices);
    } catch (error) {
        console.error('Error fetching devices:', error);
        res.status(500).json({ error: 'Failed to fetch devices' });
    }
});

// Get single device
router.get('/:id', async (req, res) => {
    try {
        const device = await Device.findByPk(req.params.id, {
            include: [{ model: Worker, as: 'worker' }]
        });
        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }
        res.json(device);
    } catch (error) {
        console.error('Error fetching device:', error);
        res.status(500).json({ error: 'Failed to fetch device' });
    }
});

// Create device
router.post('/', async (req, res) => {
    try {
        console.log('📝 Creating device with data:', req.body);
        const device = await Device.create(req.body);
        console.log('✅ Device created:', device.id);
        res.status(201).json(device);
    } catch (error) {
        console.error('❌ Error creating device:', error.message);
        console.error('Full error:', error);

        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: 'Device ID or Serial Number already exists' });
        }
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors.map(e => e.message)
            });
        }
        if (error.name === 'SequelizeConnectionError' || error.name === 'SequelizeConnectionRefusedError') {
            return res.status(500).json({ error: 'Database connection failed. Check your database configuration.' });
        }
        res.status(500).json({ error: 'Failed to create device', details: error.message });
    }
});

// Update device
router.put('/:id', async (req, res) => {
    try {
        const [updated] = await Device.update(req.body, {
            where: { id: req.params.id }
        });
        if (!updated) {
            return res.status(404).json({ error: 'Device not found' });
        }
        const device = await Device.findByPk(req.params.id);
        res.json(device);
    } catch (error) {
        console.error('Error updating device:', error);
        res.status(500).json({ error: 'Failed to update device' });
    }
});

// Assign device to worker
router.post('/:id/assign', async (req, res) => {
    try {
        const { workerId } = req.body;
        const device = await Device.findByPk(req.params.id);
        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }

        await device.update({
            workerId,
            status: workerId ? 'Active' : 'Available'
        });

        const updatedDevice = await Device.findByPk(req.params.id, {
            include: [{ model: Worker, as: 'worker' }]
        });
        res.json(updatedDevice);
    } catch (error) {
        console.error('Error assigning device:', error);
        res.status(500).json({ error: 'Failed to assign device' });
    }
});

// Archive device (soft delete)
router.patch('/:id/archive', async (req, res) => {
    try {
        const device = await Device.findByPk(req.params.id);
        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }
        await device.update({ archived: true });
        res.json({ message: 'Device archived successfully', device });
    } catch (error) {
        console.error('Error archiving device:', error);
        res.status(500).json({ error: 'Failed to archive device' });
    }
});

// Restore archived device
router.patch('/:id/restore', async (req, res) => {
    try {
        const device = await Device.findByPk(req.params.id);
        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }
        await device.update({ archived: false });
        res.json({ message: 'Device restored successfully', device });
    } catch (error) {
        console.error('Error restoring device:', error);
        res.status(500).json({ error: 'Failed to restore device' });
    }
});

// Delete device (hard delete)
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await Device.destroy({
            where: { id: req.params.id }
        });
        if (!deleted) {
            return res.status(404).json({ error: 'Device not found' });
        }
        res.json({ message: 'Device deleted successfully' });
    } catch (error) {
        console.error('Error deleting device:', error);
        res.status(500).json({ error: 'Failed to delete device' });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { EmergencyContact } = require('../models');

// Get all contacts (excluding archived by default)
router.get('/', async (req, res) => {
    try {
        const includeArchived = req.query.includeArchived === 'true';
        const whereClause = includeArchived ? {} : { archived: false };

        const contacts = await EmergencyContact.findAll({
            where: whereClause,
            order: [['priority', 'ASC'], ['createdAt', 'DESC']]
        });
        res.json(contacts);
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({ error: 'Failed to fetch contacts' });
    }
});

// Get single contact
router.get('/:id', async (req, res) => {
    try {
        const contact = await EmergencyContact.findByPk(req.params.id);
        if (!contact) {
            return res.status(404).json({ error: 'Contact not found' });
        }
        res.json(contact);
    } catch (error) {
        console.error('Error fetching contact:', error);
        res.status(500).json({ error: 'Failed to fetch contact' });
    }
});

// Create contact
router.post('/', async (req, res) => {
    try {
        const contact = await EmergencyContact.create(req.body);
        res.status(201).json(contact);
    } catch (error) {
        console.error('Error creating contact:', error);
        res.status(500).json({ error: 'Failed to create contact' });
    }
});

// Update contact
router.put('/:id', async (req, res) => {
    try {
        const [updated] = await EmergencyContact.update(req.body, {
            where: { id: req.params.id }
        });
        if (!updated) {
            return res.status(404).json({ error: 'Contact not found' });
        }
        const contact = await EmergencyContact.findByPk(req.params.id);
        res.json(contact);
    } catch (error) {
        console.error('Error updating contact:', error);
        res.status(500).json({ error: 'Failed to update contact' });
    }
});

// Archive contact (soft delete)
router.patch('/:id/archive', async (req, res) => {
    try {
        const contact = await EmergencyContact.findByPk(req.params.id);
        if (!contact) {
            return res.status(404).json({ error: 'Contact not found' });
        }
        await contact.update({ archived: true });
        res.json({ message: 'Contact archived successfully', contact });
    } catch (error) {
        console.error('Error archiving contact:', error);
        res.status(500).json({ error: 'Failed to archive contact' });
    }
});

// Delete contact (hard delete)
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await EmergencyContact.destroy({
            where: { id: req.params.id }
        });
        if (!deleted) {
            return res.status(404).json({ error: 'Contact not found' });
        }
        res.json({ message: 'Contact deleted successfully' });
    } catch (error) {
        console.error('Error deleting contact:', error);
        res.status(500).json({ error: 'Failed to delete contact' });
    }
});

module.exports = router;


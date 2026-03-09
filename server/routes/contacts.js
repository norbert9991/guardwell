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

// Send email to a specific contact
router.post('/:id/send-email', async (req, res) => {
    try {
        const contact = await EmergencyContact.findByPk(req.params.id);
        if (!contact) {
            return res.status(404).json({ error: 'Contact not found' });
        }
        if (!contact.email) {
            return res.status(400).json({ error: 'Contact does not have an email address' });
        }

        const { subject, message } = req.body;
        const emailService = require('../services/emailService');

        if (!emailService.isConfigured()) {
            return res.status(503).json({ error: 'Email service not configured. Set SMTP_USER and SMTP_PASS environment variables.' });
        }

        const result = await emailService.sendEmail({
            to: contact.email,
            subject: subject || '📋 Message from GuardWell Safety System',
            text: message || 'No message provided.',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #3B82F6, #1E40AF); color: white; padding: 20px; text-align: center;">
                        <h1 style="margin: 0;">📋 GuardWell Notification</h1>
                    </div>
                    <div style="padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb;">
                        <p style="color: #374151; line-height: 1.6;">${message || 'No message provided.'}</p>
                    </div>
                    <div style="padding: 15px; background: #1f2937; color: #9ca3af; text-align: center; font-size: 12px;">
                        <p style="margin: 0;">Sent from GuardWell Safety Monitoring System</p>
                    </div>
                </div>
            `
        });

        if (result.success) {
            console.log(`📧 Manual email sent to ${contact.name} (${contact.email})`);
            res.json({ success: true, message: `Email sent to ${contact.email}` });
        } else {
            console.error(`❌ Failed to send manual email to ${contact.email}:`, result.error);
            res.status(500).json({ error: `Failed to send email: ${result.error}` });
        }
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ error: 'Failed to send email' });
    }
});

module.exports = router;


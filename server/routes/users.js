const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'guardwell-secret-key-2024';

// Middleware to verify JWT and check admin role
const requireAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        const user = await User.findByPk(decoded.id);
        if (!user || user.status !== 'Active') {
            return res.status(401).json({ error: 'Invalid user' });
        }

        if (user.role !== 'Head Admin' && user.role !== 'Admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Get all users (admin only)
router.get('/', requireAdmin, async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['password'] },
            order: [['createdAt', 'DESC']]
        });
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Get single user
router.get('/:id', requireAdmin, async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id, {
            attributes: { exclude: ['password'] }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// Create new user (admin only)
router.post('/', requireAdmin, async (req, res) => {
    try {
        const { email, password, fullName, role, department, phone } = req.body;

        if (!email || !password || !fullName) {
            return res.status(400).json({ error: 'Email, password, and full name are required' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        // Check if email already exists
        const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Only Head Admin can create Admin users
        if (role === 'Head Admin' || (role === 'Admin' && req.user.role !== 'Head Admin')) {
            return res.status(403).json({ error: 'You do not have permission to create this user role' });
        }

        const user = await User.create({
            email: email.toLowerCase(),
            password,
            fullName,
            role: role || 'Safety Officer',
            department,
            phone,
            status: 'Active'
        });

        res.status(201).json({
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            department: user.department,
            phone: user.phone,
            status: user.status,
            createdAt: user.createdAt
        });
    } catch (error) {
        console.error('Error creating user:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: 'Email already registered' });
        }
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Update user
router.put('/:id', requireAdmin, async (req, res) => {
    try {
        const { fullName, role, department, phone, status } = req.body;

        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Prevent modifying Head Admin unless you are Head Admin
        if (user.role === 'Head Admin' && req.user.role !== 'Head Admin') {
            return res.status(403).json({ error: 'Cannot modify Head Admin' });
        }

        // Only Head Admin can change role to Admin
        if (role === 'Admin' && req.user.role !== 'Head Admin') {
            return res.status(403).json({ error: 'Only Head Admin can assign Admin role' });
        }

        await user.update({
            fullName: fullName || user.fullName,
            role: role || user.role,
            department: department !== undefined ? department : user.department,
            phone: phone !== undefined ? phone : user.phone,
            status: status || user.status
        });

        res.json({
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            department: user.department,
            phone: user.phone,
            status: user.status,
            updatedAt: user.updatedAt
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Reset user password (admin only)
router.post('/:id/reset-password', requireAdmin, async (req, res) => {
    try {
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ error: 'New password must be at least 8 characters' });
        }

        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Prevent modifying Head Admin unless you are Head Admin
        if (user.role === 'Head Admin' && req.user.role !== 'Head Admin') {
            return res.status(403).json({ error: 'Cannot reset Head Admin password' });
        }

        await user.update({ password: newPassword });

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

// Delete user (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Prevent deleting Head Admin
        if (user.role === 'Head Admin') {
            return res.status(403).json({ error: 'Cannot delete Head Admin' });
        }

        // Prevent admins from deleting other admins unless Head Admin
        if (user.role === 'Admin' && req.user.role !== 'Head Admin') {
            return res.status(403).json({ error: 'Only Head Admin can delete Admin users' });
        }

        await user.destroy();
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

module.exports = router;

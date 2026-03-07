const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Alert = sequelize.define('Alert', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    type: {
        // Changed from ENUM to STRING for PostgreSQL compatibility
        // Valid values: 'High Temperature', 'Gas Detection', 'Fall Detected', 
        // 'Emergency Button', 'Voice Alert', 'Low Battery', 'Device Offline', 'Geofence Violation'
        type: DataTypes.STRING(50),
        allowNull: false
    },
    severity: {
        // Changed from ENUM to STRING for PostgreSQL compatibility
        // Valid values: 'Low', 'Medium', 'High', 'Critical'
        type: DataTypes.STRING(20),
        allowNull: false
    },
    deviceId: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    workerId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'workers',
            key: 'id'
        }
    },
    triggerValue: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'The value that triggered the alert (e.g., 52.3°C)'
    },
    threshold: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'The threshold that was exceeded'
    },
    status: {
        // Simplified workflow: Pending → Acknowledged → Resolved
        // Valid values: 'Pending', 'Acknowledged', 'Resolved'
        type: DataTypes.STRING(20),
        defaultValue: 'Pending'
    },
    acknowledgedBy: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    acknowledgedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    resolvedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    // Response time tracking
    responseTimeMs: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Time in milliseconds from alert creation to acknowledgment'
    },
    // Auto-escalation fields
    escalated: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether this alert was auto-escalated due to no response'
    },
    escalatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the alert was escalated'
    },
    // Emergency queue workflow fields
    assignedTo: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Officer/Admin handling this emergency'
    },
    priority: {
        type: DataTypes.INTEGER,
        defaultValue: 3,
        comment: 'Priority 1-5 (1=highest)'
    },
    voiceCommand: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Voice command that triggered alert (e.g., tulong, aray)'
    },
    latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true
    },
    longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Notes added when acknowledging or resolving'
    },
    archived: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'alerts',
    timestamps: true
});

module.exports = Alert;

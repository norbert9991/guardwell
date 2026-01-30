const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Alert = sequelize.define('Alert', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    type: {
        type: DataTypes.ENUM(
            'High Temperature',
            'Gas Detection',
            'Fall Detected',
            'Emergency Button',
            'Voice Alert',
            'Low Battery',
            'Device Offline',
            'Geofence Violation'
        ),
        allowNull: false
    },
    severity: {
        type: DataTypes.ENUM('Low', 'Medium', 'High', 'Critical'),
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
        type: DataTypes.ENUM('Pending', 'Acknowledged', 'Responding', 'Resolved'),
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
    // New fields for emergency queue workflow
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
    responseNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Notes from responder during handling'
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
        allowNull: true
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

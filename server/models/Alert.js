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
            'Low Battery',
            'Device Offline'
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
        type: DataTypes.ENUM('Pending', 'Acknowledged', 'Resolved'),
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
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'alerts',
    timestamps: true
});

module.exports = Alert;

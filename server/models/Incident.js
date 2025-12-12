const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Incident = sequelize.define('Incident', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: DataTypes.STRING(200),
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM(
            'Equipment Failure',
            'Minor Injury',
            'Major Injury',
            'Near Miss',
            'Environmental Hazard',
            'Fire/Explosion',
            'Chemical Exposure'
        ),
        allowNull: false
    },
    severity: {
        type: DataTypes.ENUM('Low', 'Medium', 'High', 'Critical'),
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
    workerName: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    location: {
        type: DataTypes.STRING(200),
        allowNull: true
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    witnesses: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('Open', 'Under Investigation', 'Resolved', 'Closed'),
        defaultValue: 'Open'
    },
    alertId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Related alert if incident was auto-created from alert'
    },
    resolution: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    resolvedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    actionsTaken: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of actions taken with timestamps'
    },
    notes: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of notes with timestamps'
    },
    archived: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'incidents',
    timestamps: true
});

module.exports = Incident;

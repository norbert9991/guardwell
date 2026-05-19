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
    workerStatus: {
        type: DataTypes.ENUM('Unknown', 'Safe', 'Assisted', 'Rescued', 'Injured', 'Deceased'),
        defaultValue: 'Unknown',
        comment: 'Status of the worker involved in the incident'
    },
    notes: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: 'Array of notes added to the incident'
    },
    actionsTaken: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: 'Array of actions taken for the incident'
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

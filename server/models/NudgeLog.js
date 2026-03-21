const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NudgeLog = sequelize.define('NudgeLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    deviceId: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: 'Target device that was nudged'
    },
    workerId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'workers',
            key: 'id'
        },
        comment: 'Worker assigned to the device'
    },
    sentBy: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: 'Safety Officer',
        comment: 'Name of the officer who sent the nudge'
    },
    message: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Nudge message sent to the device'
    },
    status: {
        // Pending → Acknowledged / Expired
        type: DataTypes.STRING(20),
        defaultValue: 'Pending',
        comment: 'Pending = waiting for worker response, Acknowledged = worker tapped touch sensor, Expired = no response within time limit'
    },
    acknowledgedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the worker tapped the touch sensor to acknowledge'
    },
    expiredAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the nudge was marked as expired (no response)'
    },
    responseTimeMs: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Time in ms from nudge sent to touch sensor acknowledgment'
    },
    escalated: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether this nudge contributed to an auto-escalation'
    }
}, {
    tableName: 'nudge_logs',
    timestamps: true
});

module.exports = NudgeLog;

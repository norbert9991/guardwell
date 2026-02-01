const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Device = sequelize.define('Device', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    deviceId: {
        type: DataTypes.STRING(20),
        unique: true,
        allowNull: false
    },
    serialNumber: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('Vest', 'Helmet', 'Band'),
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
    battery: {
        type: DataTypes.INTEGER,
        defaultValue: 100
    },
    firmwareVersion: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    lastCommunication: {
        type: DataTypes.DATE,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('Active', 'Available', 'Maintenance', 'Offline'),
        defaultValue: 'Available'
    },
    archived: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'devices',
    timestamps: true
});

module.exports = Device;

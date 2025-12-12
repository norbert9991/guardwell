const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EmergencyContact = sequelize.define('EmergencyContact', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    number: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    type: {
        type: DataTypes.ENUM('Fire', 'Medical', 'Security', 'Management', 'External'),
        allowNull: false
    },
    priority: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 2,
        validate: {
            min: 1,
            max: 3
        }
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('Active', 'Inactive'),
        defaultValue: 'Active'
    },
    archived: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'emergency_contacts',
    timestamps: true
});

module.exports = EmergencyContact;

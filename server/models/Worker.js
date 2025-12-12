const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Worker = sequelize.define('Worker', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    employeeNumber: {
        type: DataTypes.STRING(20),
        unique: true,
        allowNull: false
    },
    fullName: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    department: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    position: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    contactNumber: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    emergencyContactName: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    emergencyContactNumber: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    dateHired: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    medicalConditions: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('Active', 'On Leave', 'Inactive'),
        defaultValue: 'Active'
    },
    archived: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'workers',
    timestamps: true
});

module.exports = Worker;

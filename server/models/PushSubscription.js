const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PushSubscription = sequelize.define('PushSubscription', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Users',
            key: 'id'
        }
    },
    endpoint: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true
    },
    p256dh: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    auth: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    userAgent: {
        type: DataTypes.STRING(500),
        allowNull: true
    }
}, {
    timestamps: true,
    tableName: 'PushSubscriptions'
});

module.exports = PushSubscription;

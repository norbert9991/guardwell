const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SensorData = sequelize.define('SensorData', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    deviceId: {
        type: DataTypes.STRING(20),
        allowNull: false,
        index: true
    },
    // DHT22 sensor
    temperature: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Temperature in Celsius from DHT22'
    },
    humidity: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Humidity percentage from DHT22'
    },
    // MQ2 gas sensor
    gasLevel: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Gas level PPM from MQ2 (0-4095 analog)'
    },
    // MPU6050 accelerometer/gyroscope
    accelX: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Acceleration X from MPU6050 m/s²'
    },
    accelY: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Acceleration Y from MPU6050 m/s²'
    },
    accelZ: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Acceleration Z from MPU6050 m/s²'
    },
    gyroX: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Gyroscope X from MPU6050 rad/s'
    },
    gyroY: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Gyroscope Y from MPU6050 rad/s'
    },
    gyroZ: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Gyroscope Z from MPU6050 rad/s'
    },
    // Touch sensor / emergency button
    emergencyButton: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Emergency button pressed (touch sensor)'
    },
    // Battery level from device
    battery: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    // Signal strength
    rssi: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'WiFi signal strength dBm'
    }
}, {
    tableName: 'sensor_data',
    timestamps: true,
    indexes: [
        {
            fields: ['deviceId', 'createdAt']
        }
    ]
});

module.exports = SensorData;

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
    },
    // Voice recognition (DFRobot DF2301Q)
    voiceCommand: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Voice command name (e.g., tulong_help, sakit_pain)'
    },
    voiceCommandId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Voice command ID from DF2301Q sensor'
    },
    voiceAlert: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether a voice alert was triggered'
    },
    voiceAlertType: {
        type: DataTypes.STRING(30),
        allowNull: true,
        comment: 'Type of voice alert (help, emergency, pain, fall_shock, call_nurse)'
    },
    // GPS (NEO-M8N)
    latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
        comment: 'GPS latitude from NEO-M8N'
    },
    longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
        comment: 'GPS longitude from NEO-M8N'
    },
    gpsSpeed: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'GPS speed in km/h'
    },
    gpsValid: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether GPS has a valid fix'
    },
    geofenceViolation: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether worker is outside the geofence'
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

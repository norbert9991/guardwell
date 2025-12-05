const express = require('express');
const router = express.Router();
const { SensorData, Alert, Device, Worker } = require('../models');

// Thresholds for alerts
const THRESHOLDS = {
    temperature: { warning: 40, critical: 50 },
    gasLevel: { warning: 200, critical: 400 },
    fallDetection: { threshold: 25 }, // m/s² acceleration magnitude
    battery: { low: 20 }
};

// Process sensor data and check for alerts
const processSensorData = async (data, io) => {
    try {
        // Save sensor data to database
        const sensorRecord = await SensorData.create({
            deviceId: data.device_id,
            temperature: data.temperature,
            humidity: data.humidity,
            gasLevel: data.gas_level,
            accelX: data.accel_x,
            accelY: data.accel_y,
            accelZ: data.accel_z,
            gyroX: data.gyro_x,
            gyroY: data.gyro_y,
            gyroZ: data.gyro_z,
            emergencyButton: data.emergency_button || false,
            battery: data.battery,
            rssi: data.rssi
        });

        // Update device last communication
        await Device.update(
            { lastCommunication: new Date(), battery: data.battery || 100 },
            { where: { deviceId: data.device_id } }
        );

        // Get worker info for the device
        const device = await Device.findOne({
            where: { deviceId: data.device_id },
            include: [{ model: Worker, as: 'worker' }]
        });
        const workerName = device?.worker?.fullName || 'Unknown Worker';
        const workerId = device?.worker?.id || null;

        // Check for alerts
        const alerts = [];

        // Emergency button (Touch sensor)
        if (data.emergency_button) {
            alerts.push({
                type: 'Emergency Button',
                severity: 'Critical',
                deviceId: data.device_id,
                workerId,
                triggerValue: 'Button Pressed',
                threshold: 'N/A'
            });
        }

        // Temperature check
        if (data.temperature) {
            if (data.temperature >= THRESHOLDS.temperature.critical) {
                alerts.push({
                    type: 'High Temperature',
                    severity: 'Critical',
                    deviceId: data.device_id,
                    workerId,
                    triggerValue: `${data.temperature}°C`,
                    threshold: `${THRESHOLDS.temperature.critical}°C`
                });
            } else if (data.temperature >= THRESHOLDS.temperature.warning) {
                alerts.push({
                    type: 'High Temperature',
                    severity: 'High',
                    deviceId: data.device_id,
                    workerId,
                    triggerValue: `${data.temperature}°C`,
                    threshold: `${THRESHOLDS.temperature.warning}°C`
                });
            }
        }

        // Gas level check
        if (data.gas_level) {
            if (data.gas_level >= THRESHOLDS.gasLevel.critical) {
                alerts.push({
                    type: 'Gas Detection',
                    severity: 'Critical',
                    deviceId: data.device_id,
                    workerId,
                    triggerValue: `${data.gas_level} PPM`,
                    threshold: `${THRESHOLDS.gasLevel.critical} PPM`
                });
            } else if (data.gas_level >= THRESHOLDS.gasLevel.warning) {
                alerts.push({
                    type: 'Gas Detection',
                    severity: 'High',
                    deviceId: data.device_id,
                    workerId,
                    triggerValue: `${data.gas_level} PPM`,
                    threshold: `${THRESHOLDS.gasLevel.warning} PPM`
                });
            }
        }

        // Fall detection based on acceleration magnitude
        if (data.accel_x !== undefined && data.accel_y !== undefined && data.accel_z !== undefined) {
            const accelMagnitude = Math.sqrt(
                data.accel_x ** 2 + data.accel_y ** 2 + data.accel_z ** 2
            );
            if (accelMagnitude >= THRESHOLDS.fallDetection.threshold) {
                alerts.push({
                    type: 'Fall Detected',
                    severity: 'Critical',
                    deviceId: data.device_id,
                    workerId,
                    triggerValue: `${accelMagnitude.toFixed(2)} m/s²`,
                    threshold: `${THRESHOLDS.fallDetection.threshold} m/s²`
                });
            }
        }

        // Low battery
        if (data.battery && data.battery <= THRESHOLDS.battery.low) {
            alerts.push({
                type: 'Low Battery',
                severity: 'Medium',
                deviceId: data.device_id,
                workerId,
                triggerValue: `${data.battery}%`,
                threshold: `${THRESHOLDS.battery.low}%`
            });
        }

        // Create alerts in database and emit via Socket.io
        for (const alertData of alerts) {
            const alert = await Alert.create(alertData);

            // Emit alert to all connected clients
            io.emit('alert', {
                id: alert.id,
                type: alert.type,
                severity: alert.severity,
                worker: workerName,
                device: data.device_id,
                triggerValue: alert.triggerValue,
                timestamp: new Date().toISOString(),
                status: 'Pending'
            });

            // Emit emergency alert for critical
            if (alert.severity === 'Critical') {
                io.emit('emergency_alert', {
                    id: alert.id,
                    type: alert.type,
                    worker_name: workerName,
                    device: data.device_id,
                    timestamp: new Date().toISOString()
                });
            }
        }

        // Emit sensor update to all connected clients
        io.emit('sensor_update', {
            device_id: data.device_id,
            temperature: data.temperature,
            humidity: data.humidity,
            gas_level: data.gas_level,
            battery: data.battery,
            rssi: data.rssi,
            accel_x: data.accel_x,
            accel_y: data.accel_y,
            accel_z: data.accel_z,
            worker_id: workerId,
            worker_name: workerName,
            createdAt: sensorRecord.createdAt
        });

        return { sensorRecord, alerts };
    } catch (error) {
        console.error('Error processing sensor data:', error);
        throw error;
    }
};

// POST /api/sensors/data - Receive sensor data from ESP32 via HTTP
router.post('/data', async (req, res) => {
    try {
        const result = await processSensorData(req.body, req.io);
        res.json({
            success: true,
            recordId: result.sensorRecord.id,
            alertsTriggered: result.alerts.length
        });
    } catch (error) {
        console.error('Error receiving sensor data:', error);
        res.status(500).json({ error: 'Failed to process sensor data' });
    }
});

// GET /api/sensors/latest/:deviceId - Get latest sensor data for a device
router.get('/latest/:deviceId', async (req, res) => {
    try {
        const data = await SensorData.findOne({
            where: { deviceId: req.params.deviceId },
            order: [['createdAt', 'DESC']]
        });
        res.json(data);
    } catch (error) {
        console.error('Error fetching sensor data:', error);
        res.status(500).json({ error: 'Failed to fetch sensor data' });
    }
});

// GET /api/sensors/history/:deviceId - Get sensor history
router.get('/history/:deviceId', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const data = await SensorData.findAll({
            where: { deviceId: req.params.deviceId },
            order: [['createdAt', 'DESC']],
            limit
        });
        res.json(data);
    } catch (error) {
        console.error('Error fetching sensor history:', error);
        res.status(500).json({ error: 'Failed to fetch sensor history' });
    }
});

module.exports = router;
module.exports.processSensorData = processSensorData;
module.exports.THRESHOLDS = THRESHOLDS;

const express = require('express');
const router = express.Router();
const { SensorData, Alert, Device, Worker, EmergencyContact } = require('../models');
const emailService = require('../services/emailService');

// Thresholds for alerts
const THRESHOLDS = {
    temperature: { warning: 40, critical: 50 },
    gasLevel: { warning: 200, critical: 400 },
    fallDetection: { threshold: 25 }, // m/s² acceleration magnitude
    battery: { low: 20 }
};

// Voice alert type mapping (DFRobot DF2301Q with Tagalog commands)
const VOICE_ALERT_TYPES = {
    help: { name: 'Voice Alert - Help', severity: 'Critical', tagalog: 'Tulong' },
    emergency: { name: 'Voice Alert - Emergency', severity: 'Critical', tagalog: 'Emergency' },
    fall_shock: { name: 'Voice Alert - Fall/Shock', severity: 'Critical', tagalog: 'Aray' },
    call_nurse: { name: 'Voice Alert - Call Nurse', severity: 'High', tagalog: 'Tawag' },
    pain: { name: 'Voice Alert - Pain', severity: 'High', tagalog: 'Sakit' }
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
            rssi: data.rssi,
            // Voice recognition fields
            voiceCommand: data.voice_command || null,
            voiceCommandId: data.voice_command_id || null,
            voiceAlert: data.voice_alert || false,
            voiceAlertType: data.alert_type || null
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

        // Voice alert (DFRobot DF2301Q)
        if (data.voice_alert && data.alert_type) {
            const voiceAlertInfo = VOICE_ALERT_TYPES[data.alert_type];
            if (voiceAlertInfo) {
                alerts.push({
                    type: voiceAlertInfo.name,
                    severity: voiceAlertInfo.severity,
                    deviceId: data.device_id,
                    workerId,
                    triggerValue: `Voice Command: "${voiceAlertInfo.tagalog}"`,
                    threshold: 'Voice Triggered'
                });
                console.log(`🎤 Voice Alert: ${voiceAlertInfo.tagalog} (${data.alert_type}) from ${data.device_id}`);
            }
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
                    voice_command: data.voice_command || null,
                    voice_alert_type: data.alert_type || null,
                    timestamp: new Date().toISOString()
                });

                // Send email notification to emergency contacts
                try {
                    const contacts = await EmergencyContact.findAll();
                    const emailList = contacts.map(c => c.email).filter(Boolean);

                    if (emailList.length > 0) {
                        if (alert.type === 'Emergency Button') {
                            await emailService.sendEmergencyAlert({
                                workerName,
                                location: device?.worker?.department || 'Unknown',
                                deviceId: data.device_id,
                                timestamp: new Date().toISOString(),
                                contacts: emailList
                            });
                        } else {
                            await emailService.sendThresholdAlert({
                                workerName,
                                sensorType: alert.type,
                                value: alert.triggerValue,
                                threshold: alert.threshold,
                                severity: alert.severity,
                                contacts: emailList
                            });
                        }
                    }
                } catch (emailError) {
                    console.error('Failed to send email notification:', emailError);
                }
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
            emergency_button: data.emergency_button,
            // Voice recognition data
            voice_command: data.voice_command,
            voice_command_id: data.voice_command_id,
            voice_alert: data.voice_alert,
            voice_alert_type: data.alert_type,
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

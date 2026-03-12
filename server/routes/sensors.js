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
            voiceAlertType: data.alert_type || null,
            // GPS fields (NEO-M8N)
            latitude: data.latitude || null,
            longitude: data.longitude || null,
            gpsSpeed: data.gps_speed || null,
            gpsValid: data.gps_valid || false,
            geofenceViolation: data.geofence_violation || false,
            gpsChars: data.gps_chars || 0
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

        // Geofence violation (GPS)
        if (data.geofence_violation) {
            alerts.push({
                type: 'Geofence Violation',
                severity: 'High',
                deviceId: data.device_id,
                workerId,
                triggerValue: `Left safe zone (${data.latitude?.toFixed(6)}, ${data.longitude?.toFixed(6)})`,
                threshold: '100m radius'
            });
            console.log(`📍 Geofence Alert: Worker left safe zone from ${data.device_id}`);
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

                // Queue emergency buzzer for all other devices (Emergency Button or Voice Alert)
                if (alert.type === 'Emergency Button' || alert.type.startsWith('Voice Alert')) {
                    await queueEmergencyBuzzer(data.device_id, workerName, alert.type);
                }

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
            // GPS data
            latitude: data.latitude,
            longitude: data.longitude,
            gps_speed: data.gps_speed,
            gps_valid: data.gps_valid,
            geofence_violation: data.geofence_violation,
            gps_chars: data.gps_chars,
            satellites: data.satellites || 0,
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

// ============================================
// NUDGE SYSTEM (Server ↔ ESP32)
// Enhanced: persists to NudgeLog, tracks count,
// auto-escalates after 3 unanswered nudges
// ============================================
const pendingNudges = {};  // In-memory for ESP32 polling (fast path)
const pendingEmergencyBuzzer = {};  // In-memory: { deviceId: { buzzer: true, sourceDevice, workerName, type, timestamp } }
const EMERGENCY_BUZZER_DURATION_MS = 30 * 1000; // Buzzer alert auto-expires after 30 seconds

// Helper: queue emergency buzzer for all OTHER active devices
const queueEmergencyBuzzer = async (sourceDeviceId, workerName, alertType) => {
    try {
        const allDevices = await Device.findAll({ where: { status: 'Active' } });
        const now = new Date().toISOString();
        for (const device of allDevices) {
            if (device.deviceId !== sourceDeviceId) {
                pendingEmergencyBuzzer[device.deviceId] = {
                    buzzer: true,
                    sourceDevice: sourceDeviceId,
                    workerName,
                    type: alertType,
                    timestamp: now
                };
                console.log(`🔔 Emergency buzzer queued for ${device.deviceId} (source: ${sourceDeviceId})`);
            }
        }
        // Auto-expire after 30 seconds
        setTimeout(() => {
            for (const device of allDevices) {
                if (device.deviceId !== sourceDeviceId) {
                    delete pendingEmergencyBuzzer[device.deviceId];
                }
            }
        }, EMERGENCY_BUZZER_DURATION_MS);
    } catch (error) {
        console.error('Error queuing emergency buzzers:', error);
    }
};

const NUDGE_EXPIRY_MS = 2 * 60 * 1000; // 2 minutes before a nudge is considered unanswered
const NUDGE_ESCALATION_THRESHOLD = 3;   // 3 unanswered nudges → auto-escalate

// Helper: count consecutive unanswered (Expired) nudges for a device
const getUnansweredCount = async (deviceId) => {
    const { NudgeLog } = require('../models');
    const expired = await NudgeLog.findAll({
        where: { deviceId, status: 'Expired' },
        order: [['createdAt', 'DESC']],
        limit: NUDGE_ESCALATION_THRESHOLD
    });
    // Count only if they are the most recent (no Acknowledged in between)
    const lastAck = await NudgeLog.findOne({
        where: { deviceId, status: 'Acknowledged' },
        order: [['createdAt', 'DESC']]
    });
    if (lastAck) {
        // Only count expired nudges AFTER the last acknowledgment
        const countAfterAck = await NudgeLog.count({
            where: {
                deviceId,
                status: 'Expired',
                createdAt: { [require('sequelize').Op.gt]: lastAck.createdAt }
            }
        });
        return countAfterAck;
    }
    return await NudgeLog.count({ where: { deviceId, status: 'Expired' } });
};

// POST /api/sensors/nudge/:deviceId — Safety officer sends a nudge from web dashboard
router.post('/nudge/:deviceId', async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { message, sentBy } = req.body;
        const { NudgeLog, Device, Worker } = require('../models');

        // Find the worker for this device
        const device = await Device.findOne({
            where: { deviceId },
            include: [{ model: Worker, as: 'worker' }]
        });
        const workerId = device?.worker?.id || null;
        const workerName = device?.worker?.fullName || 'Unknown Worker';

        // Save to database
        const nudgeLog = await NudgeLog.create({
            deviceId,
            workerId,
            sentBy: sentBy || 'Safety Officer',
            message: message || `Check-in requested for ${workerName}`,
            status: 'Pending'
        });

        // Store in memory for ESP32 polling
        pendingNudges[deviceId] = {
            nudge: true,
            nudgeLogId: nudgeLog.id,
            message: nudgeLog.message,
            timestamp: nudgeLog.createdAt.toISOString(),
            sentBy: nudgeLog.sentBy
        };

        // Get current unanswered count (expired only, not including this pending one)
        const unansweredCount = await getUnansweredCount(deviceId);

        console.log(`📢 Nudge #${unansweredCount + 1} queued for ${deviceId} (${workerName}) by ${nudgeLog.sentBy}`);

        // Emit via Socket.io
        if (req.io) {
            req.io.emit('nudge_sent', {
                deviceId,
                workerId,
                workerName,
                nudgeLogId: nudgeLog.id,
                message: nudgeLog.message,
                timestamp: nudgeLog.createdAt.toISOString(),
                sentBy: nudgeLog.sentBy,
                unansweredCount
            });
        }

        res.json({
            success: true,
            message: `Nudge queued for ${deviceId}`,
            nudgeLogId: nudgeLog.id,
            unansweredCount
        });
    } catch (error) {
        console.error('Error sending nudge:', error);
        res.status(500).json({ error: 'Failed to send nudge' });
    }
});

// GET /api/sensors/nudge/:deviceId — ESP32 polls for pending nudges
router.get('/nudge/:deviceId', (req, res) => {
    const { deviceId } = req.params;
    const nudge = pendingNudges[deviceId];

    if (nudge && nudge.nudge) {
        res.json(nudge);
    } else {
        res.json({ nudge: false });
    }
});

// POST /api/sensors/nudge/:deviceId/ack — ESP32 acknowledges the nudge (worker tapped touch sensor)
router.post('/nudge/:deviceId/ack', async (req, res) => {
    const { deviceId } = req.params;
    const { NudgeLog, Device, Worker } = require('../models');

    try {
        // Find the latest pending nudge for this device
        const latestNudge = await NudgeLog.findOne({
            where: { deviceId, status: 'Pending' },
            order: [['createdAt', 'DESC']]
        });

        // Get worker info for the device
        const device = await Device.findOne({
            where: { deviceId },
            include: [{ model: Worker, as: 'worker' }]
        });
        const workerName = device?.worker?.fullName || 'Unknown Worker';
        const workerId = device?.worker?.id || null;

        if (latestNudge) {
            const responseTimeMs = Date.now() - new Date(latestNudge.createdAt).getTime();
            await latestNudge.update({
                status: 'Acknowledged',
                acknowledgedAt: new Date(),
                responseTimeMs
            });
            console.log(`✅ Nudge acknowledged by ${deviceId} (${workerName}) in ${(responseTimeMs / 1000).toFixed(1)}s`);

            // Emit acknowledgement to dashboard with worker info
            if (req.io) {
                req.io.emit('nudge_acknowledged', {
                    deviceId,
                    workerId,
                    workerName,
                    nudgeLogId: latestNudge.id,
                    message: latestNudge.message,
                    responseTimeMs,
                    timestamp: new Date().toISOString()
                });
            }
        }

        // Clear from in-memory map
        delete pendingNudges[deviceId];
        res.json({ success: true });
    } catch (error) {
        console.error('Error acknowledging nudge:', error);
        delete pendingNudges[deviceId];
        res.json({ success: true });
    }
});

// GET /api/sensors/nudge/:deviceId/history — Get nudge history for a device
router.get('/nudge/:deviceId/history', async (req, res) => {
    try {
        const { NudgeLog, Worker } = require('../models');
        const limit = parseInt(req.query.limit) || 50;
        const logs = await NudgeLog.findAll({
            where: { deviceId: req.params.deviceId },
            include: [{ model: Worker, as: 'worker', attributes: ['id', 'fullName', 'department'] }],
            order: [['createdAt', 'DESC']],
            limit
        });
        res.json(logs);
    } catch (error) {
        console.error('Error fetching nudge history:', error);
        res.status(500).json({ error: 'Failed to fetch nudge history' });
    }
});

// GET /api/sensors/nudge/:deviceId/count — Get unanswered nudge count for a device
router.get('/nudge/:deviceId/count', async (req, res) => {
    try {
        const count = await getUnansweredCount(req.params.deviceId);
        res.json({ deviceId: req.params.deviceId, unansweredCount: count });
    } catch (error) {
        console.error('Error fetching nudge count:', error);
        res.status(500).json({ error: 'Failed to fetch nudge count' });
    }
});

// GET /api/sensors/nudge-logs — Get ALL nudge logs (for the Nudge Logs page)
router.get('/nudge-logs', async (req, res) => {
    try {
        const { NudgeLog, Worker } = require('../models');
        const limit = parseInt(req.query.limit) || 100;
        const status = req.query.status; // optional filter: Pending, Acknowledged, Expired

        const where = {};
        if (status) where.status = status;

        const logs = await NudgeLog.findAll({
            where,
            include: [{ model: Worker, as: 'worker', attributes: ['id', 'fullName', 'department'] }],
            order: [['createdAt', 'DESC']],
            limit
        });

        // Also get summary stats
        const totalNudges = await NudgeLog.count();
        const pendingCount = await NudgeLog.count({ where: { status: 'Pending' } });
        const acknowledgedCount = await NudgeLog.count({ where: { status: 'Acknowledged' } });
        const expiredCount = await NudgeLog.count({ where: { status: 'Expired' } });
        const escalatedCount = await NudgeLog.count({ where: { escalated: true } });

        res.json({
            logs,
            stats: {
                total: totalNudges,
                pending: pendingCount,
                acknowledged: acknowledgedCount,
                expired: expiredCount,
                escalated: escalatedCount
            }
        });
    } catch (error) {
        console.error('Error fetching nudge logs:', error);
        res.status(500).json({ error: 'Failed to fetch nudge logs' });
    }
});

// ============================================
// NUDGE EXPIRY & AUTO-ESCALATION TIMER
// Runs every 60 seconds to check for expired nudges
// ============================================
const startNudgeExpiryTimer = (io) => {
    setInterval(async () => {
        try {
            const { NudgeLog, Alert, Device, Worker, EmergencyContact } = require('../models');
            const { Op } = require('sequelize');

            const expiryTime = new Date(Date.now() - NUDGE_EXPIRY_MS);

            // Find pending nudges older than the expiry time
            const expiredNudges = await NudgeLog.findAll({
                where: {
                    status: 'Pending',
                    createdAt: { [Op.lt]: expiryTime }
                }
            });

            for (const nudge of expiredNudges) {
                // Mark as expired
                await nudge.update({
                    status: 'Expired',
                    expiredAt: new Date()
                });

                // Also clean from in-memory
                delete pendingNudges[nudge.deviceId];

                console.log(`⏰ Nudge expired for ${nudge.deviceId} (sent by ${nudge.sentBy})`);

                // Check unanswered count for this device
                const unansweredCount = await getUnansweredCount(nudge.deviceId);

                // Emit updated count to dashboard
                if (io) {
                    io.emit('nudge_expired', {
                        deviceId: nudge.deviceId,
                        nudgeLogId: nudge.id,
                        unansweredCount,
                        timestamp: new Date().toISOString()
                    });
                }

                // AUTO-ESCALATION: if 3+ unanswered nudges
                if (unansweredCount >= NUDGE_ESCALATION_THRESHOLD) {
                    // Check if we already escalated recently (within last 10 min) to avoid spam
                    const recentEscalation = await Alert.findOne({
                        where: {
                            deviceId: nudge.deviceId,
                            type: 'Unresponsive Worker',
                            createdAt: { [Op.gt]: new Date(Date.now() - 10 * 60 * 1000) }
                        }
                    });

                    if (!recentEscalation) {
                        // Get worker info
                        const device = await Device.findOne({
                            where: { deviceId: nudge.deviceId },
                            include: [{ model: Worker, as: 'worker' }]
                        });
                        const workerName = device?.worker?.fullName || 'Unknown Worker';
                        const workerId = device?.worker?.id || null;

                        // Create critical alert
                        const alert = await Alert.create({
                            type: 'Unresponsive Worker',
                            severity: 'Critical',
                            deviceId: nudge.deviceId,
                            workerId,
                            triggerValue: `${unansweredCount} unanswered nudges`,
                            threshold: `${NUDGE_ESCALATION_THRESHOLD} nudges`,
                            status: 'Pending',
                            escalated: true,
                            escalatedAt: new Date(),
                            priority: 1,
                            notes: `Worker ${workerName} has not responded to ${unansweredCount} consecutive nudges. Auto-escalated to priority 1.`
                        });

                        // Mark the expired nudges as part of escalation
                        await NudgeLog.update(
                            { escalated: true },
                            {
                                where: {
                                    deviceId: nudge.deviceId,
                                    status: 'Expired',
                                    escalated: false
                                }
                            }
                        );

                        console.log(`🚨 AUTO-ESCALATION: ${workerName} (${nudge.deviceId}) — ${unansweredCount} unanswered nudges → Priority 1 alert created`);

                        // Emit emergency alert
                        if (io) {
                            io.emit('alert', {
                                id: alert.id,
                                type: 'Unresponsive Worker',
                                severity: 'Critical',
                                worker: workerName,
                                device: nudge.deviceId,
                                triggerValue: alert.triggerValue,
                                timestamp: new Date().toISOString(),
                                status: 'Pending'
                            });

                            io.emit('emergency_alert', {
                                id: alert.id,
                                type: 'Unresponsive Worker',
                                worker_name: workerName,
                                device: nudge.deviceId,
                                timestamp: new Date().toISOString()
                            });

                            io.emit('nudge_escalated', {
                                deviceId: nudge.deviceId,
                                workerId,
                                workerName,
                                unansweredCount,
                                alertId: alert.id,
                                timestamp: new Date().toISOString()
                            });
                        }

                        // Send email notification
                        try {
                            const contacts = await EmergencyContact.findAll();
                            const emailList = contacts.map(c => c.email).filter(Boolean);
                            if (emailList.length > 0) {
                                await emailService.sendThresholdAlert({
                                    workerName,
                                    sensorType: 'Unresponsive Worker',
                                    value: `${unansweredCount} unanswered nudges`,
                                    threshold: `${NUDGE_ESCALATION_THRESHOLD} nudges`,
                                    severity: 'Critical',
                                    contacts: emailList
                                });
                            }
                        } catch (emailError) {
                            console.error('Failed to send escalation email:', emailError);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error in nudge expiry timer:', error);
        }
    }, 60 * 1000); // Check every 60 seconds
};

// ============================================
// EMERGENCY BUZZER POLLING (Server → ESP32)
// Each device polls this; if an emergency was triggered
// by another device, it receives a buzzer command
// ============================================
router.get('/emergency-buzzer/:deviceId', (req, res) => {
    const { deviceId } = req.params;
    const buzzerData = pendingEmergencyBuzzer[deviceId];

    if (buzzerData && buzzerData.buzzer) {
        // Return the buzzer command and clear it (one-shot)
        delete pendingEmergencyBuzzer[deviceId];
        res.json(buzzerData);
    } else {
        res.json({ buzzer: false });
    }
});

module.exports = router;
module.exports.processSensorData = processSensorData;
module.exports.THRESHOLDS = THRESHOLDS;
module.exports.startNudgeExpiryTimer = startNudgeExpiryTimer;
module.exports.queueEmergencyBuzzer = queueEmergencyBuzzer;

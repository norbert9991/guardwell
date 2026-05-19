require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const mqtt = require('mqtt');

const { testConnection } = require('./config/database');
const { syncDatabase } = require('./models');
const emailService = require('./services/emailService');
const escalationService = require('./services/escalationService');

// Import routes
const workersRouter = require('./routes/workers');
const devicesRouter = require('./routes/devices');
const sensorsRouter = require('./routes/sensors');
const alertsRouter = require('./routes/alerts');
const incidentsRouter = require('./routes/incidents');
const contactsRouter = require('./routes/contacts');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const reportsRouter = require('./routes/reports');

const app = express();
const server = http.createServer(app);

// Helper function to get allowed origins
const getAllowedOrigins = () => {
    const origins = [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173'
    ];

    // Add CLIENT_URL if set
    if (process.env.CLIENT_URL) {
        let clientUrl = process.env.CLIENT_URL.trim();
        // Add https:// if missing
        if (!clientUrl.startsWith('http://') && !clientUrl.startsWith('https://')) {
            clientUrl = 'https://' + clientUrl;
        }
        origins.push(clientUrl);
        // Also add without trailing slash
        origins.push(clientUrl.replace(/\/$/, ''));
    }

    console.log('✅ Allowed CORS origins:', origins);
    return origins;
};

const allowedOrigins = getAllowedOrigins();

// Socket.io setup with proper CORS
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// MQTT setup for ESP32
const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://localhost:1883';
let mqttClient = null;

const connectMQTT = () => {
    mqttClient = mqtt.connect(MQTT_BROKER, {
        clientId: `guardwell_server_${Date.now()}`,
        clean: true,
        reconnectPeriod: 5000
    });

    mqttClient.on('connect', () => {
        console.log('✅ Connected to MQTT broker');
        // Subscribe to sensor data topics
        mqttClient.subscribe('guardwell/sensors/#', (err) => {
            if (!err) {
                console.log('📡 Subscribed to guardwell/sensors/#');
            }
        });
        mqttClient.subscribe('guardwell/emergency/#', (err) => {
            if (!err) {
                console.log('🚨 Subscribed to guardwell/emergency/#');
            }
        });
    });

    mqttClient.on('message', async (topic, message) => {
        try {
            const payload = JSON.parse(message.toString());
            console.log(`📥 MQTT [${topic}]:`, payload);

            if (topic.startsWith('guardwell/sensors/')) {
                // Process sensor data
                const deviceId = topic.split('/')[2];
                const sensorData = { ...payload, device_id: deviceId };

                // Broadcast to all connected clients
                io.emit('sensor_update', sensorData);

                // Store in database via sensors route logic
                const { processSensorData } = require('./routes/sensors');
                await processSensorData(sensorData, io);
            }

            if (topic.startsWith('guardwell/emergency/')) {
                // Handle emergency button press - SAVE TO DATABASE
                const deviceId = topic.split('/')[2];

                try {
                    const { Alert, Device, Worker } = require('./models');

                    // Find device and associated worker
                    const device = await Device.findOne({
                        where: { deviceId },
                        include: [{ model: Worker, as: 'worker' }]
                    });

                    // Determine alert type
                    let alertType = 'Emergency Button';
                    let voiceCommand = null;
                    if (payload.voice_alert) {
                        alertType = 'Voice Alert';
                        voiceCommand = payload.voice_command || null;
                    }

                    // Create alert in database
                    const alert = await Alert.create({
                        type: alertType,
                        severity: 'Critical',
                        deviceId: deviceId,
                        workerId: device?.worker?.id || null,
                        priority: 1, // Highest priority for emergencies
                        voiceCommand: voiceCommand,
                        latitude: payload.latitude || null,
                        longitude: payload.longitude || null,
                        triggerValue: voiceCommand || 'Button Pressed'
                    });

                    // Fetch the complete alert with worker info
                    const savedAlert = await Alert.findByPk(alert.id, {
                        include: [{ model: Worker, as: 'worker' }]
                    });

                    console.log('🚨 Emergency saved to database:', savedAlert.id);

                    // Broadcast to all connected clients with database ID
                    io.emit('emergency_alert', {
                        id: savedAlert.id,
                        device: deviceId,
                        device_id: deviceId,
                        type: alertType,
                        severity: 'Critical',
                        status: 'Pending',
                        timestamp: savedAlert.createdAt,
                        worker_name: device?.worker?.fullName || payload.worker_name || 'Unknown Worker',
                        workerId: device?.worker?.id || null,
                        voice_command: voiceCommand,
                        latitude: payload.latitude,
                        longitude: payload.longitude,
                        alert: savedAlert
                    });

                    // Queue emergency buzzer for all other devices
                    try {
                        const { queueEmergencyBuzzer } = require('./routes/sensors');
                        const workerName = device?.worker?.fullName || payload.worker_name || 'Unknown Worker';
                        await queueEmergencyBuzzer(deviceId, workerName, alertType);
                    } catch (buzzerError) {
                        console.error('Failed to queue emergency buzzers:', buzzerError);
                    }

                    // Send email notification to emergency contacts
                    try {
                        const { EmergencyContact } = require('./models');
                        const contacts = await EmergencyContact.findAll();
                        const emailList = contacts.map(c => c.email).filter(Boolean);
                        const workerName = device?.worker?.fullName || payload.worker_name || 'Unknown Worker';

                        if (emailList.length > 0) {
                            if (alertType === 'Emergency Button') {
                                await emailService.sendEmergencyAlert({
                                    workerName,
                                    location: device?.worker?.department || 'Unknown',
                                    deviceId: deviceId,
                                    timestamp: new Date().toISOString(),
                                    contacts: emailList
                                });
                            } else {
                                await emailService.sendThresholdAlert({
                                    workerName,
                                    sensorType: alertType,
                                    value: voiceCommand || 'Button Pressed',
                                    threshold: 'N/A',
                                    severity: 'Critical',
                                    contacts: emailList
                                });
                            }
                            console.log(`📧 Emergency email sent to ${emailList.length} contacts`);
                        } else {
                            console.warn('⚠️ No emergency contacts have email addresses');
                        }
                    } catch (emailError) {
                        console.error('Failed to send emergency email:', emailError);
                    }
                } catch (dbError) {
                    console.error('Error saving emergency to database:', dbError);
                    // Still broadcast even if DB save fails
                    io.emit('emergency_alert', {
                        device: deviceId,
                        device_id: deviceId,
                        type: 'Emergency Button',
                        severity: 'Critical',
                        timestamp: new Date().toISOString(),
                        ...payload
                    });
                }
            }
        } catch (error) {
            console.error('Error processing MQTT message:', error);
        }
    });

    mqttClient.on('error', (error) => {
        console.error('❌ MQTT error:', error);
    });

    mqttClient.on('close', () => {
        console.log('⚠️ MQTT connection closed');
    });
};

// Middleware
app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Make io and mqttClient available to routes
app.use((req, res, next) => {
    req.io = io;
    req.mqttClient = mqttClient;
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Database health check
app.get('/health/db', async (req, res) => {
    try {
        const { sequelize } = require('./config/database');
        await sequelize.authenticate();
        res.json({
            status: 'connected',
            database: process.env.MYSQL_DATABASE || 'guardwell',
            host: process.env.MYSQL_HOST || 'localhost'
        });
    } catch (error) {
        res.status(500).json({
            status: 'disconnected',
            error: error.message,
            hint: 'Check your MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE environment variables'
        });
    }
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/workers', workersRouter);
app.use('/api/devices', devicesRouter);
app.use('/api/sensors', sensorsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/incidents', incidentsRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/reports', reportsRouter);

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);

    socket.on('acknowledge_alert', async ({ alertId }) => {
        try {
            const { Alert } = require('./models');
            await Alert.update(
                {
                    status: 'Acknowledged',
                    acknowledgedAt: new Date()
                },
                { where: { id: alertId } }
            );
            io.emit('alert_updated', { alertId, status: 'Acknowledged' });
        } catch (error) {
            console.error('Error acknowledging alert:', error);
        }
    });

    // Handle system-wide emergency broadcast (from Dashboard / Emergency Contacts page)
    socket.on('emergency_broadcast', async (data) => {
        console.log('🚨 SYSTEM EMERGENCY BROADCAST received:', data);
        try {
            const { Alert, Device, EmergencyContact } = require('./models');
            const { queueEmergencyBuzzer } = require('./routes/sensors');

            // Create alert in database
            const alert = await Alert.create({
                type: 'System Emergency',
                severity: 'Critical',
                deviceId: 'ALL',
                triggerValue: data.message || 'System-wide emergency activated by operator',
                threshold: 'Manual activation'
            });

            // Emit emergency_alert to all clients (triggers GlobalEmergencyAlert overlay)
            io.emit('emergency_alert', {
                id: alert.id,
                type: 'System Emergency',
                worker_name: 'All Workers',
                device: 'ALL',
                timestamp: data.timestamp || new Date().toISOString()
            });

            io.emit('alert', {
                id: alert.id,
                type: 'System Emergency',
                severity: 'Critical',
                worker: 'All Workers',
                device: 'ALL',
                triggerValue: alert.triggerValue,
                timestamp: data.timestamp || new Date().toISOString(),
                status: 'Pending'
            });

            // Queue emergency buzzer for ALL active devices
            const allDevices = await Device.findAll({ where: { status: 'Active' } });
            for (const device of allDevices) {
                await queueEmergencyBuzzer(device.deviceId, 'System Emergency', 'System Emergency');
            }

            // Send email to all emergency contacts
            try {
                const contacts = await EmergencyContact.findAll();
                const emailList = contacts.map(c => c.email).filter(Boolean);
                if (emailList.length > 0) {
                    await emailService.sendEmergencyAlert({
                        workerName: 'System-Wide Emergency',
                        location: data.source || 'Admin Panel',
                        deviceId: 'ALL',
                        timestamp: data.timestamp || new Date().toISOString(),
                        contacts: emailList
                    });
                }
            } catch (emailError) {
                console.error('Failed to send emergency broadcast email:', emailError);
            }

            console.log(`🚨 System emergency processed: Alert #${alert.id}, buzzers queued for ${allDevices.length} devices`);
        } catch (error) {
            console.error('Error processing emergency broadcast:', error);
        }
    });

    // Handle worker marked safe
    socket.on('worker_marked_safe', (data) => {
        console.log('✅ Worker marked safe:', data);
        io.emit('worker_marked_safe', data);
    });

    socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id);
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 3001;

const startServer = async () => {
    await testConnection();
    await syncDatabase();

    // Initialize email service (Gmail SMTP via Nodemailer)
    emailService.initEmail();

    // Start alert escalation monitoring service
    escalationService.startEscalationService(io);

    // Start nudge expiry & auto-escalation timer
    const { startNudgeExpiryTimer } = require('./routes/sensors');
    startNudgeExpiryTimer(io);

    // Connect to MQTT if broker is configured
    if (process.env.MQTT_BROKER) {
        connectMQTT();
    } else {
        console.log('⚠️ MQTT_BROKER not configured, skipping MQTT connection');
    }

    server.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📡 Socket.io ready`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
};

startServer();

module.exports = { app, io, mqttClient };

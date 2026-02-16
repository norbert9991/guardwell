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
app.use(express.json());

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

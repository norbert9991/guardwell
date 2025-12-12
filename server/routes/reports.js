const express = require('express');
const router = express.Router();
const { Worker, Device, Alert, Incident, SensorData } = require('../models');
const { Op, fn, col, literal } = require('sequelize');

// Helper function to get date range
const getDateRange = (startDate, endDate) => {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
};

// Worker Safety Report
router.get('/worker-safety', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const { start, end } = getDateRange(startDate, endDate);

        // Get all workers
        const workers = await Worker.findAll({
            where: { archived: false },
            include: [{ model: Incident, as: 'incidents' }]
        });

        // Get incidents in date range
        const incidents = await Incident.findAll({
            where: {
                createdAt: { [Op.between]: [start, end] },
                archived: false
            }
        });

        // Get alerts in date range
        const alerts = await Alert.findAll({
            where: {
                createdAt: { [Op.between]: [start, end] },
                archived: false
            }
        });

        // Calculate statistics
        const incidentsBySeverity = {
            Critical: incidents.filter(i => i.severity === 'Critical').length,
            High: incidents.filter(i => i.severity === 'High').length,
            Medium: incidents.filter(i => i.severity === 'Medium').length,
            Low: incidents.filter(i => i.severity === 'Low').length
        };

        const incidentsByType = {};
        incidents.forEach(i => {
            incidentsByType[i.type] = (incidentsByType[i.type] || 0) + 1;
        });

        const incidentsByStatus = {
            Open: incidents.filter(i => i.status === 'Open').length,
            'Under Investigation': incidents.filter(i => i.status === 'Under Investigation').length,
            Resolved: incidents.filter(i => i.status === 'Resolved').length,
            Closed: incidents.filter(i => i.status === 'Closed').length
        };

        // Workers with most incidents
        const workerIncidentCount = {};
        incidents.forEach(i => {
            if (i.workerName) {
                workerIncidentCount[i.workerName] = (workerIncidentCount[i.workerName] || 0) + 1;
            }
        });
        const topWorkersByIncidents = Object.entries(workerIncidentCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        res.json({
            summary: {
                totalWorkers: workers.length,
                activeWorkers: workers.filter(w => w.status === 'Active').length,
                totalIncidents: incidents.length,
                totalAlerts: alerts.length,
                criticalIncidents: incidentsBySeverity.Critical,
                resolvedIncidents: incidentsByStatus.Resolved + incidentsByStatus.Closed
            },
            incidentsBySeverity,
            incidentsByType,
            incidentsByStatus,
            topWorkersByIncidents,
            dateRange: { start, end }
        });
    } catch (error) {
        console.error('Error generating worker safety report:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

// Device Performance Report
router.get('/device-performance', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const { start, end } = getDateRange(startDate, endDate);

        // Get all devices
        const devices = await Device.findAll({
            where: { archived: false },
            include: [{ model: Worker, as: 'worker' }]
        });

        // Get sensor data in date range
        const sensorData = await SensorData.findAll({
            where: {
                createdAt: { [Op.between]: [start, end] }
            },
            order: [['createdAt', 'DESC']],
            limit: 10000
        });

        // Device status breakdown
        const devicesByStatus = {
            Active: devices.filter(d => d.status === 'Active').length,
            Available: devices.filter(d => d.status === 'Available').length,
            Maintenance: devices.filter(d => d.status === 'Maintenance').length,
            Offline: devices.filter(d => d.status === 'Offline').length
        };

        // Device type breakdown
        const devicesByType = {};
        devices.forEach(d => {
            devicesByType[d.type] = (devicesByType[d.type] || 0) + 1;
        });

        // Battery statistics
        const batteryStats = {
            low: devices.filter(d => d.battery < 20).length,
            medium: devices.filter(d => d.battery >= 20 && d.battery < 50).length,
            good: devices.filter(d => d.battery >= 50).length,
            avgBattery: devices.length > 0
                ? Math.round(devices.reduce((sum, d) => sum + (d.battery || 0), 0) / devices.length)
                : 0
        };

        // Devices without recent communication (offline > 1 hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const offlineDevices = devices.filter(d =>
            !d.lastCommunication || new Date(d.lastCommunication) < oneHourAgo
        );

        // Sensor reading averages
        const avgReadings = {
            temperature: sensorData.length > 0
                ? Math.round(sensorData.reduce((sum, s) => sum + (s.temperature || 0), 0) / sensorData.length * 10) / 10
                : 0,
            humidity: sensorData.length > 0
                ? Math.round(sensorData.reduce((sum, s) => sum + (s.humidity || 0), 0) / sensorData.length * 10) / 10
                : 0,
            gasLevel: sensorData.length > 0
                ? Math.round(sensorData.reduce((sum, s) => sum + (s.gasLevel || 0), 0) / sensorData.length)
                : 0
        };

        res.json({
            summary: {
                totalDevices: devices.length,
                activeDevices: devicesByStatus.Active,
                assignedDevices: devices.filter(d => d.workerId).length,
                offlineDevices: offlineDevices.length,
                avgBattery: batteryStats.avgBattery
            },
            devicesByStatus,
            devicesByType,
            batteryStats,
            avgReadings,
            offlineDevices: offlineDevices.map(d => ({
                deviceId: d.deviceId,
                type: d.type,
                lastCommunication: d.lastCommunication,
                worker: d.worker?.fullName || 'Unassigned'
            })),
            dateRange: { start, end }
        });
    } catch (error) {
        console.error('Error generating device performance report:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

// Alert Analytics Report
router.get('/alert-analytics', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const { start, end } = getDateRange(startDate, endDate);

        // Get alerts in date range
        const alerts = await Alert.findAll({
            where: {
                createdAt: { [Op.between]: [start, end] },
                archived: false
            },
            include: [{ model: Worker, as: 'worker' }],
            order: [['createdAt', 'DESC']]
        });

        // Alerts by type
        const alertsByType = {};
        alerts.forEach(a => {
            alertsByType[a.type] = (alertsByType[a.type] || 0) + 1;
        });

        // Alerts by severity
        const alertsBySeverity = {
            Critical: alerts.filter(a => a.severity === 'Critical').length,
            High: alerts.filter(a => a.severity === 'High').length,
            Medium: alerts.filter(a => a.severity === 'Medium').length,
            Low: alerts.filter(a => a.severity === 'Low').length
        };

        // Alerts by status
        const alertsByStatus = {
            Pending: alerts.filter(a => a.status === 'Pending').length,
            Acknowledged: alerts.filter(a => a.status === 'Acknowledged').length,
            Resolved: alerts.filter(a => a.status === 'Resolved').length
        };

        // Average response time (time to acknowledge)
        const acknowledgedAlerts = alerts.filter(a => a.acknowledgedAt);
        const avgResponseTime = acknowledgedAlerts.length > 0
            ? Math.round(acknowledgedAlerts.reduce((sum, a) => {
                const created = new Date(a.createdAt);
                const acknowledged = new Date(a.acknowledgedAt);
                return sum + (acknowledged - created) / 1000 / 60; // minutes
            }, 0) / acknowledgedAlerts.length)
            : 0;

        // Daily alert counts for trend
        const dailyAlerts = {};
        alerts.forEach(a => {
            const date = new Date(a.createdAt).toISOString().split('T')[0];
            dailyAlerts[date] = (dailyAlerts[date] || 0) + 1;
        });

        // Top devices by alerts
        const deviceAlertCount = {};
        alerts.forEach(a => {
            if (a.deviceId) {
                deviceAlertCount[a.deviceId] = (deviceAlertCount[a.deviceId] || 0) + 1;
            }
        });
        const topDevicesByAlerts = Object.entries(deviceAlertCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([deviceId, count]) => ({ deviceId, count }));

        res.json({
            summary: {
                totalAlerts: alerts.length,
                criticalAlerts: alertsBySeverity.Critical,
                pendingAlerts: alertsByStatus.Pending,
                resolvedAlerts: alertsByStatus.Resolved,
                avgResponseTimeMinutes: avgResponseTime
            },
            alertsByType,
            alertsBySeverity,
            alertsByStatus,
            dailyAlerts: Object.entries(dailyAlerts)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([date, count]) => ({ date, count })),
            topDevicesByAlerts,
            dateRange: { start, end }
        });
    } catch (error) {
        console.error('Error generating alert analytics report:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

// Compliance Report
router.get('/compliance', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const { start, end } = getDateRange(startDate, endDate);

        // Get data
        const workers = await Worker.findAll({ where: { archived: false } });
        const devices = await Device.findAll({ where: { archived: false } });
        const incidents = await Incident.findAll({
            where: {
                createdAt: { [Op.between]: [start, end] },
                archived: false
            }
        });
        const alerts = await Alert.findAll({
            where: {
                createdAt: { [Op.between]: [start, end] },
                archived: false
            }
        });

        // Calculate metrics
        const workersWithDevices = devices.filter(d => d.workerId).length;
        const deviceCoverage = workers.length > 0
            ? Math.round((workersWithDevices / workers.length) * 100)
            : 0;

        const resolvedIncidents = incidents.filter(i =>
            i.status === 'Resolved' || i.status === 'Closed'
        ).length;
        const incidentResolutionRate = incidents.length > 0
            ? Math.round((resolvedIncidents / incidents.length) * 100)
            : 100;

        const resolvedAlerts = alerts.filter(a => a.status === 'Resolved').length;
        const alertResolutionRate = alerts.length > 0
            ? Math.round((resolvedAlerts / alerts.length) * 100)
            : 100;

        // Safety score (weighted average)
        const safetyScore = Math.round(
            (deviceCoverage * 0.3) +
            (incidentResolutionRate * 0.4) +
            (alertResolutionRate * 0.3)
        );

        res.json({
            summary: {
                safetyScore,
                deviceCoverage,
                incidentResolutionRate,
                alertResolutionRate
            },
            metrics: {
                totalWorkers: workers.length,
                workersWithDevices,
                totalDevices: devices.length,
                activeDevices: devices.filter(d => d.status === 'Active').length,
                totalIncidents: incidents.length,
                resolvedIncidents,
                totalAlerts: alerts.length,
                resolvedAlerts
            },
            dateRange: { start, end }
        });
    } catch (error) {
        console.error('Error generating compliance report:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

module.exports = router;

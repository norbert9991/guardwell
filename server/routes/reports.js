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

// ═══════════════════════════════════════════════════════
// ANALYTICS ALGORITHMS
// ═══════════════════════════════════════════════════════

/**
 * Worker Risk Scoring Algorithm
 * Computes a weighted risk score per worker based on:
 *   - Incident severity distribution (Critical=40, High=25, Medium=15, Low=5)
 *   - Recent alert frequency (last 7 days, ×10 per alert)
 *   - Recency factor (incidents in last 7 days weighted 2x)
 * Risk Levels: High (≥70), Medium (30–69), Low (<30)
 */
function computeWorkerRiskScores(workers, incidents, alerts) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    return workers.map(w => {
        const workerIncidents = incidents.filter(i => i.workerId === w.id);
        const workerAlerts = alerts.filter(a => a.workerId === w.id);
        const recentAlerts = workerAlerts.filter(a => new Date(a.createdAt) >= sevenDaysAgo);
        const recentIncidents = workerIncidents.filter(i => new Date(i.createdAt) >= sevenDaysAgo);

        // Severity-weighted incident score
        const severityScore =
            workerIncidents.filter(i => i.severity === 'Critical').length * 40 +
            workerIncidents.filter(i => i.severity === 'High').length * 25 +
            workerIncidents.filter(i => i.severity === 'Medium').length * 15 +
            workerIncidents.filter(i => i.severity === 'Low').length * 5;

        // Recency bonus (recent incidents count double)
        const recencyBonus =
            recentIncidents.filter(i => i.severity === 'Critical').length * 40 +
            recentIncidents.filter(i => i.severity === 'High').length * 25 +
            recentIncidents.filter(i => i.severity === 'Medium').length * 15 +
            recentIncidents.filter(i => i.severity === 'Low').length * 5;

        // Recent alert frequency
        const alertScore = recentAlerts.length * 10;

        const rawScore = severityScore + recencyBonus + alertScore;
        // Normalize to 0-100 scale (cap at 100)
        const riskScore = Math.min(100, rawScore);
        const riskLevel = riskScore >= 70 ? 'High' : riskScore >= 30 ? 'Medium' : 'Low';

        return {
            name: w.fullName,
            workerId: w.id,
            riskScore,
            riskLevel,
            factors: {
                totalIncidents: workerIncidents.length,
                criticalIncidents: workerIncidents.filter(i => i.severity === 'Critical').length,
                recentAlerts: recentAlerts.length,
                recentIncidents: recentIncidents.length,
            }
        };
    }).sort((a, b) => b.riskScore - a.riskScore);
}

/**
 * Trend Analysis with 7-Day Moving Average
 * Computes a smoothed trend line and determines direction
 * by comparing the most recent window vs the previous window.
 */
function computeTrendAnalysis(dailyCounts) {
    if (dailyCounts.length < 2) {
        return { direction: 'Stable', movingAverage: [], percentageChange: 0 };
    }

    // Compute 7-day moving average
    const windowSize = Math.min(7, dailyCounts.length);
    const movingAverage = dailyCounts.map((d, i) => {
        const start = Math.max(0, i - windowSize + 1);
        const window = dailyCounts.slice(start, i + 1);
        const avg = window.reduce((sum, item) => sum + item.count, 0) / window.length;
        return { date: d.date, count: d.count, movingAvg: Math.round(avg * 100) / 100 };
    });

    // Compare recent half vs previous half
    const midpoint = Math.floor(dailyCounts.length / 2);
    const recentHalf = dailyCounts.slice(midpoint);
    const previousHalf = dailyCounts.slice(0, midpoint);

    const recentAvg = recentHalf.length > 0
        ? recentHalf.reduce((s, d) => s + d.count, 0) / recentHalf.length : 0;
    const previousAvg = previousHalf.length > 0
        ? previousHalf.reduce((s, d) => s + d.count, 0) / previousHalf.length : 0;

    const percentageChange = previousAvg > 0
        ? Math.round(((recentAvg - previousAvg) / previousAvg) * 100)
        : 0;

    let direction = 'Stable';
    if (percentageChange > 15) direction = 'Rising';
    else if (percentageChange < -15) direction = 'Falling';

    return { direction, movingAverage, percentageChange, recentAvg: Math.round(recentAvg * 10) / 10, previousAvg: Math.round(previousAvg * 10) / 10 };
}

/**
 * Anomaly Detection using Z-Score
 * Flags days where alert count exceeds mean + 2×stddev
 */
function detectAnomalies(dailyCounts) {
    if (dailyCounts.length < 3) return [];

    const counts = dailyCounts.map(d => d.count);
    const mean = counts.reduce((s, c) => s + c, 0) / counts.length;
    const variance = counts.reduce((s, c) => s + Math.pow(c - mean, 2), 0) / counts.length;
    const stddev = Math.sqrt(variance);
    const threshold = mean + 2 * stddev;

    return dailyCounts
        .filter(d => d.count > threshold && d.count > 0)
        .map(d => ({
            date: d.date,
            count: d.count,
            zScore: stddev > 0 ? Math.round(((d.count - mean) / stddev) * 100) / 100 : 0,
            threshold: Math.round(threshold * 100) / 100,
            mean: Math.round(mean * 100) / 100,
        }));
}

/**
 * Peak Hours Analysis
 * Groups events by hour-of-day to identify high-risk time periods
 */
function computePeakHours(events) {
    const hourCounts = new Array(24).fill(0);
    events.forEach(e => {
        const hour = new Date(e.createdAt).getHours();
        hourCounts[hour]++;
    });

    const total = events.length || 1;
    const hourData = hourCounts.map((count, hour) => ({
        hour,
        label: `${hour.toString().padStart(2, '0')}:00`,
        count,
        percentage: Math.round((count / total) * 100),
    }));

    // Find peak hour
    const peakHour = hourData.reduce((max, h) => h.count > max.count ? h : max, hourData[0]);

    return { hourData, peakHour };
}

/**
 * Sensor Threshold Analysis
 * Counts readings exceeding safety thresholds
 */
function computeThresholdAnalysis(sensorData) {
    const thresholds = {
        temperature: { value: 38, unit: '°C', label: 'High Temperature' },
        humidity: { value: 80, unit: '%', label: 'High Humidity' },
        gasLevel: { value: 300, unit: 'PPM', label: 'Dangerous Gas Level' },
    };

    const violations = {};
    let totalReadings = sensorData.length;

    Object.entries(thresholds).forEach(([field, config]) => {
        const exceeding = sensorData.filter(s => (s[field] || 0) > config.value);
        violations[field] = {
            count: exceeding.length,
            percentage: totalReadings > 0 ? Math.round((exceeding.length / totalReadings) * 100 * 10) / 10 : 0,
            threshold: config.value,
            unit: config.unit,
            label: config.label,
            maxValue: exceeding.length > 0
                ? Math.round(Math.max(...exceeding.map(s => s[field] || 0)) * 10) / 10
                : null,
        };
    });

    return { violations, totalReadings };
}

/**
 * Device Reliability Score
 * Based on how consistently a device communicates
 */
function computeDeviceReliability(devices) {
    const now = new Date();

    return devices.map(d => {
        const lastComm = d.lastCommunication ? new Date(d.lastCommunication) : null;
        let uptimeScore = 0;
        let status = 'Unknown';

        if (lastComm) {
            const hoursAgo = (now - lastComm) / (1000 * 60 * 60);
            if (hoursAgo < 1) { uptimeScore = 100; status = 'Excellent'; }
            else if (hoursAgo < 6) { uptimeScore = 80; status = 'Good'; }
            else if (hoursAgo < 24) { uptimeScore = 50; status = 'Fair'; }
            else if (hoursAgo < 72) { uptimeScore = 20; status = 'Poor'; }
            else { uptimeScore = 0; status = 'Offline'; }
        }

        return {
            deviceId: d.deviceId,
            type: d.type,
            worker: d.worker?.fullName || 'Unassigned',
            uptimeScore,
            status,
            battery: d.battery || 0,
            lastCommunication: d.lastCommunication,
        };
    }).sort((a, b) => a.uptimeScore - b.uptimeScore); // Worst first
}

/**
 * Compliance Grade and Recommendations
 */
function computeComplianceGrade(safetyScore, deviceCoverage, incidentResolutionRate, alertResolutionRate) {
    // Letter grade
    let grade, gradeColor;
    if (safetyScore >= 90) { grade = 'A'; gradeColor = 'green'; }
    else if (safetyScore >= 80) { grade = 'B'; gradeColor = 'blue'; }
    else if (safetyScore >= 70) { grade = 'C'; gradeColor = 'yellow'; }
    else if (safetyScore >= 60) { grade = 'D'; gradeColor = 'orange'; }
    else { grade = 'F'; gradeColor = 'red'; }

    // Generate recommendations based on weakest areas
    const recommendations = [];

    if (deviceCoverage < 80) {
        recommendations.push({
            priority: 'High',
            area: 'Device Coverage',
            message: `Only ${deviceCoverage}% of workers have assigned devices. Assign devices to all workers for full monitoring coverage.`,
            icon: 'radio'
        });
    }
    if (incidentResolutionRate < 80) {
        recommendations.push({
            priority: 'High',
            area: 'Incident Resolution',
            message: `Incident resolution rate is ${incidentResolutionRate}%. Prioritize closing open incidents to improve safety compliance.`,
            icon: 'alert'
        });
    }
    if (alertResolutionRate < 70) {
        recommendations.push({
            priority: 'Critical',
            area: 'Alert Response',
            message: `Alert resolution rate is ${alertResolutionRate}%. Many alerts are going unacknowledged. Review alert response procedures.`,
            icon: 'shield'
        });
    }
    if (safetyScore >= 80 && recommendations.length === 0) {
        recommendations.push({
            priority: 'Info',
            area: 'Compliance',
            message: 'Safety compliance is strong. Continue maintaining current monitoring and response practices.',
            icon: 'check'
        });
    }

    return { grade, gradeColor, recommendations };
}


// ═══════════════════════════════════════════════════════
// API ENDPOINTS
// ═══════════════════════════════════════════════════════

// Worker Safety Report
router.get('/worker-safety', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const { start, end } = getDateRange(startDate, endDate);

        // Get all workers
        const workers = await Worker.findAll({
            include: [{ model: Incident, as: 'incidents' }]
        });

        // Get incidents in date range
        const incidents = await Incident.findAll({
            where: {
                createdAt: { [Op.between]: [start, end] }
            }
        });

        // Get alerts in date range
        const alerts = await Alert.findAll({
            where: {
                createdAt: { [Op.between]: [start, end] }
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

        // Daily incident counts for trend chart
        const dailyIncidents = {};
        incidents.forEach(i => {
            const date = new Date(i.createdAt).toISOString().split('T')[0];
            dailyIncidents[date] = (dailyIncidents[date] || 0) + 1;
        });

        const dailyIncidentArray = Object.entries(dailyIncidents)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, count]) => ({ date, count }));

        // ══ ANALYTICS ══
        const workerRiskAnalysis = computeWorkerRiskScores(workers, incidents, alerts);
        const incidentTrend = computeTrendAnalysis(dailyIncidentArray);

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
            dailyIncidents: dailyIncidentArray,
            // Analytics
            analytics: {
                workerRiskAnalysis: workerRiskAnalysis.slice(0, 10), // Top 10
                incidentTrend,
                highRiskWorkers: workerRiskAnalysis.filter(w => w.riskLevel === 'High').length,
                mediumRiskWorkers: workerRiskAnalysis.filter(w => w.riskLevel === 'Medium').length,
                lowRiskWorkers: workerRiskAnalysis.filter(w => w.riskLevel === 'Low').length,
            },
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

        // Daily sensor reading averages for trend chart
        const dailySensorMap = {};
        sensorData.forEach(s => {
            const date = new Date(s.createdAt).toISOString().split('T')[0];
            if (!dailySensorMap[date]) {
                dailySensorMap[date] = { temp: [], humidity: [], gas: [] };
            }
            dailySensorMap[date].temp.push(s.temperature || 0);
            dailySensorMap[date].humidity.push(s.humidity || 0);
            dailySensorMap[date].gas.push(s.gasLevel || 0);
        });
        const dailySensorReadings = Object.entries(dailySensorMap)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, vals]) => ({
                date,
                avgTemperature: Math.round(vals.temp.reduce((a, b) => a + b, 0) / vals.temp.length * 10) / 10,
                avgHumidity: Math.round(vals.humidity.reduce((a, b) => a + b, 0) / vals.humidity.length * 10) / 10,
                avgGas: Math.round(vals.gas.reduce((a, b) => a + b, 0) / vals.gas.length)
            }));

        // ══ ANALYTICS ══
        const thresholdAnalysis = computeThresholdAnalysis(sensorData);
        const deviceReliability = computeDeviceReliability(devices);

        // Fleet reliability score (average of all device scores)
        const fleetReliability = devices.length > 0
            ? Math.round(deviceReliability.reduce((s, d) => s + d.uptimeScore, 0) / devices.length)
            : 0;

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
            dailySensorReadings,
            offlineDevices: offlineDevices.map(d => ({
                deviceId: d.deviceId,
                type: d.type,
                lastCommunication: d.lastCommunication,
                worker: d.worker?.fullName || 'Unassigned'
            })),
            // Analytics
            analytics: {
                thresholdAnalysis,
                deviceReliability: deviceReliability.slice(0, 10),
                fleetReliability,
            },
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
                createdAt: { [Op.between]: [start, end] }
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

        const dailyAlertArray = Object.entries(dailyAlerts)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, count]) => ({ date, count }));

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

        // ══ ANALYTICS ══
        const trendAnalysis = computeTrendAnalysis(dailyAlertArray);
        const anomalies = detectAnomalies(dailyAlertArray);
        const peakHoursAnalysis = computePeakHours(alerts);

        // Response time distribution
        const responseTimeDistribution = {
            under5min: acknowledgedAlerts.filter(a => {
                const diff = (new Date(a.acknowledgedAt) - new Date(a.createdAt)) / 1000 / 60;
                return diff < 5;
            }).length,
            under15min: acknowledgedAlerts.filter(a => {
                const diff = (new Date(a.acknowledgedAt) - new Date(a.createdAt)) / 1000 / 60;
                return diff >= 5 && diff < 15;
            }).length,
            under60min: acknowledgedAlerts.filter(a => {
                const diff = (new Date(a.acknowledgedAt) - new Date(a.createdAt)) / 1000 / 60;
                return diff >= 15 && diff < 60;
            }).length,
            over60min: acknowledgedAlerts.filter(a => {
                const diff = (new Date(a.acknowledgedAt) - new Date(a.createdAt)) / 1000 / 60;
                return diff >= 60;
            }).length,
        };

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
            dailyAlerts: dailyAlertArray,
            topDevicesByAlerts,
            // Analytics
            analytics: {
                trendAnalysis,
                anomalies,
                peakHours: peakHoursAnalysis,
                responseTimeDistribution,
            },
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
        const workers = await Worker.findAll();
        const devices = await Device.findAll();
        const incidents = await Incident.findAll({
            where: {
                createdAt: { [Op.between]: [start, end] }
            }
        });
        const alerts = await Alert.findAll({
            where: {
                createdAt: { [Op.between]: [start, end] }
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

        // ══ ANALYTICS ══
        const complianceGrade = computeComplianceGrade(
            safetyScore, deviceCoverage, incidentResolutionRate, alertResolutionRate
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
            // Analytics
            analytics: {
                grade: complianceGrade.grade,
                gradeColor: complianceGrade.gradeColor,
                recommendations: complianceGrade.recommendations,
                formula: 'Safety Score = (Device Coverage × 0.3) + (Incident Resolution × 0.4) + (Alert Resolution × 0.3)',
                weights: {
                    deviceCoverage: { weight: 0.3, value: deviceCoverage, contribution: Math.round(deviceCoverage * 0.3) },
                    incidentResolution: { weight: 0.4, value: incidentResolutionRate, contribution: Math.round(incidentResolutionRate * 0.4) },
                    alertResolution: { weight: 0.3, value: alertResolutionRate, contribution: Math.round(alertResolutionRate * 0.3) },
                }
            },
            dateRange: { start, end }
        });
    } catch (error) {
        console.error('Error generating compliance report:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

module.exports = router;

/**
 * Alert Escalation Service
 * 
 * Automatically escalates unacknowledged alerts after configured time thresholds.
 * Escalation thresholds by severity:
 * - Critical: 2 minutes
 * - High: 5 minutes
 * - Medium: 10 minutes
 * - Low: 15 minutes
 */

const { Op } = require('sequelize');

// Escalation thresholds in milliseconds
const ESCALATION_THRESHOLDS = {
    'Critical': 2 * 60 * 1000,   // 2 minutes
    'High': 5 * 60 * 1000,       // 5 minutes
    'Medium': 10 * 60 * 1000,    // 10 minutes
    'Low': 15 * 60 * 1000        // 15 minutes
};

// Check interval (30 seconds)
const CHECK_INTERVAL = 30 * 1000;

let escalationInterval = null;
let ioInstance = null;

/**
 * Check for alerts that need escalation
 */
async function checkForEscalation() {
    try {
        const { Alert, Worker } = require('../models');
        const now = new Date();

        // Get all pending, non-escalated alerts
        const pendingAlerts = await Alert.findAll({
            where: {
                status: 'Pending',
                escalated: { [Op.or]: [false, null] }
            },
            include: [{ model: Worker, as: 'worker' }]
        });

        const alertsToEscalate = [];

        for (const alert of pendingAlerts) {
            const alertAge = now - new Date(alert.createdAt);
            const threshold = ESCALATION_THRESHOLDS[alert.severity] || ESCALATION_THRESHOLDS['Medium'];

            if (alertAge >= threshold) {
                alertsToEscalate.push(alert);
            }
        }

        if (alertsToEscalate.length > 0) {
            console.log(`⚠️ Escalating ${alertsToEscalate.length} overdue alerts`);

            for (const alert of alertsToEscalate) {
                await Alert.update(
                    {
                        escalated: true,
                        escalatedAt: now
                    },
                    { where: { id: alert.id } }
                );

                // Emit escalation event via socket
                if (ioInstance) {
                    ioInstance.emit('emergency_escalated', {
                        alertId: alert.id,
                        severity: alert.severity,
                        escalatedAt: now,
                        ageMs: now - new Date(alert.createdAt),
                        worker: alert.worker?.fullName || 'Unknown',
                        type: alert.type,
                        alert
                    });
                }

                console.log(`  → Escalated alert #${alert.id} (${alert.severity} - ${alert.type})`);
            }
        }
    } catch (error) {
        console.error('Error in escalation check:', error);
    }
}

/**
 * Start the escalation monitoring service
 * @param {Object} io - Socket.io instance
 */
function startEscalationService(io) {
    ioInstance = io;

    if (escalationInterval) {
        clearInterval(escalationInterval);
    }

    console.log('🔔 Escalation service started');
    console.log('   Thresholds:', {
        Critical: '2 min',
        High: '5 min',
        Medium: '10 min',
        Low: '15 min'
    });

    // Run initial check
    checkForEscalation();

    // Set up periodic checks
    escalationInterval = setInterval(checkForEscalation, CHECK_INTERVAL);
}

/**
 * Stop the escalation service
 */
function stopEscalationService() {
    if (escalationInterval) {
        clearInterval(escalationInterval);
        escalationInterval = null;
        console.log('🔕 Escalation service stopped');
    }
}

/**
 * Get escalation threshold for a severity level
 * @param {string} severity 
 * @returns {number} Threshold in milliseconds
 */
function getEscalationThreshold(severity) {
    return ESCALATION_THRESHOLDS[severity] || ESCALATION_THRESHOLDS['Medium'];
}

/**
 * Get human-readable time remaining until escalation
 * @param {Date} createdAt - Alert creation time
 * @param {string} severity - Alert severity
 * @returns {object} { willEscalate: boolean, timeRemainingMs: number, timeRemainingText: string }
 */
function getEscalationStatus(createdAt, severity) {
    const now = new Date();
    const alertAge = now - new Date(createdAt);
    const threshold = ESCALATION_THRESHOLDS[severity] || ESCALATION_THRESHOLDS['Medium'];
    const timeRemaining = threshold - alertAge;

    if (timeRemaining <= 0) {
        return {
            willEscalate: false,
            overdue: true,
            timeRemainingMs: 0,
            timeRemainingText: 'Overdue'
        };
    }

    const seconds = Math.floor(timeRemaining / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return {
        willEscalate: true,
        overdue: false,
        timeRemainingMs: timeRemaining,
        timeRemainingText: minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`
    };
}

module.exports = {
    startEscalationService,
    stopEscalationService,
    checkForEscalation,
    getEscalationThreshold,
    getEscalationStatus,
    ESCALATION_THRESHOLDS
};

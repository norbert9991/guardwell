const nodemailer = require('nodemailer');

// Create reusable transporter using Gmail SMTP
let transporter = null;

// =============================================
// Email Templates
// =============================================

const EMAIL_TEMPLATES = [
    {
        key: 'emergency_alert',
        label: '🚨 Emergency Alert',
        subject: '🚨 Emergency Alert — GuardWell Safety System',
        status: 'Critical',
        statusColor: '#dc2626',
        body: `An emergency situation has been detected at our facility.

Worker: [Worker Name]
Location: [Location]
Time: [Time]

Immediate response is required. Please follow emergency protocols and proceed to the designated area without delay.

If you are unable to respond, please contact your supervisor immediately.

This is an urgent notification from the GuardWell Safety Monitoring System.`
    },
    {
        key: 'safety_violation',
        label: '⚠️ Safety Violation Notice',
        subject: '⚠️ Safety Violation Notice — GuardWell Safety System',
        status: 'Warning',
        statusColor: '#d97706',
        body: `A safety violation has been reported and requires your immediate attention.

Violation Type: [Violation Type]
Location: [Location]
Date/Time: [Date/Time]
Reported By: [Reporter Name]

Details:
[Describe the violation here]

Required Action:
Please review this violation and take the necessary corrective action as per company safety protocols. Kindly acknowledge receipt of this notice and provide a response within 24 hours.

GuardWell Safety Monitoring System`
    },
    {
        key: 'incident_report',
        label: '📋 Incident Report',
        subject: '📋 Incident Report — GuardWell Safety System',
        status: 'Active',
        statusColor: '#2563eb',
        body: `An incident has been logged in the GuardWell system and requires your attention.

Incident ID: [Incident ID]
Type: [Incident Type]
Severity: [Severity Level]
Location: [Location]
Date/Time: [Date/Time]
Affected Worker: [Worker Name]

Summary:
[Provide a brief description of the incident here]

Next Steps:
[Outline the next steps or required actions]

Please review this report and acknowledge receipt. For further details, log in to the GuardWell dashboard.

GuardWell Safety Monitoring System`
    },
    {
        key: 'nudge_escalation',
        label: '🔔 Nudge Escalation Notice',
        subject: '🔔 Nudge Escalation Notice — GuardWell Safety System',
        status: 'Escalated',
        statusColor: '#7c3aed',
        body: `A worker has not responded to repeated safety nudges and requires immediate intervention.

Worker: [Worker Name]
Device ID: [Device ID]
Location: [Location]
Nudge Count: [Number] unanswered nudges
Last Nudge Sent: [Time]

This worker has been automatically escalated to Priority 1 status due to lack of response.

Immediate Action Required:
Please attempt to make direct contact with this worker or dispatch personnel to their last known location to verify their safety.

GuardWell Safety Monitoring System`
    },
    {
        key: 'status_update',
        label: '📊 Status Update',
        subject: '📊 Status Update — GuardWell Safety System',
        status: 'Info',
        statusColor: '#0891b2',
        body: `This is a status update from the GuardWell Safety Monitoring System.

Update Summary:
[Provide your status update here]

Current Conditions:
- Active Workers: [Count]
- Active Alerts: [Count]
- Devices Online: [Count]

If you have any questions or require further information, please contact the safety officer on duty or log in to the GuardWell dashboard.

GuardWell Safety Monitoring System`
    },
    {
        key: 'drill_notification',
        label: '🔊 Safety Drill Notification',
        subject: '🔊 Safety Drill Notification — GuardWell Safety System',
        status: 'Scheduled',
        statusColor: '#059669',
        body: `This is a notification regarding an upcoming or completed safety drill.

Drill Type: [Drill Type]
Date/Time: [Scheduled Date and Time]
Location: [Drill Location]
Duration: [Expected Duration]

Instructions:
[Provide drill instructions or post-drill notes here]

Please ensure all personnel in your area are aware of this drill. Safety equipment must be accessible and all emergency exits must remain clear.

For questions, contact the Safety Officer.

GuardWell Safety Monitoring System`
    }
];

/**
 * Get available email templates
 * @returns {Array} Array of template objects
 */
const getEmailTemplates = () => EMAIL_TEMPLATES;

/**
 * Build a branded HTML email from subject, status and body text
 * @param {object} params
 * @param {string} params.subject - Email subject / header title
 * @param {string} params.status - Status label (e.g. 'Critical', 'Warning')
 * @param {string} params.statusColor - Hex colour for the status badge
 * @param {string} params.body - Plain-text body (newlines converted to <br>)
 * @param {string} params.contactName - Recipient name
 * @returns {string} HTML string
 */
const buildTemplateHtml = ({ subject, status, statusColor, body, contactName }) => {
    const color = statusColor || '#3B82F6';
    const bodyHtml = (body || '').replace(/\n/g, '<br>');

    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, ${color}, ${color}cc); color: white; padding: 24px; text-align: center;">
                <h1 style="margin: 0; font-size: 22px; letter-spacing: 0.5px;">${subject}</h1>
            </div>
            <div style="padding: 8px 20px; background: ${color}22; border-left: 4px solid ${color}; border-right: 1px solid ${color}44; border-top: none; border-bottom: none;">
                <span style="display: inline-block; background: ${color}; color: white; font-size: 12px; font-weight: bold; padding: 3px 10px; border-radius: 999px; letter-spacing: 0.5px; margin: 8px 0;">${status || 'Notification'}</span>
            </div>
            <div style="padding: 24px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none;">
                ${contactName ? `<p style="color: #374151; margin-bottom: 16px;">Dear <strong>${contactName}</strong>,</p>` : ''}
                <p style="color: #374151; line-height: 1.7; white-space: pre-wrap;">${bodyHtml}</p>
            </div>
            <div style="padding: 15px; background: #1f2937; color: #9ca3af; text-align: center; font-size: 12px;">
                <p style="margin: 0;">Sent from <strong style="color: #d1d5db;">GuardWell</strong> Safety Monitoring System</p>
            </div>
        </div>
    `;
};

const initEmail = () => {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!user || !pass) {
        console.warn('⚠️ SMTP credentials not configured - email notifications disabled');
        return false;
    }

    const port = parseInt(process.env.SMTP_PORT) || 465;
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: port,
        secure: port === 465, // true for 465 (SSL), false for 587 (STARTTLS)
        auth: {
            user: user,
            pass: pass,
        },
        connectionTimeout: 10000, // 10 seconds
        greetingTimeout: 10000,
    });

    // Verify connection
    transporter.verify()
        .then(() => console.log('✅ SMTP Email service initialized (Gmail)'))
        .catch((err) => console.error('❌ SMTP connection failed:', err.message));

    return true;
};

// Check if email is properly configured
const isConfigured = () => {
    return transporter !== null;
};

// Send a single email
const sendEmail = async ({ to, subject, text, html }) => {
    if (!isConfigured()) {
        console.warn('SMTP not configured, skipping email to:', to);
        return { success: false, error: 'SMTP not configured' };
    }

    const mailOptions = {
        from: {
            name: process.env.SMTP_FROM_NAME || 'GuardWell Alerts',
            address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
        },
        to,
        subject,
        text,
        html: html || text,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`📧 Email sent to: ${to} (Message ID: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Email send error:', error.message);
        return { success: false, error: error.message };
    }
};

// Send email to multiple recipients
const sendBulkEmail = async ({ recipients, subject, text, html }) => {
    if (!isConfigured()) {
        console.warn('SMTP not configured, skipping bulk email');
        return { success: false, error: 'SMTP not configured' };
    }

    const mailOptions = {
        from: {
            name: process.env.SMTP_FROM_NAME || 'GuardWell Alerts',
            address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
        },
        to: recipients.join(', '),
        subject,
        text,
        html: html || text,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`📧 Bulk email sent to ${recipients.length} recipients (Message ID: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Bulk email error:', error.message);
        return { success: false, error: error.message };
    }
};

// Send emergency alert email
const sendEmergencyAlert = async ({ workerName, location, deviceId, timestamp, contacts }) => {
    const subject = '🚨 EMERGENCY ALERT - GuardWell';

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #dc2626, #991b1b); color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0;">🚨 EMERGENCY ALERT</h1>
            </div>
            <div style="padding: 20px; background: #fef2f2; border: 1px solid #fecaca;">
                <h2 style="color: #dc2626; margin-top: 0;">Immediate Attention Required</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #fecaca; font-weight: bold;">Worker:</td>
                        <td style="padding: 10px; border-bottom: 1px solid #fecaca;">${workerName || 'Unknown'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #fecaca; font-weight: bold;">Location:</td>
                        <td style="padding: 10px; border-bottom: 1px solid #fecaca;">${location || 'Unknown'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #fecaca; font-weight: bold;">Device ID:</td>
                        <td style="padding: 10px; border-bottom: 1px solid #fecaca;">${deviceId || 'Unknown'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; font-weight: bold;">Time:</td>
                        <td style="padding: 10px;">${new Date(timestamp).toLocaleString()}</td>
                    </tr>
                </table>
            </div>
            <div style="padding: 15px; background: #1f2937; color: #9ca3af; text-align: center; font-size: 12px;">
                <p style="margin: 0;">This is an automated alert from GuardWell Safety Monitoring System</p>
            </div>
        </div>
    `;

    const text = `
EMERGENCY ALERT - GuardWell

Worker: ${workerName || 'Unknown'}
Location: ${location || 'Unknown'}  
Device ID: ${deviceId || 'Unknown'}
Time: ${new Date(timestamp).toLocaleString()}

This is an automated alert from GuardWell Safety Monitoring System.
    `.trim();

    return await sendBulkEmail({
        recipients: contacts,
        subject,
        text,
        html
    });
};

// Send sensor threshold alert email
const sendThresholdAlert = async ({ workerName, sensorType, value, threshold, severity, contacts }) => {
    const severityColors = {
        Critical: '#dc2626',
        High: '#ea580c',
        Medium: '#ca8a04',
        Low: '#2563eb'
    };

    const color = severityColors[severity] || '#6b7280';
    const subject = `⚠️ ${severity} Alert: ${sensorType} Threshold Exceeded - GuardWell`;

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: ${color}; color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0;">⚠️ ${severity} ALERT</h1>
            </div>
            <div style="padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb;">
                <h2 style="color: ${color}; margin-top: 0;">${sensorType} Threshold Exceeded</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Worker:</td>
                        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${workerName || 'Unknown'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Sensor:</td>
                        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${sensorType}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Current Value:</td>
                        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: ${color}; font-weight: bold;">${value}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; font-weight: bold;">Threshold:</td>
                        <td style="padding: 10px;">${threshold}</td>
                    </tr>
                </table>
            </div>
            <div style="padding: 15px; background: #1f2937; color: #9ca3af; text-align: center; font-size: 12px;">
                <p style="margin: 0;">This is an automated alert from GuardWell Safety Monitoring System</p>
            </div>
        </div>
    `;

    const text = `
${severity} ALERT - GuardWell

${sensorType} Threshold Exceeded

Worker: ${workerName || 'Unknown'}
Sensor: ${sensorType}
Current Value: ${value}
Threshold: ${threshold}

This is an automated alert from GuardWell Safety Monitoring System.
    `.trim();

    return await sendBulkEmail({
        recipients: contacts,
        subject,
        text,
        html
    });
};

module.exports = {
    initEmail,
    isConfigured,
    sendEmail,
    sendBulkEmail,
    sendEmergencyAlert,
    sendThresholdAlert,
    getEmailTemplates,
    buildTemplateHtml
};

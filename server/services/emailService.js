const nodemailer = require('nodemailer');

// Create reusable transporter using Gmail SMTP
let transporter = null;

const initEmail = () => {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!user || !pass) {
        console.warn('⚠️ SMTP credentials not configured - email notifications disabled');
        return false;
    }

    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false, // true for 465, false for other ports (STARTTLS)
        auth: {
            user: user,
            pass: pass,
        },
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
    sendThresholdAlert
};

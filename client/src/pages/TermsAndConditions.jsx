import React, { useState } from 'react';
import { Shield, ChevronDown, ChevronUp, FileText, Lock, Users, AlertTriangle, Database, Scale } from 'lucide-react';
import { CardDark, CardBody, CardHeader } from '../components/ui/Card';

export const TermsAndConditions = () => {
    const [expandedSections, setExpandedSections] = useState({});

    const toggleSection = (index) => {
        setExpandedSections(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const sections = [
        {
            icon: FileText,
            title: '1. Acceptance of Terms',
            content: `By accessing or using the GuardWell Voice-Activated Wearable Emergency Alert and Monitoring System ("the System"), you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions. If you do not agree to these terms, you must not access or use the System.

The System is designed exclusively for workplace safety monitoring at Cathay Metal Inc. Access is granted only to authorized personnel as designated by system administrators.`
        },
        {
            icon: Shield,
            title: '2. System Purpose & Scope',
            content: `GuardWell is a voice-activated wearable emergency alert and monitoring system designed to:

• Monitor worker safety through wearable ESP32 devices equipped with sensors (DHT22 temperature sensor, MPU6050 fall detection, NEO-M8N GPS).
• Enable voice-activated emergency alerts using the INMP441 microphone with Edge Impulse AI model (keywords: "Tulong", "Help", "Emergency").
• Provide a touch-activated emergency/panic button for immediate distress signaling.
• Track worker locations via GPS (NEO-M8N) including geofence boundary monitoring.
• Manage incident reports and safety compliance records.
• Generate safety analytics and reports for continuous improvement.

The System is intended solely for occupational health and safety purposes. Any use of collected data beyond workplace safety monitoring is strictly prohibited.`
        },
        {
            icon: Users,
            title: '3. User Roles & Responsibilities',
            content: `Users are assigned one of the following roles, each with specific responsibilities:

Safety Officers:
• Monitor real-time sensor data and respond to alerts promptly.
• Acknowledge emergency alerts within the required response time.
• Document incidents accurately and completely.
• Ensure workers are wearing assigned devices during work hours.

Administrators:
• Manage worker profiles, device assignments, and emergency contacts.
• Oversee alert escalation and incident resolution processes.
• Maintain accurate system records and configurations.

Head Administrators:
• Manage system users and role assignments.
• Configure system settings and alert thresholds.
• Oversee audit logs and ensure system integrity.
• Ensure compliance with data protection regulations.

All users must keep their login credentials confidential and report any unauthorized access immediately.`
        },
        {
            icon: Lock,
            title: '4. Data Privacy & Protection',
            content: `GuardWell collects and processes the following types of data:

Sensor Data: Ambient temperature (DHT22), motion/fall detection data (MPU6050), GPS location — collected every 2 seconds from wearable devices during work hours.

Location Data: GPS coordinates are collected solely for safety monitoring and emergency response purposes.

Personal Information: Worker names, employee numbers, contact details, emergency contacts, and medical conditions — stored for identification and emergency response.

Data Handling Commitments:
• All data is collected exclusively for workplace safety purposes.
• Personal data is stored securely in encrypted databases.
• Access to data is restricted based on user roles and permissions.
• Data will not be shared with third parties without explicit authorization.
• Workers have the right to request access to their own collected data.
• Data retention follows company policy and applicable regulations.

The Republic Act No. 10173 (Data Privacy Act of 2012) of the Philippines governs the handling of personal data within this system.

For questions or concerns, contact:
System Administrator — admin@guardwell.com
Cathay Metal Inc. — Safety Department`
        },
        {
            icon: AlertTriangle,
            title: '5. Emergency Response & Alert System',
            content: `The System includes automated alert and emergency response features:

• Emergency Button: Workers can trigger emergency alerts via their wearable device's touch sensor (panic button).
• Voice Alerts: Workers can trigger alerts using voice commands — "Tulong/Help", "Emergency", "Aray" (shock/injury), "Tawag/Call" (request assistance), "Sakit" (pain).
• Automated Alerts: The system generates alerts when sensor readings exceed defined safety thresholds (high temperature, fall detection).
• Geofence Monitoring: Alerts are triggered when a worker moves outside the designated facility boundary (GPS-based).

Important Disclaimers:
• The System is a supplementary safety tool and does not replace existing safety protocols and procedures.
• Response times may vary based on network connectivity and system load.
• GPS accuracy depends on environmental conditions and device hardware.
• Sensor readings are indicative and should be corroborated with professional safety equipment for critical decisions.
• The System requires active internet/network connectivity to function properly.`
        },
        {
            icon: Database,
            title: '6. System Availability & Limitations',
            content: `Service Availability:
• The System is provided on an "as-is" basis with best-effort availability.
• Scheduled maintenance windows may require temporary system downtime.
• We strive for maximum uptime but cannot guarantee uninterrupted service.

Technical Limitations:
• Network outages may delay alert transmission and sensor data updates.
• The accuracy of sensor data depends on proper device calibration and maintenance.
• GPS accuracy may be limited in indoor or enclosed environments.

Users are responsible for:
• Ensuring devices are properly charged and maintained.
• Reporting any device malfunctions or connectivity issues promptly.
• Not tampering with, modifying, or disabling safety devices.`
        },
        {
            icon: Scale,
            title: '7. Liability & Disclaimers',
            content: `Limitation of Liability:
• Cathay Metal Corporation and the GuardWell development team shall not be held liable for any damages arising from system malfunctions, delayed alerts, or inaccurate sensor readings.
• The System supplements but does not replace manual safety inspections, protocols, and procedures.
• Users acknowledge that no automated system can guarantee complete protection against all workplace hazards.

Prohibited Actions:
• Intentionally triggering false emergency alerts.
• Tampering with or disabling wearable safety devices.
• Sharing login credentials with unauthorized persons.
• Attempting to access data or features beyond assigned permissions.
• Using collected data for purposes other than workplace safety.

Violations of these terms may result in disciplinary action as per company policy.`
        },
        {
            icon: FileText,
            title: '8. Modifications & Updates',
            content: `Cathay Metal Inc. reserves the right to modify these Terms and Conditions at any time. Changes will be communicated through:

• System notifications within the GuardWell platform.
• Email notifications to registered system users.
• Announcements during safety briefings.

Continued use of the System after modifications constitutes acceptance of the updated terms.

These Terms and Conditions are effective as of February 2025 and are governed by the laws of the Republic of the Philippines.

For questions or concerns regarding these terms, contact:
System Administrator — admin@guardwell.com
Cathay Metal Inc. — Safety Department`
        }
    ];

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-4 shadow-lg">
                    <img src="/GuardwellLogo.png" alt="GuardWell" className="w-full h-full object-contain" />
                </div>
                <h1 className="text-3xl font-bold text-[#1F2937] mb-2">Terms and Conditions</h1>
                <p className="text-[#4B5563]">GuardWell: Voice-Activated Wearable Emergency Alert and Monitoring System — Cathay Metal Inc.</p>
                <p className="text-sm text-[#6B7280] mt-1">Last updated: February 2025</p>
            </div>

            {/* Introduction Card */}
            <CardDark>
                <CardBody className="p-6">
                    <p className="text-[#4B5563] leading-relaxed">
                        Welcome to the GuardWell Voice-Activated Wearable Emergency Alert and Monitoring System. These Terms and Conditions outline the rules,
                        guidelines, and responsibilities governing your use of this workplace safety platform. By using GuardWell,
                        you agree to comply with these terms to ensure the safety and well-being of all workers at Cathay Metal Inc.
                    </p>
                </CardBody>
            </CardDark>

            {/* Sections */}
            <div className="space-y-3">
                {sections.map((section, index) => {
                    const Icon = section.icon;
                    const isExpanded = expandedSections[index] !== false; // Default expanded

                    return (
                        <CardDark key={index}>
                            <button
                                onClick={() => toggleSection(index)}
                                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[#EEF1F4]/50 transition-colors rounded-xl"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-[#6FA3D8]/10 flex items-center justify-center">
                                        <Icon size={18} className="text-[#6FA3D8]" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-[#1F2937]">{section.title}</h2>
                                </div>
                                {isExpanded ? (
                                    <ChevronUp size={20} className="text-[#6B7280]" />
                                ) : (
                                    <ChevronDown size={20} className="text-[#6B7280]" />
                                )}
                            </button>
                            {isExpanded && (
                                <CardBody className="px-6 pb-6 pt-0">
                                    <div className="pl-12 text-[#4B5563] leading-relaxed whitespace-pre-line">
                                        {section.content}
                                    </div>
                                </CardBody>
                            )}
                        </CardDark>
                    );
                })}
            </div>

            {/* Footer */}
            <CardDark>
                <CardBody className="p-6 text-center">
                    <p className="text-sm text-[#6B7280]">
                        © {new Date().getFullYear()} Cathay Metal Inc. All rights reserved.
                    </p>
                    <p className="text-xs text-[#9CA3AF] mt-1">
                        GuardWell v1.0
                    </p>
                </CardBody>
            </CardDark>
        </div>
    );
};

import React, { useState } from 'react';
import {
    BookOpen, LayoutDashboard, Activity, Users, Radio, AlertTriangle,
    FileText, BarChart3, Phone, Settings, Shield, ChevronDown, ChevronRight,
    Search, Bell, Eye, Plus, Edit, Power, CheckCircle, Clock, MapPin,
    Zap, Heart, Thermometer, Wind, TrendingUp, UserCheck, HelpCircle,
    Globe, Map, Layers, Timer
} from 'lucide-react';
import { CardDark, CardBody, CardHeader } from '../components/ui/Card';

export const UserManual = () => {
    const [activeSection, setActiveSection] = useState('overview');
    const [searchTerm, setSearchTerm] = useState('');

    const sections = [
        { id: 'overview', name: 'System Overview', icon: BookOpen },
        { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
        { id: 'live-monitoring', name: 'Live Monitoring', icon: Activity },
        { id: 'map-view', name: 'Map & GPS Tracking', icon: Map },
        { id: 'nudge-system', name: 'Nudge System', icon: Bell },
        { id: 'workers', name: 'Worker Management', icon: Users },
        { id: 'devices', name: 'Device Management', icon: Radio },
        { id: 'alerts', name: 'Alert Management', icon: AlertTriangle },
        { id: 'emergency-queue', name: 'Emergency Queue', icon: Bell },
        { id: 'incidents', name: 'Incident Management', icon: FileText },
        { id: 'reports', name: 'Reports & Analytics', icon: BarChart3 },
        { id: 'contacts', name: 'Emergency Contacts', icon: Phone },
        { id: 'nudge-logs', name: 'Nudge Logs', icon: FileText },
        { id: 'language', name: 'Language Toggle', icon: Globe },
        { id: 'session-timeout', name: 'Session & Timeout', icon: Timer },
        { id: 'admin', name: 'Administration', icon: Settings },
        { id: 'roles', name: 'User Roles & Permissions', icon: Shield },
        { id: 'faq', name: 'FAQ & Troubleshooting', icon: HelpCircle },
    ];

    const filteredSections = sections.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const renderContent = () => {
        switch (activeSection) {
            case 'overview':
                return (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold text-[#1F2937] mb-4">System Overview</h2>
                            <p className="text-[#4B5563] leading-relaxed mb-4">
                                GuardWell is a voice-activated wearable emergency alert and monitoring system built for Cathay Metal Inc.
                                It integrates wearable ESP32 devices with a web-based dashboard to provide real-time
                                safety monitoring, emergency alert management, and incident tracking.
                            </p>
                        </div>

                        <div className="bg-[#EEF1F4] rounded-xl p-6 border border-[#E3E6EB]">
                            <h3 className="font-semibold text-[#1F2937] mb-3 flex items-center gap-2">
                                <Zap size={18} className="text-[#E85D2A]" />
                                Key Features
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {[
                                    'Real-time sensor data monitoring (temperature, GPS location)',
                                    'Touch-activated emergency button and voice-activated alerts',
                                    'GPS location tracking with dual map modes (Satellite & Vector)',
                                    'Simulated warehouse building overlay with room labels',
                                    'Automated alert escalation and nudge system with auto-escalation',
                                    'Incident management and documentation',
                                    'Comprehensive safety analytics and reports',
                                    'Multi-role access control (Safety Officer, Admin, Head Admin)',
                                    'Real-time emergency queue with live updates and buzzer broadcast',
                                    'English / Filipino language toggle',
                                    'Session inactivity timeout for security',
                                    'Nudge acknowledgment tracking with logs',
                                ].map((feature, i) => (
                                    <div key={i} className="flex items-start gap-2">
                                        <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                                        <span className="text-sm text-[#4B5563]">{feature}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-[#FFF7ED] rounded-xl p-6 border border-[#FDBA74]">
                            <h3 className="font-semibold text-[#1F2937] mb-2 flex items-center gap-2">
                                <AlertTriangle size={18} className="text-[#E85D2A]" />
                                Getting Started
                            </h3>
                            <ol className="list-decimal list-inside text-sm text-[#4B5563] space-y-2">
                                <li>Log in with your assigned credentials (email and password).</li>
                                <li>You will be directed to the Dashboard showing system-wide metrics.</li>
                                <li>Navigate using the sidebar menu on the left — available options depend on your role.</li>
                                <li>The Emergency Queue panel on the right shows active emergencies in real-time.</li>
                                <li>Use the 🌐 button in the top navigation bar to switch between English and Filipino.</li>
                                <li>Click on any alert or notification to take action immediately.</li>
                            </ol>
                        </div>
                    </div>
                );

            case 'dashboard':
                return (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#1F2937] mb-4">Dashboard</h2>
                        <p className="text-[#4B5563] leading-relaxed">
                            The Dashboard is your main overview page, providing a snapshot of the entire safety monitoring system at a glance.
                        </p>

                        <Section title="Key Metrics Cards" icon={TrendingUp}>
                            <ul className="space-y-2 text-sm text-[#4B5563]">
                                <li><strong>Active Workers:</strong> The number of workers currently active in the system.</li>
                                <li><strong>Active Devices:</strong> The count of IoT devices currently online and transmitting data.</li>
                                <li><strong>Active Alerts:</strong> Number of alerts currently pending or requiring attention.</li>
                                <li><strong>System Status:</strong> Shows whether the system is online (connected via WebSocket) or offline.</li>
                            </ul>
                        </Section>

                        <Section title="Emergency Panel" icon={AlertTriangle}>
                            <p className="text-sm text-[#4B5563] mb-2">
                                The Emergency Panel allows authorized operators to trigger a <strong>system-wide emergency alert</strong> that:
                            </p>
                            <ul className="space-y-1 text-sm text-[#4B5563]">
                                <li>• Alerts all connected devices immediately</li>
                                <li>• Notifies emergency contacts via the system</li>
                                <li>• Logs the event for audit purposes</li>
                                <li>• Triggers evacuation protocols</li>
                            </ul>
                            <p className="text-sm text-[#4B5563] mt-2">
                                A confirmation dialog and responsibility warning are shown before activation.
                            </p>
                        </Section>

                        <Section title="Live Sensor Data" icon={Activity}>
                            <p className="text-sm text-[#4B5563]">
                                Shows real-time aggregated sensor data from all active devices:
                                average temperature and critical alert count.
                                If no devices are transmitting, a "No active devices" message is displayed instead of showing zero values.
                            </p>
                        </Section>

                        <Section title="Recent Alerts" icon={Bell}>
                            <p className="text-sm text-[#4B5563]">
                                Displays the 5 most recent alerts with severity badges, timestamps, and a quick
                                <strong> Acknowledge</strong> button that appears on hover. Click "View All" to go to the full Alerts page.
                            </p>
                        </Section>
                    </div>
                );

            case 'live-monitoring':
                return (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#1F2937] mb-4">Live Monitoring</h2>
                        <p className="text-[#4B5563] leading-relaxed">
                            The Live Monitoring page displays real-time sensor data from all active ESP32 wearable devices assigned to workers.
                            Data is transmitted every 2 seconds via HTTPS and updated on the dashboard in real-time.
                        </p>

                        <Section title="View Modes" icon={Eye}>
                            <p className="text-sm text-[#4B5563] mb-2">
                                Toggle between two view modes using the buttons in the top right:
                            </p>
                            <ul className="space-y-2 text-sm text-[#4B5563]">
                                <li><strong>Grid View:</strong> Shows each worker's device as a card with all sensor readings, status indicators,
                                    GPS status, motion data, and action buttons.</li>
                                <li><strong>Map View:</strong> Shows all workers on a Leaflet map with their GPS positions. Supports
                                    Satellite and Vector tile layers, warehouse building overlay, and geofence visualization.
                                    See the <em>Map & GPS Tracking</em> section for details.</li>
                            </ul>
                        </Section>

                        <Section title="Sensor Readings" icon={Thermometer}>
                            <ul className="space-y-3 text-sm text-[#4B5563]">
                                <li>
                                    <strong>Temperature (°C):</strong> Measured by the <strong>DHT22</strong> sensor. Monitors the ambient/environmental
                                    temperature around the worker. Values above 40°C trigger a warning; above 50°C triggers a critical alert.
                                </li>
                                <li>
                                    <strong>WiFi Signal (dBm):</strong> Indicates the strength of the device's connection to the Wi-Fi network.
                                    Displayed with a quality label (Excellent / Good / Fair / Weak / Very Weak).
                                </li>
                                <li>
                                    <strong>Fall Detection:</strong> The <strong>MPU6050</strong> accelerometer/gyroscope detects sudden impacts or falls
                                    (acceleration exceeding 25 m/s²). Triggers an automatic emergency alert.
                                </li>
                                <li>
                                    <strong>GPS Last Seen Location:</strong> Displays the coordinates and timestamp of the most recent valid GPS fix
                                    from the <strong>NEO-M8N</strong> module, along with satellite count and a link to Google Maps.
                                </li>
                            </ul>
                        </Section>

                        <Section title="Voice Recognition" icon={Bell}>
                            <p className="text-sm text-[#4B5563] mb-2">
                                Each device uses an <strong>INMP441</strong> digital microphone with an <strong>Edge Impulse</strong> AI model
                                trained to detect Filipino/English distress keywords:
                            </p>
                            <ul className="space-y-1 text-sm text-[#4B5563]">
                                <li>• <strong>"Tulong"</strong> — Filipino for "help"; triggers a critical voice alert</li>
                                <li>• <strong>"Help"</strong> — English distress keyword; triggers a critical voice alert</li>
                                <li>• <strong>"Emergency"</strong> — Triggers a high-priority emergency alert</li>
                            </ul>
                        </Section>

                        <Section title="RGB LED Status Indicator" icon={Activity}>
                            <ul className="space-y-2 text-sm text-[#4B5563]">
                                <li><span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2"></span><strong>Steady Green:</strong> Device is online, connected, and all readings are normal.</li>
                                <li><span className="inline-block w-3 h-3 rounded-full bg-yellow-400 mr-2"></span><strong>Yellow Pulse:</strong> GPS is acquiring satellites — waiting for fix.</li>
                                <li><span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2"></span><strong>Red Flash:</strong> Data is being transmitted, or an emergency is active (rapid flash).</li>
                                <li><span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-2"></span><strong>Blue Blink:</strong> Nudge received from the web dashboard.</li>
                                <li><span className="inline-block w-3 h-3 rounded-full bg-purple-500 mr-2"></span><strong>Purple Pulse:</strong> Geofence violation — worker is outside the designated area.</li>
                            </ul>
                        </Section>

                        <Section title="Geofence" icon={MapPin}>
                            <p className="text-sm text-[#4B5563]">
                                Each device is configured with a <strong>geofence</strong> — a virtual boundary around the facility.
                                If a worker moves outside the designated radius (default 100 meters), a geofence violation alert is
                                automatically triggered and the device's LED turns purple. This helps ensure workers stay within safe zones.
                            </p>
                        </Section>
                    </div>
                );

            case 'map-view':
                return (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#1F2937] mb-4">Map & GPS Tracking</h2>
                        <p className="text-[#4B5563] leading-relaxed">
                            The Map View in Live Monitoring provides a visual overview of all workers' GPS positions on an interactive map,
                            centered on the facility at <strong>299 P. Dela Cruz St., San Bartolome, Novaliches, Quezon City</strong>.
                        </p>

                        <Section title="Dual Map Modes" icon={Layers}>
                            <p className="text-sm text-[#4B5563] mb-2">
                                Switch between two map tile layers using the toggle buttons above the map:
                            </p>
                            <ul className="space-y-2 text-sm text-[#4B5563]">
                                <li><strong>🛰️ Satellite:</strong> Uses Esri World Imagery for a Google Maps-like aerial view. Best for
                                    seeing the actual terrain and building footprints from above.</li>
                                <li><strong>🗺️ Vector:</strong> Uses CARTO light tiles for a clean, minimal map style. The warehouse building
                                    polygons are most visible in this mode. Ideal for floor-plan-style viewing.</li>
                            </ul>
                        </Section>

                        <Section title="Warehouse Building Overlay" icon={MapPin}>
                            <p className="text-sm text-[#4B5563] mb-2">
                                A simulated warehouse building is drawn as a vector polygon on the map with labeled rooms:
                            </p>
                            <ul className="space-y-1 text-sm text-[#4B5563]">
                                <li>• 🏭 <strong>GuardWell Warehouse</strong> — Main building outline (dashed border)</li>
                                <li>• 📦 <strong>Storage</strong> — Yellow-tinted storage area</li>
                                <li>• 🏢 <strong>Office</strong> — Blue-tinted office area</li>
                                <li>• 🚚 <strong>Loading Dock</strong> — Green-tinted loading area</li>
                            </ul>
                        </Section>

                        <Section title="GPS 'You Are Here' Pin" icon={MapPin}>
                            <p className="text-sm text-[#4B5563]">
                                A pulsing blue dot (similar to Google Maps' location indicator) marks the facility's exact location.
                                Click it to see the full address. This pin is always visible regardless of geofence status.
                            </p>
                        </Section>

                        <Section title="Worker Markers" icon={Users}>
                            <p className="text-sm text-[#4B5563] mb-2">
                                Each worker with GPS coordinates appears as a colored pin on the map:
                            </p>
                            <ul className="space-y-1 text-sm text-[#4B5563]">
                                <li><span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-2"></span><strong>Blue:</strong> Normal status</li>
                                <li><span className="inline-block w-3 h-3 rounded-full bg-orange-500 mr-2"></span><strong>Orange:</strong> Warning status</li>
                                <li><span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2"></span><strong>Red:</strong> Critical status</li>
                                <li><span className="inline-block w-3 h-3 rounded-full bg-violet-500 mr-2"></span><strong>Violet:</strong> Outside geofence</li>
                            </ul>
                            <p className="text-sm text-[#4B5563] mt-2">
                                Worker markers are shown even when they are outside the geofence boundary for continuous tracking visibility.
                            </p>
                        </Section>

                        <Section title="Geofence Circle" icon={MapPin}>
                            <p className="text-sm text-[#4B5563]">
                                A dashed green circle shows the geofence boundary (default 100m radius) around the facility.
                                Workers outside this circle trigger violation alerts.
                            </p>
                        </Section>
                    </div>
                );

            case 'nudge-system':
                return (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#1F2937] mb-4">Nudge System</h2>
                        <p className="text-[#4B5563] leading-relaxed">
                            The Nudge feature allows operators to remotely check on workers by sending a signal to their wearable device.
                            The device will beep and blink blue to get the worker's attention.
                        </p>

                        <Section title="Sending a Nudge" icon={Bell}>
                            <ol className="list-decimal list-inside space-y-2 text-sm text-[#4B5563]">
                                <li>Go to <strong>Live Monitoring</strong> in Grid view.</li>
                                <li>Find the worker's card and click the <strong>"Nudge"</strong> button.</li>
                                <li>The button shows the current nudge count (e.g., "Nudge (1/3)").</li>
                                <li>The worker's device will beep and flash blue for ~10 seconds.</li>
                                <li>If the worker presses the touch sensor, the nudge is acknowledged.</li>
                            </ol>
                        </Section>

                        <Section title="Nudge Acknowledgment" icon={CheckCircle}>
                            <p className="text-sm text-[#4B5563] mb-2">
                                When a worker acknowledges a nudge by pressing their device's touch sensor:
                            </p>
                            <ul className="space-y-1 text-sm text-[#4B5563]">
                                <li>• A green notification popup appears at the top of Live Monitoring showing who responded</li>
                                <li>• The response time is displayed (e.g., "Response: 3.2s")</li>
                                <li>• A toast notification also appears</li>
                                <li>• The nudge count for that worker resets to 0</li>
                            </ul>
                        </Section>

                        <Section title="Auto-Escalation (3 Unanswered)" icon={AlertTriangle}>
                            <p className="text-sm text-[#4B5563]">
                                If a worker fails to respond to <strong>3 consecutive nudges</strong>, they are automatically escalated
                                to Priority 1 status. This triggers:
                            </p>
                            <ul className="space-y-1 text-sm text-[#4B5563] mt-2">
                                <li>• A critical alert is created in the system</li>
                                <li>• Emergency contacts are notified via email</li>
                                <li>• The nudge button changes to "⚠ Escalated" and is disabled</li>
                                <li>• The escalation is logged in Nudge Logs</li>
                            </ul>
                        </Section>
                    </div>
                );

            case 'workers':
                return (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#1F2937] mb-4">Worker Management</h2>
                        <p className="text-[#4B5563] leading-relaxed">
                            Manage all worker profiles, contact information, and employment details.
                            This module allows you to register, update, and deactivate workers in the system.
                        </p>

                        <Section title="Adding a New Worker" icon={Plus}>
                            <ol className="list-decimal list-inside space-y-2 text-sm text-[#4B5563]">
                                <li>Click the <strong>"Add Worker"</strong> button in the top right corner.</li>
                                <li>Optionally upload a <strong>profile photo</strong> by clicking the camera circle at the top of the form.</li>
                                <li>Fill in the required fields: Employee Number, Full Name, Department (dropdown), and Position (dropdown).</li>
                                <li>Enter contact information: Contact Number (must be exactly 11 digits) and Email.</li>
                                <li>Add Emergency Contact details — name and number (also 11 digits).</li>
                                <li>Optionally add Date Hired and Medical Conditions.</li>
                                <li>Click <strong>"Add Worker"</strong> to submit, then confirm in the confirmation dialog.</li>
                            </ol>
                        </Section>

                        <Section title="Editing a Worker" icon={Edit}>
                            <ol className="list-decimal list-inside space-y-2 text-sm text-[#4B5563]">
                                <li>Find the worker in the table and click the <strong>pencil/edit icon</strong> in the Actions column.</li>
                                <li>Modify any fields as needed — you can also change or remove the profile photo.</li>
                                <li>Click <strong>"Save Changes"</strong> and confirm.</li>
                            </ol>
                        </Section>

                        <Section title="Worker Profile" icon={Eye}>
                            <p className="text-sm text-[#4B5563] mb-2">
                                Click the <strong>eye icon</strong> on a worker's row to view their full profile, which includes:
                            </p>
                            <ul className="space-y-1 text-sm text-[#4B5563]">
                                <li>• Personal and contact information</li>
                                <li>• Assigned device and status</li>
                                <li>• Recent alerts associated with the worker</li>
                                <li>• PPE compliance percentage</li>
                                <li>• Attendance records</li>
                                <li>• You can upload/change the profile photo directly from this page.</li>
                            </ul>
                        </Section>

                        <Section title="Activating/Deactivating Workers" icon={Power}>
                            <p className="text-sm text-[#4B5563]">
                                Click the <strong>power icon</strong> to toggle a worker between Active and Inactive status.
                                Deactivating a worker means they will not receive alerts and their device will be unmonitored.
                                You can reactivate them at any time using the same button.
                            </p>
                        </Section>

                        <Section title="Searching & Filtering" icon={Search}>
                            <p className="text-sm text-[#4B5563]">
                                Use the search bar to find workers by name or employee number.
                                Use the department dropdown to filter workers by their assigned department.
                            </p>
                        </Section>
                    </div>
                );

            case 'devices':
                return (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#1F2937] mb-4">Device Management</h2>
                        <p className="text-[#4B5563] leading-relaxed">
                            Manage the ESP32 IoT wearable devices used for worker safety monitoring.
                            Each device contains multiple sensors and communicates via HTTPS protocol.
                        </p>

                        <Section title="Adding a Device" icon={Plus}>
                            <ol className="list-decimal list-inside space-y-2 text-sm text-[#4B5563]">
                                <li>Click <strong>"Add Device"</strong> and enter the Device ID (must match the ESP32 firmware configuration).</li>
                                <li>Provide a device name for easy identification.</li>
                                <li>Set the device type and model information.</li>
                                <li>The device will appear as "Offline" until it connects to the server.</li>
                            </ol>
                        </Section>

                        <Section title="Assigning a Device to a Worker" icon={UserCheck}>
                            <p className="text-sm text-[#4B5563]">
                                Each device can be assigned to one worker at a time. To assign a device:
                            </p>
                            <ol className="list-decimal list-inside space-y-2 text-sm text-[#4B5563] mt-2">
                                <li>Click the <strong>assign button</strong> on the device row.</li>
                                <li>Select a worker from the dropdown list.</li>
                                <li>Confirm the assignment. The worker will now receive monitoring coverage through this device.</li>
                            </ol>
                        </Section>

                        <Section title="Device Status" icon={Activity}>
                            <ul className="space-y-2 text-sm text-[#4B5563]">
                                <li><strong>Online:</strong> Device is actively transmitting sensor data.</li>
                                <li><strong>Offline:</strong> Device is not transmitting — may be powered off or out of range.</li>
                                <li><strong>Assigned:</strong> Device is linked to a worker.</li>
                                <li><strong>Unassigned:</strong> Device is available for assignment.</li>
                            </ul>
                        </Section>
                    </div>
                );

            case 'alerts':
                return (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#1F2937] mb-4">Alert Management</h2>
                        <p className="text-[#4B5563] leading-relaxed">
                            The Alerts module tracks all safety alerts generated by the system. Alerts are created automatically
                            when sensor readings exceed thresholds, when a worker presses the emergency button, or when voice
                            commands are detected.
                        </p>

                        <Section title="Alert Types" icon={AlertTriangle}>
                            <ul className="space-y-2 text-sm text-[#4B5563]">
                                <li><strong>Emergency Button:</strong> Triggered when a worker uses the touch sensor (panic button) on their device.</li>
                                <li><strong>Voice Alert – Tulong / Help:</strong> Triggered by AI keyword detection via the INMP441 microphone (Edge Impulse model).</li>
                                <li><strong>High Temperature:</strong> Ambient temperature from the DHT22 sensor exceeds the safe threshold.</li>
                                <li><strong>Fall Detected:</strong> MPU6050 accelerometer detects a sudden impact (acceleration &gt; 25 m/s²).</li>
                                <li><strong>Geofence Violation:</strong> Worker's GPS position moves outside the designated facility radius — triggers a Critical alert and emergency buzzer on all devices.</li>
                                <li><strong>Flat Orientation Detected:</strong> Device remains flat/horizontal for 3+ consecutive readings, suggesting the worker may be incapacitated.</li>
                                <li><strong>Nudge Auto-Escalation:</strong> Worker failed to respond to 3 consecutive nudges.</li>
                            </ul>
                        </Section>

                        <Section title="Alert Severity Levels" icon={Zap}>
                            <ul className="space-y-2 text-sm text-[#4B5563]">
                                <li><span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2"></span><strong>Critical:</strong> Immediate danger — requires instant response (e.g., emergency button, gas detection).</li>
                                <li><span className="inline-block w-3 h-3 rounded-full bg-orange-500 mr-2"></span><strong>High:</strong> Serious safety concern — respond promptly.</li>
                                <li><span className="inline-block w-3 h-3 rounded-full bg-yellow-500 mr-2"></span><strong>Medium:</strong> Warning-level condition — monitor closely.</li>
                                <li><span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-2"></span><strong>Low:</strong> Informational alert — review when convenient.</li>
                            </ul>
                        </Section>

                        <Section title="Alert Workflow" icon={Clock}>
                            <ol className="list-decimal list-inside space-y-2 text-sm text-[#4B5563]">
                                <li><strong>Pending:</strong> New alert — waiting for acknowledgment.</li>
                                <li><strong>Acknowledged:</strong> An operator has seen the alert and is taking action.</li>
                                <li><strong>Resolved:</strong> The situation has been handled and documented.</li>
                            </ol>
                            <p className="text-sm text-[#4B5563] mt-3">
                                You can acknowledge alerts individually or use <strong>batch acknowledge</strong> to handle multiple alerts at once.
                                When acknowledging, you can optionally add quick notes for context.
                            </p>
                        </Section>

                        <Section title="Auto-Escalation" icon={TrendingUp}>
                            <p className="text-sm text-[#4B5563]">
                                If an alert remains unacknowledged for a configured period (default: 5 minutes for Critical alerts),
                                it automatically escalates. Escalated alerts are flagged with a special indicator and may trigger
                                email notifications to supervisors and emergency contacts.
                            </p>
                        </Section>
                    </div>
                );

            case 'emergency-queue':
                return (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#1F2937] mb-4">Emergency Queue Panel</h2>
                        <p className="text-[#4B5563] leading-relaxed">
                            The Emergency Queue is a persistent sidebar panel visible on the right side of every page.
                            It shows all active emergency alerts in real-time and allows you to take immediate action.
                        </p>

                        <Section title="How It Works" icon={Bell}>
                            <ul className="space-y-2 text-sm text-[#4B5563]">
                                <li>• The panel updates automatically in real-time via WebSocket — no need to refresh.</li>
                                <li>• New emergencies appear at the top with a visual animation.</li>
                                <li>• Each emergency card shows the worker name, device, alert type, and timestamp.</li>
                                <li>• A buzzer sound is broadcast to all connected devices when an emergency is triggered.</li>
                                <li>• The panel can be expanded or collapsed using the toggle button.</li>
                            </ul>
                        </Section>

                        <Section title="Taking Action" icon={CheckCircle}>
                            <ul className="space-y-2 text-sm text-[#4B5563]">
                                <li><strong>Acknowledge:</strong> Click the "Acknowledge" button to indicate you've seen the alert and are responding.</li>
                                <li><strong>View Details:</strong> Click on the emergency card to navigate to the full alert details.</li>
                                <li><strong>Quick Notes:</strong> When acknowledging, you can add optional notes describing your response.</li>
                            </ul>
                        </Section>

                        <Section title="Global Emergency Alert" icon={AlertTriangle}>
                            <p className="text-sm text-[#4B5563]">
                                When a new critical emergency arrives, a full-screen banner appears at the top of the page
                                with the alert details. This ensures you never miss a critical emergency regardless of
                                which page you're currently viewing. An emergency buzzer sound also plays on all connected devices.
                            </p>
                        </Section>
                    </div>
                );

            case 'incidents':
                return (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#1F2937] mb-4">Incident Management</h2>
                        <p className="text-[#4B5563] leading-relaxed">
                            The Incident Management module allows you to create, track, and resolve workplace safety incidents.
                            Incidents can be created manually or auto-generated from emergency alerts.
                        </p>

                        <Section title="Creating an Incident" icon={Plus}>
                            <ol className="list-decimal list-inside space-y-2 text-sm text-[#4B5563]">
                                <li>Click <strong>"Report Incident"</strong> on the Incident Management page.</li>
                                <li>Fill in the incident title and select the incident type (Equipment Failure, Minor Injury, Major Injury, Near Miss, etc.).</li>
                                <li>Set the severity level (Low, Medium, High, Critical).</li>
                                <li>Select the affected worker and location.</li>
                                <li>Provide a detailed description of what happened.</li>
                                <li>Add any witnesses if applicable.</li>
                                <li>Submit the incident report.</li>
                            </ol>
                        </Section>

                        <Section title="Incident Detail Page" icon={FileText}>
                            <p className="text-sm text-[#4B5563] mb-2">
                                Click on any incident to view its full detail page, where you can:
                            </p>
                            <ul className="space-y-2 text-sm text-[#4B5563]">
                                <li><strong>View Details:</strong> See the complete incident information — type, severity, worker, location, description, and witnesses.</li>
                                <li><strong>Add Notes:</strong> Add timestamped notes to the incident for ongoing documentation. Notes record who added them and when.</li>
                                <li><strong>Log Actions Taken:</strong> Document specific actions taken in response to the incident (e.g., "First aid administered", "Area evacuated").</li>
                                <li><strong>Update Status:</strong> Change the incident status: Open → Under Investigation → Resolved.</li>
                                <li><strong>Close Incident:</strong> Close the incident with a resolution summary, recording the final outcome.</li>
                                <li><strong>Timeline:</strong> View a chronological timeline of all actions taken.</li>
                            </ul>
                        </Section>

                        <Section title="Incident Statuses" icon={Clock}>
                            <ul className="space-y-2 text-sm text-[#4B5563]">
                                <li><strong>Open:</strong> Newly reported — awaiting investigation.</li>
                                <li><strong>Under Investigation:</strong> Currently being investigated and handled.</li>
                                <li><strong>Resolved:</strong> Issue has been resolved but incident stays on record.</li>
                                <li><strong>Closed:</strong> Incident is fully closed with a documented resolution.</li>
                            </ul>
                        </Section>
                    </div>
                );

            case 'reports':
                return (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#1F2937] mb-4">Reports & Analytics</h2>
                        <p className="text-[#4B5563] leading-relaxed">
                            The Reports module provides comprehensive safety analytics through visual charts and detailed metrics.
                            Use date range filters to analyze specific time periods.
                        </p>

                        <Section title="Available Reports" icon={BarChart3}>
                            <ul className="space-y-3 text-sm text-[#4B5563]">
                                <li>
                                    <strong>Worker Safety Report:</strong> Analyzes worker-related safety data including
                                    total workers, active workers, alert frequency per worker, and safety compliance rates.
                                </li>
                                <li>
                                    <strong>Device Performance Report:</strong> Monitors device uptime, connectivity status,
                                    sensor accuracy, and maintenance needs across all deployed devices.
                                </li>
                                <li>
                                    <strong>Alert Analytics:</strong> Breaks down alerts by type, severity, response time,
                                    and resolution rate. Includes trend charts showing alert patterns over time.
                                </li>
                                <li>
                                    <strong>Compliance Report:</strong> Tracks adherence to safety protocols, PPE compliance,
                                    and regulatory requirements.
                                </li>
                            </ul>
                        </Section>

                        <Section title="Charts & Visualization" icon={TrendingUp}>
                            <p className="text-sm text-[#4B5563]">
                                Reports include interactive charts (line, bar, doughnut, and pie charts) powered by Chart.js.
                                You can hover over data points for detailed tooltips and use the date range picker to
                                filter data for specific time periods.
                            </p>
                        </Section>
                    </div>
                );

            case 'contacts':
                return (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#1F2937] mb-4">Emergency Contacts</h2>
                        <p className="text-[#4B5563] leading-relaxed">
                            Manage the list of emergency contacts that are notified when critical alerts are escalated.
                            This module is available to Admins and Head Admins only.
                        </p>

                        <Section title="Managing Contacts" icon={Phone}>
                            <ul className="space-y-2 text-sm text-[#4B5563]">
                                <li><strong>Add Contact:</strong> Register new emergency contacts with name, phone number, email, role, and organization.</li>
                                <li><strong>Edit Contact:</strong> Update existing contact information as needed.</li>
                                <li><strong>Archive/Delete:</strong> Remove contacts that are no longer needed.</li>
                            </ul>
                        </Section>

                        <Section title="Notification System" icon={Bell}>
                            <p className="text-sm text-[#4B5563]">
                                When an alert is escalated (unacknowledged past the configured time) or a worker's nudge count
                                reaches 3, the system sends email notifications to the relevant emergency contacts.
                                This ensures that critical situations are communicated even if the monitoring operator is unavailable.
                            </p>
                        </Section>
                    </div>
                );

            case 'nudge-logs':
                return (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#1F2937] mb-4">Nudge Logs</h2>
                        <p className="text-[#4B5563] leading-relaxed">
                            The Nudge Logs page provides a detailed history of all nudges sent to workers.
                            It tracks who was nudged, when, whether they responded, and the response time.
                        </p>

                        <Section title="Log Details" icon={FileText}>
                            <ul className="space-y-2 text-sm text-[#4B5563]">
                                <li><strong>Worker Name:</strong> The worker who received the nudge.</li>
                                <li><strong>Device ID:</strong> Which device was nudged.</li>
                                <li><strong>Sent At:</strong> Timestamp when the nudge was sent.</li>
                                <li><strong>Status:</strong> Acknowledged, Expired, or Escalated.</li>
                                <li><strong>Response Time:</strong> How long the worker took to respond (if acknowledged).</li>
                                <li><strong>Unanswered Count:</strong> Number of consecutive unanswered nudges at that point.</li>
                            </ul>
                        </Section>

                        <Section title="Filtering & Search" icon={Search}>
                            <p className="text-sm text-[#4B5563]">
                                Use the search bar to filter logs by worker name or device ID.
                                Logs are sorted by most recent first.
                            </p>
                        </Section>
                    </div>
                );

            case 'language':
                return (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#1F2937] mb-4">Language Toggle (EN / Filipino)</h2>
                        <p className="text-[#4B5563] leading-relaxed">
                            GuardWell supports two languages: <strong>English</strong> and <strong>Filipino</strong>.
                            You can switch between them at any time.
                        </p>

                        <Section title="How to Switch Language" icon={Globe}>
                            <ol className="list-decimal list-inside space-y-2 text-sm text-[#4B5563]">
                                <li>Look for the <strong>🌐 EN</strong> or <strong>🌐 FIL</strong> button in the top navigation bar.</li>
                                <li>Click it to toggle between English and Filipino.</li>
                                <li>The interface labels (navigation, dashboard, live monitoring, etc.) will update immediately.</li>
                                <li>Your preference is saved automatically and will persist across sessions.</li>
                            </ol>
                        </Section>

                        <Section title="What Gets Translated" icon={CheckCircle}>
                            <ul className="space-y-1 text-sm text-[#4B5563]">
                                <li>• Navigation bar labels and connection status</li>
                                <li>• Sidebar menu items</li>
                                <li>• Dashboard headings, metric cards, and action buttons</li>
                                <li>• Live Monitoring view labels, sensor names, and status indicators</li>
                                <li>• Confirmation dialogs and modals</li>
                            </ul>
                        </Section>
                    </div>
                );

            case 'session-timeout':
                return (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#1F2937] mb-4">Session & Timeout</h2>
                        <p className="text-[#4B5563] leading-relaxed">
                            For security, GuardWell includes a session inactivity timeout that automatically logs you out
                            after a period of inactivity.
                        </p>

                        <Section title="How It Works" icon={Timer}>
                            <ul className="space-y-2 text-sm text-[#4B5563]">
                                <li>• If you are inactive (no mouse movement, clicks, or keyboard input) for a set period, a warning banner appears.</li>
                                <li>• The banner shows a countdown timer and a <strong>"Stay Logged In"</strong> button.</li>
                                <li>• If you click "Stay Logged In" or interact with the page, the timer resets.</li>
                                <li>• If the countdown reaches zero, you are automatically logged out.</li>
                            </ul>
                        </Section>

                        <Section title="Why This Exists" icon={Shield}>
                            <p className="text-sm text-[#4B5563]">
                                The timeout ensures that unattended workstations do not remain logged into the safety
                                monitoring system, preventing unauthorized access and maintaining data security.
                            </p>
                        </Section>
                    </div>
                );

            case 'admin':
                return (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#1F2937] mb-4">Administration</h2>
                        <p className="text-[#4B5563] leading-relaxed">
                            Administration features are available only to Head Admin users. These modules allow you to
                            manage system users, view audit logs, and configure system settings.
                        </p>

                        <Section title="User Management" icon={Users}>
                            <ul className="space-y-2 text-sm text-[#4B5563]">
                                <li><strong>Create Users:</strong> Add new system users with email, name, role, and department.</li>
                                <li><strong>Assign Roles:</strong> Set user roles (Safety Officer, Admin, or Head Admin) — each role has different permissions.</li>
                                <li><strong>Reset Passwords:</strong> Reset a user's password if they're locked out.</li>
                                <li><strong>Deactivate Users:</strong> Disable accounts for users who no longer need access.</li>
                            </ul>
                        </Section>

                        <Section title="System Settings" icon={Settings}>
                            <p className="text-sm text-[#4B5563]">
                                Configure system-wide settings such as alert thresholds, escalation timers, notification preferences,
                                and email settings. Changes here affect the entire system's behavior.
                            </p>
                        </Section>

                        <Section title="Audit Log" icon={FileText}>
                            <p className="text-sm text-[#4B5563]">
                                View a chronological log of all significant system actions — who did what and when.
                                The audit log tracks user logins, data modifications, alert acknowledgments, and administrative changes
                                for accountability and compliance purposes.
                            </p>
                        </Section>
                    </div>
                );

            case 'roles':
                return (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#1F2937] mb-4">User Roles & Permissions</h2>
                        <p className="text-[#4B5563] leading-relaxed">
                            GuardWell uses a role-based access control system with three levels of access.
                        </p>

                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm border border-[#E3E6EB] rounded-lg overflow-hidden">
                                <thead className="bg-[#EEF1F4]">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold text-[#1F2937]">Feature</th>
                                        <th className="px-4 py-3 text-center font-semibold text-[#1F2937]">Safety Officer</th>
                                        <th className="px-4 py-3 text-center font-semibold text-[#1F2937]">Admin</th>
                                        <th className="px-4 py-3 text-center font-semibold text-[#1F2937]">Head Admin</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E3E6EB]">
                                    {[
                                        ['View Dashboard', true, true, true],
                                        ['Live Monitoring', true, true, true],
                                        ['View Workers', true, true, true],
                                        ['Add/Edit Workers', false, true, true],
                                        ['View Devices', true, true, true],
                                        ['Manage Devices', false, true, true],
                                        ['View & Respond to Alerts', true, true, true],
                                        ['Send Nudges', true, true, true],
                                        ['View Nudge Logs', true, true, true],
                                        ['View Incidents', true, true, true],
                                        ['Create/Edit Incidents', true, true, true],
                                        ['View Reports', true, true, true],
                                        ['Manage Emergency Contacts', false, true, true],
                                        ['Manage System Users', false, false, true],
                                        ['System Settings', false, false, true],
                                        ['View Audit Logs', false, false, true],
                                    ].map(([feature, so, admin, ha], i) => (
                                        <tr key={i} className="hover:bg-[#EEF1F4]/50">
                                            <td className="px-4 py-2.5 text-[#4B5563]">{feature}</td>
                                            <td className="px-4 py-2.5 text-center">{so ? <CheckCircle size={16} className="text-green-500 inline" /> : <span className="text-[#D1D5DB]">—</span>}</td>
                                            <td className="px-4 py-2.5 text-center">{admin ? <CheckCircle size={16} className="text-green-500 inline" /> : <span className="text-[#D1D5DB]">—</span>}</td>
                                            <td className="px-4 py-2.5 text-center">{ha ? <CheckCircle size={16} className="text-green-500 inline" /> : <span className="text-[#D1D5DB]">—</span>}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );

            case 'faq':
                return (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#1F2937] mb-4">FAQ & Troubleshooting</h2>

                        {[
                            {
                                q: 'I see a "500 Internal Server Error" when loading the page. What should I do?',
                                a: 'This usually means the backend server is restarting or experiencing an issue. Wait a few minutes and refresh the page. If the issue persists, contact the Head Administrator.'
                            },
                            {
                                q: 'A device shows as "Offline" even though it should be active.',
                                a: 'Check that the ESP32 device is powered on, connected to WiFi, and configured with the correct server address. The device LED should indicate its connection status.'
                            },
                            {
                                q: 'I\'m not receiving emergency alert notifications.',
                                a: 'Ensure that the Emergency Queue panel is not minimized (check the bell icon on the right side of the screen). Also verify that your browser allows notifications from the application.'
                            },
                            {
                                q: 'How do I change my password?',
                                a: 'Click on your profile name in the top navigation bar and select "Change Password". Enter your current password and your new password twice to confirm.'
                            },
                            {
                                q: 'The sensor readings seem incorrect or stuck.',
                                a: 'This may indicate a sensor calibration issue or device malfunction. Try having the worker restart the device. If readings remain stuck, the device may need physical inspection and recalibration.'
                            },
                            {
                                q: 'Can I use GuardWell on a mobile device?',
                                a: 'GuardWell is a web-based application that works on any modern browser. While it\'s optimized for desktop/laptop screens, it is accessible on tablets and smartphones. For the best experience, use a larger screen.'
                            },
                            {
                                q: 'How is my data protected?',
                                a: 'All data is transferred over encrypted connections (HTTPS). User authentication uses JWT tokens with bcrypt-hashed passwords. Access is restricted based on user roles. Please review the Terms & Conditions for full data privacy details.'
                            },
                            {
                                q: 'How do I switch the interface language?',
                                a: 'Click the 🌐 button (showing "EN" or "FIL") in the top navigation bar to toggle between English and Filipino. Your preference is saved automatically.'
                            },
                            {
                                q: 'A worker did not respond to nudges. What happens?',
                                a: 'After 3 unanswered nudges, the worker is automatically escalated to Priority 1. A critical alert is created and emergency contacts are notified via email. The worker\'s card will show "⚠ Escalated".'
                            },
                            {
                                q: 'I was logged out automatically. Why?',
                                a: 'GuardWell has a session inactivity timeout. If you don\'t interact with the system for a set period, a warning banner appears with a countdown. If you don\'t click "Stay Logged In" before it expires, you are logged out for security.'
                            },
                            {
                                q: 'How do I view the warehouse on the map?',
                                a: 'Go to Live Monitoring → Map view. The warehouse building is shown as a polygon overlay with labeled rooms. Switch to "Vector" mode for the clearest view of the floor plan.'
                            },
                        ].map((faq, i) => (
                            <CardDark key={i}>
                                <CardBody className="p-5">
                                    <h3 className="font-semibold text-[#1F2937] mb-2 flex items-start gap-2">
                                        <HelpCircle size={18} className="text-[#6FA3D8] flex-shrink-0 mt-0.5" />
                                        {faq.q}
                                    </h3>
                                    <p className="text-sm text-[#4B5563] pl-7">{faq.a}</p>
                                </CardBody>
                            </CardDark>
                        ))}
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="flex gap-6 min-h-[calc(100vh-120px)]">
            {/* Sidebar Navigation */}
            <div className="w-72 flex-shrink-0">
                <CardDark className="sticky top-6">
                    <CardHeader className="px-4 py-4 border-b border-[#E3E6EB]">
                        <div className="flex items-center gap-2 mb-3">
                            <BookOpen size={20} className="text-[#E85D2A]" />
                            <h2 className="font-bold text-[#1F2937]">User Manual</h2>
                        </div>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                            <input
                                type="text"
                                placeholder="Search topics..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E3E6EB] bg-[#EEF1F4] text-sm text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#6FA3D8]/30 focus:border-[#6FA3D8]"
                            />
                        </div>
                    </CardHeader>
                    <CardBody className="p-2">
                        <nav className="space-y-0.5">
                            {filteredSections.map((section) => {
                                const Icon = section.icon;
                                const isActive = activeSection === section.id;
                                return (
                                    <button
                                        key={section.id}
                                        onClick={() => setActiveSection(section.id)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${isActive
                                            ? 'bg-[#6FA3D8]/10 text-[#2F4A6D] font-semibold border border-[#6FA3D8]/20'
                                            : 'text-[#4B5563] hover:bg-[#EEF1F4] hover:text-[#1F2937]'
                                            }`}
                                    >
                                        <Icon size={16} className={isActive ? 'text-[#6FA3D8]' : 'text-[#6B7280]'} />
                                        {section.name}
                                    </button>
                                );
                            })}
                        </nav>
                    </CardBody>
                </CardDark>
            </div>

            {/* Content Area */}
            <div className="flex-1">
                <CardDark>
                    <CardBody className="p-8">
                        {renderContent()}
                    </CardBody>
                </CardDark>
            </div>
        </div>
    );
};

// Reusable section component
const Section = ({ title, icon: Icon, children }) => (
    <div className="bg-[#EEF1F4] rounded-xl p-5 border border-[#E3E6EB]">
        <h3 className="font-semibold text-[#1F2937] mb-3 flex items-center gap-2">
            <Icon size={18} className="text-[#6FA3D8]" />
            {title}
        </h3>
        {children}
    </div>
);

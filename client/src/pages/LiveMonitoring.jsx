import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Thermometer, Wind, Droplets, Battery, Signal, User, Shield, Radio, AlertTriangle, CheckCircle, X, Eye, Clock, Bell, ShieldCheck, Mic, Map, Grid, MapPin, Globe, Layers, Navigation2, Smartphone } from 'lucide-react';
import { CardDark, CardBody } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { LocationMap } from '../components/ui/LocationMap';
import { DeviceLedIndicator } from '../components/ui/DeviceLedIndicator';
import { useSocket } from '../context/SocketContext';
import { devicesApi, alertsApi, sensorsApi } from '../utils/api';
import { useToast } from '../context/ToastContext';
import { useRefresh } from '../context/RefreshContext';

export const LiveMonitoring = () => {
    const { socket, sensorData, connected, emitEvent } = useSocket();
    const [filter, setFilter] = useState('all');
    const [devices, setDevices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedWorker, setSelectedWorker] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [markedSafe, setMarkedSafe] = useState({});
    const [sosActive, setSosActive] = useState({});
    const [nudgedDevices, setNudgedDevices] = useState({});
    const [nudgeCounts, setNudgeCounts] = useState({});       // { deviceId: unansweredCount }
    const [escalatedDevices, setEscalatedDevices] = useState({}); // { deviceId: true }
    const [recentAcks, setRecentAcks] = useState([]);             // Recent acknowledged nudges for popup
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'map'
    const [mapStyle, setMapStyle] = useState('satellite'); // 'satellite' or 'vector'
    const [focusDeviceId, setFocusDeviceId] = useState(null); // device to fly to on map
    const [fitAllTrigger, setFitAllTrigger] = useState(0); // increment to trigger fit-all
    const toast = useToast();

    // Fetch devices from API
    const fetchDevices = useCallback(async () => {
        try {
            const response = await devicesApi.getAll();
            setDevices(response.data);
        } catch (error) {
            console.error('Failed to fetch devices:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchDevices(); }, [fetchDevices]);

    // Register refresh
    const { registerRefresh } = useRefresh();
    useEffect(() => { registerRefresh(fetchDevices); }, [registerRefresh, fetchDevices]);

    // Combine devices with real-time sensor data
    const workersWithSensorData = devices.map(device => {
        // Get real-time data for this device from Socket
        const realTimeData = sensorData[device.deviceId] || {};

        // Check if this device has an active SOS (persists until marked safe)
        const hasSosActive = sosActive[device.deviceId] || false;

        // Check if emergency button is currently pressed
        const emergencyPressed = realTimeData.emergency_button || false;

        // Check for voice alert
        const voiceAlertActive = realTimeData.voice_alert || false;

        // Check for geofence violation
        const geofenceViolation = realTimeData.geofence_violation || false;

        // Check for flat orientation alert
        const flatOrientation = realTimeData.flat_orientation || false;

        // Determine status based on sensor readings and SOS state
        let status = 'normal';
        if (hasSosActive || emergencyPressed || voiceAlertActive || geofenceViolation || flatOrientation || realTimeData.temperature >= 50 || realTimeData.gas_level >= 400) {
            status = 'critical';
        } else if (realTimeData.temperature >= 40 || realTimeData.gas_level >= 200) {
            status = 'warning';
        }

        return {
            id: device.id,
            name: device.worker?.fullName || 'Unassigned',
            department: device.worker?.department || 'N/A',
            device: device.deviceId,
            sensors: {
                temperature: realTimeData.temperature || 0,
                gas: realTimeData.gas_level || 0,
                humidity: realTimeData.humidity || 0,
                battery: realTimeData.battery || device.battery || 0,
                signal: realTimeData.rssi || 0,
                accel: {
                    x: realTimeData.accel_x || 0,
                    y: realTimeData.accel_y || 0,
                    z: realTimeData.accel_z || 0
                },
                gyro: {
                    x: realTimeData.gyro_x || 0,
                    y: realTimeData.gyro_y || 0,
                    z: realTimeData.gyro_z || 0
                },
                movement: realTimeData.accel_x !== undefined ? 'Active' : 'Unknown',
                emergency: emergencyPressed,
                sosActive: hasSosActive,
                // Voice recognition data
                voiceCommand: realTimeData.voice_command || null,
                voiceCommandId: realTimeData.voice_command_id || null,
                voiceAlert: voiceAlertActive,
                voiceAlertType: realTimeData.voice_alert_type || null,
                // GPS data — use != null to preserve valid 0.0 coordinates
                latitude: realTimeData.latitude != null ? realTimeData.latitude : null,
                longitude: realTimeData.longitude != null ? realTimeData.longitude : null,
                gpsSpeed: realTimeData.gps_speed != null ? realTimeData.gps_speed : null,
                gpsValid: realTimeData.gps_valid || false,
                satellites: realTimeData.satellites || 0,
                geofenceViolation: geofenceViolation,
                gpsChars: realTimeData.gps_chars || 0,
                flatOrientation: flatOrientation
            },
            status: Object.keys(realTimeData).length > 0 ? status : 'offline',
            lastUpdate: realTimeData.createdAt || 'No data'
        };
    });

    // Effect to set SOS active when emergency button is pressed
    useEffect(() => {
        devices.forEach(device => {
            const realTimeData = sensorData[device.deviceId] || {};
            if (realTimeData.emergency_button && !sosActive[device.deviceId]) {
                // SOS button was pressed - set active and keep until marked safe
                setSosActive(prev => ({ ...prev, [device.deviceId]: true }));
                toast.error(
                    `Emergency SOS activated for ${device.worker?.fullName || device.deviceId}!`,
                    'SOS ALERT'
                );
            }
        });
    }, [sensorData, devices]);

    // Filter if needed
    const filteredWorkers = workersWithSensorData.filter(worker => {
        if (filter === 'all') return true;
        return worker.department.toLowerCase() === filter;
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'normal': return 'border-success/50';
            case 'warning': return 'border-warning/50';
            case 'critical': return 'border-danger/50 emergency-alert';
            case 'offline': return 'border-gray-700 opacity-60';
            default: return 'border-gray-700';
        }
    };

    // Get voice command display name (Tagalog to English mapping)
    const getVoiceCommandDisplay = (alertType) => {
        const voiceCommands = {
            help: { tagalog: 'TULONG', english: 'Help Requested', icon: '🙋' },
            emergency: { tagalog: 'EMERGENCY', english: 'Emergency', icon: '🚨' },
            fall_shock: { tagalog: 'ARAY', english: 'Fall/Shock Detected', icon: '⚠️' },
            call_nurse: { tagalog: 'TAWAG', english: 'Call Nurse', icon: '📞' },
            pain: { tagalog: 'SAKIT', english: 'Pain Reported', icon: '🩺' }
        };
        return voiceCommands[alertType] || { tagalog: alertType?.toUpperCase(), english: 'Voice Alert', icon: '🎤' };
    };

    const getSensorStatus = (value, thresholds) => {
        if (value >= thresholds.critical) return 'text-danger';
        if (value >= thresholds.warning) return 'text-warning';
        return 'text-success';
    };

    // Gas level interpretation
    const getGasLevelInfo = (ppm) => {
        if (ppm >= 450) {
            return {
                label: 'Critical',
                description: 'Gas Leak Detected',
                color: 'text-danger',
                bgColor: 'bg-red-500/20',
                percentage: '40%+'
            };
        } else if (ppm >= 221) {
            return {
                label: 'Poor',
                description: 'Poor Ventilation',
                color: 'text-warning',
                bgColor: 'bg-yellow-500/20',
                percentage: `${Math.round((ppm / 1000) * 100)}%`
            };
        } else {
            return {
                label: 'Normal',
                description: 'Safe Levels',
                color: 'text-success',
                bgColor: 'bg-green-500/20',
                percentage: `${Math.round((ppm / 1000) * 100)}%`
            };
        }
    };

    // Accelerometer → human-readable orientation / movement
    const getOrientationInfo = (accel) => {
        const x = accel?.x || 0;
        const y = accel?.y || 0;
        const z = accel?.z || 0;
        const magnitude = Math.sqrt(x * x + y * y + z * z);

        // Fall / impact detection
        if (magnitude >= 25) return { label: 'Fall Detected!', icon: '🚨', color: 'text-red-500', bgColor: 'bg-red-500/15' };
        if (magnitude >= 15) return { label: 'High Impact', icon: '⚠️', color: 'text-orange-500', bgColor: 'bg-orange-500/15' };

        // Orientation based on dominant axis
        const absX = Math.abs(x), absY = Math.abs(y), absZ = Math.abs(z);
        if (absZ > absX && absZ > absY) {
            return z > 0
                ? { label: 'Flat / Horizontal', icon: '📱', color: 'text-green-600', bgColor: 'bg-green-500/15' }
                : { label: 'Upside Down', icon: '🔄', color: 'text-yellow-600', bgColor: 'bg-yellow-500/15' };
        }
        if (absY > absX && absY > absZ) {
            return { label: 'Upright / Standing', icon: '🧍', color: 'text-blue-600', bgColor: 'bg-blue-500/15' };
        }
        if (absX > absY && absX > absZ) {
            return { label: 'Tilted Sideways', icon: '↗️', color: 'text-purple-600', bgColor: 'bg-purple-500/15' };
        }
        return { label: 'In Motion', icon: '🏃', color: 'text-cyan-600', bgColor: 'bg-cyan-500/15' };
    };

    // Gyroscope → human-readable rotation status
    const getRotationInfo = (gyro) => {
        const x = gyro?.x || 0;
        const y = gyro?.y || 0;
        const z = gyro?.z || 0;
        const rotMag = Math.sqrt(x * x + y * y + z * z);

        if (rotMag < 5) return { label: 'Stationary', icon: '⏸️', color: 'text-green-600', bgColor: 'bg-green-500/15' };
        if (rotMag < 30) return { label: 'Slight Movement', icon: '🔃', color: 'text-blue-600', bgColor: 'bg-blue-500/15' };
        if (rotMag < 90) return { label: 'Active Movement', icon: '🔄', color: 'text-yellow-600', bgColor: 'bg-yellow-500/15' };
        return { label: 'Rapid Rotation', icon: '🌀', color: 'text-red-500', bgColor: 'bg-red-500/15' };
    };

    // Humidity → human-readable comfort level
    const getHumidityInfo = (humidity) => {
        const h = humidity || 0;
        if (h < 20) return { label: 'Very Dry', color: 'text-orange-500', bgColor: 'bg-orange-500/15' };
        if (h < 30) return { label: 'Dry', color: 'text-yellow-600', bgColor: 'bg-yellow-500/15' };
        if (h <= 60) return { label: 'Comfortable', color: 'text-green-600', bgColor: 'bg-green-500/15' };
        if (h <= 70) return { label: 'Humid', color: 'text-yellow-600', bgColor: 'bg-yellow-500/15' };
        return { label: 'Very Humid', color: 'text-red-500', bgColor: 'bg-red-500/15' };
    };

    // Calculate metrics
    const activeDevices = workersWithSensorData.filter(w => w.status !== 'offline').length;
    const avgTemp = workersWithSensorData.length > 0
        ? Math.round(workersWithSensorData.reduce((sum, w) => sum + (w.sensors.temperature || 0), 0) / workersWithSensorData.length)
        : 0;

    // Handle view details
    const handleViewDetails = (worker) => {
        setSelectedWorker(worker);
        setShowDetailsModal(true);
    };

    // Handle mark safe - clears the SOS state for the device
    const handleMarkSafe = (workerId, workerName, deviceId) => {
        // Clear the SOS active state for this device
        setSosActive(prev => {
            const updated = { ...prev };
            delete updated[deviceId];
            return updated;
        });

        setMarkedSafe(prev => ({ ...prev, [workerId]: true }));

        // Emit event to backend
        if (emitEvent) {
            emitEvent('worker_marked_safe', {
                workerId,
                workerName,
                deviceId,
                timestamp: new Date().toISOString(),
                markedBy: 'Operator'
            });
        }

        toast.success(`${workerName} has been marked as safe`);

        // Clear the marked safe badge after 5 seconds (visual only)
        setTimeout(() => {
            setMarkedSafe(prev => {
                const updated = { ...prev };
                delete updated[workerId];
                return updated;
            });
        }, 5000);
    };

    // Handle nudge — send check-in alert to ESP32 device
    const handleNudge = async (deviceId, workerName) => {
        try {
            setNudgedDevices(prev => ({ ...prev, [deviceId]: true }));
            const response = await sensorsApi.sendNudge(deviceId, `Check-in requested for ${workerName}`);
            const unansweredCount = response.data.unansweredCount || 0;
            setNudgeCounts(prev => ({ ...prev, [deviceId]: unansweredCount }));
            toast.success(`Nudge sent to ${workerName}'s device (${unansweredCount}/3 unanswered)`);

            // Clear nudge visual after 10 seconds (matches ESP32 NUDGE_BLINK_CYCLES)
            setTimeout(() => {
                setNudgedDevices(prev => {
                    const updated = { ...prev };
                    delete updated[deviceId];
                    return updated;
                });
            }, 10000);
        } catch (error) {
            console.error('Failed to send nudge:', error);
            toast.error('Failed to send nudge. Please try again.');
            setNudgedDevices(prev => {
                const updated = { ...prev };
                delete updated[deviceId];
                return updated;
            });
        }
    };

    // Listen for nudge-related socket events
    useEffect(() => {
        if (!socket) return;

        const handleNudgeAck = (data) => {
            // Worker responded — reset count and clear nudge state
            setNudgeCounts(prev => ({ ...prev, [data.deviceId]: 0 }));
            setEscalatedDevices(prev => {
                const updated = { ...prev };
                delete updated[data.deviceId];
                return updated;
            });
            setNudgedDevices(prev => {
                const updated = { ...prev };
                delete updated[data.deviceId];
                return updated;
            });

            // Add to recent acks popup
            const ackEntry = {
                id: data.nudgeLogId || Date.now(),
                deviceId: data.deviceId,
                workerName: data.workerName || data.deviceId,
                responseTime: data.responseTimeMs ? `${(data.responseTimeMs / 1000).toFixed(1)}s` : 'N/A',
                timestamp: data.timestamp || new Date().toISOString()
            };
            setRecentAcks(prev => [ackEntry, ...prev].slice(0, 10)); // Keep last 10

            // Also show a toast
            toast.success(
                `${ackEntry.workerName} acknowledged the nudge (${ackEntry.responseTime})`,
                'NUDGE ACKNOWLEDGED'
            );

            // Auto-remove from popup after 60 seconds
            setTimeout(() => {
                setRecentAcks(prev => prev.filter(a => a.id !== ackEntry.id));
            }, 60000);
        };

        const handleNudgeExpired = (data) => {
            setNudgeCounts(prev => ({ ...prev, [data.deviceId]: data.unansweredCount }));
        };

        const handleNudgeEscalated = (data) => {
            setEscalatedDevices(prev => ({ ...prev, [data.deviceId]: true }));
            setNudgeCounts(prev => ({ ...prev, [data.deviceId]: data.unansweredCount }));
            toast.error(`${data.workerName} auto-escalated — ${data.unansweredCount} unanswered nudges!`, 'AUTO-ESCALATION');
        };

        socket.on('nudge_acknowledged', handleNudgeAck);
        socket.on('nudge_expired', handleNudgeExpired);
        socket.on('nudge_escalated', handleNudgeEscalated);

        return () => {
            socket.off('nudge_acknowledged', handleNudgeAck);
            socket.off('nudge_expired', handleNudgeExpired);
            socket.off('nudge_escalated', handleNudgeEscalated);
        };
    }, [socket]);

    // Format time
    const formatTime = (timestamp) => {
        if (!timestamp || timestamp === 'No data') return 'No data';
        return new Date(timestamp).toLocaleTimeString();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-[#6B7280]">Loading devices...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-[#1F2937] mb-2">Live Monitoring</h1>
                    <p className="text-[#4B5563]">Real-time worker and sensor data monitoring</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-[#EEF1F4] rounded-lg border border-[#E3E6EB]">
                        <div className={`status-dot ${connected ? 'status-online' : 'status-offline'}`} />
                        <span className="text-sm text-[#4B5563]">{connected ? 'Live' : 'Disconnected'}</span>
                    </div>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="input-dark"
                    >
                        <option value="all">All Departments</option>
                        <option value="manufacturing">Manufacturing</option>
                        <option value="assembly">Assembly</option>
                        <option value="maintenance">Maintenance</option>
                    </select>
                    {/* View Mode Toggle */}
                    <div className="flex shrink-0 rounded-xl border border-[#E3E6EB] bg-white shadow-sm p-1 gap-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`px-5 py-2.5 flex items-center gap-2 rounded-lg font-medium transition-all duration-200 ${viewMode === 'grid'
                                ? 'bg-[#6FA3D8] text-white shadow-md'
                                : 'bg-transparent text-[#4B5563] hover:bg-[#EEF1F4] hover:text-[#1F2937]'
                                }`}
                        >
                            <Grid size={18} />
                            <span className="text-sm">Grid</span>
                        </button>
                        <button
                            onClick={() => setViewMode('map')}
                            className={`px-5 py-2.5 flex items-center gap-2 rounded-lg font-medium transition-all duration-200 ${viewMode === 'map'
                                ? 'bg-[#6FA3D8] text-white shadow-md'
                                : 'bg-transparent text-[#4B5563] hover:bg-[#EEF1F4] hover:text-[#1F2937]'
                                }`}
                        >
                            <MapPin size={18} />
                            <span className="text-sm">Map</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Recent Nudge Acknowledgments Popup */}
            {recentAcks.length > 0 && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 shadow-sm animate-in">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                                <CheckCircle size={18} className="text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-green-900 text-sm">Recent Nudge Acknowledgments</h3>
                                <p className="text-xs text-green-600">{recentAcks.length} worker{recentAcks.length > 1 ? 's' : ''} responded</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setRecentAcks([])}
                            className="p-1.5 rounded-lg hover:bg-green-200/50 transition-colors text-green-600"
                            title="Dismiss all"
                        >
                            <X size={16} />
                        </button>
                    </div>
                    <div className="space-y-2">
                        {recentAcks.map(ack => (
                            <div key={ack.id} className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2 border border-green-100">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                        <User size={12} className="text-green-700" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-[#1F2937]">{ack.workerName}</p>
                                        <p className="text-xs text-[#6B7280]">{ack.deviceId}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-medium text-green-700">Response: {ack.responseTime}</p>
                                    <p className="text-xs text-[#6B7280]">{new Date(ack.timestamp).toLocaleTimeString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Total Devices"
                    value={devices.length}
                    icon={Radio}
                    color="bg-[#3B82F6]"
                    subtitle="Registered devices"
                />
                <MetricCard
                    title="Active Now"
                    value={activeDevices}
                    icon={Activity}
                    color="bg-[#00BFA5]"
                    subtitle="Transmitting data"
                />
                <MetricCard
                    title="With Workers"
                    value={devices.filter(d => d.worker).length}
                    icon={User}
                    color="bg-[#10B981]"
                    subtitle="Assigned"
                />
                <MetricCard
                    title="Avg Temperature"
                    value={`${avgTemp}°C`}
                    icon={Thermometer}
                    color={avgTemp >= 40 ? "bg-[#EF4444]" : "bg-[#F59E0B]"}
                    subtitle={avgTemp >= 40 ? "Above normal" : "Safe range"}
                />
            </div>

            {/* Map View */}
            {viewMode === 'map' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <h2 className="text-xl font-semibold text-[#1F2937]">Worker Locations</h2>
                        <div className="flex items-center gap-4">
                            {/* Map Style Toggle */}
                            <div className="flex rounded-lg border border-[#E3E6EB] bg-white shadow-sm p-0.5 gap-0.5">
                                <button
                                    onClick={() => setMapStyle('satellite')}
                                    className={`px-3 py-1.5 flex items-center gap-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                                        mapStyle === 'satellite'
                                            ? 'bg-[#6FA3D8] text-white shadow-sm'
                                            : 'bg-transparent text-[#4B5563] hover:bg-[#EEF1F4]'
                                    }`}
                                >
                                    <Globe size={14} />
                                    Satellite
                                </button>
                                <button
                                    onClick={() => setMapStyle('vector')}
                                    className={`px-3 py-1.5 flex items-center gap-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                                        mapStyle === 'vector'
                                            ? 'bg-[#6FA3D8] text-white shadow-sm'
                                            : 'bg-transparent text-[#4B5563] hover:bg-[#EEF1F4]'
                                    }`}
                                >
                                    <Layers size={14} />
                                    Vector
                                </button>
                            </div>
                            {/* Legend */}
                            <div className="flex items-center gap-3 text-sm">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                                    Normal
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                                    Warning
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                                    Critical
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded-full bg-violet-500"></span>
                                    Outside
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Map + Device List side by side */}
                    <div className="flex gap-4">
                        {/* Map */}
                        <div className="flex-1">
                            <LocationMap
                                workers={filteredWorkers.map(w => ({
                                    ...w,
                                    deviceId: w.device
                                }))}
                                geofenceCenter={[14.705493, 121.034774]}
                                geofenceRadius={100}
                                mapStyle={mapStyle}
                                focusDeviceId={focusDeviceId}
                                onMarkerClick={(deviceId) => setFocusDeviceId(deviceId)}
                                fitAllTrigger={fitAllTrigger}
                            />
                        </div>

                        {/* Device List - Locate Sidebar */}
                        <div className="w-72 bg-white border border-[#E3E6EB] rounded-xl shadow-sm overflow-hidden flex flex-col" style={{ height: 500 }}>
                            <div className="p-3 border-b border-[#E3E6EB] bg-[#EEF1F4] flex items-center justify-between">
                                <h3 className="font-semibold text-sm text-[#1F2937] flex items-center gap-2">
                                    <Navigation2 size={16} className="text-[#6FA3D8]" />
                                    Devices ({filteredWorkers.length})
                                </h3>
                                <button
                                    onClick={() => {
                                        setFocusDeviceId(null);
                                        setFitAllTrigger(prev => prev + 1);
                                    }}
                                    className="text-xs px-2.5 py-1 rounded-md font-medium bg-white border border-[#E3E6EB] text-[#4B5563] hover:bg-[#6FA3D8] hover:text-white hover:border-[#6FA3D8] transition-all"
                                >
                                    Show All
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                {filteredWorkers.map((worker) => {
                                    const hasValidGPS = worker.sensors.latitude != null &&
                                        worker.sensors.longitude != null &&
                                        worker.sensors.gpsValid &&
                                        !(parseFloat(worker.sensors.latitude) === 0 && parseFloat(worker.sensors.longitude) === 0);

                                    return (
                                        <div
                                            key={worker.id}
                                            className={`p-3 rounded-lg border transition-all ${
                                                focusDeviceId === worker.device
                                                    ? 'border-[#6FA3D8] bg-[#6FA3D8]/10'
                                                    : 'border-[#E3E6EB] hover:border-[#6FA3D8]/50 hover:bg-[#EEF1F4]'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className={`w-2 h-2 rounded-full ${
                                                    worker.status === 'critical' ? 'bg-red-500' :
                                                    worker.status === 'warning' ? 'bg-orange-500' :
                                                    worker.status === 'offline' ? 'bg-gray-400' : 'bg-green-500'
                                                }`} />
                                                <span className="text-sm font-medium text-[#1F2937] truncate flex-1">{worker.name}</span>
                                                <span className="text-xs text-[#6B7280]">{worker.device}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className={`text-xs px-2 py-0.5 rounded ${
                                                    hasValidGPS
                                                        ? 'bg-green-50 text-green-600'
                                                        : 'bg-yellow-50 text-yellow-600'
                                                }`}>
                                                    {hasValidGPS ? '✓ GPS Fix' : '⏳ No GPS'}
                                                </span>
                                                <button
                                                    onClick={() => setFocusDeviceId(worker.device)}
                                                    disabled={!hasValidGPS}
                                                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                                                        hasValidGPS
                                                            ? 'bg-[#6FA3D8] text-white hover:bg-[#5A8FC4] cursor-pointer'
                                                            : 'bg-[#E3E6EB] text-[#9CA3AF] cursor-not-allowed'
                                                    }`}
                                                >
                                                    <MapPin size={12} />
                                                    Locate
                                                </button>
                                            </div>
                                            {hasValidGPS && (
                                                <div className="mt-2 text-xs text-[#6B7280] font-mono">
                                                    {parseFloat(worker.sensors.latitude).toFixed(6)}, {parseFloat(worker.sensors.longitude).toFixed(6)}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Devices Grid */}
            {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredWorkers.map((worker) => (
                        <CardDark
                            key={worker.id}
                            className={`${getStatusColor(worker.status)} transition-all duration-300`}
                        >
                            <CardBody className="p-6">
                                {/* Worker Info */}
                                <div className="flex items-start gap-4 mb-4 pb-4 border-b border-[#E3E6EB]">
                                    <div className="w-12 h-12 bg-[#6FA3D8] rounded-full flex items-center justify-center flex-shrink-0">
                                        <User className="h-7 w-7 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-[#1F2937] truncate">{worker.name}</h3>
                                        <p className="text-sm text-[#4B5563]">{worker.department}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="info" className="text-xs">{worker.device}</Badge>
                                            <Badge
                                                variant={worker.status === 'offline' ? 'secondary' : worker.status === 'critical' ? 'danger' : 'success'}
                                                className="text-xs"
                                            >
                                                {worker.status === 'offline' ? 'Offline' : worker.sensors.movement}
                                            </Badge>
                                        </div>
                                        {/* RGB LED Indicator - mirrors ESP32 hardware LED */}
                                        <div className="mt-1.5">
                                            <DeviceLedIndicator sensors={worker.sensors} status={worker.status} size="sm" nudgeActive={!!nudgedDevices[worker.device]} />
                                        </div>
                                    </div>
                                </div>

                                {/* SOS Indicator - Shows for active SOS (persists until marked safe) */}
                                {(worker.sensors.sosActive || worker.sensors.emergency) && !markedSafe[worker.id] && (
                                    <div className="mb-4 p-3 bg-red-500/20 border-2 border-red-500 rounded-lg animate-pulse">
                                        <div className="flex items-center justify-center gap-2 mb-2">
                                            <AlertTriangle className="h-6 w-6 text-red-500" />
                                            <span className="text-red-500 font-bold text-lg tracking-wider">SOS ACTIVATED</span>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="success"
                                            className="w-full bg-green-600 hover:bg-green-700"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleMarkSafe(worker.id, worker.name, worker.device);
                                            }}
                                        >
                                            <ShieldCheck size={16} className="mr-2" />
                                            Mark as Safe
                                        </Button>
                                    </div>
                                )}

                                {/* Voice Alert Indicator */}
                                {worker.sensors.voiceAlert && worker.sensors.voiceAlertType && !markedSafe[worker.id] && (
                                    <div className="mb-4 p-3 bg-purple-500/20 border-2 border-purple-500 rounded-lg animate-pulse">
                                        <div className="flex items-center justify-center gap-2 mb-2">
                                            <Mic className="h-6 w-6 text-purple-400" />
                                            <span className="text-purple-400 font-bold text-lg tracking-wider">
                                                {getVoiceCommandDisplay(worker.sensors.voiceAlertType).icon} VOICE ALERT
                                            </span>
                                        </div>
                                        <div className="text-center mb-3">
                                            <span className="text-white font-semibold text-xl">
                                                "{getVoiceCommandDisplay(worker.sensors.voiceAlertType).tagalog}"
                                            </span>
                                            <p className="text-purple-300 text-sm">
                                                {getVoiceCommandDisplay(worker.sensors.voiceAlertType).english}
                                            </p>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="success"
                                            className="w-full bg-green-600 hover:bg-green-700"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleMarkSafe(worker.id, worker.name, worker.device);
                                            }}
                                        >
                                            <ShieldCheck size={16} className="mr-2" />
                                            Mark as Safe
                                        </Button>
                                    </div>
                                )}

                                {/* Flat Orientation Alert Indicator */}
                                {worker.sensors.flatOrientation && !markedSafe[worker.id] && (
                                    <div className="mb-4 p-3 bg-orange-500/20 border-2 border-orange-500 rounded-lg animate-pulse">
                                        <div className="flex items-center justify-center gap-2 mb-2">
                                            <Smartphone className="h-6 w-6 text-orange-400" />
                                            <span className="text-orange-400 font-bold text-lg tracking-wider">
                                                ⚠️ FLAT ORIENTATION
                                            </span>
                                        </div>
                                        <div className="text-center mb-3">
                                            <p className="text-orange-300 text-sm">
                                                Device is flat/horizontal — worker may have fallen
                                            </p>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="success"
                                            className="w-full bg-green-600 hover:bg-green-700"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleMarkSafe(worker.id, worker.name, worker.device);
                                            }}
                                        >
                                            <ShieldCheck size={16} className="mr-2" />
                                            Mark as Safe
                                        </Button>
                                    </div>
                                )}

                                {/* Marked Safe Indicator */}
                                {markedSafe[worker.id] && (
                                    <div className="mb-4 p-2 bg-green-500/20 border border-green-500 rounded-lg flex items-center justify-center gap-2">
                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                        <span className="text-green-500 font-semibold">Marked Safe</span>
                                    </div>
                                )}

                                {/* Sensor Readings */}
                                <div className="space-y-3">
                                    {/* Temperature */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-[#4B5563]">
                                            <Thermometer size={16} />
                                            <span className="text-sm">Temperature</span>
                                        </div>
                                        <span className={`font-semibold ${getSensorStatus(worker.sensors.temperature, { warning: 40, critical: 50 })}`}>
                                            {worker.sensors.temperature.toFixed(1)}°C
                                        </span>
                                    </div>

                                    {/* Gas Level */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-[#4B5563]">
                                            <Wind size={16} />
                                            <span className="text-sm">Gas Level</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs px-2 py-0.5 rounded ${getGasLevelInfo(worker.sensors.gas).bgColor} ${getGasLevelInfo(worker.sensors.gas).color}`}>
                                                {getGasLevelInfo(worker.sensors.gas).label}
                                            </span>
                                            <span className={`font-semibold ${getGasLevelInfo(worker.sensors.gas).color}`}>
                                                {worker.sensors.gas} PPM
                                            </span>
                                        </div>
                                    </div>

                                    {/* Humidity */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-[#4B5563]">
                                            <Droplets size={16} />
                                            <span className="text-sm">Humidity</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs px-2 py-0.5 rounded ${getHumidityInfo(worker.sensors.humidity).bgColor} ${getHumidityInfo(worker.sensors.humidity).color}`}>
                                                {getHumidityInfo(worker.sensors.humidity).label}
                                            </span>
                                            <span className={`font-semibold ${getHumidityInfo(worker.sensors.humidity).color}`}>{worker.sensors.humidity.toFixed(1)}%</span>
                                        </div>
                                    </div>

                                    {/* Battery */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-[#4B5563]">
                                            <Battery size={16} />
                                            <span className="text-sm">Battery</span>
                                        </div>
                                        <span className={`font-semibold ${worker.sensors.battery < 20 ? 'text-red-500' : worker.sensors.battery < 50 ? 'text-orange-500' : 'text-green-500'}`}>
                                            {worker.sensors.battery}%
                                        </span>
                                    </div>

                                    {/* Signal */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-[#4B5563]">
                                            <Signal size={16} />
                                            <span className="text-sm">Signal</span>
                                        </div>
                                        <span className="font-semibold text-[#4B5563]">{worker.sensors.signal} dBm</span>
                                    </div>

                                    {/* Motion Data */}
                                    <div className="mt-3 pt-3 border-t border-[#E3E6EB]">
                                        <div className="flex items-center gap-2 text-[#4B5563] mb-2">
                                            <Activity size={16} />
                                            <span className="text-sm font-medium">Motion Status</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className={`p-2 rounded ${getOrientationInfo(worker.sensors.accel).bgColor}`}>
                                                <span className="text-[#6B7280] block">Orientation</span>
                                                <span className={`font-semibold ${getOrientationInfo(worker.sensors.accel).color}`}>
                                                    {getOrientationInfo(worker.sensors.accel).icon} {getOrientationInfo(worker.sensors.accel).label}
                                                </span>
                                            </div>
                                            <div className={`p-2 rounded ${getRotationInfo(worker.sensors.gyro).bgColor}`}>
                                                <span className="text-[#6B7280] block">Rotation</span>
                                                <span className={`font-semibold ${getRotationInfo(worker.sensors.gyro).color}`}>
                                                    {getRotationInfo(worker.sensors.gyro).icon} {getRotationInfo(worker.sensors.gyro).label}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* GPS Debug Section */}
                                    <div className="mt-3 pt-3 border-t border-[#E3E6EB]">
                                        <div className="flex items-center gap-2 text-[#4B5563] mb-2">
                                            <MapPin size={16} />
                                            <span className="text-sm font-medium">GPS Status</span>
                                            <span className={`ml-auto text-xs px-2 py-0.5 rounded ${worker.sensors.gpsValid ? 'bg-green-500/20 text-green-600' : 'bg-yellow-500/20 text-yellow-600'}`}>
                                                {worker.sensors.gpsValid ? '✓ Fix' : '⏳ Acquiring'}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="bg-[#EEF1F4] p-2 rounded">
                                                <span className="text-[#6B7280] block">Chars Received</span>
                                                <span className={`font-mono ${worker.sensors.gpsChars > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                    {worker.sensors.gpsChars?.toLocaleString() || 0}
                                                </span>
                                            </div>
                                            <div className="bg-[#EEF1F4] p-2 rounded">
                                                <span className="text-[#6B7280] block">Geofence</span>
                                                <span className={`font-semibold ${worker.sensors.geofenceViolation ? 'text-red-500' : 'text-green-600'}`}>
                                                    {worker.sensors.geofenceViolation ? '⚠ Outside' : '✓ Inside'}
                                                </span>
                                            </div>
                                        </div>
                                        {worker.sensors.gpsValid && worker.sensors.latitude && (
                                            <div className="mt-2 bg-[#EEF1F4] p-2 rounded text-xs">
                                                <span className="text-[#6B7280] block">Coordinates</span>
                                                <span className="text-cyan-600 font-mono">
                                                    {worker.sensors.latitude?.toFixed(6)}, {worker.sensors.longitude?.toFixed(6)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="mt-4 pt-4 border-t border-[#E3E6EB]">
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => handleViewDetails(worker)}
                                        >
                                            <Eye size={14} className="mr-1" />
                                            View Details
                                        </Button>
                                        {/* Nudge button — triggers ESP32 buzzer + blue LED */}
                                        {worker.status !== 'offline' && (
                                            <Button
                                                size="sm"
                                                variant={escalatedDevices[worker.device] ? 'danger' : nudgedDevices[worker.device] ? 'secondary' : (nudgeCounts[worker.device] || 0) >= 2 ? 'warning' : 'primary'}
                                                className={`flex-1 ${escalatedDevices[worker.device] ? '' : nudgedDevices[worker.device] ? '' : (nudgeCounts[worker.device] || 0) >= 2 ? '' : 'bg-[#6FA3D8] hover:bg-[#5A8EC3]'}`}
                                                onClick={() => handleNudge(worker.device, worker.name)}
                                                disabled={!!nudgedDevices[worker.device] || !!escalatedDevices[worker.device]}
                                            >
                                                <Bell size={14} className="mr-1" />
                                                {escalatedDevices[worker.device]
                                                    ? '⚠ Escalated'
                                                    : nudgedDevices[worker.device]
                                                        ? 'Nudged ✓'
                                                        : (nudgeCounts[worker.device] || 0) > 0
                                                            ? `Nudge (${nudgeCounts[worker.device]}/3)`
                                                            : 'Nudge'
                                                }
                                            </Button>
                                        )}
                                        {/* Show Mark Safe button for devices with active SOS but not yet marked */}
                                        {(worker.sensors.sosActive || worker.sensors.emergency) && !markedSafe[worker.id] && (
                                            <Button
                                                size="sm"
                                                variant="success"
                                                className="flex-1 bg-green-600 hover:bg-green-700"
                                                onClick={() => handleMarkSafe(worker.id, worker.name, worker.device)}
                                            >
                                                <ShieldCheck size={14} className="mr-1" />
                                                Mark Safe
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardBody>
                        </CardDark>
                    ))}
                </div>
            )}

            {viewMode === 'grid' && filteredWorkers.length === 0 && (
                <CardDark>
                    <CardBody className="p-12 text-center">
                        <Activity className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-400 mb-2">No Devices Found</h3>
                        <p className="text-gray-500">Add devices in Device Management to see them here</p>
                    </CardBody>
                </CardDark>
            )}

            {/* Worker Details Modal */}
            <Modal
                isOpen={showDetailsModal}
                onClose={() => setShowDetailsModal(false)}
                title={`Worker Details - ${selectedWorker?.name || ''}`}
                size="lg"
            >
                {selectedWorker && (
                    <div className="space-y-6">
                        {/* Worker Info */}
                        <div className="bg-[#EEF1F4] rounded-lg p-4 border border-[#E3E6EB]">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-[#6FA3D8]/20 rounded-full flex items-center justify-center">
                                    <User className="h-8 w-8 text-[#6FA3D8]" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-[#1F2937]">{selectedWorker.name}</h3>
                                    <p className="text-[#4B5563]">{selectedWorker.department}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Badge variant="info">{selectedWorker.device}</Badge>
                                        <Badge variant={selectedWorker.status === 'normal' ? 'success' : selectedWorker.status === 'warning' ? 'warning' : 'danger'}>
                                            {selectedWorker.status.toUpperCase()}
                                        </Badge>
                                    </div>
                                    {/* RGB LED Indicator in Modal */}
                                    <div className="mt-2">
                                        <DeviceLedIndicator sensors={selectedWorker.sensors} status={selectedWorker.status} size="md" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sensor Readings */}
                        <div>
                            <h4 className="label-modal mb-3">Current Sensor Readings</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div className="bg-[#EEF1F4] p-4 rounded-lg border border-[#E3E6EB]">
                                    <div className="flex items-center gap-2 text-[#4B5563] mb-2">
                                        <Thermometer size={16} />
                                        <span className="text-sm">Temperature</span>
                                    </div>
                                    <p className="text-2xl font-bold text-[#1F2937]">{selectedWorker.sensors.temperature}°C</p>
                                </div>
                                <div className="bg-[#EEF1F4] p-4 rounded-lg border border-[#E3E6EB]">
                                    <div className="flex items-center gap-2 text-[#4B5563] mb-2">
                                        <Wind size={16} />
                                        <span className="text-sm">Gas Level</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs px-2 py-0.5 rounded ${getGasLevelInfo(selectedWorker.sensors.gas).bgColor} ${getGasLevelInfo(selectedWorker.sensors.gas).color}`}>
                                            {getGasLevelInfo(selectedWorker.sensors.gas).label}
                                        </span>
                                        <p className={`text-xl font-bold ${getGasLevelInfo(selectedWorker.sensors.gas).color}`}>{selectedWorker.sensors.gas} PPM</p>
                                    </div>
                                </div>
                                <div className="bg-[#EEF1F4] p-4 rounded-lg border border-[#E3E6EB]">
                                    <div className="flex items-center gap-2 text-[#4B5563] mb-2">
                                        <Droplets size={16} />
                                        <span className="text-sm">Humidity</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <p className={`text-2xl font-bold ${getHumidityInfo(selectedWorker.sensors.humidity).color}`}>{selectedWorker.sensors.humidity}%</p>
                                        <span className={`text-xs px-2 py-0.5 rounded ${getHumidityInfo(selectedWorker.sensors.humidity).bgColor} ${getHumidityInfo(selectedWorker.sensors.humidity).color}`}>
                                            {getHumidityInfo(selectedWorker.sensors.humidity).label}
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-[#EEF1F4] p-4 rounded-lg border border-[#E3E6EB]">
                                    <div className="flex items-center gap-2 text-[#4B5563] mb-2">
                                        <Battery size={16} />
                                        <span className="text-sm">Battery</span>
                                    </div>
                                    <p className="text-2xl font-bold text-[#1F2937]">{selectedWorker.sensors.battery}%</p>
                                </div>
                                <div className="bg-[#EEF1F4] p-4 rounded-lg border border-[#E3E6EB]">
                                    <div className="flex items-center gap-2 text-[#4B5563] mb-2">
                                        <Signal size={16} />
                                        <span className="text-sm">Signal</span>
                                    </div>
                                    <p className="text-2xl font-bold text-[#1F2937]">{selectedWorker.sensors.signal} dBm</p>
                                </div>
                                <div className="bg-[#EEF1F4] p-4 rounded-lg border border-[#E3E6EB]">
                                    <div className="flex items-center gap-2 text-[#4B5563] mb-2">
                                        <Clock size={16} />
                                        <span className="text-sm">Last Update</span>
                                    </div>
                                    <p className="text-lg font-bold text-[#1F2937]">{formatTime(selectedWorker.lastUpdate)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Motion Data */}
                        <div>
                            <h4 className="label-modal mb-3">Motion Data</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className={`p-4 rounded-lg border border-[#E3E6EB] ${getOrientationInfo(selectedWorker.sensors.accel).bgColor}`}>
                                    <h5 className="text-sm text-[#4B5563] mb-2">Orientation (Accelerometer)</h5>
                                    <div className="text-center">
                                        <p className="text-3xl mb-1">{getOrientationInfo(selectedWorker.sensors.accel).icon}</p>
                                        <p className={`text-lg font-bold ${getOrientationInfo(selectedWorker.sensors.accel).color}`}>
                                            {getOrientationInfo(selectedWorker.sensors.accel).label}
                                        </p>
                                        <p className="text-xs text-[#6B7280] mt-1 font-mono">
                                            X:{selectedWorker.sensors.accel.x.toFixed(1)} Y:{selectedWorker.sensors.accel.y.toFixed(1)} Z:{selectedWorker.sensors.accel.z.toFixed(1)}
                                        </p>
                                    </div>
                                </div>
                                <div className={`p-4 rounded-lg border border-[#E3E6EB] ${getRotationInfo(selectedWorker.sensors.gyro).bgColor}`}>
                                    <h5 className="text-sm text-[#4B5563] mb-2">Rotation (Gyroscope)</h5>
                                    <div className="text-center">
                                        <p className="text-3xl mb-1">{getRotationInfo(selectedWorker.sensors.gyro).icon}</p>
                                        <p className={`text-lg font-bold ${getRotationInfo(selectedWorker.sensors.gyro).color}`}>
                                            {getRotationInfo(selectedWorker.sensors.gyro).label}
                                        </p>
                                        <p className="text-xs text-[#6B7280] mt-1 font-mono">
                                            X:{selectedWorker.sensors.gyro.x.toFixed(1)} Y:{selectedWorker.sensors.gyro.y.toFixed(1)} Z:{selectedWorker.sensors.gyro.z.toFixed(1)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* GPS / Location */}
                        <div>
                            <h4 className="label-modal mb-3">GPS / Location</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div className="bg-[#EEF1F4] p-4 rounded-lg border border-[#E3E6EB]">
                                    <div className="flex items-center gap-2 text-[#4B5563] mb-2">
                                        <MapPin size={16} />
                                        <span className="text-sm">GPS Status</span>
                                    </div>
                                    <p className={`text-lg font-bold ${selectedWorker.sensors.gpsValid ? 'text-green-600' : 'text-yellow-600'}`}>
                                        {selectedWorker.sensors.gpsValid ? '✓ Fix Acquired' : '⏳ Acquiring...'}
                                    </p>
                                </div>
                                <div className="bg-[#EEF1F4] p-4 rounded-lg border border-[#E3E6EB]">
                                    <div className="flex items-center gap-2 text-[#4B5563] mb-2">
                                        <Map size={16} />
                                        <span className="text-sm">Coordinates</span>
                                    </div>
                                    {selectedWorker.sensors.gpsValid && selectedWorker.sensors.latitude != null ? (
                                        <p className="text-sm font-mono font-bold text-[#6FA3D8]">
                                            {parseFloat(selectedWorker.sensors.latitude).toFixed(6)},<br />
                                            {parseFloat(selectedWorker.sensors.longitude).toFixed(6)}
                                        </p>
                                    ) : (
                                        <p className="text-sm text-[#9CA3AF]">No fix yet</p>
                                    )}
                                </div>
                                <div className="bg-[#EEF1F4] p-4 rounded-lg border border-[#E3E6EB]">
                                    <div className="flex items-center gap-2 text-[#4B5563] mb-2">
                                        <Shield size={16} />
                                        <span className="text-sm">Geofence</span>
                                    </div>
                                    <p className={`text-lg font-bold ${selectedWorker.sensors.geofenceViolation ? 'text-red-500' : 'text-green-600'}`}>
                                        {selectedWorker.sensors.geofenceViolation ? '⚠ Outside' : '✓ Inside'}
                                    </p>
                                </div>
                            </div>
                            {selectedWorker.sensors.gpsValid && selectedWorker.sensors.latitude != null && (
                                <div className="mt-3 bg-[#EEF1F4] p-3 rounded-lg border border-[#E3E6EB] flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm text-[#4B5563]">
                                        <MapPin size={14} />
                                        <span>Satellites: <strong>{selectedWorker.sensors.satellites || 'N/A'}</strong></span>
                                        {selectedWorker.sensors.gpsSpeed != null && selectedWorker.sensors.gpsSpeed > 0 && (
                                            <span className="ml-3">Speed: <strong>{parseFloat(selectedWorker.sensors.gpsSpeed).toFixed(1)} km/h</strong></span>
                                        )}
                                    </div>
                                    <a
                                        href={`https://www.google.com/maps?q=${selectedWorker.sensors.latitude},${selectedWorker.sensors.longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-[#6FA3D8] hover:underline font-medium"
                                    >
                                        Open in Google Maps ↗
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-4 border-t border-[#E3E6EB]">
                            <Button
                                variant="secondary"
                                className="flex-1"
                                onClick={() => setShowDetailsModal(false)}
                            >
                                Close
                            </Button>
                            <Button
                                variant={markedSafe[selectedWorker.id] ? 'secondary' : 'primary'}
                                className="flex-1"
                                onClick={() => {
                                    handleMarkSafe(selectedWorker.id, selectedWorker.name);
                                    setShowDetailsModal(false);
                                }}
                                disabled={markedSafe[selectedWorker.id]}
                            >
                                {markedSafe[selectedWorker.id] ? 'Already Marked Safe' : 'Mark as Safe'}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};


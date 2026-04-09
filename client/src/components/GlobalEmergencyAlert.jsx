import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, User, Radio, Clock, CheckCircle, Phone, Shield, Mic, Loader2, Smartphone, MapPin, Volume2, VolumeX } from 'lucide-react';
import { Button } from './ui/Button';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { alertsApi } from '../utils/api';

const STORAGE_KEY = 'guardwell_global_emergency_enabled';

/**
 * Global Emergency Alert Overlay
 * Displays system-wide when any emergency button is triggered.
 * Blocks all user interaction until emergencies are acknowledged.
 * Can be disabled in System Settings > Notification Settings.
 */
export const GlobalEmergencyAlert = () => {
    const { emergencyAlerts, hasActiveEmergency, acknowledgeEmergency, stopEmergencyAlarm, startEmergencyAlarm } = useSocket();
    const { user } = useAuth();
    const [acknowledgedDevices, setAcknowledgedDevices] = useState({});
    const [loading, setLoading] = useState({});
    const [alarmMuted, setAlarmMuted] = useState(false);
    const navigate = useNavigate();

    // Read toggle from localStorage (defaults to enabled)
    const [overlayEnabled, setOverlayEnabled] = useState(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored === null ? true : stored === 'true';
    });

    // Listen for storage changes so toggling in Settings updates this in real-time
    useEffect(() => {
        const handleStorageChange = () => {
            const stored = localStorage.getItem(STORAGE_KEY);
            setOverlayEnabled(stored === null ? true : stored === 'true');
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    // Toggle alarm mute
    const handleToggleMute = () => {
        if (alarmMuted) {
            startEmergencyAlarm();
            setAlarmMuted(false);
        } else {
            stopEmergencyAlarm();
            setAlarmMuted(true);
        }
    };

    // Don't render if overlay is disabled or no active emergencies
    if (!overlayEnabled || !hasActiveEmergency) return null;

    const unacknowledgedEmergencies = emergencyAlerts.filter(e => !e.acknowledged);

    // Determine alert category for styling
    const getAlertCategory = (type) => {
        if (type?.startsWith('Voice Alert')) return 'voice';  // All EI keyword detections
        if (type?.includes('Flat Orientation')) return 'flat';
        return 'emergency';
    };

    // Category-specific styles
    const categoryStyles = {
        voice: {
            iconBg: 'bg-purple-500/30',
            iconColor: 'text-purple-400',
            textColor: 'text-purple-400',
            badgeBg: 'bg-purple-500/20 border-purple-500',
            badgeText: 'text-purple-300',
            borderColor: 'border-purple-500',
            gradientFrom: 'from-purple-900/40',
            gradientTo: 'to-purple-800/20',
            shadowColor: 'shadow-purple-500/20',
        },
        flat: {
            iconBg: 'bg-orange-500/30',
            iconColor: 'text-orange-400',
            textColor: 'text-orange-400',
            badgeBg: 'bg-orange-500/20 border-orange-500',
            badgeText: 'text-orange-300',
            borderColor: 'border-orange-500',
            gradientFrom: 'from-orange-900/40',
            gradientTo: 'to-orange-800/20',
            shadowColor: 'shadow-orange-500/20',
        },
        emergency: {
            iconBg: 'bg-red-500/30',
            iconColor: 'text-red-400',
            textColor: 'text-red-400',
            badgeBg: 'bg-red-500/20 border-red-500',
            badgeText: 'text-red-300',
            borderColor: 'border-red-500',
            gradientFrom: 'from-red-900/40',
            gradientTo: 'to-red-800/20',
            shadowColor: 'shadow-red-500/20',
        },
    };

    // Category-specific icon
    const getCategoryIcon = (category) => {
        switch (category) {
            case 'voice': return <Mic className="h-9 w-9 text-purple-400" />;
            case 'flat':  return <Smartphone className="h-9 w-9 text-orange-400" />;
            default:      return <User className="h-9 w-9 text-red-400" />;
        }
    };

    // Human-readable description for voice alerts
    const getAlertDescription = (emergency, category) => {
        if (category === 'voice') {
            // Edge Impulse keyword: "help"
            if (emergency.type === 'Voice Alert - Help') {
                return 'Worker shouted "HELP" — immediate response required';
            }
            // Edge Impulse keyword: "tulong" (Filipino for help)
            if (emergency.type === 'Voice Alert - Tulong') {
                return 'Worker shouted "TULONG" (Help in Filipino) — immediate response required';
            }
            // Legacy FFT human detection
            if (emergency.type?.includes('Human Detected')) {
                return 'Human voice detected in industrial zone — possible distress signal';
            }
            // Fallback: show voice command if available
            if (emergency.voice_command) {
                const cmd = emergency.voice_command.split('_')[0];
                return `Worker called: "${cmd.charAt(0).toUpperCase() + cmd.slice(1)}"`;
            }
        }
        if (category === 'flat') {
            return 'Worker device detected in flat/horizontal position — possible fall or incapacitation';
        }
        return null;
    };

    const handleAcknowledge = async (emergency) => {
        setLoading(prev => ({ ...prev, [emergency.id]: true }));
        try {
            // Persist to API first
            if (emergency.id) {
                await alertsApi.acknowledge(emergency.id, user?.fullName || 'Officer');
            }
            // Update local state
            acknowledgeEmergency(emergency.id);
            setAcknowledgedDevices(prev => ({
                ...prev,
                [emergency.device]: true
            }));
        } catch (error) {
            console.error('Failed to acknowledge emergency:', error);
            // Still update local state even if API fails
            acknowledgeEmergency(emergency.id);
        } finally {
            setLoading(prev => ({ ...prev, [emergency.id]: false }));
        }
    };

    const handleAcknowledgeAndTrack = async (emergency) => {
        await handleAcknowledge(emergency);
        // Navigate to Live Monitoring in MAP mode, focused on this device
        const deviceId = emergency.device || emergency.device_id;
        navigate(`/live-monitoring?view=map&focus=${encodeURIComponent(deviceId)}`);
    };

    const handleGoToMonitoring = async (emergency) => {
        await handleAcknowledge(emergency);
        navigate('/live-monitoring');
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4 overflow-y-auto">
            <div className="max-w-3xl w-full space-y-6">
                {/* Emergency Header */}
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-28 h-28 bg-red-500/20 rounded-full mb-6 border-4 border-red-500 animate-pulse">
                        <AlertTriangle className="h-14 w-14 text-red-500" />
                    </div>
                    <h1 className="text-5xl font-bold text-red-500 tracking-wider mb-3">
                        🚨 EMERGENCY ALERT 🚨
                    </h1>
                    <p className="text-xl text-gray-300">
                        {unacknowledgedEmergencies.length} emergency {unacknowledgedEmergencies.length === 1 ? 'alert' : 'alerts'} require immediate attention
                    </p>
                    {/* Mute / Unmute alarm button */}
                    <button
                        onClick={handleToggleMute}
                        title={alarmMuted ? 'Unmute alarm' : 'Mute alarm'}
                        className={`mt-4 inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold border transition-all ${
                            alarmMuted
                                ? 'border-gray-600 bg-gray-800 text-gray-400 hover:bg-gray-700'
                                : 'border-red-500 bg-red-500/20 text-red-300 hover:bg-red-500/30 animate-pulse'
                        }`}
                    >
                        {alarmMuted
                            ? <><VolumeX size={16} /> Alarm Muted — Click to Unmute</>
                            : <><Volume2 size={16} /> Alarm Sounding — Click to Mute</>
                        }
                    </button>
                </div>

                {/* Emergency Cards */}
                <div className="space-y-4 max-h-[50vh] overflow-y-auto">
                    {unacknowledgedEmergencies.map((emergency) => {
                        const category = getAlertCategory(emergency.type);
                        const styles = categoryStyles[category];
                        const description = getAlertDescription(emergency, category);

                        return (
                            <div
                                key={emergency.id || `${emergency.device}-${emergency.timestamp}`}
                                className={`bg-gradient-to-r ${styles.gradientFrom} ${styles.gradientTo} border-2 ${styles.borderColor} rounded-xl p-6 shadow-lg ${styles.shadowColor}`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-16 h-16 ${styles.iconBg} rounded-full flex items-center justify-center animate-pulse`}>
                                            {getCategoryIcon(category)}
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-white">
                                                {emergency.worker_name || 'Unknown Worker'}
                                            </h3>
                                            <p className={`${styles.textColor} font-semibold text-lg`}>
                                                {emergency.type || 'Emergency Button Pressed'}
                                            </p>
                                            {/* Context description for alerts */}
                                            {description && (
                                                <div className={`mt-2 inline-flex items-center gap-2 ${styles.badgeBg} border px-3 py-1.5 rounded-lg`}>
                                                    {category === 'flat' 
                                                        ? <Smartphone size={14} className="text-orange-400" />
                                                        : <Mic size={14} className="text-purple-400" />
                                                    }
                                                    <span className={`${styles.badgeText} font-semibold text-sm`}>
                                                        {description}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-400">
                                                <span className="flex items-center gap-1.5 bg-black/30 px-2 py-1 rounded">
                                                    <Radio size={14} />
                                                    Device: {emergency.device}
                                                </span>
                                                <span className="flex items-center gap-1.5 bg-black/30 px-2 py-1 rounded">
                                                    <Clock size={14} />
                                                    {new Date(emergency.timestamp).toLocaleTimeString()}
                                                </span>
                                                {/* Show GPS location if available */}
                                                {emergency.gps_valid && emergency.latitude && emergency.longitude && (
                                                    <a
                                                        href={`https://www.google.com/maps?q=${emergency.latitude},${emergency.longitude}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1.5 bg-black/30 px-2 py-1 rounded text-[#00E5FF] hover:text-white transition-colors"
                                                    >
                                                        <MapPin size={14} />
                                                        {emergency.latitude.toFixed(5)}, {emergency.longitude.toFixed(5)}
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="mt-5 flex flex-col gap-2">
                                    {/* Row 1: Primary actions */}
                                    <div className="flex gap-3">
                                        <Button
                                            variant="danger"
                                            className="flex-1 py-3 text-lg font-semibold"
                                            icon={loading[emergency.id] ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle size={20} />}
                                            onClick={() => handleAcknowledge(emergency)}
                                            disabled={loading[emergency.id]}
                                        >
                                            {loading[emergency.id] ? 'Saving...' : 'Acknowledge'}
                                        </Button>
                                        <Button
                                            variant="primary"
                                            className="flex-1 py-3 text-lg font-semibold"
                                            icon={loading[emergency.id] ? <Loader2 size={20} className="animate-spin" /> : <Shield size={20} />}
                                            onClick={() => handleGoToMonitoring(emergency)}
                                            disabled={loading[emergency.id]}
                                        >
                                            Acknowledge &amp; Monitor
                                        </Button>
                                    </div>
                                    {/* Row 2: GPS Track button — shown only if GPS coords are attached */}
                                    {emergency.gps_valid && emergency.latitude && emergency.longitude ? (
                                        <button
                                            onClick={() => handleAcknowledgeAndTrack(emergency)}
                                            disabled={loading[emergency.id]}
                                            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-base
                                                       bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700
                                                       text-white transition-all duration-200 shadow-md shadow-emerald-900/40
                                                       disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <MapPin size={18} />
                                            📍 Acknowledge &amp; Track Location on Map
                                            <span className="text-emerald-200 text-sm font-normal ml-1">
                                                ({parseFloat(emergency.latitude).toFixed(4)}, {parseFloat(emergency.longitude).toFixed(4)})
                                            </span>
                                        </button>
                                    ) : (
                                        <div className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm
                                                        border border-gray-700 bg-gray-800/50 text-gray-500 cursor-not-allowed">
                                            <MapPin size={14} />
                                            No GPS fix available for this device
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Emergency Instructions */}
                <div className="bg-gray-900/80 rounded-lg p-4 border border-gray-700">
                    <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                        <Phone size={16} className="text-[#00E5FF]" />
                        Emergency Response Protocol
                    </h4>
                    <ul className="text-gray-400 text-sm space-y-1">
                        <li>• Acknowledge all alerts to dismiss this screen</li>
                        <li>• Contact emergency services if required</li>
                        <li>• Check worker status in Live Monitoring</li>
                        <li>• Document the incident after resolution</li>
                    </ul>
                </div>

                {/* Footer */}
                <p className="text-center text-gray-500 text-sm">
                    This overlay will remain until all emergencies are acknowledged.
                </p>
            </div>
        </div>
    );
};

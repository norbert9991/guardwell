import React, { useState } from 'react';
import { AlertTriangle, User, Radio, Clock, CheckCircle, Phone, Shield } from 'lucide-react';
import { Button } from './ui/Button';
import { useSocket } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';

/**
 * Global Emergency Alert Overlay
 * Displays system-wide when any emergency button is triggered.
 * Blocks all user interaction until emergencies are acknowledged.
 */
export const GlobalEmergencyAlert = () => {
    const { emergencyAlerts, hasActiveEmergency, acknowledgeEmergency } = useSocket();
    const [acknowledgedDevices, setAcknowledgedDevices] = useState({});
    const navigate = useNavigate();

    // Don't render anything if no active emergencies
    if (!hasActiveEmergency) return null;

    const unacknowledgedEmergencies = emergencyAlerts.filter(e => !e.acknowledged);

    const handleAcknowledge = (emergency) => {
        acknowledgeEmergency(emergency.id);
        setAcknowledgedDevices(prev => ({
            ...prev,
            [emergency.device]: true
        }));
    };

    const handleAcknowledgeAndNavigate = (emergency) => {
        handleAcknowledge(emergency);
        // Navigate to Live Monitoring for more details
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
                </div>

                {/* Emergency Cards */}
                <div className="space-y-4 max-h-[50vh] overflow-y-auto">
                    {unacknowledgedEmergencies.map((emergency) => (
                        <div
                            key={emergency.id || `${emergency.device}-${emergency.timestamp}`}
                            className="bg-gradient-to-r from-red-900/40 to-red-800/20 border-2 border-red-500 rounded-xl p-6 shadow-lg shadow-red-500/20"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-red-500/30 rounded-full flex items-center justify-center animate-pulse">
                                        <User className="h-9 w-9 text-red-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-white">
                                            {emergency.worker_name || 'Unknown Worker'}
                                        </h3>
                                        <p className="text-red-400 font-semibold text-lg">
                                            {emergency.type || 'Emergency Button Pressed'}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-400">
                                            <span className="flex items-center gap-1.5 bg-black/30 px-2 py-1 rounded">
                                                <Radio size={14} />
                                                Device: {emergency.device}
                                            </span>
                                            <span className="flex items-center gap-1.5 bg-black/30 px-2 py-1 rounded">
                                                <Clock size={14} />
                                                {new Date(emergency.timestamp).toLocaleTimeString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="mt-5 flex gap-3">
                                <Button
                                    variant="danger"
                                    className="flex-1 py-3 text-lg font-semibold"
                                    icon={<CheckCircle size={20} />}
                                    onClick={() => handleAcknowledge(emergency)}
                                >
                                    Acknowledge
                                </Button>
                                <Button
                                    variant="primary"
                                    className="flex-1 py-3 text-lg font-semibold"
                                    icon={<Shield size={20} />}
                                    onClick={() => handleAcknowledgeAndNavigate(emergency)}
                                >
                                    Acknowledge & Go to Monitoring
                                </Button>
                            </div>
                        </div>
                    ))}
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

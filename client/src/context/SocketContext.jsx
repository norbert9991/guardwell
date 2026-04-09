import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

// ============================================================
// Web Audio emergency siren (no external file needed)
// Two alternating tones (800 Hz / 1000 Hz) at 0.5s each, looping.
// ============================================================
let alarmAudioCtx = null;
let alarmGainNode = null;
let alarmOscillator = null;
let alarmInterval = null;
let alarmActive = false;

const buildAlarmCycle = (ctx, gain) => {
    let toggle = false;
    const fireBeep = () => {
        if (alarmOscillator) {
            try { alarmOscillator.stop(); } catch (_) {}
        }
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(toggle ? 960 : 760, ctx.currentTime);
        osc.connect(gain);
        osc.start();
        alarmOscillator = osc;
        toggle = !toggle;
    };
    fireBeep();
    alarmInterval = setInterval(fireBeep, 500);
};

const startAlarm = () => {
    if (alarmActive) return;
    alarmActive = true;
    try {
        alarmAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        alarmGainNode = alarmAudioCtx.createGain();
        alarmGainNode.gain.setValueAtTime(0.18, alarmAudioCtx.currentTime); // not too loud
        alarmGainNode.connect(alarmAudioCtx.destination);
        buildAlarmCycle(alarmAudioCtx, alarmGainNode);
    } catch (e) {
        console.warn('Emergency alarm audio failed to start:', e);
    }
};

const stopAlarm = () => {
    if (!alarmActive) return;
    alarmActive = false;
    clearInterval(alarmInterval);
    alarmInterval = null;
    try { alarmOscillator?.stop(); } catch (_) {}
    alarmOscillator = null;
    try { alarmAudioCtx?.close(); } catch (_) {}
    alarmAudioCtx = null;
    alarmGainNode = null;
};

const SocketContext = createContext(null);

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within SocketProvider');
    }
    return context;
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);
    const [sensorData, setSensorData] = useState({});
    const [alerts, setAlerts] = useState([]);
    const [emergencyAlerts, setEmergencyAlerts] = useState([]);
    const { isAuthenticated } = useAuth();

    // Alarm helpers exposed to components
    const startEmergencyAlarm = useCallback(() => startAlarm(), []);
    const stopEmergencyAlarm  = useCallback(() => stopAlarm(),  []);

    useEffect(() => {
        if (!isAuthenticated) return;

        // TODO: Replace with actual backend URL
        const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

        const newSocket = io(SOCKET_URL, {
            autoConnect: true,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
        });

        newSocket.on('connect', () => {
            console.log('Socket connected:', newSocket.id);
            setConnected(true);
        });

        newSocket.on('disconnect', () => {
            console.log('Socket disconnected');
            setConnected(false);
        });

        // Listen for sensor updates
        newSocket.on('sensor_update', (data) => {
            setSensorData(prev => ({
                ...prev,
                [data.device_id]: data
            }));
        });

        // Listen for alerts
        newSocket.on('alert', (alert) => {
            setAlerts(prev => [alert, ...prev].slice(0, 50)); // Keep last 50 alerts
        });

        // Listen for emergency alerts - PERSIST these
        newSocket.on('emergency_alert', (emergency) => {
            // 🔊 Play siren alarm to grab the operator's attention
            startAlarm();

            // Show browser notification
            if (Notification.permission === 'granted') {
                new Notification('🚨 EMERGENCY ALERT', {
                    body: `${emergency.worker_name} triggered emergency alert!`,
                    icon: '/favicon.ico',
                    requireInteraction: true,
                });
            }

            // Add to persistent emergency alerts (don't auto-remove)
            setEmergencyAlerts(prev => {
                // Check if already exists to avoid duplicates
                const exists = prev.some(e => e.id === emergency.id ||
                    (e.device === emergency.device && Date.now() - new Date(e.timestamp).getTime() < 5000));
                if (exists) return prev;
                return [{ ...emergency, acknowledged: false, status: 'Pending' }, ...prev];
            });

            setAlerts(prev => [emergency, ...prev]);
        });

        // Listen for emergency status updates (real-time sync across tabs)
        newSocket.on('emergency_status_updated', (data) => {
            console.log('📡 Emergency status updated:', data);
            setEmergencyAlerts(prev =>
                prev.map(e => {
                    if (e.id === data.alertId) {
                        return {
                            ...e,
                            status: data.status || e.status,
                            assignedTo: data.assignedTo || e.assignedTo,
                            acknowledgedBy: data.acknowledgedBy || e.acknowledgedBy,
                            responseTimeMs: data.responseTimeMs || e.responseTimeMs,
                            acknowledged: data.status === 'Acknowledged' || e.acknowledged
                        };
                    }
                    return e;
                })
            );
        });

        // Listen for escalated alerts
        newSocket.on('emergency_escalated', (data) => {
            console.log('⚠️ Emergency escalated:', data);
            // 🔊 Re-trigger alarm for escalations too
            startAlarm();

            // Show browser notification for escalation
            if (Notification.permission === 'granted') {
                new Notification('⚠️ ALERT ESCALATED', {
                    body: `Alert for ${data.worker} has been escalated due to no response!`,
                    icon: '/favicon.ico',
                    requireInteraction: true,
                });
            }

            setEmergencyAlerts(prev =>
                prev.map(e => {
                    if (e.id === data.alertId) {
                        return {
                            ...e,
                            escalated: true,
                            escalatedAt: data.escalatedAt
                        };
                    }
                    return e;
                })
            );
        });

        // Listen for resolved emergencies
        newSocket.on('emergency_resolved', (data) => {
            console.log('✅ Emergency resolved:', data);
            setEmergencyAlerts(prev => prev.filter(e => e.id !== data.alertId));
        });

        setSocket(newSocket);

        return () => {
            newSocket.close();
        };
    }, [isAuthenticated]);

    // Request notification permission on mount
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    const emitEvent = (event, data) => {
        if (socket && connected) {
            socket.emit(event, data);
        }
    };

    const acknowledgeAlert = (alertId) => {
        emitEvent('acknowledge_alert', { alertId });
    };

    // Dismiss a specific emergency alert
    const dismissEmergency = (emergencyId) => {
        setEmergencyAlerts(prev => prev.filter(e => e.id !== emergencyId));
    };

    // Acknowledge emergency (mark as acknowledged but keep in list)
    // If this was the last unacknowledged emergency, stop the alarm.
    const acknowledgeEmergency = (emergencyId) => {
        setEmergencyAlerts(prev => {
            const updated = prev.map(e => e.id === emergencyId ? { ...e, acknowledged: true } : e);
            const anyUnacknowledged = updated.some(e => !e.acknowledged);
            if (!anyUnacknowledged) stopAlarm(); // 🔕 All clear — silence siren
            return updated;
        });
    };

    // Clear all emergency alerts and stop alarm
    const clearAllEmergencies = () => {
        stopAlarm();
        setEmergencyAlerts([]);
    };

    // Check if there are any unacknowledged emergencies
    const hasActiveEmergency = emergencyAlerts.some(e => !e.acknowledged);

    const value = {
        socket,
        connected,
        sensorData,
        alerts,
        emergencyAlerts,
        hasActiveEmergency,
        emitEvent,
        acknowledgeAlert,
        dismissEmergency,
        acknowledgeEmergency,
        clearAllEmergencies,
        startEmergencyAlarm,
        stopEmergencyAlarm,
    };

    return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};


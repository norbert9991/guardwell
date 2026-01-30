import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

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
                            acknowledged: data.status === 'Acknowledged' || data.status === 'Responding' || e.acknowledged
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
    const acknowledgeEmergency = (emergencyId) => {
        setEmergencyAlerts(prev =>
            prev.map(e => e.id === emergencyId ? { ...e, acknowledged: true } : e)
        );
    };

    // Clear all emergency alerts
    const clearAllEmergencies = () => {
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
    };

    return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};


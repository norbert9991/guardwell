import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { initializePushNotifications, isPushSupported } from '../utils/pushNotifications';

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
    const [pushEnabled, setPushEnabled] = useState(false);
    const { isAuthenticated, user } = useAuth();

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

        // Listen for emergency alerts
        newSocket.on('emergency_alert', (emergency) => {
            // Show browser notification (fallback for when push fails)
            if (Notification.permission === 'granted' && !pushEnabled) {
                new Notification('🚨 EMERGENCY ALERT', {
                    body: `${emergency.worker_name} triggered emergency alert!`,
                    icon: '/favicon.ico',
                    requireInteraction: true,
                });
            }

            setAlerts(prev => [emergency, ...prev]);
        });

        setSocket(newSocket);

        return () => {
            newSocket.close();
        };
    }, [isAuthenticated, pushEnabled]);

    // Initialize push notifications when authenticated
    useEffect(() => {
        const setupPushNotifications = async () => {
            if (!isAuthenticated) return;

            if (!isPushSupported()) {
                console.warn('Push notifications not supported in this browser');
                // Fall back to basic notification permission request
                if ('Notification' in window && Notification.permission === 'default') {
                    Notification.requestPermission();
                }
                return;
            }

            try {
                const result = await initializePushNotifications(user?.id);
                if (result.success) {
                    setPushEnabled(true);
                    console.log('✅ Push notifications enabled');
                } else {
                    console.warn('Push notifications setup failed:', result.error);
                    // Fall back to basic notifications
                    if ('Notification' in window && Notification.permission === 'default') {
                        Notification.requestPermission();
                    }
                }
            } catch (error) {
                console.error('Error setting up push notifications:', error);
            }
        };

        setupPushNotifications();
    }, [isAuthenticated, user?.id]);

    const emitEvent = (event, data) => {
        if (socket && connected) {
            socket.emit(event, data);
        }
    };

    const acknowledgeAlert = (alertId) => {
        emitEvent('acknowledge_alert', { alertId });
    };

    const value = {
        socket,
        connected,
        sensorData,
        alerts,
        emitEvent,
        acknowledgeAlert,
        pushEnabled,
    };

    return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};


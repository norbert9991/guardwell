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

        // Listen for emergency alerts
        newSocket.on('emergency_alert', (emergency) => {
            // Show browser notification
            if (Notification.permission === 'granted') {
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

    const value = {
        socket,
        connected,
        sensorData,
        alerts,
        emitEvent,
        acknowledgeAlert,
    };

    return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

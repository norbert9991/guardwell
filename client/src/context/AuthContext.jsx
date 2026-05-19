import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../utils/api';

const AuthContext = createContext(null);

// Permission constants
export const PERMISSIONS = {
    // View permissions (all roles)
    VIEW_DASHBOARD: 'view_dashboard',
    VIEW_MONITORING: 'view_monitoring',
    VIEW_WORKERS: 'view_workers',
    VIEW_DEVICES: 'view_devices',
    VIEW_ALERTS: 'view_alerts',
    VIEW_INCIDENTS: 'view_incidents',
    VIEW_REPORTS: 'view_reports',

    // Action permissions (varies by role)
    MANAGE_WORKERS: 'manage_workers',          // Add/Edit/Archive workers
    MANAGE_DEVICES: 'manage_devices',          // Add/Edit/Assign devices
    MANAGE_CONTACTS: 'manage_contacts',        // Manage emergency contacts
    MANAGE_USERS: 'manage_users',              // User management (Head Admin only)
    MANAGE_SYSTEM: 'manage_system',            // System settings (Head Admin only)

    // Operational permissions
    ACKNOWLEDGE_ALERTS: 'acknowledge_alerts',   // All roles
    MANAGE_INCIDENTS: 'manage_incidents',       // All roles
    TRIGGER_EMERGENCY: 'trigger_emergency',     // All roles
    MARK_SAFE: 'mark_safe',                     // All roles
    EXPORT_REPORTS: 'export_reports',           // Admin and Head Admin only
    ARCHIVE_RECORDS: 'archive_records',         // Admin and Head Admin only
};

// Role-based permission mapping
const ROLE_PERMISSIONS = {
    'Head Admin': Object.values(PERMISSIONS), // Full access
    'Admin': [
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.VIEW_MONITORING,
        PERMISSIONS.VIEW_WORKERS,
        PERMISSIONS.VIEW_DEVICES,
        PERMISSIONS.VIEW_ALERTS,
        PERMISSIONS.VIEW_INCIDENTS,
        PERMISSIONS.VIEW_REPORTS,
        PERMISSIONS.MANAGE_WORKERS,
        PERMISSIONS.MANAGE_DEVICES,
        PERMISSIONS.MANAGE_CONTACTS,
        PERMISSIONS.ACKNOWLEDGE_ALERTS,
        PERMISSIONS.MANAGE_INCIDENTS,
        PERMISSIONS.TRIGGER_EMERGENCY,
        PERMISSIONS.MARK_SAFE,
        PERMISSIONS.EXPORT_REPORTS,
        PERMISSIONS.ARCHIVE_RECORDS,
    ],
    'Safety Officer': [
        // View permissions — full read access to all modules
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.VIEW_MONITORING,
        PERMISSIONS.VIEW_WORKERS,
        PERMISSIONS.VIEW_DEVICES,
        PERMISSIONS.VIEW_ALERTS,
        PERMISSIONS.VIEW_INCIDENTS,
        PERMISSIONS.VIEW_REPORTS,
        // Operational permissions — respond to emergencies and manage incidents
        PERMISSIONS.ACKNOWLEDGE_ALERTS,
        PERMISSIONS.MANAGE_INCIDENTS,
        PERMISSIONS.TRIGGER_EMERGENCY,
        PERMISSIONS.MARK_SAFE,
        // No: MANAGE_WORKERS, MANAGE_DEVICES, MANAGE_CONTACTS,
        //     EXPORT_REPORTS, ARCHIVE_RECORDS, MANAGE_USERS, MANAGE_SYSTEM
    ],
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(localStorage.getItem('token'));

    useEffect(() => {
        // Validate existing token on mount
        const validateToken = async () => {
            const storedToken = localStorage.getItem('token');

            if (storedToken) {
                // If the tab was closed and reopened, sessionStorage won't have the flag.
                // Treat this as a stale session and force re-login.
                const sessionActive = sessionStorage.getItem('sessionActive');
                if (!sessionActive) {
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
                    setLoading(false);
                    return;
                }

                try {
                    const response = await authApi.validate();
                    if (response.data.valid) {
                        setUser(response.data.user);
                        setToken(storedToken);
                    } else {
                        // Token invalid, clear storage
                        localStorage.removeItem('user');
                        localStorage.removeItem('token');
                        sessionStorage.removeItem('sessionActive');
                    }
                } catch (error) {
                    console.error('Token validation failed:', error);
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
                    sessionStorage.removeItem('sessionActive');
                }
            }
            setLoading(false);
        };

        validateToken();
    }, []);

    const login = async (email, password) => {
        try {
            const response = await authApi.login(email, password);

            const { token: newToken, user: userData } = response.data;

            setUser(userData);
            setToken(newToken);
            localStorage.setItem('user', JSON.stringify(userData));
            localStorage.setItem('token', newToken);
            // Mark this tab as having an active session.
            // sessionStorage is cleared automatically when the tab/window is closed.
            sessionStorage.setItem('sessionActive', 'true');

            return { success: true, user: userData };
        } catch (error) {
            console.error('Login error:', error);
            const errorMessage = error.response?.data?.error || 'Login failed. Please try again.';
            return { success: false, error: errorMessage };
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        sessionStorage.removeItem('sessionActive');
    };

    // Role checks
    const isHeadAdmin = user?.role === 'Head Admin';
    const isAdmin = user?.role === 'Admin' || user?.role === 'Safety Officer' || isHeadAdmin;
    const isSafetyOfficer = user?.role === 'Safety Officer' || user?.role === 'Admin';

    // Permission check function
    const hasPermission = (permission) => {
        if (!user?.role) return false;
        const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
        return rolePermissions.includes(permission);
    };

    // Check if user can access a specific route
    const canAccessRoute = (requiredRole) => {
        if (!user?.role) return false;

        const roleHierarchy = {
            'Head Admin': 3,
            'Admin': 2,
            'Safety Officer': 1
        };

        const userLevel = roleHierarchy[user.role] || 0;
        const requiredLevel = roleHierarchy[requiredRole] || 0;

        return userLevel >= requiredLevel;
    };

    const value = {
        user,
        token,
        loading,
        login,
        logout,
        isAuthenticated: !!user && !!token,
        isAdmin,
        isHeadAdmin,
        isSafetyOfficer,
        hasPermission,
        canAccessRoute,
        userRole: user?.role || null,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};


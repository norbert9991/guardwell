import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../utils/api';

const AuthContext = createContext(null);

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
                try {
                    const response = await authApi.validate();
                    if (response.data.valid) {
                        setUser(response.data.user);
                        setToken(storedToken);
                    } else {
                        // Token invalid, clear storage
                        localStorage.removeItem('user');
                        localStorage.removeItem('token');
                    }
                } catch (error) {
                    console.error('Token validation failed:', error);
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
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
    };

    const isAdmin = user?.role === 'Admin' || user?.role === 'Head Admin';

    const value = {
        user,
        token,
        loading,
        login,
        logout,
        isAuthenticated: !!user && !!token,
        isAdmin,
        isHeadAdmin: user?.role === 'Head Admin',
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

import React, { createContext, useContext, useState, useEffect } from 'react';

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
        // Check if user is logged in on mount
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');

        if (storedUser && storedToken) {
            setUser(JSON.parse(storedUser));
            setToken(storedToken);
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        try {
            // TODO: Replace with actual API call
            // const response = await axios.post('/api/auth/login', { email, password });

            // Mock login for development
            const mockUser = {
                id: '1',
                email: email,
                name: email.includes('admin') ? 'Head Admin' : 'Safety Officer',
                role: email.includes('admin') ? 'Admin' : 'Safety Officer',
                department: 'Operations'
            };

            const mockToken = 'mock-jwt-token-' + Date.now();

            setUser(mockUser);
            setToken(mockToken);
            localStorage.setItem('user', JSON.stringify(mockUser));
            localStorage.setItem('token', mockToken);

            return { success: true, user: mockUser };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
    };

    const value = {
        user,
        token,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'Admin',
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

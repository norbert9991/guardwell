import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

const RefreshContext = createContext(null);

export const useRefresh = () => {
    const context = useContext(RefreshContext);
    if (!context) throw new Error('useRefresh must be used within RefreshProvider');
    return context;
};

export const RefreshProvider = ({ children }) => {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastRefreshed, setLastRefreshed] = useState(null);
    const refreshFnRef = useRef(null);

    /**
     * Pages call this on mount to register their data-reload function.
     * Only one page is mounted at a time so the ref is simply overwritten.
     */
    const registerRefresh = useCallback((fn) => {
        refreshFnRef.current = fn;
    }, []);

    /**
     * Navbar calls this. Runs the currently-registered page refresh function.
     */
    const triggerRefresh = useCallback(async () => {
        if (!refreshFnRef.current || isRefreshing) return;
        setIsRefreshing(true);
        try {
            await refreshFnRef.current();
        } catch (err) {
            console.error('Refresh failed:', err);
        } finally {
            setIsRefreshing(false);
            setLastRefreshed(new Date());
        }
    }, [isRefreshing]);

    return (
        <RefreshContext.Provider value={{ registerRefresh, triggerRefresh, isRefreshing, lastRefreshed }}>
            {children}
        </RefreshContext.Provider>
    );
};

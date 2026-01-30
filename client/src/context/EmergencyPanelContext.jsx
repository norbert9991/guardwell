import React, { createContext, useContext, useState } from 'react';

const EmergencyPanelContext = createContext();

export const EmergencyPanelProvider = ({ children }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <EmergencyPanelContext.Provider value={{ isExpanded, setIsExpanded }}>
            {children}
        </EmergencyPanelContext.Provider>
    );
};

export const useEmergencyPanel = () => {
    const context = useContext(EmergencyPanelContext);
    if (!context) {
        throw new Error('useEmergencyPanel must be used within EmergencyPanelProvider');
    }
    return context;
};

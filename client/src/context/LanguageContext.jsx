import React, { createContext, useContext, useState, useCallback } from 'react';

const LanguageContext = createContext();

// ── Translation dictionary ──
const translations = {
    // ─── Navbar ───
    'nav.safetyMonitoring': { en: 'Safety Monitoring System', fil: 'Sistema ng Pagmamanman sa Kaligtasan' },
    'nav.connected': { en: 'Connected', fil: 'Konektado' },
    'nav.disconnected': { en: 'Disconnected', fil: 'Hindi Konektado' },
    'nav.logout': { en: 'Logout', fil: 'Mag-logout' },
    'nav.confirmLogout': { en: 'Confirm Logout', fil: 'Kumpirmahin ang Pag-logout' },
    'nav.logoutMessage': { en: 'Are you sure you want to logout? You will need to sign in again to access the system.', fil: 'Sigurado ka bang gusto mong mag-logout? Kailangan mong mag-sign in muli upang ma-access ang sistema.' },
    'nav.cancel': { en: 'Cancel', fil: 'Kanselahin' },

    // ─── Sidebar ───
    'sidebar.safetyMonitoring': { en: 'Safety Monitoring', fil: 'Pagmamanman sa Kaligtasan' },
    'sidebar.dashboard': { en: 'Dashboard', fil: 'Dashboard' },
    'sidebar.liveMonitoring': { en: 'Live Monitoring', fil: 'Live na Pagmamanman' },
    'sidebar.workers': { en: 'Workers', fil: 'Mga Manggagawa' },
    'sidebar.devices': { en: 'Devices', fil: 'Mga Device' },
    'sidebar.alerts': { en: 'Alerts', fil: 'Mga Alerto' },
    'sidebar.incidents': { en: 'Incidents', fil: 'Mga Insidente' },
    'sidebar.reports': { en: 'Reports', fil: 'Mga Ulat' },
    'sidebar.nudgeLogs': { en: 'Nudge Logs', fil: 'Log ng Nudge' },
    'sidebar.emergencyContacts': { en: 'Emergency Contacts', fil: 'Mga Emergency Contact' },
    'sidebar.userManagement': { en: 'User Management', fil: 'Pamamahala ng User' },
    'sidebar.systemSettings': { en: 'System Settings', fil: 'Mga Setting ng Sistema' },
    'sidebar.manual': { en: 'Manual', fil: 'Manual' },
    'sidebar.terms': { en: 'Terms', fil: 'Mga Tuntunin' },

    // ─── Dashboard ───
    'dashboard.title': { en: 'Dashboard', fil: 'Dashboard' },
    'dashboard.subtitle': { en: 'Real-time overview of worker safety and monitoring system', fil: 'Real-time na pangkalahatang-tanaw ng sistema ng kaligtasan at pagmamanman ng manggagawa' },
    'dashboard.activeWorkers': { en: 'Active Workers', fil: 'Mga Aktibong Manggagawa' },
    'dashboard.totalRegistered': { en: 'total registered', fil: 'kabuuang nakarehistro' },
    'dashboard.activeDevices': { en: 'Active Devices', fil: 'Mga Aktibong Device' },
    'dashboard.transmittingData': { en: 'Transmitting data', fil: 'Nagpapadala ng data' },
    'dashboard.activeAlerts': { en: 'Active Alerts', fil: 'Mga Aktibong Alerto' },
    'dashboard.requireAttention': { en: 'Require attention', fil: 'Nangangailangan ng atensyon' },
    'dashboard.allClear': { en: 'All clear', fil: 'Lahat ay maayos' },
    'dashboard.systemStatus': { en: 'System Status', fil: 'Katayuan ng Sistema' },
    'dashboard.online': { en: 'Online', fil: 'Online' },
    'dashboard.offline': { en: 'Offline', fil: 'Offline' },
    'dashboard.allOperational': { en: 'All systems operational', fil: 'Lahat ng sistema ay gumagana' },
    'dashboard.reconnecting': { en: 'Reconnecting...', fil: 'Nagkokonekta muli...' },
    'dashboard.recentAlerts': { en: 'Recent Alerts', fil: 'Mga Kamakailang Alerto' },
    'dashboard.viewAll': { en: 'View All', fil: 'Tingnan Lahat' },
    'dashboard.noRecentAlerts': { en: 'No recent alerts', fil: 'Walang kamakailang alerto' },
    'dashboard.runningSmooth': { en: 'Everything is running smoothly', fil: 'Maayos ang lahat ng bagay' },
    'dashboard.acknowledge': { en: 'Acknowledge', fil: 'Kilalanin' },
    'dashboard.processing': { en: 'Processing...', fil: 'Pinoproseso...' },
    'dashboard.emergencyAlert': { en: 'Emergency Alert', fil: 'Emergency na Alerto' },
    'dashboard.emergencyActivated': { en: 'Emergency Activated!', fil: 'Na-activate ang Emergency!' },
    'dashboard.triggerEmergency': { en: 'Trigger immediate emergency response for all active units', fil: 'Mag-trigger ng agarang emergency response para sa lahat ng aktibong unit' },
    'dashboard.allNotified': { en: 'All units have been notified. Response teams are being dispatched.', fil: 'Lahat ng unit ay naabisuhan na. Ang mga response team ay ipinapadala na.' },
    'dashboard.activateEmergency': { en: 'ACTIVATE EMERGENCY', fil: 'I-ACTIVATE ANG EMERGENCY' },
    'dashboard.emergencyActive': { en: 'EMERGENCY ACTIVE', fil: 'AKTIBO ANG EMERGENCY' },
    'dashboard.liveSensorData': { en: 'Live Sensor Data', fil: 'Live na Data ng Sensor' },
    'dashboard.avgTemperature': { en: 'Avg Temperature', fil: 'Average na Temperatura' },
    'dashboard.highestGas': { en: 'Highest Gas Reading', fil: 'Pinakamataas na Gas Reading' },
    'dashboard.criticalAlerts': { en: 'Critical Alerts', fil: 'Mga Kritikal na Alerto' },
    'dashboard.avgBattery': { en: 'Avg Battery Level', fil: 'Average na Lebel ng Baterya' },
    'dashboard.noActiveDevices': { en: 'No active devices transmitting data', fil: 'Walang aktibong device na nagpapadala ng data' },
    'dashboard.iUnderstandActivate': { en: 'I UNDERSTAND, ACTIVATE', fil: 'NAIINTINDIHAN KO, I-ACTIVATE' },
    'dashboard.systemWideEmergency': { en: 'System-Wide Emergency', fil: 'Emergency sa Buong Sistema' },
    'dashboard.importantNotice': { en: 'Important Notice', fil: 'Mahalagang Paunawa' },

    // ─── Live Monitoring ───
    'live.title': { en: 'Live Monitoring', fil: 'Live na Pagmamanman' },
    'live.subtitle': { en: 'Real-time worker and sensor data monitoring', fil: 'Real-time na pagmamanman ng manggagawa at data ng sensor' },
    'live.live': { en: 'Live', fil: 'Live' },
    'live.disconnected': { en: 'Disconnected', fil: 'Hindi Konektado' },
    'live.allDepartments': { en: 'All Departments', fil: 'Lahat ng Departamento' },
    'live.grid': { en: 'Grid', fil: 'Grid' },
    'live.map': { en: 'Map', fil: 'Mapa' },
    'live.totalDevices': { en: 'Total Devices', fil: 'Kabuuang Device' },
    'live.registeredDevices': { en: 'Registered devices', fil: 'Nakarehistrong device' },
    'live.activeNow': { en: 'Active Now', fil: 'Aktibo Ngayon' },
    'live.withWorkers': { en: 'With Workers', fil: 'May Manggagawa' },
    'live.assigned': { en: 'Assigned', fil: 'Naka-assign' },
    'live.avgTemperature': { en: 'Avg Temperature', fil: 'Average na Temperatura' },
    'live.aboveNormal': { en: 'Above normal', fil: 'Higit sa normal' },
    'live.safeRange': { en: 'Safe range', fil: 'Ligtas na saklaw' },
    'live.workerLocations': { en: 'Worker Locations', fil: 'Mga Lokasyon ng Manggagawa' },
    'live.satellite': { en: 'Satellite', fil: 'Satellite' },
    'live.vector': { en: 'Vector', fil: 'Vector' },
    'live.normal': { en: 'Normal', fil: 'Normal' },
    'live.warning': { en: 'Warning', fil: 'Babala' },
    'live.critical': { en: 'Critical', fil: 'Kritikal' },
    'live.outside': { en: 'Outside', fil: 'Labas' },
    'live.temperature': { en: 'Temperature', fil: 'Temperatura' },
    'live.gasLevel': { en: 'Gas Level', fil: 'Lebel ng Gas' },
    'live.humidity': { en: 'Humidity', fil: 'Halumigmig' },
    'live.battery': { en: 'Battery', fil: 'Baterya' },
    'live.signal': { en: 'Signal', fil: 'Signal' },
    'live.motionStatus': { en: 'Motion Status', fil: 'Katayuan ng Galaw' },
    'live.orientation': { en: 'Orientation', fil: 'Oryentasyon' },
    'live.rotation': { en: 'Rotation', fil: 'Pag-ikot' },
    'live.gpsStatus': { en: 'GPS Status', fil: 'Katayuan ng GPS' },
    'live.coordinates': { en: 'Coordinates', fil: 'Mga Koordinado' },
    'live.viewDetails': { en: 'View Details', fil: 'Tingnan ang Detalye' },
    'live.nudge': { en: 'Nudge', fil: 'Nudge' },
    'live.markSafe': { en: 'Mark as Safe', fil: 'Markahan bilang Ligtas' },
    'live.sosActivated': { en: 'SOS ACTIVATED', fil: 'SOS AY NA-ACTIVATE' },
    'live.voiceAlert': { en: 'VOICE ALERT', fil: 'VOICE ALERT' },
    'live.markedSafe': { en: 'Marked Safe', fil: 'Minarkahang Ligtas' },
    'live.nudgeAcks': { en: 'Recent Nudge Acknowledgments', fil: 'Mga Kamakailang Nudge Acknowledgment' },
    'live.responded': { en: 'responded', fil: 'tumugon' },
};

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState(() => {
        try {
            return localStorage.getItem('guardwell-lang') || 'en';
        } catch {
            return 'en';
        }
    });

    const toggleLanguage = useCallback(() => {
        setLanguage(prev => {
            const next = prev === 'en' ? 'fil' : 'en';
            try { localStorage.setItem('guardwell-lang', next); } catch { }
            return next;
        });
    }, []);

    const t = useCallback((key) => {
        const entry = translations[key];
        if (!entry) return key; // Fallback: return the key itself
        return entry[language] || entry.en || key;
    }, [language]);

    return (
        <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const ctx = useContext(LanguageContext);
    if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
    return ctx;
};

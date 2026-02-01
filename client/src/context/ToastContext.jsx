import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertTriangle, Info, X, XCircle } from 'lucide-react';

// Toast context
const ToastContext = createContext(null);

// Toast types with styling - Light theme
const toastTypes = {
    success: {
        icon: CheckCircle,
        bgColor: 'bg-white',
        borderColor: 'border-green-500',
        iconColor: 'text-green-600',
        textColor: 'text-green-700',
        accentColor: 'bg-green-500'
    },
    error: {
        icon: XCircle,
        bgColor: 'bg-white',
        borderColor: 'border-red-500',
        iconColor: 'text-red-600',
        textColor: 'text-red-700',
        accentColor: 'bg-red-500'
    },
    warning: {
        icon: AlertTriangle,
        bgColor: 'bg-white',
        borderColor: 'border-yellow-500',
        iconColor: 'text-yellow-600',
        textColor: 'text-yellow-700',
        accentColor: 'bg-yellow-500'
    },
    info: {
        icon: Info,
        bgColor: 'bg-white',
        borderColor: 'border-blue-500',
        iconColor: 'text-blue-600',
        textColor: 'text-blue-700',
        accentColor: 'bg-blue-500'
    }
};

// Individual Toast component
const Toast = ({ id, type, title, message, onClose }) => {
    const config = toastTypes[type] || toastTypes.info;
    const Icon = config.icon;

    return (
        <div
            className={`flex items-start gap-3 p-4 rounded-lg border-l-4 ${config.bgColor} ${config.borderColor} shadow-lg animate-slide-in-right min-w-[320px] max-w-[420px]`}
            role="alert"
            style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' }}
        >
            <Icon className={`h-5 w-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
            <div className="flex-1 min-w-0">
                {title && <p className={`font-semibold ${config.textColor}`}>{title}</p>}
                <p className="text-[#4B5563] text-sm">{message}</p>
            </div>
            <button
                onClick={() => onClose(id)}
                className="text-[#9CA3AF] hover:text-[#4B5563] transition-colors flex-shrink-0"
            >
                <X size={18} />
            </button>
        </div>
    );
};

// Toast Provider component
export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
        const id = Date.now() + Math.random();

        setToasts(prev => [...prev, { id, type, title, message }]);

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }

        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    // Convenience methods
    const success = useCallback((message, title = 'Success') => {
        return addToast({ type: 'success', title, message });
    }, [addToast]);

    const error = useCallback((message, title = 'Error') => {
        return addToast({ type: 'error', title, message, duration: 6000 });
    }, [addToast]);

    const warning = useCallback((message, title = 'Warning') => {
        return addToast({ type: 'warning', title, message });
    }, [addToast]);

    const info = useCallback((message, title = 'Info') => {
        return addToast({ type: 'info', title, message });
    }, [addToast]);

    return (
        <ToastContext.Provider value={{ addToast, removeToast, success, error, warning, info }}>
            {children}
            {/* Toast container */}
            <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-auto">
                {toasts.map(toast => (
                    <Toast
                        key={toast.id}
                        {...toast}
                        onClose={removeToast}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    );
};

// Hook to use toast
export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

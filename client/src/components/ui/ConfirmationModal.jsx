import React from 'react';
import { AlertTriangle, CheckCircle, Info, HelpCircle, X } from 'lucide-react';
import { Button } from './Button';

/**
 * Reusable confirmation modal for add/create operations
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {function} onClose - Called when modal is closed/cancelled
 * @param {function} onConfirm - Called when user confirms action
 * @param {string} title - Modal title
 * @param {string} message - Confirmation message
 * @param {string} variant - Icon/color variant: 'info' | 'warning' | 'danger' | 'success'
 * @param {string} confirmText - Text for confirm button
 * @param {string} cancelText - Text for cancel button
 * @param {boolean} loading - Shows loading state on confirm button
 * @param {object} data - Optional data to display (for review before confirm)
 */
export const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    variant = 'info',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    loading = false,
    data = null
}) => {
    if (!isOpen) return null;

    const variants = {
        info: {
            icon: Info,
            bgColor: 'bg-blue-500/20',
            iconColor: 'text-blue-500',
            buttonVariant: 'primary'
        },
        warning: {
            icon: HelpCircle,
            bgColor: 'bg-yellow-500/20',
            iconColor: 'text-yellow-500',
            buttonVariant: 'primary'
        },
        danger: {
            icon: AlertTriangle,
            bgColor: 'bg-red-500/20',
            iconColor: 'text-red-500',
            buttonVariant: 'danger'
        },
        success: {
            icon: CheckCircle,
            bgColor: 'bg-green-500/20',
            iconColor: 'text-green-500',
            buttonVariant: 'primary'
        }
    };

    const config = variants[variant] || variants.info;
    const Icon = config.icon;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget && !loading) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
            onClick={handleBackdropClick}
        >
            <div className="bg-dark-card border border-white/10 rounded-2xl shadow-2xl w-full max-w-md transform animate-scale-in">
                {/* Close button */}
                <button
                    onClick={onClose}
                    disabled={loading}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10 disabled:opacity-50"
                >
                    <X size={20} />
                </button>

                <div className="p-8 text-center">
                    {/* Icon */}
                    <div className={`w-20 h-20 ${config.bgColor} rounded-full flex items-center justify-center mx-auto mb-6`}>
                        <Icon className={`h-10 w-10 ${config.iconColor}`} />
                    </div>

                    {/* Title */}
                    <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>

                    {/* Message */}
                    <p className="text-gray-400 mb-6">{message}</p>

                    {/* Data Preview */}
                    {data && (
                        <div className="bg-dark-lighter rounded-xl p-4 mb-6 text-left">
                            <h4 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">Review Details</h4>
                            <div className="space-y-2">
                                {Object.entries(data).map(([key, value]) => (
                                    value && (
                                        <div key={key} className="flex justify-between text-sm">
                                            <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                            <span className="text-white font-medium">{value}</span>
                                        </div>
                                    )
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-3 justify-center">
                        <Button
                            variant="secondary"
                            onClick={onClose}
                            disabled={loading}
                            size="lg"
                            className="min-w-[120px]"
                        >
                            {cancelText}
                        </Button>
                        <Button
                            variant={config.buttonVariant}
                            onClick={onConfirm}
                            disabled={loading}
                            size="lg"
                            className="min-w-[120px]"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Processing...
                                </span>
                            ) : confirmText}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

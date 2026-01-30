import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

export const Modal = ({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    showClose = true,
    className
}) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const sizes = {
        sm: 'max-w-md',
        md: 'max-w-2xl',
        lg: 'max-w-4xl',
        xl: 'max-w-6xl',
        full: 'max-w-full mx-4',
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal - Light Theme */}
            <div className={cn(
                'relative w-full animate-slide-in',
                'bg-white',
                'border border-[#E3E6EB] rounded-xl',
                'shadow-2xl',
                sizes[size],
                className
            )}>
                {/* Subtle accent line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#6FA3D8] via-[#2F4A6D] to-[#E85D2A] rounded-t-xl" />

                {/* Header */}
                {(title || showClose) && (
                    <div className="relative flex items-center justify-between px-6 py-4 border-b border-[#E3E6EB]">
                        {title && (
                            <h3 className="relative text-xl font-bold text-[#1F2937] tracking-tight flex items-center gap-3">
                                <div className="w-1 h-6 bg-gradient-to-b from-[#6FA3D8] to-[#2F4A6D] rounded-full" />
                                {title}
                            </h3>
                        )}
                        {showClose && (
                            <button
                                onClick={onClose}
                                className="relative p-2 text-[#6B7280] hover:text-[#1F2937] hover:bg-[#EEF1F4] rounded-lg transition-all duration-200"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>
                )}

                {/* Content */}
                <div className="relative px-6 py-5 max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-hide">
                    {children}
                </div>
            </div>
        </div>
    );
};

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
                className="absolute inset-0 bg-black/70 backdrop-blur-md"
                onClick={onClose}
            />

            {/* Modal */}
            <div className={cn(
                'relative w-full animate-slide-in',
                'bg-gradient-to-br from-[#1a2235] to-[#151B2B]',
                'border border-[#2d3a52] rounded-xl',
                'shadow-2xl shadow-black/50',
                sizes[size],
                className
            )}>
                {/* Glow effect */}
                <div className="absolute -inset-[1px] bg-gradient-to-r from-[#00E5FF]/20 via-transparent to-[#00E5FF]/20 rounded-xl blur-sm pointer-events-none" />

                {/* Header */}
                {(title || showClose) && (
                    <div className="relative flex items-center justify-between px-6 py-4 border-b border-[#2d3a52]/80">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#00E5FF]/5 to-transparent pointer-events-none" />
                        {title && (
                            <h3 className="relative text-xl font-bold text-white tracking-tight flex items-center gap-3">
                                <div className="w-1 h-6 bg-gradient-to-b from-[#00E5FF] to-[#00b8cc] rounded-full" />
                                {title}
                            </h3>
                        )}
                        {showClose && (
                            <button
                                onClick={onClose}
                                className="relative p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
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

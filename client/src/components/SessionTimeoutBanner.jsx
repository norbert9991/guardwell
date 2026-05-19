import React from 'react';
import { AlertTriangle, Clock, Shield } from 'lucide-react';

/**
 * Fixed banner shown when the inactivity timeout is about to expire.
 * Stays at the top of the page above the navbar.
 */
export const SessionTimeoutBanner = ({ secondsLeft, onStayLoggedIn }) => {
    const minutes = Math.floor(secondsLeft / 60);
    const secs    = secondsLeft % 60;
    const timeStr = minutes > 0
        ? `${minutes}:${String(secs).padStart(2, '0')}`
        : `0:${String(secs).padStart(2, '0')}`;

    const isUrgent = secondsLeft <= 30;

    return (
        <div
            className={`fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between px-6 py-3 shadow-lg transition-colors duration-500 ${
                isUrgent
                    ? 'bg-red-600 text-white'
                    : 'bg-amber-500 text-white'
            }`}
            style={{ animation: 'slideDown 0.3s ease-out' }}
        >
            <div className="flex items-center gap-3">
                <AlertTriangle size={20} className={isUrgent ? 'animate-pulse' : ''} />
                <div>
                    <span className="font-semibold text-sm">
                        Session Expiring Soon
                    </span>
                    <span className="text-sm ml-2 opacity-90">
                        — You will be automatically logged out due to inactivity.
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {/* Countdown */}
                <div className="flex items-center gap-2 bg-black/20 rounded-lg px-4 py-1.5">
                    <Clock size={16} />
                    <span className={`font-mono font-bold text-lg tabular-nums ${isUrgent ? 'text-white' : 'text-white'}`}>
                        {timeStr}
                    </span>
                </div>

                {/* Stay logged in button */}
                <button
                    onClick={onStayLoggedIn}
                    className="flex items-center gap-2 bg-white text-gray-800 font-semibold text-sm px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors shadow-sm"
                >
                    <Shield size={16} />
                    Stay Logged In
                </button>
            </div>

            <style>{`
                @keyframes slideDown {
                    from { transform: translateY(-100%); opacity: 0; }
                    to   { transform: translateY(0);     opacity: 1; }
                }
            `}</style>
        </div>
    );
};

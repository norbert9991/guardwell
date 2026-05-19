import { useEffect, useRef, useCallback, useState } from 'react';

const IDLE_TIMEOUT_MS = 15 * 60 * 1000;  // 15 minutes
const WARNING_COUNTDOWN_S = 60;            // 60-second warning window

/**
 * Monitors user inactivity and triggers a warning + auto-logout.
 * @param {Function} onLogout  - Called when session expires
 * @returns {{ showWarning, secondsLeft, resetTimer }}
 */
export const useInactivityTimeout = (onLogout) => {
    const [showWarning, setShowWarning] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(WARNING_COUNTDOWN_S);

    const idleTimerRef    = useRef(null);
    const countdownRef    = useRef(null);
    const logoutCalledRef = useRef(false);

    // Clear both timers
    const clearTimers = useCallback(() => {
        if (idleTimerRef.current)  clearTimeout(idleTimerRef.current);
        if (countdownRef.current)  clearInterval(countdownRef.current);
    }, []);

    // Start the 60-second countdown to logout
    const startCountdown = useCallback(() => {
        setShowWarning(true);
        setSecondsLeft(WARNING_COUNTDOWN_S);
        logoutCalledRef.current = false;

        countdownRef.current = setInterval(() => {
            setSecondsLeft(prev => {
                if (prev <= 1) {
                    clearInterval(countdownRef.current);
                    if (!logoutCalledRef.current) {
                        logoutCalledRef.current = true;
                        onLogout();
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, [onLogout]);

    // Reset idle timer — called on any user activity
    const resetTimer = useCallback(() => {
        clearTimers();
        setShowWarning(false);
        setSecondsLeft(WARNING_COUNTDOWN_S);
        logoutCalledRef.current = false;

        idleTimerRef.current = setTimeout(startCountdown, IDLE_TIMEOUT_MS);
    }, [clearTimers, startCountdown]);

    useEffect(() => {
        const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart', 'click'];

        const handleActivity = () => {
            // Only reset during normal mode (not once warning is showing — they must click the button)
            if (!showWarning) {
                resetTimer();
            }
        };

        events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));

        // Kick off the initial timer
        resetTimer();

        return () => {
            clearTimers();
            events.forEach(e => window.removeEventListener(e, handleActivity));
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showWarning]);

    return { showWarning, secondsLeft, resetTimer };
};

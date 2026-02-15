import React from 'react';

/**
 * DeviceLedIndicator - Mirrors the ESP32 RGB LED state machine.
 *
 * Priority (highest first):
 *  1. Emergency  → red rapid flash
 *  2. Geofence   → purple pulse
 *  3. GPS Wait   → yellow slow pulse
 *  4. Idle       → green steady glow
 *  Offline       → gray (no data)
 */

const LED_STATES = {
    emergency: {
        label: 'Emergency',
        className: 'led-emergency',
        color: '#EF4444',
        shadow: '#EF4444',
    },
    geofence: {
        label: 'Geofence Breach',
        className: 'led-geofence',
        color: '#A855F7',
        shadow: '#A855F7',
    },
    gpsWait: {
        label: 'GPS Acquiring',
        className: 'led-gps-wait',
        color: '#EAB308',
        shadow: '#EAB308',
    },
    idle: {
        label: 'Normal',
        className: 'led-idle',
        color: '#22C55E',
        shadow: '#22C55E',
    },
    offline: {
        label: 'Offline',
        className: 'led-offline',
        color: '#9CA3AF',
        shadow: 'transparent',
    },
};

function deriveLedState(sensors, status) {
    if (status === 'offline') return LED_STATES.offline;

    // Priority 1 — Emergency (button or voice alert)
    if (sensors?.emergency || sensors?.sosActive || sensors?.voiceAlert) {
        return LED_STATES.emergency;
    }

    // Priority 2 — Geofence violation
    if (sensors?.geofenceViolation) {
        return LED_STATES.geofence;
    }

    // Priority 3 — GPS acquiring (device is online but no fix)
    if (sensors?.gpsValid === false && status !== 'offline') {
        return LED_STATES.gpsWait;
    }

    // Priority 4 — Normal / Idle
    return LED_STATES.idle;
}

export const DeviceLedIndicator = ({ sensors, status, size = 'md', showLabel = true }) => {
    const state = deriveLedState(sensors, status);

    const sizeClasses = {
        sm: 'w-3 h-3',
        md: 'w-4 h-4',
        lg: 'w-5 h-5',
    };

    return (
        <div className="flex items-center gap-2">
            <span
                className={`${sizeClasses[size] || sizeClasses.md} rounded-full inline-block ${state.className}`}
                style={{
                    backgroundColor: state.color,
                    boxShadow: `0 0 8px ${state.shadow}, 0 0 16px ${state.shadow}40`,
                }}
                title={state.label}
            />
            {showLabel && (
                <span className="text-xs font-medium text-[#6B7280]">
                    {state.label}
                </span>
            )}
        </div>
    );
};

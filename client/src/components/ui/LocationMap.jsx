import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ── Hazardous Zone location: 14°42'19.8"N 121°02'05.2"E ──
const FACILITY_CENTER = [14.705493, 121.034774];

// ── Custom marker icons ──
const createIcon = (color) => new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const icons = {
    normal: createIcon('blue'),
    warning: createIcon('orange'),
    critical: createIcon('red'),
    outside: createIcon('violet'),
    pin: createIcon('green'),
};

// ── Hazardous zone bounding box around the coordinate ──
const HAZARDOUS_ZONE = [
    [14.705600, 121.034600],
    [14.705600, 121.034900],
    [14.705300, 121.034900],
    [14.705300, 121.034600],
];

// ── Tile layer configs ──
const TILE_LAYERS = {
    satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '&copy; <a href="https://www.esri.com/">Esri</a> — World Imagery',
        maxZoom: 20,
    },
    vector: {
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 20,
    },
};

// ── Helper: convert decimal degrees to DMS format ──
function toDMS(decimal, isLat) {
    const abs = Math.abs(decimal);
    const d = Math.floor(abs);
    const mFloat = (abs - d) * 60;
    const m = Math.floor(mFloat);
    const s = ((mFloat - m) * 60).toFixed(1);
    const dir = isLat ? (decimal >= 0 ? 'N' : 'S') : (decimal >= 0 ? 'E' : 'W');
    return `${d}°${m}'${s}"${dir}`;
}

// ── Component to fly to a focused device ──
function FocusController({ focusDeviceId, workers, markerRefs, geofenceCenter }) {
    const map = useMap();

    useEffect(() => {
        if (!focusDeviceId) return;

        const worker = workers.find(w => w.deviceId === focusDeviceId);
        if (worker?.sensors?.latitude && worker?.sensors?.longitude) {
            const lat = parseFloat(worker.sensors.latitude);
            const lng = parseFloat(worker.sensors.longitude);
            if (lat !== 0 || lng !== 0) {
                const isOutside = worker.sensors?.geofenceViolation;
                if (isOutside && geofenceCenter) {
                    const bounds = L.latLngBounds([geofenceCenter, [lat, lng]]);
                    map.flyToBounds(bounds.pad(0.3), { duration: 1.2, maxZoom: 17 });
                } else {
                    map.flyTo([lat, lng], 19, { duration: 1.2 });
                }

                setTimeout(() => {
                    const ref = markerRefs.current?.[focusDeviceId];
                    if (ref) ref.openPopup();
                }, 1300);
            }
        }
    }, [focusDeviceId, workers, map, markerRefs, geofenceCenter]);

    return null;
}

// ── Component to fit all markers on the map ──
function FitAllController({ workers, trigger, geofenceCenter }) {
    const map = useMap();

    useEffect(() => {
        if (!trigger) return;
        const points = workers
            .filter(w => w.sensors?.latitude && w.sensors?.longitude)
            .map(w => [parseFloat(w.sensors.latitude), parseFloat(w.sensors.longitude)]);

        if (geofenceCenter) points.push(geofenceCenter);

        if (points.length > 0) {
            const bounds = L.latLngBounds(points);
            map.flyToBounds(bounds.pad(0.2), { duration: 1.2, maxZoom: 18 });
        }
    }, [trigger, workers, map, geofenceCenter]);

    return null;
}

// ── Click-to-Pin controller ──
function ClickPinController({ onPin }) {
    useMapEvents({
        click(e) {
            onPin([e.latlng.lat, e.latlng.lng]);
        },
    });
    return null;
}

// ── Hazardous Zone Overlay ──
function HazardousZoneOverlay() {
    return (
        <Polygon
            positions={HAZARDOUS_ZONE}
            pathOptions={{
                color: '#ef4444',
                weight: 3,
                fillColor: '#ef4444',
                fillOpacity: 0.25,
                dashArray: '5, 5',
            }}
        >
            <Tooltip direction="center" permanent className="hazard-label">
                ⚠️ Hazardous Zone
            </Tooltip>
        </Polygon>
    );
}

// ══════════════════════════════════════════
// Main LocationMap component
// ══════════════════════════════════════════
export function LocationMap({
    workers,
    geofenceCenter,
    geofenceRadius = 100,
    mapStyle = 'satellite',
    focusDeviceId = null,
    onMarkerClick = null,
    fitAllTrigger = 0,
}) {
    const mapCenter = geofenceCenter || FACILITY_CENTER;
    const tileConfig = TILE_LAYERS[mapStyle] || TILE_LAYERS.satellite;
    const markerRefs = useRef({});
    const pinRef = useRef(null);
    const [pinnedPosition, setPinnedPosition] = useState(null);
    const [copied, setCopied] = useState(false);

    // Show only workers with VALID, non-zero GPS coordinates
    const workersWithGPS = useMemo(() =>
        workers.filter(w => {
            const lat = parseFloat(w.sensors?.latitude);
            const lng = parseFloat(w.sensors?.longitude);
            return w.sensors?.latitude != null &&
                   w.sensors?.longitude != null &&
                   !(lat === 0 && lng === 0) &&
                   !isNaN(lat) && !isNaN(lng);
        }), [workers]);

    const getMarkerIcon = (worker) => {
        if (worker.sensors?.geofenceViolation) return icons.outside;
        if (worker.status === 'critical') return icons.critical;
        if (worker.status === 'warning') return icons.warning;
        return icons.normal;
    };

    const handlePin = useCallback((pos) => {
        setPinnedPosition(pos);
        setCopied(false);
        setTimeout(() => {
            if (pinRef.current) pinRef.current.openPopup();
        }, 50);
    }, []);

    const handleCopyCoords = useCallback(() => {
        if (!pinnedPosition) return;
        const text = `${pinnedPosition[0].toFixed(6)}, ${pinnedPosition[1].toFixed(6)}`;
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }, [pinnedPosition]);

    return (
        <div className="w-full h-[500px] rounded-xl overflow-hidden border border-[#E3E6EB] shadow-md relative">
            {/* Hint overlay */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
                <div className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
                    📌 Click anywhere to pin &amp; see coordinates
                </div>
            </div>

            <MapContainer
                center={mapCenter}
                zoom={18}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
            >
                {/* Switchable tile layer */}
                <TileLayer
                    key={mapStyle}
                    attribution={tileConfig.attribution}
                    url={tileConfig.url}
                    maxZoom={tileConfig.maxZoom}
                />

                {/* Click-to-pin handler */}
                <ClickPinController onPin={handlePin} />

                {/* Geofence Circle */}
                <Circle
                    center={mapCenter}
                    radius={geofenceRadius}
                    pathOptions={{
                        color: mapStyle === 'satellite' ? '#4ade80' : '#22c55e',
                        fillColor: '#22c55e',
                        fillOpacity: mapStyle === 'satellite' ? 0.08 : 0.1,
                        weight: 2,
                        dashArray: '5, 10'
                    }}
                />

                {/* Hazardous Zone Overlay */}
                <HazardousZoneOverlay />

                {/* Facility Center Marker */}
                <Marker position={FACILITY_CENTER} icon={icons.normal} opacity={0.5}>
                    <Popup>
                        <div className="text-sm" style={{ minWidth: 180 }}>
                            <strong style={{ fontSize: 14, color: '#1e293b' }}>📍 Facility Center</strong>
                            <hr style={{ margin: '6px 0', borderColor: '#e2e8f0' }} />
                            <div style={{ color: '#475569', lineHeight: 1.5 }}>
                                Geofence Reference Point<br />
                                14°42'19.8"N 121°02'05.2"E
                            </div>
                            <div style={{ marginTop: 6, fontSize: 11, color: '#94a3b8' }}>
                                {FACILITY_CENTER[0].toFixed(6)}, {FACILITY_CENTER[1].toFixed(6)}
                            </div>
                        </div>
                    </Popup>
                </Marker>

                {/* Pinned Location Marker (green) */}
                {pinnedPosition && (
                    <Marker position={pinnedPosition} icon={icons.pin} ref={pinRef}>
                        <Popup>
                            <div style={{ minWidth: 220, fontFamily: 'system-ui, sans-serif' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <strong style={{ fontSize: 14, color: '#166534' }}>📌 Pinned Location</strong>
                                    <button
                                        onClick={() => setPinnedPosition(null)}
                                        style={{
                                            background: 'none', border: 'none', cursor: 'pointer',
                                            fontSize: 18, color: '#9ca3af', padding: '0 4px', lineHeight: 1
                                        }}
                                        title="Remove pin"
                                    >×</button>
                                </div>
                                <hr style={{ margin: '6px 0', borderColor: '#e2e8f0' }} />
                                <div style={{ color: '#334155', fontSize: 13, lineHeight: 1.6 }}>
                                    <div style={{ fontWeight: 600 }}>Decimal:</div>
                                    <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#1e293b' }}>
                                        {pinnedPosition[0].toFixed(6)}, {pinnedPosition[1].toFixed(6)}
                                    </div>
                                    <div style={{ fontWeight: 600, marginTop: 6 }}>DMS:</div>
                                    <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#1e293b' }}>
                                        {toDMS(pinnedPosition[0], true)} {toDMS(pinnedPosition[1], false)}
                                    </div>
                                </div>
                                <button
                                    onClick={handleCopyCoords}
                                    style={{
                                        marginTop: 8, width: '100%', padding: '6px 12px',
                                        background: copied ? '#16a34a' : '#2563eb',
                                        color: '#fff', border: 'none', borderRadius: 6,
                                        cursor: 'pointer', fontSize: 12, fontWeight: 600,
                                        transition: 'background 0.2s'
                                    }}
                                >
                                    {copied ? '✓ Copied!' : '📋 Copy Coordinates'}
                                </button>
                            </div>
                        </Popup>
                    </Marker>
                )}

                {/* Worker Markers — only real GPS data */}
                {workersWithGPS.map((worker) => (
                    <Marker
                        key={worker.id}
                        position={[
                            parseFloat(worker.sensors.latitude),
                            parseFloat(worker.sensors.longitude)
                        ]}
                        icon={getMarkerIcon(worker)}
                        ref={(ref) => { if (ref) markerRefs.current[worker.deviceId] = ref; }}
                        eventHandlers={{
                            click: () => onMarkerClick?.(worker.deviceId),
                        }}
                    >
                        <Popup>
                            <div className="text-sm min-w-[150px]">
                                <strong className="text-lg">{worker.name}</strong><br />
                                <span className="text-gray-600">{worker.deviceId}</span>
                                <hr className="my-1" />
                                <div className="space-y-1">
                                    <div>📍 {parseFloat(worker.sensors.latitude).toFixed(6)}, {parseFloat(worker.sensors.longitude).toFixed(6)}</div>
                                    {worker.sensors?.gpsSpeed > 0 && (
                                        <div>🚗 {worker.sensors.gpsSpeed.toFixed(1)} km/h</div>
                                    )}
                                    {worker.sensors?.satellites > 0 && (
                                        <div>🛰️ {worker.sensors.satellites} satellites</div>
                                    )}
                                    {worker.sensors?.geofenceViolation && (
                                        <div className="text-red-600 font-bold">⚠️ OUTSIDE SAFE ZONE</div>
                                    )}
                                    <div className={`font-semibold ${worker.status === 'critical' ? 'text-red-600' :
                                        worker.status === 'warning' ? 'text-orange-500' : 'text-green-600'
                                        }`}>
                                        Status: {worker.status?.toUpperCase()}
                                    </div>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* Fly-to controller for Locate button */}
                <FocusController
                    focusDeviceId={focusDeviceId}
                    workers={workersWithGPS}
                    markerRefs={markerRefs}
                    geofenceCenter={mapCenter}
                />

                {/* Fit-all controller */}
                <FitAllController
                    workers={workersWithGPS}
                    trigger={fitAllTrigger}
                    geofenceCenter={mapCenter}
                />
            </MapContainer>
        </div>
    );
}

export default LocationMap;

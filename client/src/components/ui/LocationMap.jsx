import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, Tooltip, useMap } from 'react-leaflet';
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
    outside: createIcon('violet')
};

// ── Pulsing GPS "You Are Here" icon ──
const gpsIcon = L.divIcon({
    className: 'gps-pulse-icon',
    html: `
        <div style="position:relative;width:40px;height:40px;">
            <div style="
                position:absolute;top:50%;left:50%;
                width:16px;height:16px;
                margin:-8px 0 0 -8px;
                background:#4285F4;
                border:3px solid #fff;
                border-radius:50%;
                box-shadow:0 0 6px rgba(66,133,244,0.6);
                z-index:2;
            "></div>
            <div style="
                position:absolute;top:50%;left:50%;
                width:40px;height:40px;
                margin:-20px 0 0 -20px;
                background:rgba(66,133,244,0.18);
                border:2px solid rgba(66,133,244,0.35);
                border-radius:50%;
                z-index:1;
                animation:gpsPulse 2s ease-out infinite;
            "></div>
        </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
});

// ── Hazardous zone bounding box around the coordinate ──
const HAZARDOUS_ZONE = [
    [14.705600, 121.034600],
    [14.705600, 121.034900],
    [14.705300, 121.034900],
    [14.705300, 121.034600],
];

// ── Inject pulse animation CSS ──
const pulseStyleId = 'gps-pulse-keyframes';
if (typeof document !== 'undefined' && !document.getElementById(pulseStyleId)) {
    const style = document.createElement('style');
    style.id = pulseStyleId;
    style.textContent = `
        @keyframes gpsPulse {
            0%   { transform: scale(0.5); opacity: 1; }
            100% { transform: scale(2.2); opacity: 0; }
        }
        .gps-pulse-icon { background: none !important; border: none !important; }
    `;
    document.head.appendChild(style);
}

// ── Component to recenter map ──
function MapController({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.setView(center, zoom || map.getZoom());
        }
    }, [center, zoom, map]);
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

// ══════════════════════════════════════════
// Main LocationMap component
// ══════════════════════════════════════════
export function LocationMap({
    workers,
    geofenceCenter,
    geofenceRadius = 100,
    mapStyle = 'satellite',  // 'satellite' | 'vector'
}) {
    const mapCenter = geofenceCenter || FACILITY_CENTER;
    const tileConfig = TILE_LAYERS[mapStyle] || TILE_LAYERS.satellite;

    // Show ALL workers with coordinates — no gpsValid filter
    const workersWithGPS = workers.filter(w =>
        w.sensors?.latitude != null && w.sensors?.longitude != null
    );

    const getMarkerIcon = (worker) => {
        if (worker.sensors?.geofenceViolation) return icons.outside;
        if (worker.status === 'critical') return icons.critical;
        if (worker.status === 'warning') return icons.warning;
        return icons.normal;
    };

    return (
        <div className="w-full h-[500px] rounded-xl overflow-hidden border border-[#E3E6EB] shadow-md">
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

                {/* "You Are Here" GPS Pin — always visible */}
                <Marker position={FACILITY_CENTER} icon={gpsIcon}>
                    <Popup>
                        <div className="text-sm" style={{ minWidth: 200 }}>
                            <strong style={{ fontSize: 14, color: '#1e293b' }}>📍 You Are Here</strong>
                            <hr style={{ margin: '6px 0', borderColor: '#e2e8f0' }} />
                            <div style={{ color: '#475569', lineHeight: 1.5 }}>
                                Hazardous Zone Center<br />
                                14°42'19.8"N 121°02'05.2"E
                            </div>
                            <div style={{ marginTop: 6, fontSize: 11, color: '#94a3b8' }}>
                                {FACILITY_CENTER[0].toFixed(6)}, {FACILITY_CENTER[1].toFixed(6)}
                            </div>
                        </div>
                    </Popup>
                </Marker>

                {/* Worker Markers */}
                {workersWithGPS.map((worker) => (
                    <Marker
                        key={worker.id}
                        position={[
                            parseFloat(worker.sensors.latitude),
                            parseFloat(worker.sensors.longitude)
                        ]}
                        icon={getMarkerIcon(worker)}
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

                <MapController center={mapCenter} zoom={18} />
            </MapContainer>
        </div>
    );
}

export default LocationMap;

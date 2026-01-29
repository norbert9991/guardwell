import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
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

// Component to recenter map when workers change
function MapController({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.setView(center, map.getZoom());
        }
    }, [center, map]);
    return null;
}

export function LocationMap({ workers, geofenceCenter, geofenceRadius = 100 }) {
    const mapCenter = geofenceCenter || [14.7089, 121.0430]; // Default: Novaliches, QC

    // Filter workers with valid GPS
    const workersWithGPS = workers.filter(w =>
        w.sensors?.latitude && w.sensors?.longitude && w.sensors?.gpsValid
    );

    const getMarkerIcon = (worker) => {
        if (worker.sensors?.geofenceViolation) return icons.outside;
        if (worker.status === 'critical') return icons.critical;
        if (worker.status === 'warning') return icons.warning;
        return icons.normal;
    };

    return (
        <div className="w-full h-[500px] rounded-xl overflow-hidden border border-gray-700">
            <MapContainer
                center={mapCenter}
                zoom={17}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Geofence Circle */}
                <Circle
                    center={mapCenter}
                    radius={geofenceRadius}
                    pathOptions={{
                        color: '#22c55e',
                        fillColor: '#22c55e',
                        fillOpacity: 0.1,
                        weight: 2,
                        dashArray: '5, 10'
                    }}
                />

                {/* Geofence Center Marker */}
                <Marker position={mapCenter}>
                    <Popup>
                        <div className="text-sm">
                            <strong>📍 Facility Center</strong><br />
                            Geofence Radius: {geofenceRadius}m
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

                <MapController center={mapCenter} />
            </MapContainer>
        </div>
    );
}

export default LocationMap;

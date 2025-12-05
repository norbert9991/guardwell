import React, { useState, useEffect } from 'react';
import { Activity, Thermometer, Wind, Droplets, Battery, Signal, User, Shield, Radio } from 'lucide-react';
import { CardDark, CardBody } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useSocket } from '../context/SocketContext';
import { devicesApi, sensorsApi } from '../utils/api';

export const LiveMonitoring = () => {
    const { sensorData, connected } = useSocket();
    const [filter, setFilter] = useState('all');
    const [devices, setDevices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch devices from API on mount
    useEffect(() => {
        const fetchDevices = async () => {
            try {
                const response = await devicesApi.getAll();
                setDevices(response.data);
            } catch (error) {
                console.error('Failed to fetch devices:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDevices();
    }, []);

    // Combine devices with real-time sensor data
    const workersWithSensorData = devices.map(device => {
        // Get real-time data for this device from Socket
        const realTimeData = sensorData[device.deviceId] || {};

        // Determine status based on sensor readings
        let status = 'normal';
        if (realTimeData.temperature >= 50 || realTimeData.gas_level >= 400) {
            status = 'critical';
        } else if (realTimeData.temperature >= 40 || realTimeData.gas_level >= 200) {
            status = 'warning';
        }

        return {
            id: device.id,
            name: device.worker?.fullName || 'Unassigned',
            department: device.worker?.department || 'N/A',
            device: device.deviceId,
            sensors: {
                temperature: realTimeData.temperature || 0,
                gas: realTimeData.gas_level || 0,
                humidity: realTimeData.humidity || 0,
                battery: realTimeData.battery || device.battery || 0,
                signal: realTimeData.rssi || 0,
                accel: {
                    x: realTimeData.accel_x || 0,
                    y: realTimeData.accel_y || 0,
                    z: realTimeData.accel_z || 0
                },
                gyro: {
                    x: realTimeData.gyro_x || 0,
                    y: realTimeData.gyro_y || 0,
                    z: realTimeData.gyro_z || 0
                },
                movement: realTimeData.accel_x !== undefined ? 'Active' : 'Unknown'
            },
            status: Object.keys(realTimeData).length > 0 ? status : 'offline',
            lastUpdate: realTimeData.createdAt || 'No data'
        };
    });

    // Filter if needed
    const filteredWorkers = workersWithSensorData.filter(worker => {
        if (filter === 'all') return true;
        return worker.department.toLowerCase() === filter;
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'normal': return 'border-success/50';
            case 'warning': return 'border-warning/50';
            case 'critical': return 'border-danger/50 emergency-alert';
            case 'offline': return 'border-gray-700 opacity-60';
            default: return 'border-gray-700';
        }
    };

    const getSensorStatus = (value, thresholds) => {
        if (value >= thresholds.critical) return 'text-danger';
        if (value >= thresholds.warning) return 'text-warning';
        return 'text-success';
    };

    // Calculate metrics
    const activeDevices = workersWithSensorData.filter(w => w.status !== 'offline').length;
    const avgTemp = workersWithSensorData.length > 0
        ? Math.round(workersWithSensorData.reduce((sum, w) => sum + (w.sensors.temperature || 0), 0) / workersWithSensorData.length)
        : 0;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-400">Loading devices...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Live Monitoring</h1>
                    <p className="text-gray-400">Real-time worker and sensor data monitoring</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-dark-lighter rounded-lg border border-gray-700">
                        <div className={`status-dot ${connected ? 'status-online' : 'status-offline'}`} />
                        <span className="text-sm text-gray-300">{connected ? 'Live' : 'Disconnected'}</span>
                    </div>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="input-dark"
                    >
                        <option value="all">All Departments</option>
                        <option value="manufacturing">Manufacturing</option>
                        <option value="assembly">Assembly</option>
                        <option value="maintenance">Maintenance</option>
                    </select>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Total Devices"
                    value={devices.length}
                    icon={Radio}
                    color="bg-[#3B82F6]"
                    subtitle="Registered devices"
                />
                <MetricCard
                    title="Active Now"
                    value={activeDevices}
                    icon={Activity}
                    color="bg-[#00BFA5]"
                    subtitle="Transmitting data"
                />
                <MetricCard
                    title="With Workers"
                    value={devices.filter(d => d.worker).length}
                    icon={User}
                    color="bg-[#10B981]"
                    subtitle="Assigned"
                />
                <MetricCard
                    title="Avg Temperature"
                    value={`${avgTemp}°C`}
                    icon={Thermometer}
                    color={avgTemp >= 40 ? "bg-[#EF4444]" : "bg-[#F59E0B]"}
                    subtitle={avgTemp >= 40 ? "Above normal" : "Safe range"}
                />
            </div>

            {/* Devices Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredWorkers.map((worker) => (
                    <CardDark
                        key={worker.id}
                        className={`${getStatusColor(worker.status)} transition-all duration-300`}
                    >
                        <CardBody className="p-6">
                            {/* Worker Info */}
                            <div className="flex items-start gap-4 mb-4 pb-4 border-b border-gray-700">
                                <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0">
                                    <User className="h-7 w-7 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-white truncate">{worker.name}</h3>
                                    <p className="text-sm text-gray-400">{worker.department}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="info" className="text-xs">{worker.device}</Badge>
                                        <Badge
                                            variant={worker.status === 'offline' ? 'secondary' : worker.status === 'critical' ? 'danger' : 'success'}
                                            className="text-xs"
                                        >
                                            {worker.status === 'offline' ? 'Offline' : worker.sensors.movement}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            {/* Sensor Readings */}
                            <div className="space-y-3">
                                {/* Temperature */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <Thermometer size={16} />
                                        <span className="text-sm">Temperature</span>
                                    </div>
                                    <span className={`font-semibold ${getSensorStatus(worker.sensors.temperature, { warning: 40, critical: 50 })}`}>
                                        {worker.sensors.temperature.toFixed(1)}°C
                                    </span>
                                </div>

                                {/* Gas Level */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <Wind size={16} />
                                        <span className="text-sm">Gas Level</span>
                                    </div>
                                    <span className={`font-semibold ${getSensorStatus(worker.sensors.gas, { warning: 200, critical: 400 })}`}>
                                        {worker.sensors.gas} PPM
                                    </span>
                                </div>

                                {/* Humidity */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <Droplets size={16} />
                                        <span className="text-sm">Humidity</span>
                                    </div>
                                    <span className="font-semibold text-gray-300">{worker.sensors.humidity.toFixed(1)}%</span>
                                </div>

                                {/* Battery */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <Battery size={16} />
                                        <span className="text-sm">Battery</span>
                                    </div>
                                    <span className={`font-semibold ${worker.sensors.battery < 20 ? 'text-danger' : worker.sensors.battery < 50 ? 'text-warning' : 'text-success'}`}>
                                        {worker.sensors.battery}%
                                    </span>
                                </div>

                                {/* Signal */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <Signal size={16} />
                                        <span className="text-sm">Signal</span>
                                    </div>
                                    <span className="font-semibold text-gray-300">{worker.sensors.signal} dBm</span>
                                </div>

                                {/* Motion Data */}
                                <div className="mt-3 pt-3 border-t border-gray-700/50">
                                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                                        <Activity size={16} />
                                        <span className="text-sm font-medium">Motion (X, Y, Z)</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="bg-black/20 p-2 rounded">
                                            <span className="text-gray-500 block">Accel (m/s²)</span>
                                            <span className="text-gray-300 font-mono">
                                                {worker.sensors.accel.x.toFixed(1)}, {worker.sensors.accel.y.toFixed(1)}, {worker.sensors.accel.z.toFixed(1)}
                                            </span>
                                        </div>
                                        <div className="bg-black/20 p-2 rounded">
                                            <span className="text-gray-500 block">Gyro (°/s)</span>
                                            <span className="text-gray-300 font-mono">
                                                {worker.sensors.gyro.x.toFixed(1)}, {worker.sensors.gyro.y.toFixed(1)}, {worker.sensors.gyro.z.toFixed(1)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-2 gap-2">
                                <Button size="sm" variant="outline" className="text-xs">
                                    View Details
                                </Button>
                                <Button size="sm" variant="primary" className="text-xs">
                                    Mark Safe
                                </Button>
                            </div>
                        </CardBody>
                    </CardDark>
                ))}
            </div>

            {filteredWorkers.length === 0 && (
                <CardDark>
                    <CardBody className="p-12 text-center">
                        <Activity className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-400 mb-2">No Devices Found</h3>
                        <p className="text-gray-500">Add devices in Device Management to see them here</p>
                    </CardBody>
                </CardDark>
            )}
        </div>
    );
};

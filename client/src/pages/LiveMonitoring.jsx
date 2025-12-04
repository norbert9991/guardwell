import React, { useState } from 'react';
import { Activity, Thermometer, Wind, Droplets, Battery, Signal, User, Shield, Radio } from 'lucide-react';
import { CardDark, CardBody } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useSocket } from '../context/SocketContext';

export const LiveMonitoring = () => {
    const { sensorData, connected } = useSocket();
    const [filter, setFilter] = useState('all');

    // Mock worker data for demonstration
    const workers = [
        {
            id: 1,
            name: 'Juan dela Cruz',
            photo: null,
            department: 'Manufacturing',
            device: 'DEV-001',
            timeWorking: '02:34:12',
            sensors: {
                temperature: 34.5,
                gas: 150,
                humidity: 65,
                battery: 85,
                signal: -45,
                movement: 'Active'
            },
            status: 'normal'
        },
        {
            id: 2,
            name: 'Maria Santos',
            photo: null,
            department: 'Assembly',
            device: 'DEV-002',
            timeWorking: '03:15:47',
            sensors: {
                temperature: 42.3,
                gas: 320,
                humidity: 72,
                battery: 62,
                signal: -52,
                movement: 'Active'
            },
            status: 'warning'
        },
        {
            id: 3,
            name: 'Pedro Reyes',
            photo: null,
            department: 'Maintenance',
            device: 'DEV-003',
            timeWorking: '01:22:05',
            sensors: {
                temperature: 36.2,
                gas: 85,
                humidity: 58,
                battery: 92,
                signal: -38,
                movement: 'Active'
            },
            status: 'normal'
        },
        {
            id: 4,
            name: 'Ana Lopez',
            photo: null,
            department: 'Quality Control',
            device: 'DEV-004',
            timeWorking: '04:01:33',
            sensors: {
                temperature: 52.1,
                gas: 550,
                humidity: 81,
                battery: 42,
                signal: -60,
                movement: 'Inactive'
            },
            status: 'critical'
        }
    ];

    const getStatusColor = (status) => {
        switch (status) {
            case 'normal': return 'border-success/50';
            case 'warning': return 'border-warning/50';
            case 'critical': return 'border-danger/50 emergency-alert';
            default: return 'border-gray-700';
        }
    };

    const getSensorStatus = (value, thresholds) => {
        if (value >= thresholds.critical) return 'text-danger';
        if (value >= thresholds.warning) return 'text-warning';
        return 'text-success';
    };

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
                    title="Active Workers"
                    value={workers.length}
                    icon={User}
                    color="bg-[#00BFA5]"
                    subtitle="Currently monitored"
                />
                <MetricCard
                    title="Workers Reading"
                    value={workers.filter(w => w.status !== 'offline').length}
                    icon={Activity}
                    color="bg-[#3B82F6]"
                    subtitle="Transmitting data"
                />
                <MetricCard
                    title="PPE Detected"
                    value={workers.length}
                    icon={Shield}
                    color="bg-[#10B981]"
                    subtitle="100% Compliance"
                />
                <MetricCard
                    title="Avg Temp Exposure"
                    value="29°C"
                    icon={Thermometer}
                    color="bg-[#F59E0B]"
                    subtitle="Safe range"
                />
            </div>

            {/* Workers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {workers.map((worker) => (
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
                                            variant={worker.sensors.movement === 'Active' ? 'success' : 'secondary'}
                                            className="text-xs"
                                        >
                                            {worker.sensors.movement}
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
                                        {worker.sensors.temperature}°C
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
                                    <span className="font-semibold text-gray-300">{worker.sensors.humidity}%</span>
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

                                {/* Time Working */}
                                <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <Activity size={16} />
                                        <span className="text-sm">Working</span>
                                    </div>
                                    <span className="font-semibold text-primary-500">{worker.timeWorking}</span>
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

            {workers.length === 0 && (
                <CardDark>
                    <CardBody className="p-12 text-center">
                        <Activity className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-400 mb-2">No Active Workers</h3>
                        <p className="text-gray-500">There are currently no workers being monitored</p>
                    </CardBody>
                </CardDark>
            )}
        </div>
    );
};

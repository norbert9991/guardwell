import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Users,
    Radio,
    AlertTriangle,
    Shield,
    Activity,
    Clock,
    TrendingUp,
    Battery
} from 'lucide-react';
import { CardDark, CardBody, CardHeader } from '../components/ui/Card';
import { Badge, StatusBadge, SeverityBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useSocket } from '../context/SocketContext';
import { MetricCard } from '../components/ui/MetricCard';
import { workersApi, devicesApi, alertsApi } from '../utils/api';

export const Dashboard = () => {
    const { alerts: realtimeAlerts, sensorData, connected } = useSocket();
    const [workers, setWorkers] = useState([]);
    const [devices, setDevices] = useState([]);
    const [dbAlerts, setDbAlerts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch data from API on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [workersRes, devicesRes, alertsRes] = await Promise.all([
                    workersApi.getAll(),
                    devicesApi.getAll(),
                    alertsApi.getAll()
                ]);
                setWorkers(workersRes.data);
                setDevices(devicesRes.data);
                setDbAlerts(alertsRes.data);
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    // Combine real-time alerts with database alerts
    const allAlerts = [...realtimeAlerts, ...dbAlerts.filter(a =>
        !realtimeAlerts.some(ra => ra.id === a.id)
    )].slice(0, 10);

    // Calculate metrics from real data
    const activeWorkers = workers.filter(w => w.status === 'Active').length;
    const activeDevices = Object.keys(sensorData).length || devices.filter(d => d.status === 'Active').length;
    const pendingAlerts = allAlerts.filter(a => a.status === 'Pending').length;

    // Calculate averages from real sensor data
    const sensorValues = Object.values(sensorData);
    const avgTemp = sensorValues.length > 0
        ? Math.round(sensorValues.reduce((sum, s) => sum + (s.temperature || 0), 0) / sensorValues.length)
        : 0;
    const maxGas = sensorValues.length > 0
        ? Math.max(...sensorValues.map(s => s.gas_level || 0))
        : 0;
    const avgBattery = sensorValues.length > 0
        ? Math.round(sensorValues.reduce((sum, s) => sum + (s.battery || 0), 0) / sensorValues.length)
        : 0;
    const criticalAlerts = allAlerts.filter(a => a.severity === 'Critical').length;

    // Format time ago
    const formatTimeAgo = (timestamp) => {
        if (!timestamp) return 'Unknown';
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} hr ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="space-y-8 animate-slide-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Dashboard</h1>
                    <p className="text-gray-400 text-lg">Real-time overview of worker safety and monitoring system</p>
                </div>
                <div className="text-right hidden md:block">
                    <div className="flex items-center gap-2 justify-end mb-1">
                        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-sm text-gray-400">{connected ? 'Live' : 'Disconnected'}</span>
                    </div>
                    <p className="text-sm text-gray-500 font-medium">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Active Workers"
                    value={activeWorkers || workers.length}
                    icon={Users}
                    color="bg-[#00BFA5]"
                    subtitle={`${workers.length} total registered`}
                />
                <MetricCard
                    title="Active Devices"
                    value={`${activeDevices}/${devices.length}`}
                    icon={Radio}
                    color="bg-[#3B82F6]"
                    subtitle="Transmitting data"
                />
                <MetricCard
                    title="Active Alerts"
                    value={pendingAlerts}
                    icon={AlertTriangle}
                    color={pendingAlerts > 0 ? "bg-[#EF4444]" : "bg-[#10B981]"}
                    subtitle={pendingAlerts > 0 ? "Require attention" : "All clear"}
                />
                <MetricCard
                    title="System Status"
                    value={connected ? "Online" : "Offline"}
                    icon={Shield}
                    color={connected ? "bg-[#10B981]" : "bg-[#EF4444]"}
                    subtitle={connected ? "All systems operational" : "Reconnecting..."}
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Alerts */}
                <div className="lg:col-span-2">
                    <CardDark className="h-full border-t-4 border-t-[#F59E0B]">
                        <CardHeader className="px-6 py-5 border-b border-white/10 bg-white/5">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-[#F59E0B]/20">
                                        <AlertTriangle className="h-5 w-5 text-[#F59E0B]" />
                                    </div>
                                    Recent Alerts
                                </h2>
                                <Link to="/alerts">
                                    <Button variant="outline" size="sm" className="hover:bg-[#F59E0B]/10 hover:text-[#F59E0B] hover:border-[#F59E0B]">View All</Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardBody className="p-0">
                            <div className="divide-y divide-white/10">
                                {allAlerts.length > 0 ? (
                                    allAlerts.slice(0, 5).map((alert, index) => (
                                        <div key={alert.id || index} className="p-5 hover:bg-white/5 transition-colors group">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <SeverityBadge severity={alert.severity} />
                                                        <span className="font-semibold text-white text-lg">{alert.type}</span>
                                                    </div>
                                                    <div className="flex items-center gap-6 text-sm text-gray-400">
                                                        <span className="flex items-center gap-2 group-hover:text-gray-300 transition-colors">
                                                            <Users size={16} className="text-[#00BFA5]" />
                                                            {alert.worker?.fullName || alert.worker || alert.device || 'Unknown'}
                                                        </span>
                                                        <span className="flex items-center gap-2 group-hover:text-gray-300 transition-colors">
                                                            <Clock size={16} className="text-[#3B82F6]" />
                                                            {formatTimeAgo(alert.createdAt || alert.timestamp)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <StatusBadge status={alert.status || 'Pending'} />
                                                    {alert.status === 'Pending' && (
                                                        <Button size="sm" variant="primary" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                            Acknowledge
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-12 text-center text-gray-500">
                                        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <AlertTriangle className="h-8 w-8 text-gray-600" />
                                        </div>
                                        <p className="text-lg font-medium">No recent alerts</p>
                                        <p className="text-sm">Everything is running smoothly</p>
                                    </div>
                                )}
                            </div>
                        </CardBody>
                    </CardDark>
                </div>

                {/* Quick Stats & Actions */}
                <div className="space-y-8">
                    {/* Emergency Panel */}
                    <CardDark className="bg-gradient-to-br from-[#EF4444]/20 to-[#EF4444]/5 border-[#EF4444]/50 overflow-hidden relative group">
                        <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#EF4444]/20 rounded-full blur-3xl group-hover:bg-[#EF4444]/30 transition-colors duration-500"></div>
                        <CardBody className="p-8 text-center relative z-10">
                            <div className="w-20 h-20 bg-[#EF4444]/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                                <AlertTriangle className="h-10 w-10 text-[#EF4444]" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Emergency Alert</h3>
                            <p className="text-sm text-gray-300 mb-6">
                                Trigger immediate emergency response for all active units
                            </p>
                            <Button
                                variant="danger"
                                size="lg"
                                className="w-full py-4 text-lg font-bold shadow-lg hover:shadow-[0_0_25px_rgba(239,68,68,0.5)] transition-all duration-300"
                            >
                                ACTIVATE EMERGENCY
                            </Button>
                        </CardBody>
                    </CardDark>

                    {/* Today's Performance - Now with real data */}
                    <CardDark className="border-t-4 border-t-[#3B82F6]">
                        <CardHeader className="px-6 py-4 border-b border-white/10 bg-white/5">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <Activity className="h-5 w-5 text-[#3B82F6]" />
                                Live Sensor Data
                            </h3>
                        </CardHeader>
                        <CardBody className="p-6">
                            <div className="space-y-5">
                                <div className="flex items-center justify-between group">
                                    <span className="text-sm text-gray-400 group-hover:text-white transition-colors">Avg Temperature</span>
                                    <span className={`text-lg font-bold ${avgTemp >= 40 ? 'text-danger' : 'text-white'}`}>{avgTemp}°C</span>
                                </div>
                                <div className="flex items-center justify-between group">
                                    <span className="text-sm text-gray-400 group-hover:text-white transition-colors">Highest Gas Reading</span>
                                    <span className={`text-lg font-bold ${maxGas >= 200 ? 'text-warning' : 'text-white'}`}>{maxGas} PPM</span>
                                </div>
                                <div className="flex items-center justify-between group">
                                    <span className="text-sm text-gray-400 group-hover:text-white transition-colors">Critical Alerts</span>
                                    <span className={`text-lg font-bold ${criticalAlerts > 0 ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>{criticalAlerts}</span>
                                </div>
                                <div className="flex items-center justify-between group">
                                    <span className="text-sm text-gray-400 flex items-center gap-2 group-hover:text-white transition-colors">
                                        <Battery size={16} className="text-[#10B981]" />
                                        Avg Battery Level
                                    </span>
                                    <span className={`text-lg font-bold ${avgBattery < 20 ? 'text-danger' : 'text-[#10B981]'}`}>{avgBattery || '--'}%</span>
                                </div>
                            </div>
                        </CardBody>
                    </CardDark>

                    {/* Quick Actions */}
                    <CardDark className="border-t-4 border-t-[#00BFA5]">
                        <CardBody className="p-6">
                            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-[#00BFA5]" />
                                Quick Actions
                            </h3>
                            <div className="space-y-3">
                                <Link to="/live-monitoring">
                                    <Button variant="outline" className="w-full justify-start py-3 hover:bg-[#00BFA5]/10 border-white/10 hover:border-[#00BFA5]" size="sm">
                                        <Activity size={18} className="mr-3 text-[#00BFA5]" />
                                        Live Monitoring
                                    </Button>
                                </Link>
                                <Link to="/workers">
                                    <Button variant="outline" className="w-full justify-start py-3 hover:bg-[#3B82F6]/10 border-white/10 hover:border-[#3B82F6] hover:text-[#3B82F6]" size="sm">
                                        <Users size={18} className="mr-3 text-[#3B82F6]" />
                                        Manage Workers
                                    </Button>
                                </Link>
                                <Link to="/reports">
                                    <Button variant="outline" className="w-full justify-start py-3 hover:bg-[#F59E0B]/10 border-white/10 hover:border-[#F59E0B] hover:text-[#F59E0B]" size="sm">
                                        <TrendingUp size={18} className="mr-3 text-[#F59E0B]" />
                                        View Reports
                                    </Button>
                                </Link>
                            </div>
                        </CardBody>
                    </CardDark>
                </div>
            </div>
        </div>
    );
};

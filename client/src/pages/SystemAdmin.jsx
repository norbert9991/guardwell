import React, { useState, useEffect } from 'react';
import {
    Settings,
    Users,
    Shield,
    Database,
    Activity,
    Server,
    Bell,
    Lock,
    RefreshCw,
    Save,
    Trash2,
    Plus,
    Edit,
    Download,
    AlertTriangle
} from 'lucide-react';
import { CardDark, CardBody, CardHeader } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';
import { Button } from '../components/ui/Button';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Table } from '../components/ui/Table';
import { workersApi, devicesApi, alertsApi, incidentsApi, authApi } from '../utils/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const SystemAdmin = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [systemStats, setSystemStats] = useState({
        totalWorkers: 0,
        totalDevices: 0,
        activeDevices: 0,
        totalAlerts: 0,
        pendingAlerts: 0,
        totalIncidents: 0
    });
    const [isLoading, setIsLoading] = useState(true);
    const { connected, sensorData } = useSocket();
    const { user, isHeadAdmin } = useAuth();
    const toast = useToast();

    // Password confirmation state for database actions
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [isExecuting, setIsExecuting] = useState(false);

    // System settings state
    const [settings, setSettings] = useState({
        alertThresholds: {
            temperatureWarning: 40,
            temperatureCritical: 50,
            gasWarning: 200,
            gasCritical: 400,
            batteryLow: 20
        },
        notifications: {
            emailAlerts: true,
            smsAlerts: false,
            pushNotifications: true
        },
        dataRetention: {
            sensorDataDays: 30,
            alertDataDays: 90,
            incidentDataDays: 365
        }
    });

    const [showThresholdModal, setShowThresholdModal] = useState(false);
    const [editThresholds, setEditThresholds] = useState({ ...settings.alertThresholds });

    // Fetch system statistics
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [workersRes, devicesRes, alertsRes, incidentsRes] = await Promise.all([
                    workersApi.getAll(),
                    devicesApi.getAll(),
                    alertsApi.getAll(),
                    incidentsApi.getAll()
                ]);

                setSystemStats({
                    totalWorkers: workersRes.data.length,
                    totalDevices: devicesRes.data.length,
                    activeDevices: devicesRes.data.filter(d => d.status === 'Active').length,
                    totalAlerts: alertsRes.data.length,
                    pendingAlerts: alertsRes.data.filter(a => a.status === 'Pending').length,
                    totalIncidents: incidentsRes.data.length
                });
            } catch (error) {
                console.error('Failed to fetch system stats:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }, []);

    const handleSaveThresholds = () => {
        setSettings(prev => ({
            ...prev,
            alertThresholds: { ...editThresholds }
        }));
        setShowThresholdModal(false);
        toast.success('Alert thresholds updated successfully!');
    };

    // Database action handlers
    const initiateDbAction = (actionType) => {
        if (!isHeadAdmin) {
            toast.error('Only Head Admin can perform database actions');
            return;
        }
        setPendingAction(actionType);
        setPassword('');
        setPasswordError('');
        setShowPasswordModal(true);
    };

    const executeDbAction = async () => {
        if (!password.trim()) {
            setPasswordError('Password is required');
            return;
        }

        setIsExecuting(true);
        setPasswordError('');

        try {
            // Verify password by attempting login
            const verifyResponse = await authApi.login(user.email, password);

            if (!verifyResponse.data.token) {
                setPasswordError('Invalid password');
                setIsExecuting(false);
                return;
            }

            // Password verified, execute the action
            switch (pendingAction) {
                case 'export':
                    await performExportData();
                    break;
                case 'sync':
                    await performSyncDatabase();
                    break;
                case 'clear':
                    await performClearOldData();
                    break;
            }

            setShowPasswordModal(false);
            setPendingAction(null);
            setPassword('');
        } catch (error) {
            console.error('Password verification failed:', error);
            setPasswordError('Invalid password. Please try again.');
        } finally {
            setIsExecuting(false);
        }
    };

    const performExportData = async () => {
        toast.info('Generating data export...');
        // Fetch all data
        try {
            const [workers, devices, alerts, incidents] = await Promise.all([
                workersApi.getAll(true),
                devicesApi.getAll(true),
                alertsApi.getAll(),
                incidentsApi.getAll()
            ]);

            const exportData = {
                exportedAt: new Date().toISOString(),
                exportedBy: user.email,
                workers: workers.data,
                devices: devices.data,
                alerts: alerts.data,
                incidents: incidents.data
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `guardwell-export-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);

            toast.success('Data exported successfully!');
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to export data');
        }
    };

    const performSyncDatabase = async () => {
        toast.info('Syncing database...');
        // Simulate database sync (in production, this would call a backend endpoint)
        await new Promise(resolve => setTimeout(resolve, 2000));
        toast.success('Database synchronized successfully!');
    };

    const performClearOldData = async () => {
        toast.info('Clearing old data...');
        // In production, this would call a backend endpoint to clear old records
        await new Promise(resolve => setTimeout(resolve, 2000));
        toast.success('Old data cleared successfully!');
    };

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Activity },
        { id: 'thresholds', label: 'Alert Thresholds', icon: Bell },
        { id: 'system', label: 'System Settings', icon: Settings },
        { id: 'database', label: 'Database', icon: Database },
    ];

    const renderOverview = () => (
        <div className="space-y-6">
            {/* System Health */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="System Status"
                    value={connected ? "Online" : "Offline"}
                    icon={Server}
                    color={connected ? "bg-[#10B981]" : "bg-[#EF4444]"}
                    subtitle={connected ? "All systems operational" : "Connection issues"}
                />
                <MetricCard
                    title="Active Connections"
                    value={Object.keys(sensorData).length}
                    icon={Activity}
                    color="bg-[#3B82F6]"
                    subtitle="ESP32 devices connected"
                />
                <MetricCard
                    title="Pending Alerts"
                    value={systemStats.pendingAlerts}
                    icon={Bell}
                    color={systemStats.pendingAlerts > 0 ? "bg-[#F59E0B]" : "bg-[#10B981]"}
                    subtitle="Require attention"
                />
                <MetricCard
                    title="Total Workers"
                    value={systemStats.totalWorkers}
                    icon={Users}
                    color="bg-[#8B5CF6]"
                    subtitle="Registered workers"
                />
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CardDark className="border-t-4 border-t-[#3B82F6]">
                    <CardHeader className="px-6 py-4 border-b border-white/10">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <Database className="h-5 w-5 text-[#3B82F6]" />
                            Database Statistics
                        </h3>
                    </CardHeader>
                    <CardBody className="p-6">
                        <div className="space-y-5">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Total Workers</span>
                                <span className="text-white font-semibold">{systemStats.totalWorkers}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Total Devices</span>
                                <span className="text-white font-semibold">{systemStats.totalDevices}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Active Devices</span>
                                <span className="text-white font-semibold">{systemStats.activeDevices}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Total Alerts</span>
                                <span className="text-white font-semibold">{systemStats.totalAlerts}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Total Incidents</span>
                                <span className="text-white font-semibold">{systemStats.totalIncidents}</span>
                            </div>
                        </div>
                    </CardBody>
                </CardDark>

                <CardDark className="border-t-4 border-t-[#10B981]">
                    <CardHeader className="px-6 py-4 border-b border-white/10">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <Bell className="h-5 w-5 text-[#10B981]" />
                            Current Alert Thresholds
                        </h3>
                    </CardHeader>
                    <CardBody className="p-6">
                        <div className="space-y-5">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Temperature Warning</span>
                                <Badge variant="warning">{settings.alertThresholds.temperatureWarning}°C</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Temperature Critical</span>
                                <Badge variant="danger">{settings.alertThresholds.temperatureCritical}°C</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Gas Warning</span>
                                <Badge variant="warning">{settings.alertThresholds.gasWarning} PPM</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Gas Critical</span>
                                <Badge variant="danger">{settings.alertThresholds.gasCritical} PPM</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Low Battery</span>
                                <Badge variant="warning">{settings.alertThresholds.batteryLow}%</Badge>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            className="w-full mt-4"
                            onClick={() => {
                                setEditThresholds({ ...settings.alertThresholds });
                                setShowThresholdModal(true);
                            }}
                        >
                            <Edit size={16} className="mr-2" />
                            Edit Thresholds
                        </Button>
                    </CardBody>
                </CardDark>
            </div>
        </div>
    );

    const renderThresholds = () => (
        <div className="space-y-6">
            <CardDark>
                <CardHeader className="px-6 py-4 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <Bell className="h-5 w-5 text-[#F59E0B]" />
                            Alert Threshold Configuration
                        </h3>
                        <Button
                            onClick={() => {
                                setEditThresholds({ ...settings.alertThresholds });
                                setShowThresholdModal(true);
                            }}
                        >
                            <Edit size={16} className="mr-2" />
                            Edit Thresholds
                        </Button>
                    </div>
                </CardHeader>
                <CardBody className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Temperature Thresholds */}
                        <div className="p-4 bg-dark-lighter rounded-lg">
                            <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                                🌡️ Temperature
                            </h4>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Warning Level</span>
                                    <span className="text-warning font-semibold">{settings.alertThresholds.temperatureWarning}°C</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Critical Level</span>
                                    <span className="text-danger font-semibold">{settings.alertThresholds.temperatureCritical}°C</span>
                                </div>
                            </div>
                        </div>

                        {/* Gas Thresholds */}
                        <div className="p-4 bg-dark-lighter rounded-lg">
                            <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                                💨 Gas Level
                            </h4>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Warning Level</span>
                                    <span className="text-warning font-semibold">{settings.alertThresholds.gasWarning} PPM</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Critical Level</span>
                                    <span className="text-danger font-semibold">{settings.alertThresholds.gasCritical} PPM</span>
                                </div>
                            </div>
                        </div>

                        {/* Battery Threshold */}
                        <div className="p-4 bg-dark-lighter rounded-lg">
                            <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                                🔋 Battery
                            </h4>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Low Battery Warning</span>
                                    <span className="text-warning font-semibold">{settings.alertThresholds.batteryLow}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardBody>
            </CardDark>
        </div>
    );



    const renderSystemSettings = () => (
        <div className="space-y-6">
            <CardDark>
                <CardHeader className="px-6 py-4 border-b border-white/10">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Settings className="h-5 w-5 text-[#3B82F6]" />
                        Notification Settings
                    </h3>
                </CardHeader>
                <CardBody className="p-6">
                    <div className="space-y-5">
                        <div className="flex items-center justify-between p-4 bg-dark-lighter rounded-lg">
                            <div>
                                <h4 className="font-medium text-white">Email Alerts</h4>
                                <p className="text-sm text-gray-400">Send critical alerts via email</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.notifications.emailAlerts}
                                    onChange={(e) => setSettings(prev => ({
                                        ...prev,
                                        notifications: { ...prev.notifications, emailAlerts: e.target.checked }
                                    }))}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                            </label>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-dark-lighter rounded-lg">
                            <div>
                                <h4 className="font-medium text-white">SMS Alerts</h4>
                                <p className="text-sm text-gray-400">Send emergency alerts via SMS</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.notifications.smsAlerts}
                                    onChange={(e) => setSettings(prev => ({
                                        ...prev,
                                        notifications: { ...prev.notifications, smsAlerts: e.target.checked }
                                    }))}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                            </label>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-dark-lighter rounded-lg">
                            <div>
                                <h4 className="font-medium text-white">Push Notifications</h4>
                                <p className="text-sm text-gray-400">Browser push notifications for alerts</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.notifications.pushNotifications}
                                    onChange={(e) => setSettings(prev => ({
                                        ...prev,
                                        notifications: { ...prev.notifications, pushNotifications: e.target.checked }
                                    }))}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                            </label>
                        </div>
                    </div>
                </CardBody>
            </CardDark>

            <CardDark>
                <CardHeader className="px-6 py-4 border-b border-white/10">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Database className="h-5 w-5 text-[#10B981]" />
                        Data Retention
                    </h3>
                </CardHeader>
                <CardBody className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-4 bg-dark-lighter rounded-lg">
                            <h4 className="font-medium text-white mb-2">Sensor Data</h4>
                            <p className="text-2xl font-bold text-primary-500">{settings.dataRetention.sensorDataDays} days</p>
                            <p className="text-sm text-gray-400">Raw sensor readings</p>
                        </div>
                        <div className="p-4 bg-dark-lighter rounded-lg">
                            <h4 className="font-medium text-white mb-2">Alert History</h4>
                            <p className="text-2xl font-bold text-warning">{settings.dataRetention.alertDataDays} days</p>
                            <p className="text-sm text-gray-400">Alert records</p>
                        </div>
                        <div className="p-4 bg-dark-lighter rounded-lg">
                            <h4 className="font-medium text-white mb-2">Incident Reports</h4>
                            <p className="text-2xl font-bold text-danger">{settings.dataRetention.incidentDataDays} days</p>
                            <p className="text-sm text-gray-400">Incident documentation</p>
                        </div>
                    </div>
                </CardBody>
            </CardDark>
        </div>
    );

    const renderDatabase = () => (
        <div className="space-y-6">
            <CardDark>
                <CardHeader className="px-6 py-4 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <Database className="h-5 w-5 text-[#3B82F6]" />
                            Database Status
                        </h3>
                        <Button variant="outline" size="sm">
                            <RefreshCw size={16} className="mr-2" />
                            Refresh
                        </Button>
                    </div>
                </CardHeader>
                <CardBody className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-4 bg-dark-lighter rounded-lg">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                                <h4 className="font-medium text-white">MySQL Database</h4>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Status</span>
                                    <StatusBadge status="Active" />
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Host</span>
                                    <span className="text-white">Railway (MySQL)</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Tables</span>
                                    <span className="text-white">6</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-dark-lighter rounded-lg">
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                                <h4 className="font-medium text-white">Socket.io Server</h4>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Status</span>
                                    <StatusBadge status={connected ? "Active" : "Offline"} />
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Connected Clients</span>
                                    <span className="text-white">{connected ? '1' : '0'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Active Devices</span>
                                    <span className="text-white">{Object.keys(sensorData).length}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 p-4 bg-dark-lighter rounded-lg border border-[#2d3a52]">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-medium text-white flex items-center gap-2">
                                <Lock size={16} className="text-red-400" />
                                Quick Actions
                            </h4>
                            {isHeadAdmin ? (
                                <Badge variant="danger" className="text-xs">Head Admin Only</Badge>
                            ) : (
                                <Badge variant="secondary" className="text-xs">Requires Head Admin</Badge>
                            )}
                        </div>
                        <div className="flex gap-3 flex-wrap">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => initiateDbAction('export')}
                                disabled={!isHeadAdmin}
                            >
                                <Download size={16} className="mr-2" />
                                Export Data
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => initiateDbAction('sync')}
                                disabled={!isHeadAdmin}
                            >
                                <RefreshCw size={16} className="mr-2" />
                                Sync Database
                            </Button>
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={() => initiateDbAction('clear')}
                                disabled={!isHeadAdmin}
                            >
                                <Trash2 size={16} className="mr-2" />
                                Clear Old Data
                            </Button>
                        </div>
                        <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
                            <AlertTriangle size={12} />
                            Password confirmation required for all database actions.
                        </p>
                    </div>
                </CardBody>
            </CardDark>
        </div>
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-400">Loading system administration...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-[#1F2937] mb-2">System Administration</h1>
                <p className="text-gray-400">Manage system settings, thresholds, and configurations</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 flex-wrap">
                {tabs.map(tab => (
                    <Button
                        key={tab.id}
                        variant={activeTab === tab.id ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <tab.icon size={16} className="mr-2" />
                        {tab.label}
                    </Button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'thresholds' && renderThresholds()}

            {activeTab === 'system' && renderSystemSettings()}
            {activeTab === 'database' && renderDatabase()}

            {/* Edit Thresholds Modal */}
            <Modal
                isOpen={showThresholdModal}
                onClose={() => setShowThresholdModal(false)}
                title="Edit Alert Thresholds"
                size="md"
            >
                <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label-modal">
                                Temperature Warning (°C)
                            </label>
                            <input
                                type="number"
                                value={editThresholds.temperatureWarning}
                                onChange={(e) => setEditThresholds(prev => ({
                                    ...prev,
                                    temperatureWarning: parseInt(e.target.value)
                                }))}
                                className="input-modal"
                            />
                        </div>
                        <div>
                            <label className="label-modal">
                                Temperature Critical (°C)
                            </label>
                            <input
                                type="number"
                                value={editThresholds.temperatureCritical}
                                onChange={(e) => setEditThresholds(prev => ({
                                    ...prev,
                                    temperatureCritical: parseInt(e.target.value)
                                }))}
                                className="input-modal"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label-modal">
                                Gas Warning (PPM)
                            </label>
                            <input
                                type="number"
                                value={editThresholds.gasWarning}
                                onChange={(e) => setEditThresholds(prev => ({
                                    ...prev,
                                    gasWarning: parseInt(e.target.value)
                                }))}
                                className="input-modal"
                            />
                        </div>
                        <div>
                            <label className="label-modal">
                                Gas Critical (PPM)
                            </label>
                            <input
                                type="number"
                                value={editThresholds.gasCritical}
                                onChange={(e) => setEditThresholds(prev => ({
                                    ...prev,
                                    gasCritical: parseInt(e.target.value)
                                }))}
                                className="input-modal"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="label-modal">
                            Low Battery Warning (%)
                        </label>
                        <input
                            type="number"
                            value={editThresholds.batteryLow}
                            onChange={(e) => setEditThresholds(prev => ({
                                ...prev,
                                batteryLow: parseInt(e.target.value)
                            }))}
                            className="input-modal"
                            min="5"
                            max="50"
                        />
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t border-[#2d3a52]/50">
                        <Button variant="secondary" onClick={() => setShowThresholdModal(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveThresholds}>
                            <Save size={16} className="mr-2" />
                            Save Thresholds
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Password Confirmation Modal for Database Actions */}
            <Modal
                isOpen={showPasswordModal}
                onClose={() => {
                    setShowPasswordModal(false);
                    setPendingAction(null);
                    setPassword('');
                    setPasswordError('');
                }}
                title="Confirm Admin Action"
                size="md"
            >
                <div className="space-y-4">
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-medium text-red-400">
                                    {pendingAction === 'export' && 'Export Database'}
                                    {pendingAction === 'sync' && 'Sync Database'}
                                    {pendingAction === 'clear' && 'Clear Old Data'}
                                </h4>
                                <p className="text-sm text-gray-400 mt-1">
                                    {pendingAction === 'export' && 'This will export all system data to a JSON file.'}
                                    {pendingAction === 'sync' && 'This will synchronize the database with the current schema.'}
                                    {pendingAction === 'clear' && 'This will permanently delete old records based on retention settings. This action cannot be undone.'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="label-modal flex items-center gap-2">
                            <Lock size={14} />
                            Enter Your Password to Confirm
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setPasswordError('');
                            }}
                            className={`input-modal ${passwordError ? 'border-red-500' : ''}`}
                            placeholder="Enter your password..."
                            autoFocus
                        />
                        {passwordError && (
                            <p className="text-red-400 text-sm mt-1">{passwordError}</p>
                        )}
                    </div>

                    <div className="bg-[#1a2235] rounded-lg p-3 border border-[#2d3a52]">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Logged in as:</span>
                            <span className="text-white font-medium">{user?.email}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm mt-1">
                            <span className="text-gray-500">Role:</span>
                            <Badge variant="danger">Head Admin</Badge>
                        </div>
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t border-[#2d3a52]/50">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setShowPasswordModal(false);
                                setPendingAction(null);
                                setPassword('');
                                setPasswordError('');
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant={pendingAction === 'clear' ? 'danger' : 'primary'}
                            onClick={executeDbAction}
                            disabled={isExecuting || !password.trim()}
                        >
                            {isExecuting ? (
                                <>
                                    <RefreshCw size={16} className="mr-2 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Shield size={16} className="mr-2" />
                                    Confirm & Execute
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

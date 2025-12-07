import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, User, CheckCircle, Bell, XCircle, Filter, Calendar, Search, X } from 'lucide-react';
import { CardDark, CardBody, CardHeader } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';
import { Button } from '../components/ui/Button';
import { SeverityBadge, StatusBadge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { alertsApi } from '../utils/api';
import { useSocket } from '../context/SocketContext';

export const AlertManagement = () => {
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [filter, setFilter] = useState('all');
    const [alerts, setAlerts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { alerts: realtimeAlerts, acknowledgeAlert } = useSocket();

    // Advanced filters
    const [showFilters, setShowFilters] = useState(false);
    const [severityFilter, setSeverityFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month, custom
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Fetch alerts from API
    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const response = await alertsApi.getAll();
                setAlerts(response.data);
            } catch (error) {
                console.error('Failed to fetch alerts:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAlerts();
    }, []);

    // Merge real-time alerts with database alerts
    useEffect(() => {
        if (realtimeAlerts.length > 0) {
            setAlerts(prev => {
                const newAlerts = realtimeAlerts.filter(ra =>
                    !prev.some(a => a.id === ra.id)
                );
                return [...newAlerts, ...prev];
            });
        }
    }, [realtimeAlerts]);

    const handleAcknowledge = async (alertId) => {
        setIsSubmitting(true);
        try {
            const response = await alertsApi.acknowledge(alertId);
            setAlerts(prev => prev.map(a =>
                a.id === alertId ? response.data : a
            ));
            // Also notify via socket
            acknowledgeAlert(alertId);
        } catch (error) {
            console.error('Failed to acknowledge alert:', error);
            alert('Failed to acknowledge alert. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResolve = async (alertId, notes = '') => {
        setIsSubmitting(true);
        try {
            const response = await alertsApi.resolve(alertId, notes);
            setAlerts(prev => prev.map(a =>
                a.id === alertId ? response.data : a
            ));
            setSelectedAlert(null);
        } catch (error) {
            console.error('Failed to resolve alert:', error);
            alert('Failed to resolve alert. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Format timestamp
    const formatTime = (timestamp) => {
        if (!timestamp) return 'Unknown';
        const date = new Date(timestamp);
        return date.toLocaleString();
    };

    // Get unique alert types from data
    const alertTypes = [...new Set(alerts.map(a => a.type).filter(Boolean))];

    // Check if date is within range
    const isInDateRange = (alertDate) => {
        if (!alertDate) return true;
        const date = new Date(alertDate);
        const now = new Date();

        switch (dateFilter) {
            case 'today':
                return date.toDateString() === now.toDateString();
            case 'week':
                const weekAgo = new Date(now);
                weekAgo.setDate(weekAgo.getDate() - 7);
                return date >= weekAgo;
            case 'month':
                const monthAgo = new Date(now);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                return date >= monthAgo;
            case 'year':
                const yearAgo = new Date(now);
                yearAgo.setFullYear(yearAgo.getFullYear() - 1);
                return date >= yearAgo;
            case 'custom':
                if (startDate && endDate) {
                    return date >= new Date(startDate) && date <= new Date(endDate + 'T23:59:59');
                }
                return true;
            default:
                return true;
        }
    };

    // Clear all filters
    const clearFilters = () => {
        setFilter('all');
        setSeverityFilter('all');
        setTypeFilter('all');
        setDateFilter('all');
        setStartDate('');
        setEndDate('');
        setSearchTerm('');
    };

    // Check if any filters are active
    const hasActiveFilters = filter !== 'all' || severityFilter !== 'all' || typeFilter !== 'all' || dateFilter !== 'all' || searchTerm;

    // Filter alerts with all criteria
    const filteredAlerts = alerts.filter(alert => {
        // Status filter
        if (filter !== 'all' && alert.status?.toLowerCase() !== filter) return false;

        // Severity filter
        if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;

        // Type filter
        if (typeFilter !== 'all' && alert.type !== typeFilter) return false;

        // Date filter
        if (!isInDateRange(alert.createdAt)) return false;

        // Search filter
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            const matchesSearch =
                alert.message?.toLowerCase().includes(search) ||
                alert.type?.toLowerCase().includes(search) ||
                alert.device?.deviceId?.toLowerCase().includes(search) ||
                alert.worker?.fullName?.toLowerCase().includes(search);
            if (!matchesSearch) return false;
        }

        return true;
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-400">Loading alerts...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Alert Management</h1>
                    <p className="text-gray-400">Monitor and manage safety alerts</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Button
                        variant={showFilters ? 'primary' : 'outline'}
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-2"
                    >
                        <Filter size={16} />
                        Filters
                        {hasActiveFilters && (
                            <span className="bg-[#00E5FF] text-black text-xs rounded-full w-5 h-5 flex items-center justify-center ml-1">
                                !
                            </span>
                        )}
                    </Button>
                    {hasActiveFilters && (
                        <Button variant="secondary" onClick={clearFilters} className="flex items-center gap-2">
                            <X size={16} />
                            Clear
                        </Button>
                    )}
                </div>
            </div>

            {/* Advanced Filters Panel */}
            {showFilters && (
                <CardDark className="border-[#00E5FF]/30">
                    <CardBody className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Search */}
                            <div className="lg:col-span-2">
                                <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search alerts..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="input-dark pl-10"
                                    />
                                </div>
                            </div>

                            {/* Status Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                                <select
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                    className="input-dark"
                                >
                                    <option value="all">All Status</option>
                                    <option value="pending">Pending</option>
                                    <option value="acknowledged">Acknowledged</option>
                                    <option value="resolved">Resolved</option>
                                </select>
                            </div>

                            {/* Severity Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Severity</label>
                                <select
                                    value={severityFilter}
                                    onChange={(e) => setSeverityFilter(e.target.value)}
                                    className="input-dark"
                                >
                                    <option value="all">All Severity</option>
                                    <option value="Critical">Critical</option>
                                    <option value="High">High</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Low">Low</option>
                                </select>
                            </div>

                            {/* Alert Type Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Alert Type</label>
                                <select
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                    className="input-dark"
                                >
                                    <option value="all">All Types</option>
                                    {alertTypes.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Date Range Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Date Range</label>
                                <select
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                    className="input-dark"
                                >
                                    <option value="all">All Time</option>
                                    <option value="today">Today</option>
                                    <option value="week">Last 7 Days</option>
                                    <option value="month">Last 30 Days</option>
                                    <option value="year">Last Year</option>
                                    <option value="custom">Custom Range</option>
                                </select>
                            </div>

                            {/* Custom Date Range */}
                            {dateFilter === 'custom' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">From Date</label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="input-dark"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">To Date</label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="input-dark"
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Filter Summary */}
                        <div className="mt-4 pt-4 border-t border-gray-700 flex items-center justify-between">
                            <p className="text-sm text-gray-400">
                                Showing <span className="text-white font-semibold">{filteredAlerts.length}</span> of <span className="text-white font-semibold">{alerts.length}</span> alerts
                            </p>
                        </div>
                    </CardBody>
                </CardDark>
            )}

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                    title="Critical Alerts"
                    value={alerts.filter(a => a.severity === 'Critical' && a.status !== 'Resolved').length}
                    icon={AlertTriangle}
                    color="bg-[#EF4444]"
                    subtitle="Immediate action required"
                />
                <MetricCard
                    title="Active Alerts"
                    value={alerts.filter(a => a.status !== 'Resolved').length}
                    icon={Bell}
                    color="bg-[#F59E0B]"
                    subtitle="Pending or acknowledged"
                />
                <MetricCard
                    title="Resolved Today"
                    value={alerts.filter(a => a.status === 'Resolved').length}
                    icon={CheckCircle}
                    color="bg-[#10B981]"
                    subtitle="Successfully handled"
                />
            </div>

            {filteredAlerts.length === 0 ? (
                <CardDark>
                    <CardBody className="p-12 text-center">
                        <AlertTriangle className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-400 mb-2">No Alerts</h3>
                        <p className="text-gray-500">
                            {filter === 'all' ? 'No alerts have been recorded yet.' : `No ${filter} alerts found.`}
                        </p>
                    </CardBody>
                </CardDark>
            ) : (
                <div className="grid gap-4">
                    {filteredAlerts.map(alert => (
                        <CardDark key={alert.id} className={`${alert.severity === 'Critical' ? 'border-danger/50' : alert.severity === 'High' ? 'border-warning/50' : 'border-gray-700'}`}>
                            <CardBody className="p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-3">
                                            <SeverityBadge severity={alert.severity} />
                                            <h3 className="text-xl font-semibold text-white">{alert.type}</h3>
                                            <StatusBadge status={alert.status} />
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div>
                                                <p className="text-gray-400 flex items-center gap-1 mb-1">
                                                    <User size={14} /> Worker
                                                </p>
                                                <p className="text-white font-medium">{alert.worker?.fullName || alert.deviceId || 'Unknown'}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-400 mb-1">Device</p>
                                                <p className="text-white font-medium">{alert.deviceId || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-400 mb-1">Trigger Value</p>
                                                <p className="text-danger font-medium">{alert.triggerValue || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-400 flex items-center gap-1 mb-1">
                                                    <Clock size={14} /> Time
                                                </p>
                                                <p className="text-white font-medium">{formatTime(alert.createdAt)}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 ml-4">
                                        <Button size="sm" variant="outline" onClick={() => setSelectedAlert(alert)}>View Details</Button>
                                        {alert.status === 'Pending' && (
                                            <Button
                                                size="sm"
                                                variant="primary"
                                                icon={<CheckCircle size={16} />}
                                                onClick={() => handleAcknowledge(alert.id)}
                                                disabled={isSubmitting}
                                            >
                                                Acknowledge
                                            </Button>
                                        )}
                                        {alert.status === 'Acknowledged' && (
                                            <Button
                                                size="sm"
                                                variant="success"
                                                icon={<CheckCircle size={16} />}
                                                onClick={() => handleResolve(alert.id)}
                                                disabled={isSubmitting}
                                            >
                                                Resolve
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardBody>
                        </CardDark>
                    ))}
                </div>
            )}

            {/* Alert Detail Modal */}
            <Modal
                isOpen={!!selectedAlert}
                onClose={() => setSelectedAlert(null)}
                title="Alert Details"
                size="lg"
            >
                {selectedAlert && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 mb-4">
                            <SeverityBadge severity={selectedAlert.severity} />
                            <h3 className="text-xl font-semibold">{selectedAlert.type}</h3>
                            <StatusBadge status={selectedAlert.status} />
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-gray-600">Worker:</p>
                                <p className="font-medium">{selectedAlert.worker?.fullName || 'Unknown'}</p>
                            </div>
                            <div>
                                <p className="text-gray-600">Device:</p>
                                <p className="font-medium">{selectedAlert.deviceId}</p>
                            </div>
                            <div>
                                <p className="text-gray-600">Trigger Value:</p>
                                <p className="font-medium text-danger">{selectedAlert.triggerValue}</p>
                            </div>
                            <div>
                                <p className="text-gray-600">Threshold:</p>
                                <p className="font-medium">{selectedAlert.threshold}</p>
                            </div>
                            <div>
                                <p className="text-gray-600">Created:</p>
                                <p className="font-medium">{formatTime(selectedAlert.createdAt)}</p>
                            </div>
                            {selectedAlert.acknowledgedAt && (
                                <div>
                                    <p className="text-gray-600">Acknowledged:</p>
                                    <p className="font-medium">{formatTime(selectedAlert.acknowledgedAt)}</p>
                                </div>
                            )}
                            {selectedAlert.resolvedAt && (
                                <div>
                                    <p className="text-gray-600">Resolved:</p>
                                    <p className="font-medium">{formatTime(selectedAlert.resolvedAt)}</p>
                                </div>
                            )}
                        </div>

                        {selectedAlert.notes && (
                            <div className="border-t pt-4">
                                <h4 className="font-semibold mb-2">Notes</h4>
                                <p className="text-gray-600">{selectedAlert.notes}</p>
                            </div>
                        )}

                        <div className="border-t pt-4">
                            <h4 className="font-semibold mb-3">Actions</h4>
                            <div className="flex gap-2">
                                {selectedAlert.status === 'Pending' && (
                                    <Button
                                        variant="primary"
                                        onClick={() => handleAcknowledge(selectedAlert.id)}
                                        disabled={isSubmitting}
                                    >
                                        Acknowledge
                                    </Button>
                                )}
                                {selectedAlert.status === 'Acknowledged' && (
                                    <Button
                                        variant="success"
                                        onClick={() => handleResolve(selectedAlert.id)}
                                        disabled={isSubmitting}
                                    >
                                        Mark Resolved
                                    </Button>
                                )}
                                <Button
                                    variant="secondary"
                                    onClick={() => setSelectedAlert(null)}
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

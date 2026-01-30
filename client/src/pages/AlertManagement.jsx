import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, User, CheckCircle, Bell, XCircle, Filter, Calendar, Search, X, FileText, Plus } from 'lucide-react';
import { CardDark, CardBody, CardHeader } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';
import { Button } from '../components/ui/Button';
import { SeverityBadge, StatusBadge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { alertsApi, incidentsApi } from '../utils/api';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';

export const AlertManagement = () => {
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [filter, setFilter] = useState('all');
    const [alerts, setAlerts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { alerts: realtimeAlerts, acknowledgeAlert } = useSocket();
    const toast = useToast();

    // Confirmation modal state
    const [showAcknowledgeConfirm, setShowAcknowledgeConfirm] = useState(false);
    const [showResolveConfirm, setShowResolveConfirm] = useState(false);
    const [alertToAction, setAlertToAction] = useState(null);

    // Create Incident from Alert state
    const [showCreateIncidentPrompt, setShowCreateIncidentPrompt] = useState(false);
    const [showIncidentForm, setShowIncidentForm] = useState(false);
    const [acknowledgedAlert, setAcknowledgedAlert] = useState(null);
    const [incidentFormData, setIncidentFormData] = useState({
        title: '',
        type: 'Near Miss',
        severity: 'Medium',
        workerName: '',
        workerId: null,
        location: '',
        description: '',
        alertId: null
    });

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

    // Show confirmation for acknowledge
    const promptAcknowledge = (alertData) => {
        setAlertToAction(alertData);
        setShowAcknowledgeConfirm(true);
    };

    // Show confirmation for resolve
    const promptResolve = (alertData) => {
        setAlertToAction(alertData);
        setShowResolveConfirm(true);
    };

    const handleAcknowledge = async (alertId) => {
        setIsSubmitting(true);
        try {
            const response = await alertsApi.acknowledge(alertId);
            setAlerts(prev => prev.map(a =>
                a.id === alertId ? response.data : a
            ));
            // Also notify via socket
            acknowledgeAlert(alertId);
            toast.success('Alert acknowledged successfully');
            setShowAcknowledgeConfirm(false);

            // Store the acknowledged alert and prompt for incident creation
            setAcknowledgedAlert(alertToAction);
            setShowCreateIncidentPrompt(true);
            setAlertToAction(null);
        } catch (error) {
            console.error('Failed to acknowledge alert:', error);
            toast.error('Failed to acknowledge alert. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle "Yes" to create incident from alert
    const handleCreateIncidentFromAlert = () => {
        if (!acknowledgedAlert) return;

        // Pre-fill incident form with alert data
        setIncidentFormData({
            title: `Alert: ${acknowledgedAlert.type}`,
            type: mapAlertTypeToIncidentType(acknowledgedAlert.type),
            severity: acknowledgedAlert.severity || 'Medium',
            workerName: acknowledgedAlert.worker?.fullName || 'Unknown Worker',
            workerId: acknowledgedAlert.workerId || null,
            location: 'Workplace', // Default, user can edit
            description: `Auto-generated from Alert #${acknowledgedAlert.id}\n\nAlert Type: ${acknowledgedAlert.type}\nTrigger Value: ${acknowledgedAlert.triggerValue || 'N/A'}\nThreshold: ${acknowledgedAlert.threshold || 'N/A'}\nDevice: ${acknowledgedAlert.deviceId || 'N/A'}`,
            alertId: acknowledgedAlert.id
        });

        setShowCreateIncidentPrompt(false);
        setShowIncidentForm(true);
    };

    // Map alert types to incident types
    const mapAlertTypeToIncidentType = (alertType) => {
        const typeMap = {
            'High Temperature': 'Environmental Hazard',
            'Gas Detection': 'Chemical Exposure',
            'Fall Detected': 'Major Injury',
            'Emergency Button': 'Near Miss',
            'Low Battery': 'Equipment Failure',
            'Device Offline': 'Equipment Failure'
        };
        return typeMap[alertType] || 'Near Miss';
    };

    // Handle incident form submission
    const handleSubmitIncident = async () => {
        setIsSubmitting(true);
        try {
            await incidentsApi.create(incidentFormData);
            toast.success('Incident report created successfully!');
            setShowIncidentForm(false);
            setAcknowledgedAlert(null);
            setIncidentFormData({
                title: '',
                type: 'Near Miss',
                severity: 'Medium',
                workerName: '',
                workerId: null,
                location: '',
                description: '',
                alertId: null
            });
        } catch (error) {
            console.error('Failed to create incident:', error);
            toast.error('Failed to create incident. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Skip incident creation
    const handleSkipIncident = () => {
        setShowCreateIncidentPrompt(false);
        setAcknowledgedAlert(null);
    };

    const handleResolve = async (alertId, notes = '') => {
        setIsSubmitting(true);
        try {
            const response = await alertsApi.resolve(alertId, notes);
            setAlerts(prev => prev.map(a =>
                a.id === alertId ? response.data : a
            ));
            setSelectedAlert(null);
            toast.success('Alert resolved successfully');
            setShowResolveConfirm(false);
            setAlertToAction(null);
        } catch (error) {
            console.error('Failed to resolve alert:', error);
            toast.error('Failed to resolve alert. Please try again.');
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
                <div className="text-[#6B7280]">Loading alerts...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[#1F2937] mb-2">Alert Management</h1>
                    <p className="text-[#4B5563]">Monitor and manage safety alerts</p>
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
                                <label className="block text-sm font-medium text-[#4B5563] mb-2">Search</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#6B7280]" size={18} />
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
                                <label className="block text-sm font-medium text-[#4B5563] mb-2">Status</label>
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
                                <label className="block text-sm font-medium text-[#4B5563] mb-2">Severity</label>
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
                                <label className="block text-sm font-medium text-[#4B5563] mb-2">Alert Type</label>
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
                                <label className="block text-sm font-medium text-[#4B5563] mb-2">Date Range</label>
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
                                        <label className="block text-sm font-medium text-[#4B5563] mb-2">From Date</label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="input-dark"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#4B5563] mb-2">To Date</label>
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
                        <div className="mt-4 pt-4 border-t border-[#E3E6EB] flex items-center justify-between">
                            <p className="text-sm text-[#4B5563]">
                                Showing <span className="text-[#1F2937] font-semibold">{filteredAlerts.length}</span> of <span className="text-[#1F2937] font-semibold">{alerts.length}</span> alerts
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
                        <AlertTriangle className="h-16 w-16 text-[#9CA3AF] mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-[#4B5563] mb-2">No Alerts</h3>
                        <p className="text-[#6B7280]">
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
                                            <h3 className="text-xl font-semibold text-[#1F2937]">{alert.type}</h3>
                                            <StatusBadge status={alert.status} />
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div>
                                                <p className="text-[#4B5563] flex items-center gap-1 mb-1">
                                                    <User size={14} /> Worker
                                                </p>
                                                <p className="text-[#1F2937] font-medium">{alert.worker?.fullName || alert.deviceId || 'Unknown'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[#4B5563] mb-1">Device</p>
                                                <p className="text-[#1F2937] font-medium">{alert.deviceId || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[#4B5563] mb-1">Trigger Value</p>
                                                <p className="text-red-500 font-medium">{alert.triggerValue || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[#4B5563] flex items-center gap-1 mb-1">
                                                    <Clock size={14} /> Time
                                                </p>
                                                <p className="text-[#1F2937] font-medium">{formatTime(alert.createdAt)}</p>
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
                                                onClick={() => promptAcknowledge(alert)}
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
                                                onClick={() => promptResolve(alert)}
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
                                        onClick={() => promptAcknowledge(selectedAlert)}
                                        disabled={isSubmitting}
                                    >
                                        Acknowledge
                                    </Button>
                                )}
                                {selectedAlert.status === 'Acknowledged' && (
                                    <Button
                                        variant="success"
                                        onClick={() => promptResolve(selectedAlert)}
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

            {/* Acknowledge Confirmation Modal */}
            <ConfirmationModal
                isOpen={showAcknowledgeConfirm}
                onClose={() => { setShowAcknowledgeConfirm(false); setAlertToAction(null); }}
                onConfirm={() => handleAcknowledge(alertToAction?.id)}
                isSubmitting={isSubmitting}
                title="Acknowledge Alert"
                message="Do you want to acknowledge this alert?"
                confirmText="Yes, Acknowledge"
                variant="info"
                data={alertToAction ? [
                    { label: 'Type', value: alertToAction.type },
                    { label: 'Severity', value: alertToAction.severity },
                    { label: 'Worker', value: alertToAction.worker?.fullName || 'Unknown' },
                    { label: 'Device', value: alertToAction.deviceId || 'N/A' }
                ] : []}
            />

            {/* Resolve Confirmation Modal */}
            <ConfirmationModal
                isOpen={showResolveConfirm}
                onClose={() => { setShowResolveConfirm(false); setAlertToAction(null); }}
                onConfirm={() => handleResolve(alertToAction?.id)}
                isSubmitting={isSubmitting}
                title="Resolve Alert"
                message="Do you want to mark this alert as resolved?"
                confirmText="Yes, Resolve"
                variant="success"
                data={alertToAction ? [
                    { label: 'Type', value: alertToAction.type },
                    { label: 'Severity', value: alertToAction.severity },
                    { label: 'Worker', value: alertToAction.worker?.fullName || 'Unknown' },
                    { label: 'Device', value: alertToAction.deviceId || 'N/A' }
                ] : []}
            />

            {/* Create Incident Prompt Modal */}
            <ConfirmationModal
                isOpen={showCreateIncidentPrompt}
                onClose={handleSkipIncident}
                onConfirm={handleCreateIncidentFromAlert}
                title="Create Incident Report?"
                message="Would you like to create an incident report from this alert? This helps track and document the event."
                confirmText="Yes, Create Incident"
                cancelText="No, Skip"
                variant="info"
                data={acknowledgedAlert ? [
                    { label: 'Alert Type', value: acknowledgedAlert.type },
                    { label: 'Severity', value: acknowledgedAlert.severity },
                    { label: 'Worker', value: acknowledgedAlert.worker?.fullName || 'Unknown' }
                ] : []}
            />

            {/* Create Incident Form Modal */}
            <Modal
                isOpen={showIncidentForm}
                onClose={() => { setShowIncidentForm(false); setAcknowledgedAlert(null); }}
                title="Create Incident Report"
                size="lg"
            >
                <div className="space-y-6">
                    {/* Alert Link Banner */}
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex items-center gap-3">
                        <FileText className="h-5 w-5 text-blue-400" />
                        <span className="text-sm text-blue-300">
                            Creating incident from Alert #{acknowledgedAlert?.id}
                        </span>
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-4">
                        {/* Title */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Incident Title *
                            </label>
                            <input
                                type="text"
                                value={incidentFormData.title}
                                onChange={(e) => setIncidentFormData(prev => ({ ...prev, title: e.target.value }))}
                                className="input-dark w-full"
                                placeholder="Brief description of the incident"
                            />
                        </div>

                        {/* Type & Severity Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Incident Type *
                                </label>
                                <select
                                    value={incidentFormData.type}
                                    onChange={(e) => setIncidentFormData(prev => ({ ...prev, type: e.target.value }))}
                                    className="input-dark w-full"
                                >
                                    <option value="Equipment Failure">Equipment Failure</option>
                                    <option value="Minor Injury">Minor Injury</option>
                                    <option value="Major Injury">Major Injury</option>
                                    <option value="Near Miss">Near Miss</option>
                                    <option value="Environmental Hazard">Environmental Hazard</option>
                                    <option value="Fire/Explosion">Fire/Explosion</option>
                                    <option value="Chemical Exposure">Chemical Exposure</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Severity *
                                </label>
                                <select
                                    value={incidentFormData.severity}
                                    onChange={(e) => setIncidentFormData(prev => ({ ...prev, severity: e.target.value }))}
                                    className="input-dark w-full"
                                >
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                    <option value="Critical">Critical</option>
                                </select>
                            </div>
                        </div>

                        {/* Worker & Location Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Worker Name *
                                </label>
                                <input
                                    type="text"
                                    value={incidentFormData.workerName}
                                    onChange={(e) => setIncidentFormData(prev => ({ ...prev, workerName: e.target.value }))}
                                    className="input-dark w-full"
                                    placeholder="Name of worker involved"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Location
                                </label>
                                <input
                                    type="text"
                                    value={incidentFormData.location}
                                    onChange={(e) => setIncidentFormData(prev => ({ ...prev, location: e.target.value }))}
                                    className="input-dark w-full"
                                    placeholder="Where the incident occurred"
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Description *
                            </label>
                            <textarea
                                value={incidentFormData.description}
                                onChange={(e) => setIncidentFormData(prev => ({ ...prev, description: e.target.value }))}
                                className="input-dark w-full h-32 resize-none"
                                placeholder="Detailed description of what happened..."
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-gray-700">
                        <Button
                            variant="secondary"
                            onClick={() => { setShowIncidentForm(false); setAcknowledgedAlert(null); }}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleSubmitIncident}
                            disabled={isSubmitting || !incidentFormData.title || !incidentFormData.workerName || !incidentFormData.description}
                            className="flex-1"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Creating...
                                </span>
                            ) : (
                                <>
                                    <Plus size={18} className="mr-2" />
                                    Create Incident
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};


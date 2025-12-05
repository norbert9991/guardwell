import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, User, CheckCircle, Bell, XCircle } from 'lucide-react';
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

    // Filter alerts
    const filteredAlerts = alerts.filter(alert => {
        if (filter === 'all') return true;
        return alert.status?.toLowerCase() === filter;
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Alert Management</h1>
                    <p className="text-gray-400">Monitor and manage safety alerts</p>
                </div>
                <div className="flex gap-2">
                    <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input-dark">
                        <option value="all">All Alerts</option>
                        <option value="pending">Pending</option>
                        <option value="acknowledged">Acknowledged</option>
                        <option value="resolved">Resolved</option>
                    </select>
                </div>
            </div>

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

import React, { useState } from 'react';
import { AlertTriangle, Clock, User, CheckCircle, Bell } from 'lucide-react';
import { CardDark, CardBody, CardHeader } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';
import { Button } from '../components/ui/Button';
import { SeverityBadge, StatusBadge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';

export const AlertManagement = () => {
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [filter, setFilter] = useState('all');

    const alerts = [
        {
            id: 1,
            type: 'High Temperature',
            severity: 'High',
            worker: 'Juan dela Cruz',
            device: 'DEV-001',
            triggerValue: '52.3°C',
            timestamp: '2024-11-29 14:30:15',
            status: 'Pending',
            responseTime: null
        },
        {
            id: 2,
            type: 'Gas Detection',
            severity: 'Critical',
            worker: 'Maria Santos',
            device: 'DEV-002',
            triggerValue: '550 PPM',
            timestamp: '2024-11-29 14:25:42',
            status: 'Acknowledged',
            acknowledgedBy: 'Safety Officer',
            responseTime: '45s'
        }
    ];

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
                    value={alerts.filter(a => a.severity === 'Critical').length}
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

            <div className="grid gap-4">
                {alerts.map(alert => (
                    <CardDark key={alert.id} className={`${alert.severity === 'Critical' ? 'border-danger/50' : 'border-warning/50'}`}>
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
                                            <p className="text-white font-medium">{alert.worker}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400 mb-1">Device</p>
                                            <p className="text-white font-medium">{alert.device}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400 mb-1">Trigger Value</p>
                                            <p className="text-danger font-medium">{alert.triggerValue}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400 flex items-center gap-1 mb-1">
                                                <Clock size={14} /> Time
                                            </p>
                                            <p className="text-white font-medium">{alert.timestamp}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 ml-4">
                                    <Button size="sm" onClick={() => setSelectedAlert(alert)}>View Details</Button>
                                    {alert.status === 'Pending' && (
                                        <Button size="sm" variant="primary" icon={<CheckCircle size={16} />}>
                                            Acknowledge
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardBody>
                    </CardDark>
                ))}
            </div>

            {/* Alert Detail Modal */}
            <Modal
                isOpen={!!selectedAlert}
                onClose={() => setSelectedAlert(null)}
                title="Alert Details"
                size="lg"
            >
                {selectedAlert && (
                    <div className="space-y-4">
                        <div>
                            <h4 className="font-semibold mb-2">Alert Information</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-600">Type:</p>
                                    <p className="font-medium">{selectedAlert.type}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600">Severity:</p>
                                    <SeverityBadge severity={selectedAlert.severity} />
                                </div>
                            </div>
                        </div>
                        <div className="border-t pt-4">
                            <h4 className="font-semibold mb-2">Actions</h4>
                            <div className="flex gap-2">
                                <Button variant="primary">Acknowledge</Button>
                                <Button variant="secondary">Create Incident</Button>
                                <Button variant="secondary">Mark Resolved</Button>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

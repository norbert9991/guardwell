import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { CardDark, CardBody, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SeverityBadge, StatusBadge } from '../components/ui/Badge';

export const IncidentDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const incident = {
        id,
        title: 'Gas Leak Exposure',
        type: 'Equipment Failure',
        severity: 'Critical',
        worker: 'Maria Santos',
        dateTime: '2024-11-29 14:25:42',
        description: 'Worker exposed to elevated gas levels in the manufacturing area due to equipment malfunction.',
        actionsTaken: 'Worker was immediately evacuated. Area was sealed and investigated.',
        status: 'Open',
        reportedBy: 'Safety Officer'
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate('/incidents')} icon={<ArrowLeft size={18} />}>
                    Back
                </Button>
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Incident Details</h1>
                    <p className="text-gray-400">Incident #{incident.id}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <CardDark>
                        <CardHeader className="px-6 py-4 border-b border-gray-700">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-semibold text-white">{incident.title}</h2>
                                <div className="flex gap-2">
                                    <SeverityBadge severity={incident.severity} />
                                    <StatusBadge status={incident.status} />
                                </div>
                            </div>
                        </CardHeader>
                        <CardBody className="p-6 space-y-6">
                            <div>
                                <h3 className="font-semibold text-white mb-2">Description</h3>
                                <p className="text-gray-300">{incident.description}</p>
                            </div>
                            <div>
                                <h3 className="font-semibold text-white mb-2">Actions Taken</h3>
                                <p className="text-gray-300">{incident.actionsTaken}</p>
                            </div>
                            <div className="flex gap-2 pt-4">
                                <Button variant="primary">Update Status</Button>
                                <Button variant="secondary">Add Notes</Button>
                                <Button variant="danger">Close Incident</Button>
                            </div>
                        </CardBody>
                    </CardDark>
                </div>

                <div className="space-y-6">
                    <CardDark>
                        <CardHeader className="px-6 py-4 border-b border-gray-700">
                            <h3 className="font-semibold text-white">Incident Information</h3>
                        </CardHeader>
                        <CardBody className="p-6 space-y-3 text-sm">
                            <div>
                                <p className="text-gray-400 mb-1">Type</p>
                                <p className="text-white font-medium">{incident.type}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 mb-1">Worker</p>
                                <p className="text-white font-medium">{incident.worker}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 mb-1">Date & Time</p>
                                <p className="text-white font-medium">{incident.dateTime}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 mb-1">Reported By</p>
                                <p className="text-white font-medium">{incident.reportedBy}</p>
                            </div>
                        </CardBody>
                    </CardDark>
                </div>
            </div>
        </div>
    );
};

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Radio, AlertTriangle, FileText, Clock, Loader2 } from 'lucide-react';
import { CardDark, CardBody, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { workersApi, alertsApi } from '../utils/api';

export const WorkerProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [worker, setWorker] = useState(null);
    const [recentAlerts, setRecentAlerts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch worker data from API
    useEffect(() => {
        const fetchWorkerData = async () => {
            try {
                setIsLoading(true);
                const workerResponse = await workersApi.getById(id);
                setWorker(workerResponse.data);

                // Fetch alerts for this worker
                try {
                    const alertsResponse = await alertsApi.getAll();
                    // Filter alerts for this worker
                    const workerAlerts = alertsResponse.data
                        .filter(alert => alert.workerId === parseInt(id))
                        .slice(0, 5); // Get last 5 alerts
                    setRecentAlerts(workerAlerts);
                } catch (alertError) {
                    console.error('Failed to fetch alerts:', alertError);
                    setRecentAlerts([]);
                }
            } catch (error) {
                console.error('Failed to fetch worker:', error);
                setError('Worker not found or failed to load.');
            } finally {
                setIsLoading(false);
            }
        };

        if (id) {
            fetchWorkerData();
        }
    }, [id]);

    // Mock attendance data (would need a separate API if tracked)
    const attendance = [
        { date: new Date().toISOString().split('T')[0], timeIn: '08:00', timeOut: '17:00', hours: '9.0' },
        { date: new Date(Date.now() - 86400000).toISOString().split('T')[0], timeIn: '08:05', timeOut: '17:10', hours: '9.1' }
    ];

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 text-primary-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Loading worker profile...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !worker) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Worker Not Found</h2>
                    <p className="text-gray-400 mb-4">{error || 'The requested worker could not be found.'}</p>
                    <Button onClick={() => navigate('/workers')}>
                        Back to Workers
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate('/workers')} icon={<ArrowLeft size={18} />}>
                    Back
                </Button>
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Worker Profile</h1>
                    <p className="text-gray-400">View and manage worker information</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Worker Info */}
                <div className="lg:col-span-1 space-y-6">
                    <CardDark>
                        <CardBody className="p-6 text-center">
                            <div className="w-24 h-24 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <User className="h-14 w-14 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-1">{worker.fullName}</h2>
                            <p className="text-gray-400 mb-2">{worker.position}</p>
                            <StatusBadge status={worker.status} />
                        </CardBody>
                    </CardDark>

                    <CardDark>
                        <CardHeader className="px-6 py-4 border-b border-gray-700">
                            <h3 className="font-semibold text-white">Contact Information</h3>
                        </CardHeader>
                        <CardBody className="p-6 space-y-3 text-sm">
                            <div>
                                <p className="text-gray-400 mb-1">Employee Number</p>
                                <p className="text-white font-medium">{worker.employeeNumber}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 mb-1">Email</p>
                                <p className="text-white font-medium">{worker.email}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 mb-1">Phone</p>
                                <p className="text-white font-medium">{worker.contactNumber}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 mb-1">Department</p>
                                <p className="text-white font-medium">{worker.department}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 mb-1">Emergency Contact</p>
                                <p className="text-white font-medium">{worker.emergencyContactName || 'Not set'}</p>
                                <p className="text-gray-400 text-xs">{worker.emergencyContactNumber || ''}</p>
                            </div>
                        </CardBody>
                    </CardDark>
                </div>

                {/* Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Device & Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <CardDark>
                            <CardBody className="p-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <Radio className="h-5 w-5 text-primary-500" />
                                    <span className="text-sm text-gray-400">Assigned Device</span>
                                </div>
                                <p className="text-2xl font-bold text-white">{worker.assignedDevice || 'None'}</p>
                            </CardBody>
                        </CardDark>
                        <CardDark>
                            <CardBody className="p-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <AlertTriangle className="h-5 w-5 text-warning" />
                                    <span className="text-sm text-gray-400">Total Alerts</span>
                                </div>
                                <p className="text-2xl font-bold text-white">{recentAlerts.length}</p>
                            </CardBody>
                        </CardDark>
                        <CardDark>
                            <CardBody className="p-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <Clock className="h-5 w-5 text-success" />
                                    <span className="text-sm text-gray-400">PPE Compliance</span>
                                </div>
                                <p className="text-2xl font-bold text-white">{worker.ppeCompliance}%</p>
                            </CardBody>
                        </CardDark>
                    </div>

                    {/* Recent Alerts */}
                    <CardDark>
                        <CardHeader className="px-6 py-4 border-b border-gray-700">
                            <h3 className="font-semibold text-white">Recent Alerts</h3>
                        </CardHeader>
                        <CardBody className="p-0">
                            <div className="divide-y divide-gray-700">
                                {recentAlerts.map(alert => (
                                    <div key={alert.id} className="p-4 flex items-center justify-between">
                                        <div>
                                            <p className="text-white font-medium">{alert.type}</p>
                                            <p className="text-sm text-gray-400">{alert.date}</p>
                                        </div>
                                        <StatusBadge status={alert.status} />
                                    </div>
                                ))}
                            </div>
                        </CardBody>
                    </CardDark>

                    {/* Attendance */}
                    <CardDark>
                        <CardHeader className="px-6 py-4 border-b border-gray-700">
                            <h3 className="font-semibold text-white">Attendance Records</h3>
                        </CardHeader>
                        <CardBody className="p-0">
                            <table className="min-w-full divide-y divide-gray-700">
                                <thead className="bg-dark-lighter">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Time In</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Time Out</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Hours</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {attendance.map((record, idx) => (
                                        <tr key={idx}>
                                            <td className="px-6 py-4 text-sm text-white">{record.date}</td>
                                            <td className="px-6 py-4 text-sm text-gray-300">{record.timeIn}</td>
                                            <td className="px-6 py-4 text-sm text-gray-300">{record.timeOut}</td>
                                            <td className="px-6 py-4 text-sm text-white font-medium">{record.hours}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardBody>
                    </CardDark>
                </div>
            </div>
        </div>
    );
};

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Radio, AlertTriangle, Clock, Loader2, Camera, Briefcase, Calendar, Heart, Phone, Mail, Shield, Bell, CheckCircle, XCircle } from 'lucide-react';
import { CardDark, CardBody, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge, StatusBadge, SeverityBadge } from '../components/ui/Badge';
import { workersApi, alertsApi, sensorsApi } from '../utils/api';
import { useToast } from '../context/ToastContext';
import { useRefresh } from '../context/RefreshContext';

export const WorkerProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [worker, setWorker] = useState(null);
    const [recentAlerts, setRecentAlerts] = useState([]);
    const [nudgeStats, setNudgeStats] = useState({ total: 0, acknowledged: 0, expired: 0, escalated: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const toast = useToast();

    // Fetch worker data from API
    const fetchWorkerData = useCallback(async () => {
        try {
            setIsLoading(true);
            const workerResponse = await workersApi.getById(id);
            setWorker(workerResponse.data);

            // Fetch alerts for this worker
            try {
                const alertsResponse = await alertsApi.getAll();
                const workerAlerts = alertsResponse.data
                    .filter(alert => alert.workerId === parseInt(id))
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .slice(0, 5);
                setRecentAlerts(workerAlerts);
            } catch (alertError) {
                console.error('Failed to fetch alerts:', alertError);
                setRecentAlerts([]);
            }

            // Fetch nudge stats for this worker
            try {
                const nudgeResponse = await sensorsApi.getNudgeLogs();
                const workerNudges = (nudgeResponse.data.logs || []).filter(
                    log => log.workerId === parseInt(id)
                );
                setNudgeStats({
                    total: workerNudges.length,
                    acknowledged: workerNudges.filter(n => n.status === 'Acknowledged').length,
                    expired: workerNudges.filter(n => n.status === 'Expired').length,
                    escalated: workerNudges.filter(n => n.escalated).length
                });
            } catch (nudgeError) {
                console.error('Failed to fetch nudge stats:', nudgeError);
            }
        } catch (error) {
            console.error('Failed to fetch worker:', error);
            setError('Worker not found or failed to load.');
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (id) fetchWorkerData();
    }, [id, fetchWorkerData]);

    // Register refresh
    const { registerRefresh } = useRefresh();
    useEffect(() => { registerRefresh(fetchWorkerData); }, [registerRefresh, fetchWorkerData]);

    // Format date
    const formatDate = (date) => {
        if (!date) return 'Not set';
        return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    // Calculate tenure
    const getTenure = (dateHired) => {
        if (!dateHired) return null;
        const hired = new Date(dateHired);
        const now = new Date();
        const months = (now.getFullYear() - hired.getFullYear()) * 12 + (now.getMonth() - hired.getMonth());
        if (months < 1) return 'Less than a month';
        if (months < 12) return `${months} month${months > 1 ? 's' : ''}`;
        const years = Math.floor(months / 12);
        const remainingMonths = months % 12;
        if (remainingMonths === 0) return `${years} year${years > 1 ? 's' : ''}`;
        return `${years} year${years > 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 text-primary-500 animate-spin mx-auto mb-4" />
                    <p className="text-[#4B5563]">Loading worker profile...</p>
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
                    <h2 className="text-xl font-bold text-[#1F2937] mb-2">Worker Not Found</h2>
                    <p className="text-[#4B5563] mb-4">{error || 'The requested worker could not be found.'}</p>
                    <Button onClick={() => navigate('/workers')}>
                        Back to Workers
                    </Button>
                </div>
            </div>
        );
    }

    const nudgeResponseRate = nudgeStats.total > 0
        ? Math.round((nudgeStats.acknowledged / (nudgeStats.acknowledged + nudgeStats.expired)) * 100) || 0
        : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="outline" onClick={() => navigate('/workers')} icon={<ArrowLeft size={18} />}>
                    Back
                </Button>
                <div>
                    <h1 className="text-3xl font-bold text-[#1F2937] mb-2">Worker Profile</h1>
                    <p className="text-[#4B5563]">Detailed worker information and status</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT COLUMN — Profile Card + Contact + Employment */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Profile Card */}
                    <CardDark>
                        <CardBody className="p-6 text-center">
                            <div className="relative inline-block mb-4">
                                <label className="cursor-pointer group" title="Click to change photo">
                                    {worker.profileImage ? (
                                        <img src={worker.profileImage} alt={worker.fullName} className="w-24 h-24 rounded-full object-cover border-2 border-[#E3E6EB] group-hover:border-[#6FA3D8] transition-colors mx-auto" />
                                    ) : (
                                        <div className="w-24 h-24 bg-[#6FA3D8] rounded-full flex items-center justify-center mx-auto group-hover:bg-[#5A8FC2] transition-colors">
                                            <User className="h-14 w-14 text-white" />
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        onChange={async (e) => {
                                            const file = e.target.files[0];
                                            if (!file) return;
                                            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
                                            if (!allowedTypes.includes(file.type)) {
                                                toast.error('Only JPEG, PNG, and WebP images are allowed.');
                                                return;
                                            }
                                            if (file.size > 5 * 1024 * 1024) {
                                                toast.error('Image must be less than 5MB.');
                                                return;
                                            }
                                            const reader = new FileReader();
                                            reader.onload = async (event) => {
                                                setIsUploadingPhoto(true);
                                                try {
                                                    await workersApi.uploadPhoto(worker.id, event.target.result);
                                                    setWorker(prev => ({ ...prev, profileImage: event.target.result }));
                                                    toast.success('Photo updated successfully');
                                                } catch (err) {
                                                    console.error('Failed to upload photo:', err);
                                                    toast.error('Failed to upload photo');
                                                } finally {
                                                    setIsUploadingPhoto(false);
                                                }
                                            };
                                            reader.readAsDataURL(file);
                                        }}
                                        className="hidden"
                                        disabled={isUploadingPhoto}
                                    />
                                    <div className="absolute bottom-0 right-0 w-7 h-7 bg-[#6FA3D8] rounded-full flex items-center justify-center border-2 border-white group-hover:bg-[#5A8FC2] transition-colors">
                                        <Camera size={14} className="text-white" />
                                    </div>
                                </label>
                            </div>
                            <h2 className="text-2xl font-bold text-[#1F2937] mb-1">{worker.fullName}</h2>
                            <p className="text-[#4B5563] mb-2">{worker.position}</p>
                            <StatusBadge status={worker.status} />
                        </CardBody>
                    </CardDark>

                    {/* Contact Information */}
                    <CardDark>
                        <CardHeader className="px-6 py-4 border-b border-[#E3E6EB]">
                            <h3 className="font-semibold text-[#1F2937] flex items-center gap-2">
                                <Phone size={16} className="text-[#6FA3D8]" />
                                Contact Information
                            </h3>
                        </CardHeader>
                        <CardBody className="p-6 space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-[#4B5563]">Employee #</span>
                                <span className="text-[#1F2937] font-medium">{worker.employeeNumber}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#4B5563]">Email</span>
                                <span className="text-[#1F2937] font-medium">{worker.email || 'Not set'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#4B5563]">Phone</span>
                                <span className="text-[#1F2937] font-medium">{worker.contactNumber}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#4B5563]">Department</span>
                                <span className="text-[#1F2937] font-medium">{worker.department}</span>
                            </div>
                            <div className="border-t border-[#E3E6EB] pt-3">
                                <p className="text-[#4B5563] mb-1 text-xs uppercase font-semibold tracking-wider">Emergency Contact</p>
                                <p className="text-[#1F2937] font-medium">{worker.emergencyContactName || 'Not set'}</p>
                                {worker.emergencyContactNumber && (
                                    <p className="text-[#6B7280] text-xs">{worker.emergencyContactNumber}</p>
                                )}
                            </div>
                        </CardBody>
                    </CardDark>

                    {/* Employment Details */}
                    <CardDark>
                        <CardHeader className="px-6 py-4 border-b border-[#E3E6EB]">
                            <h3 className="font-semibold text-[#1F2937] flex items-center gap-2">
                                <Briefcase size={16} className="text-[#F59E0B]" />
                                Employment Details
                            </h3>
                        </CardHeader>
                        <CardBody className="p-6 space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-[#4B5563]">Date Hired</span>
                                <span className="text-[#1F2937] font-medium">{formatDate(worker.dateHired)}</span>
                            </div>
                            {worker.dateHired && (
                                <div className="flex justify-between">
                                    <span className="text-[#4B5563]">Tenure</span>
                                    <span className="text-[#1F2937] font-medium">{getTenure(worker.dateHired)}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-[#4B5563]">Position</span>
                                <span className="text-[#1F2937] font-medium">{worker.position}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#4B5563]">Status</span>
                                <StatusBadge status={worker.status} />
                            </div>
                        </CardBody>
                    </CardDark>
                </div>

                {/* RIGHT COLUMN — Stats, Device, Medical, Nudges, Alerts */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <CardDark>
                            <CardBody className="p-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <Radio className="h-5 w-5 text-[#6FA3D8]" />
                                    <span className="text-sm text-[#4B5563]">Assigned Device</span>
                                </div>
                                <p className="text-2xl font-bold text-[#1F2937]">
                                    {worker.device?.deviceId || 'None'}
                                </p>
                                {worker.device && (
                                    <p className="text-xs text-[#6B7280] mt-1">SN: {worker.device.serialNumber}</p>
                                )}
                            </CardBody>
                        </CardDark>
                        <CardDark>
                            <CardBody className="p-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                                    <span className="text-sm text-[#4B5563]">Total Alerts</span>
                                </div>
                                <p className="text-2xl font-bold text-[#1F2937]">{recentAlerts.length}</p>
                                <p className="text-xs text-[#6B7280] mt-1">
                                    {recentAlerts.filter(a => a.status === 'Pending').length} pending
                                </p>
                            </CardBody>
                        </CardDark>
                        <CardDark>
                            <CardBody className="p-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <Bell className="h-5 w-5 text-[#8B5CF6]" />
                                    <span className="text-sm text-[#4B5563]">Nudge Response</span>
                                </div>
                                <p className="text-2xl font-bold text-[#1F2937]">
                                    {nudgeStats.total > 0 ? `${nudgeResponseRate}%` : 'N/A'}
                                </p>
                                <p className="text-xs text-[#6B7280] mt-1">{nudgeStats.total} total nudges</p>
                            </CardBody>
                        </CardDark>
                    </div>

                    {/* Medical Conditions */}
                    <CardDark>
                        <CardHeader className="px-6 py-4 border-b border-[#E3E6EB]">
                            <h3 className="font-semibold text-[#1F2937] flex items-center gap-2">
                                <Heart size={16} className="text-red-500" />
                                Medical Information
                            </h3>
                        </CardHeader>
                        <CardBody className="p-6">
                            {worker.medicalConditions ? (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <p className="text-sm text-[#1F2937]">{worker.medicalConditions}</p>
                                </div>
                            ) : (
                                <p className="text-sm text-[#6B7280] italic">No medical conditions recorded.</p>
                            )}
                        </CardBody>
                    </CardDark>

                    {/* Nudge Summary */}
                    {nudgeStats.total > 0 && (
                        <CardDark>
                            <CardHeader className="px-6 py-4 border-b border-[#E3E6EB]">
                                <h3 className="font-semibold text-[#1F2937] flex items-center gap-2">
                                    <Bell size={16} className="text-[#8B5CF6]" />
                                    Nudge Summary
                                </h3>
                            </CardHeader>
                            <CardBody className="p-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                    <div className="bg-[#EEF1F4] p-3 rounded-lg">
                                        <p className="text-xl font-bold text-[#3B82F6]">{nudgeStats.total}</p>
                                        <p className="text-xs text-[#4B5563]">Total Sent</p>
                                    </div>
                                    <div className="bg-[#EEF1F4] p-3 rounded-lg">
                                        <p className="text-xl font-bold text-green-600">{nudgeStats.acknowledged}</p>
                                        <p className="text-xs text-[#4B5563]">Acknowledged</p>
                                    </div>
                                    <div className="bg-[#EEF1F4] p-3 rounded-lg">
                                        <p className="text-xl font-bold text-red-500">{nudgeStats.expired}</p>
                                        <p className="text-xs text-[#4B5563]">Expired</p>
                                    </div>
                                    <div className="bg-[#EEF1F4] p-3 rounded-lg">
                                        <p className="text-xl font-bold text-orange-500">{nudgeStats.escalated}</p>
                                        <p className="text-xs text-[#4B5563]">Escalated</p>
                                    </div>
                                </div>
                                {/* Response Rate Bar */}
                                <div className="mt-4">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-medium text-[#4B5563]">Response Rate</span>
                                        <span className={`text-sm font-bold ${nudgeResponseRate >= 80 ? 'text-green-600' : nudgeResponseRate >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                                            {nudgeResponseRate}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-[#E3E6EB] rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all duration-500 ${nudgeResponseRate >= 80 ? 'bg-green-500' : nudgeResponseRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                            style={{ width: `${nudgeResponseRate}%` }}
                                        />
                                    </div>
                                </div>
                            </CardBody>
                        </CardDark>
                    )}

                    {/* Recent Alerts */}
                    <CardDark>
                        <CardHeader className="px-6 py-4 border-b border-[#E3E6EB]">
                            <h3 className="font-semibold text-[#1F2937] flex items-center gap-2">
                                <AlertTriangle size={16} className="text-orange-500" />
                                Recent Alerts
                            </h3>
                        </CardHeader>
                        <CardBody className="p-0">
                            {recentAlerts.length === 0 ? (
                                <div className="p-8 text-center">
                                    <CheckCircle className="h-10 w-10 text-green-400 mx-auto mb-2" />
                                    <p className="text-sm text-[#6B7280]">No alerts recorded for this worker.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-[#E3E6EB]">
                                    {recentAlerts.map(alert => (
                                        <div key={alert.id} className="p-4 flex items-center justify-between hover:bg-[#EEF1F4]/50 transition-colors">
                                            <div>
                                                <p className="text-[#1F2937] font-medium text-sm">{alert.type}</p>
                                                <p className="text-xs text-[#6B7280]">
                                                    {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : alert.date}
                                                </p>
                                                {alert.message && (
                                                    <p className="text-xs text-[#4B5563] mt-1 truncate max-w-sm">{alert.message}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {alert.severity && <SeverityBadge severity={alert.severity} />}
                                                <StatusBadge status={alert.status} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardBody>
                    </CardDark>
                </div>
            </div>
        </div>
    );
};

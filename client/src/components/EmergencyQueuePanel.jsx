import React, { useState, useEffect } from 'react';
import {
    AlertTriangle, User, Clock, CheckCircle, X, ChevronRight, ChevronLeft,
    Bell, Radio, Shield, Mic, MapPin, UserCheck, Play, CheckSquare, Square
} from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useSocket } from '../context/SocketContext';
import { useEmergencyPanel } from '../context/EmergencyPanelContext';
import { alertsApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

/**
 * Emergency Queue Panel - Light Theme
 * Persistent sidebar showing all active emergencies with queue management.
 * Uses EmergencyPanelContext for shared expanded state with layout.
 */
export const EmergencyQueuePanel = () => {
    const { emergencyAlerts, connected } = useSocket();
    const { isExpanded, setIsExpanded } = useEmergencyPanel();
    const { user } = useAuth();
    const toast = useToast();

    const [activeEmergencies, setActiveEmergencies] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch active emergencies from API on mount
    useEffect(() => {
        fetchActiveEmergencies();
    }, []);

    // Merge socket emergencies with API data
    useEffect(() => {
        if (emergencyAlerts.length > 0) {
            setActiveEmergencies(prev => {
                const newAlerts = emergencyAlerts.filter(
                    ea => !prev.some(p => p.id === ea.id)
                );
                if (newAlerts.length > 0) {
                    return [...newAlerts, ...prev];
                }
                return prev;
            });
        }
    }, [emergencyAlerts]);

    const fetchActiveEmergencies = async () => {
        try {
            const response = await alertsApi.getActive();
            setActiveEmergencies(response.data);
        } catch (error) {
            console.error('Failed to fetch active emergencies:', error);
        }
    };

    // Handle acknowledge single
    const handleAcknowledge = async (alertId) => {
        setIsLoading(true);
        try {
            await alertsApi.acknowledge(alertId, user?.fullName || 'Officer');
            setActiveEmergencies(prev =>
                prev.map(e => e.id === alertId ? { ...e, status: 'Acknowledged', acknowledgedBy: user?.fullName } : e)
            );
            toast.success('Emergency acknowledged');
        } catch (error) {
            toast.error('Failed to acknowledge emergency');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle mark as responding
    const handleRespond = async (alertId) => {
        setIsLoading(true);
        try {
            await alertsApi.respond(alertId, user?.fullName || 'Officer', '');
            setActiveEmergencies(prev =>
                prev.map(e => e.id === alertId ? { ...e, status: 'Responding', assignedTo: user?.fullName } : e)
            );
            toast.success('Marked as responding');
        } catch (error) {
            toast.error('Failed to update status');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle resolve
    const handleResolve = async (alertId) => {
        setIsLoading(true);
        try {
            await alertsApi.resolve(alertId, 'Resolved by officer');
            setActiveEmergencies(prev => prev.filter(e => e.id !== alertId));
            toast.success('Emergency resolved');
        } catch (error) {
            toast.error('Failed to resolve emergency');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle batch acknowledge
    const handleBatchAcknowledge = async () => {
        if (selectedIds.length === 0) return;
        setIsLoading(true);
        try {
            await alertsApi.batchAcknowledge(selectedIds, user?.fullName || 'Officer');
            setActiveEmergencies(prev =>
                prev.map(e => selectedIds.includes(e.id) ? { ...e, status: 'Acknowledged', acknowledgedBy: user?.fullName } : e)
            );
            setSelectedIds([]);
            toast.success(`${selectedIds.length} emergencies acknowledged`);
        } catch (error) {
            toast.error('Failed to batch acknowledge');
        } finally {
            setIsLoading(false);
        }
    };

    // Toggle selection
    const toggleSelect = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    // Select all pending
    const selectAllPending = () => {
        const pendingIds = activeEmergencies.filter(e => e.status === 'Pending').map(e => e.id);
        setSelectedIds(pendingIds);
    };

    // Get status badge variant
    const getStatusBadge = (status) => {
        switch (status) {
            case 'Pending': return 'danger';
            case 'Acknowledged': return 'warning';
            case 'Responding': return 'info';
            default: return 'secondary';
        }
    };

    // Count by status
    const pendingCount = activeEmergencies.filter(e => e.status === 'Pending').length;
    const totalActive = activeEmergencies.length;

    // Format elapsed time
    const getElapsedTime = (timestamp) => {
        const elapsed = Date.now() - new Date(timestamp).getTime();
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        if (minutes > 0) return `${minutes}m ${seconds}s ago`;
        return `${seconds}s ago`;
    };

    return (
        <>
            {/* Collapsed Toggle Button */}
            {!isExpanded && (
                <button
                    onClick={() => setIsExpanded(true)}
                    className={`fixed right-0 top-1/2 -translate-y-1/2 z-50 p-3 rounded-l-lg shadow-lg transition-all
                        ${pendingCount > 0 ? 'bg-[#E85D2A] animate-pulse' : 'bg-white border border-[#E3E6EB]'}`}
                >
                    <div className="flex flex-col items-center gap-2">
                        <ChevronLeft size={20} className={pendingCount > 0 ? 'text-white' : 'text-[#6B7280]'} />
                        <Bell size={20} className={pendingCount > 0 ? 'text-white' : 'text-[#6B7280]'} />
                        {totalActive > 0 && (
                            <span className="bg-[#E85D2A] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                {totalActive}
                            </span>
                        )}
                    </div>
                </button>
            )}

            {/* Expanded Panel - Light Theme */}
            {isExpanded && (
                <div className="fixed right-0 top-0 h-screen w-96 bg-white border-l border-[#E3E6EB] shadow-xl z-50 flex flex-col">
                    {/* Header */}
                    <div className="p-4 border-b border-[#E3E6EB] bg-[#EEF1F4]">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${pendingCount > 0 ? 'bg-[#E85D2A]/20 animate-pulse' : 'bg-[#E3E6EB]'}`}>
                                    <Bell size={20} className={pendingCount > 0 ? 'text-[#E85D2A]' : 'text-[#6B7280]'} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-[#1F2937]">Emergency Queue</h2>
                                    <p className="text-xs text-[#6B7280]">
                                        {pendingCount} pending • {totalActive} active
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsExpanded(false)}
                                className="p-2 hover:bg-[#E3E6EB] rounded-lg transition-colors"
                            >
                                <ChevronRight size={20} className="text-[#6B7280]" />
                            </button>
                        </div>

                        {/* Batch Actions */}
                        {totalActive > 0 && (
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={selectAllPending}
                                    className="flex-1 text-xs"
                                >
                                    Select All Pending ({pendingCount})
                                </Button>
                                <Button
                                    size="sm"
                                    variant="warning"
                                    onClick={handleBatchAcknowledge}
                                    disabled={selectedIds.length === 0 || isLoading}
                                    className="flex-1 text-xs"
                                >
                                    Batch Ack ({selectedIds.length})
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Emergency List */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#EEF1F4]">
                        {activeEmergencies.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <Shield size={48} className="text-[#22c55e] mb-4" />
                                <p className="text-[#1F2937] font-medium">No Active Emergencies</p>
                                <p className="text-[#6B7280] text-sm">All clear!</p>
                            </div>
                        ) : (
                            activeEmergencies.map((emergency) => (
                                <div
                                    key={emergency.id}
                                    className={`rounded-lg border transition-all bg-white ${emergency.status === 'Pending'
                                        ? 'border-[#E85D2A]/50 shadow-md'
                                        : emergency.status === 'Acknowledged'
                                            ? 'border-[#F4A261]/50'
                                            : 'border-[#6FA3D8]/50'
                                        }`}
                                >
                                    {/* Card Header */}
                                    <div className="p-3">
                                        <div className="flex items-start gap-3">
                                            {/* Checkbox */}
                                            <button
                                                onClick={() => toggleSelect(emergency.id)}
                                                className="mt-1"
                                            >
                                                {selectedIds.includes(emergency.id) ? (
                                                    <CheckSquare size={18} className="text-[#6FA3D8]" />
                                                ) : (
                                                    <Square size={18} className="text-[#9CA3AF]" />
                                                )}
                                            </button>

                                            {/* Icon */}
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${emergency.type === 'Voice Alert' ? 'bg-[#6FA3D8]/20' : 'bg-[#E85D2A]/20'
                                                }`}>
                                                {emergency.type === 'Voice Alert' ? (
                                                    <Mic size={18} className="text-[#6FA3D8]" />
                                                ) : (
                                                    <AlertTriangle size={18} className="text-[#E85D2A]" />
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-semibold text-[#1F2937] truncate">
                                                        {emergency.worker?.fullName || emergency.worker_name || 'Unknown'}
                                                    </span>
                                                    <Badge variant={getStatusBadge(emergency.status)} className="text-xs">
                                                        {emergency.status}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-[#6B7280] truncate">
                                                    {emergency.type}
                                                    {emergency.voiceCommand && ` - "${emergency.voiceCommand}"`}
                                                </p>
                                                <div className="flex items-center gap-3 mt-1 text-xs text-[#9CA3AF]">
                                                    <span className="flex items-center gap-1">
                                                        <Radio size={10} />
                                                        {emergency.deviceId || emergency.device}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock size={10} />
                                                        {getElapsedTime(emergency.createdAt || emergency.timestamp)}
                                                    </span>
                                                </div>
                                                {emergency.assignedTo && (
                                                    <div className="flex items-center gap-1 mt-1 text-xs text-[#6FA3D8]">
                                                        <UserCheck size={10} />
                                                        Assigned: {emergency.assignedTo}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Actions */}
                                    <div className="px-3 pb-3 flex gap-2">
                                        {emergency.status === 'Pending' && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="warning"
                                                    className="flex-1 text-xs py-1.5"
                                                    onClick={() => handleAcknowledge(emergency.id)}
                                                    disabled={isLoading}
                                                >
                                                    <CheckCircle size={12} className="mr-1" />
                                                    Acknowledge
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="primary"
                                                    className="flex-1 text-xs py-1.5"
                                                    onClick={() => handleRespond(emergency.id)}
                                                    disabled={isLoading}
                                                >
                                                    <Play size={12} className="mr-1" />
                                                    Respond
                                                </Button>
                                            </>
                                        )}
                                        {emergency.status === 'Acknowledged' && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="primary"
                                                    className="flex-1 text-xs py-1.5"
                                                    onClick={() => handleRespond(emergency.id)}
                                                    disabled={isLoading}
                                                >
                                                    <Play size={12} className="mr-1" />
                                                    Respond
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="success"
                                                    className="flex-1 text-xs py-1.5"
                                                    onClick={() => handleResolve(emergency.id)}
                                                    disabled={isLoading}
                                                >
                                                    <CheckCircle size={12} className="mr-1" />
                                                    Resolve
                                                </Button>
                                            </>
                                        )}
                                        {emergency.status === 'Responding' && (
                                            <Button
                                                size="sm"
                                                variant="success"
                                                className="flex-1 text-xs py-1.5"
                                                onClick={() => handleResolve(emergency.id)}
                                                disabled={isLoading}
                                            >
                                                <CheckCircle size={12} className="mr-1" />
                                                Mark Resolved
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-3 border-t border-[#E3E6EB] bg-white">
                        <div className="flex items-center justify-between text-xs text-[#6B7280]">
                            <span className="flex items-center gap-1">
                                <span className={`w-2 h-2 rounded-full ${connected ? 'bg-[#22c55e]' : 'bg-[#E85D2A]'}`} />
                                {connected ? 'Live' : 'Disconnected'}
                            </span>
                            <button
                                onClick={fetchActiveEmergencies}
                                className="text-[#6FA3D8] hover:text-[#2F4A6D]"
                            >
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

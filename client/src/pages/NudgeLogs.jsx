import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, Clock, AlertTriangle, XCircle, Filter, RefreshCw, User, Shield, Loader2 } from 'lucide-react';
import { CardDark, CardBody } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { sensorsApi } from '../utils/api';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';

export const NudgeLogs = () => {
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState({ total: 0, pending: 0, acknowledged: 0, expired: 0, escalated: 0 });
    const [statusFilter, setStatusFilter] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const { socket } = useSocket();
    const toast = useToast();

    // Fetch nudge logs
    const fetchLogs = async (showRefresh = false) => {
        try {
            if (showRefresh) setIsRefreshing(true);
            const params = {};
            if (statusFilter) params.status = statusFilter;
            const response = await sensorsApi.getNudgeLogs(params);
            setLogs(response.data.logs || []);
            setStats(response.data.stats || { total: 0, pending: 0, acknowledged: 0, expired: 0, escalated: 0 });
        } catch (error) {
            console.error('Failed to fetch nudge logs:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [statusFilter]);

    // Listen for real-time nudge events
    useEffect(() => {
        if (!socket) return;

        const handleNudgeSent = () => fetchLogs();
        const handleNudgeAck = () => fetchLogs();
        const handleNudgeExpired = () => fetchLogs();
        const handleNudgeEscalated = (data) => {
            fetchLogs();
            toast.error(`${data.workerName} auto-escalated — ${data.unansweredCount} unanswered nudges!`, 'AUTO-ESCALATION');
        };

        socket.on('nudge_sent', handleNudgeSent);
        socket.on('nudge_acknowledged', handleNudgeAck);
        socket.on('nudge_expired', handleNudgeExpired);
        socket.on('nudge_escalated', handleNudgeEscalated);

        return () => {
            socket.off('nudge_sent', handleNudgeSent);
            socket.off('nudge_acknowledged', handleNudgeAck);
            socket.off('nudge_expired', handleNudgeExpired);
            socket.off('nudge_escalated', handleNudgeEscalated);
        };
    }, [socket]);

    const getStatusBadge = (status, escalated) => {
        if (escalated) return <Badge variant="danger" className="text-xs">🚨 Escalated</Badge>;
        switch (status) {
            case 'Pending': return <Badge variant="warning" className="text-xs"><Clock size={12} className="mr-1" />Pending</Badge>;
            case 'Acknowledged': return <Badge variant="success" className="text-xs"><CheckCircle size={12} className="mr-1" />Acknowledged</Badge>;
            case 'Expired': return <Badge variant="danger" className="text-xs"><XCircle size={12} className="mr-1" />Expired</Badge>;
            default: return <Badge variant="secondary" className="text-xs">{status}</Badge>;
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '—';
        return new Date(timestamp).toLocaleString();
    };

    const formatResponseTime = (ms) => {
        if (!ms) return '—';
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(1)}s`;
    };

    // Calculate response rate
    const responseRate = stats.total > 0
        ? Math.round((stats.acknowledged / (stats.acknowledged + stats.expired)) * 100) || 0
        : 0;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-[#6FA3D8]" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-[#1F2937] mb-2">Nudge Logs</h1>
                    <p className="text-[#4B5563]">Track all nudge operations, responses, and escalations</p>
                </div>
                <Button
                    variant="outline"
                    onClick={() => fetchLogs(true)}
                    disabled={isRefreshing}
                >
                    <RefreshCw size={16} className={`mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <MetricCard
                    title="Total Nudges"
                    value={stats.total}
                    icon={Bell}
                    color="bg-[#3B82F6]"
                    subtitle="All time"
                />
                <MetricCard
                    title="Pending"
                    value={stats.pending}
                    icon={Clock}
                    color="bg-[#F59E0B]"
                    subtitle="Awaiting response"
                />
                <MetricCard
                    title="Acknowledged"
                    value={stats.acknowledged}
                    icon={CheckCircle}
                    color="bg-[#10B981]"
                    subtitle="Worker responded"
                />
                <MetricCard
                    title="Expired"
                    value={stats.expired}
                    icon={XCircle}
                    color="bg-[#EF4444]"
                    subtitle="No response"
                />
                <MetricCard
                    title="Escalated"
                    value={stats.escalated}
                    icon={AlertTriangle}
                    color="bg-[#E85D2A]"
                    subtitle="Auto-prioritized"
                />
            </div>

            {/* Response Rate Bar */}
            <CardDark>
                <CardBody className="p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-[#4B5563]">Overall Response Rate</span>
                        <span className={`text-lg font-bold ${responseRate >= 80 ? 'text-green-600' : responseRate >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                            {responseRate}%
                        </span>
                    </div>
                    <div className="w-full bg-[#E3E6EB] rounded-full h-3">
                        <div
                            className={`h-3 rounded-full transition-all duration-500 ${responseRate >= 80 ? 'bg-green-500' : responseRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${responseRate}%` }}
                        />
                    </div>
                </CardBody>
            </CardDark>

            {/* Filter */}
            <div className="flex items-center gap-3">
                <Filter size={16} className="text-[#6B7280]" />
                <span className="text-sm text-[#4B5563] font-medium">Filter:</span>
                {['', 'Pending', 'Acknowledged', 'Expired'].map(f => (
                    <button
                        key={f || 'all'}
                        onClick={() => setStatusFilter(f)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${statusFilter === f
                            ? 'bg-[#6FA3D8] text-white shadow-md'
                            : 'bg-white text-[#4B5563] border border-[#E3E6EB] hover:bg-[#EEF1F4]'
                            }`}
                    >
                        {f || 'All'}
                    </button>
                ))}
            </div>

            {/* Logs Table */}
            <CardDark>
                <CardBody className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[#E3E6EB] bg-[#EEF1F4]">
                                    <th className="text-left p-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Time</th>
                                    <th className="text-left p-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Worker</th>
                                    <th className="text-left p-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Device</th>
                                    <th className="text-left p-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Sent By</th>
                                    <th className="text-left p-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Status</th>
                                    <th className="text-left p-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Response Time</th>
                                    <th className="text-left p-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Message</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="p-12 text-center">
                                            <Bell className="h-12 w-12 text-[#D1D5DB] mx-auto mb-3" />
                                            <p className="text-[#6B7280] font-medium">No nudge logs found</p>
                                            <p className="text-[#9CA3AF] text-sm mt-1">Nudge logs will appear here when nudges are sent from Live Monitoring</p>
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log) => (
                                        <tr key={log.id} className={`border-b border-[#E3E6EB] hover:bg-[#EEF1F4]/50 transition-colors ${log.escalated ? 'bg-red-50' : ''}`}>
                                            <td className="p-4 text-sm text-[#4B5563] whitespace-nowrap">
                                                {formatTime(log.createdAt)}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 bg-[#6FA3D8]/20 rounded-full flex items-center justify-center">
                                                        <User size={14} className="text-[#6FA3D8]" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-[#1F2937]">{log.worker?.fullName || 'Unknown'}</p>
                                                        <p className="text-xs text-[#6B7280]">{log.worker?.department || '—'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <Badge variant="info" className="text-xs">{log.deviceId}</Badge>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-1.5">
                                                    <Shield size={14} className="text-[#6B7280]" />
                                                    <span className="text-sm text-[#4B5563]">{log.sentBy}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                {getStatusBadge(log.status, log.escalated)}
                                            </td>
                                            <td className="p-4">
                                                <span className={`text-sm font-mono ${log.status === 'Acknowledged' ? 'text-green-600' : 'text-[#6B7280]'}`}>
                                                    {formatResponseTime(log.responseTimeMs)}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className="text-sm text-[#4B5563] truncate max-w-[200px] block">{log.message || '—'}</span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardBody>
            </CardDark>
        </div>
    );
};

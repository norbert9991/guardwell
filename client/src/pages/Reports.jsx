import React, { useState, useEffect } from 'react';
import { Download, Calendar, FileText, Users, Radio, AlertTriangle, Shield, TrendingUp, BarChart3, PieChart } from 'lucide-react';
import { CardDark, CardBody, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { MetricCard } from '../components/ui/MetricCard';
import { reportsApi } from '../utils/api';
import { useAuth, PERMISSIONS } from '../context/AuthContext';

export const Reports = () => {
    const [reportType, setReportType] = useState('worker-safety');
    const [dateRange, setDateRange] = useState({
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [reportData, setReportData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const { hasPermission } = useAuth();

    // Permission checks
    const canExportReports = hasPermission(PERMISSIONS.EXPORT_REPORTS);

    // Fetch report data
    const fetchReport = async () => {
        setIsLoading(true);
        setError(null);
        try {
            let response;
            switch (reportType) {
                case 'worker-safety':
                    response = await reportsApi.getWorkerSafety(dateRange.start, dateRange.end);
                    break;
                case 'device-performance':
                    response = await reportsApi.getDevicePerformance(dateRange.start, dateRange.end);
                    break;
                case 'alert-analytics':
                    response = await reportsApi.getAlertAnalytics(dateRange.start, dateRange.end);
                    break;
                case 'compliance':
                    response = await reportsApi.getCompliance(dateRange.start, dateRange.end);
                    break;
                default:
                    response = await reportsApi.getWorkerSafety(dateRange.start, dateRange.end);
            }
            setReportData(response.data);
        } catch (err) {
            console.error('Failed to fetch report:', err);
            setError('Failed to load report data');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [reportType, dateRange]);

    // Export to CSV
    const exportToCSV = () => {
        if (!reportData) return;

        let csvContent = '';
        const fileName = `${reportType}-report-${dateRange.start}-${dateRange.end}.csv`;

        if (reportType === 'worker-safety' && reportData.summary) {
            csvContent = 'Metric,Value\n';
            Object.entries(reportData.summary).forEach(([key, value]) => {
                csvContent += `${key},${value}\n`;
            });
            csvContent += '\nIncidents by Severity\n';
            Object.entries(reportData.incidentsBySeverity || {}).forEach(([key, value]) => {
                csvContent += `${key},${value}\n`;
            });
        } else if (reportData.summary) {
            csvContent = 'Metric,Value\n';
            Object.entries(reportData.summary).forEach(([key, value]) => {
                csvContent += `${key},${value}\n`;
            });
        }

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    // Print report (PDF via browser)
    const printReport = () => {
        window.print();
    };

    // Render metrics based on report type
    const renderMetrics = () => {
        if (!reportData?.summary) return null;

        switch (reportType) {
            case 'worker-safety':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricCard
                            title="Total Workers"
                            value={reportData.summary.totalWorkers}
                            icon={Users}
                            color="bg-[#3B82F6]"
                            subtitle={`${reportData.summary.activeWorkers} active`}
                        />
                        <MetricCard
                            title="Total Incidents"
                            value={reportData.summary.totalIncidents}
                            icon={AlertTriangle}
                            color="bg-[#F59E0B]"
                            subtitle={`${reportData.summary.criticalIncidents} critical`}
                        />
                        <MetricCard
                            title="Total Alerts"
                            value={reportData.summary.totalAlerts}
                            icon={Shield}
                            color="bg-[#EF4444]"
                            subtitle="In date range"
                        />
                        <MetricCard
                            title="Resolved"
                            value={reportData.summary.resolvedIncidents}
                            icon={TrendingUp}
                            color="bg-[#10B981]"
                            subtitle="Incidents resolved"
                        />
                    </div>
                );

            case 'device-performance':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricCard
                            title="Total Devices"
                            value={reportData.summary.totalDevices}
                            icon={Radio}
                            color="bg-[#3B82F6]"
                            subtitle={`${reportData.summary.activeDevices} active`}
                        />
                        <MetricCard
                            title="Assigned"
                            value={reportData.summary.assignedDevices}
                            icon={Users}
                            color="bg-[#10B981]"
                            subtitle="With workers"
                        />
                        <MetricCard
                            title="Offline"
                            value={reportData.summary.offlineDevices}
                            icon={AlertTriangle}
                            color="bg-[#EF4444]"
                            subtitle="Need attention"
                        />
                        <MetricCard
                            title="Avg Battery"
                            value={`${reportData.summary.avgBattery}%`}
                            icon={TrendingUp}
                            color="bg-[#F59E0B]"
                            subtitle="Fleet average"
                        />
                    </div>
                );

            case 'alert-analytics':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricCard
                            title="Total Alerts"
                            value={reportData.summary.totalAlerts}
                            icon={AlertTriangle}
                            color="bg-[#3B82F6]"
                            subtitle="In date range"
                        />
                        <MetricCard
                            title="Critical"
                            value={reportData.summary.criticalAlerts}
                            icon={Shield}
                            color="bg-[#EF4444]"
                            subtitle="High priority"
                        />
                        <MetricCard
                            title="Pending"
                            value={reportData.summary.pendingAlerts}
                            icon={FileText}
                            color="bg-[#F59E0B]"
                            subtitle="Awaiting action"
                        />
                        <MetricCard
                            title="Avg Response"
                            value={`${reportData.summary.avgResponseTimeMinutes}m`}
                            icon={TrendingUp}
                            color="bg-[#10B981]"
                            subtitle="Time to acknowledge"
                        />
                    </div>
                );

            case 'compliance':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricCard
                            title="Safety Score"
                            value={`${reportData.summary.safetyScore}%`}
                            icon={Shield}
                            color={reportData.summary.safetyScore >= 80 ? "bg-[#10B981]" : reportData.summary.safetyScore >= 60 ? "bg-[#F59E0B]" : "bg-[#EF4444]"}
                            subtitle="Overall rating"
                        />
                        <MetricCard
                            title="Device Coverage"
                            value={`${reportData.summary.deviceCoverage}%`}
                            icon={Radio}
                            color="bg-[#3B82F6]"
                            subtitle="Workers with devices"
                        />
                        <MetricCard
                            title="Incident Resolution"
                            value={`${reportData.summary.incidentResolutionRate}%`}
                            icon={AlertTriangle}
                            color="bg-[#10B981]"
                            subtitle="Resolved rate"
                        />
                        <MetricCard
                            title="Alert Resolution"
                            value={`${reportData.summary.alertResolutionRate}%`}
                            icon={TrendingUp}
                            color="bg-[#10B981]"
                            subtitle="Resolved rate"
                        />
                    </div>
                );

            default:
                return null;
        }
    };

    // Render charts/details
    const renderDetails = () => {
        if (!reportData) return null;

        switch (reportType) {
            case 'worker-safety':
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Incidents by Severity */}
                        <CardDark>
                            <CardHeader className="px-6 py-4 border-b border-gray-700">
                                <h3 className="font-semibold text-white flex items-center gap-2">
                                    <BarChart3 size={18} />
                                    Incidents by Severity
                                </h3>
                            </CardHeader>
                            <CardBody className="p-6">
                                <div className="space-y-3">
                                    {Object.entries(reportData.incidentsBySeverity || {}).map(([severity, count]) => {
                                        const colors = {
                                            Critical: 'bg-red-500',
                                            High: 'bg-orange-500',
                                            Medium: 'bg-yellow-500',
                                            Low: 'bg-green-500'
                                        };
                                        const maxCount = Math.max(...Object.values(reportData.incidentsBySeverity || {}), 1);
                                        return (
                                            <div key={severity} className="flex items-center gap-3">
                                                <span className="w-20 text-sm text-gray-400">{severity}</span>
                                                <div className="flex-1 h-6 bg-gray-700 rounded overflow-hidden">
                                                    <div
                                                        className={`h-full ${colors[severity]} transition-all`}
                                                        style={{ width: `${(count / maxCount) * 100}%` }}
                                                    />
                                                </div>
                                                <span className="w-8 text-right text-white font-semibold">{count}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardBody>
                        </CardDark>

                        {/* Incidents by Type */}
                        <CardDark>
                            <CardHeader className="px-6 py-4 border-b border-gray-700">
                                <h3 className="font-semibold text-white flex items-center gap-2">
                                    <PieChart size={18} />
                                    Incidents by Type
                                </h3>
                            </CardHeader>
                            <CardBody className="p-6">
                                <div className="space-y-2">
                                    {Object.entries(reportData.incidentsByType || {}).map(([type, count]) => (
                                        <div key={type} className="flex justify-between items-center py-2 border-b border-gray-700/50">
                                            <span className="text-gray-300">{type}</span>
                                            <span className="text-white font-semibold">{count}</span>
                                        </div>
                                    ))}
                                    {Object.keys(reportData.incidentsByType || {}).length === 0 && (
                                        <p className="text-gray-500 text-center py-4">No incidents in this period</p>
                                    )}
                                </div>
                            </CardBody>
                        </CardDark>
                    </div>
                );

            case 'device-performance':
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Devices by Status */}
                        <CardDark>
                            <CardHeader className="px-6 py-4 border-b border-gray-700">
                                <h3 className="font-semibold text-white flex items-center gap-2">
                                    <BarChart3 size={18} />
                                    Devices by Status
                                </h3>
                            </CardHeader>
                            <CardBody className="p-6">
                                <div className="space-y-3">
                                    {Object.entries(reportData.devicesByStatus || {}).map(([status, count]) => {
                                        const colors = {
                                            Active: 'bg-green-500',
                                            Available: 'bg-blue-500',
                                            Maintenance: 'bg-yellow-500',
                                            Offline: 'bg-red-500'
                                        };
                                        const maxCount = Math.max(...Object.values(reportData.devicesByStatus || {}), 1);
                                        return (
                                            <div key={status} className="flex items-center gap-3">
                                                <span className="w-24 text-sm text-gray-400">{status}</span>
                                                <div className="flex-1 h-6 bg-gray-700 rounded overflow-hidden">
                                                    <div
                                                        className={`h-full ${colors[status]} transition-all`}
                                                        style={{ width: `${(count / maxCount) * 100}%` }}
                                                    />
                                                </div>
                                                <span className="w-8 text-right text-white font-semibold">{count}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardBody>
                        </CardDark>

                        {/* Sensor Averages */}
                        <CardDark>
                            <CardHeader className="px-6 py-4 border-b border-gray-700">
                                <h3 className="font-semibold text-white flex items-center gap-2">
                                    <TrendingUp size={18} />
                                    Average Sensor Readings
                                </h3>
                            </CardHeader>
                            <CardBody className="p-6">
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div className="bg-[#0d1220] p-4 rounded-lg border border-[#2d3a52]">
                                        <p className="text-2xl font-bold text-white">{reportData.avgReadings?.temperature || 0}°C</p>
                                        <p className="text-sm text-gray-400">Temperature</p>
                                    </div>
                                    <div className="bg-[#0d1220] p-4 rounded-lg border border-[#2d3a52]">
                                        <p className="text-2xl font-bold text-white">{reportData.avgReadings?.humidity || 0}%</p>
                                        <p className="text-sm text-gray-400">Humidity</p>
                                    </div>
                                    <div className="bg-[#0d1220] p-4 rounded-lg border border-[#2d3a52]">
                                        <p className="text-2xl font-bold text-white">{reportData.avgReadings?.gasLevel || 0}</p>
                                        <p className="text-sm text-gray-400">Gas (PPM)</p>
                                    </div>
                                </div>
                            </CardBody>
                        </CardDark>
                    </div>
                );

            case 'alert-analytics':
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Alerts by Type */}
                        <CardDark>
                            <CardHeader className="px-6 py-4 border-b border-gray-700">
                                <h3 className="font-semibold text-white flex items-center gap-2">
                                    <PieChart size={18} />
                                    Alerts by Type
                                </h3>
                            </CardHeader>
                            <CardBody className="p-6">
                                <div className="space-y-2">
                                    {Object.entries(reportData.alertsByType || {}).map(([type, count]) => (
                                        <div key={type} className="flex justify-between items-center py-2 border-b border-gray-700/50">
                                            <span className="text-gray-300">{type}</span>
                                            <span className="text-white font-semibold">{count}</span>
                                        </div>
                                    ))}
                                    {Object.keys(reportData.alertsByType || {}).length === 0 && (
                                        <p className="text-gray-500 text-center py-4">No alerts in this period</p>
                                    )}
                                </div>
                            </CardBody>
                        </CardDark>

                        {/* Alerts by Severity */}
                        <CardDark>
                            <CardHeader className="px-6 py-4 border-b border-gray-700">
                                <h3 className="font-semibold text-white flex items-center gap-2">
                                    <BarChart3 size={18} />
                                    Alerts by Severity
                                </h3>
                            </CardHeader>
                            <CardBody className="p-6">
                                <div className="space-y-3">
                                    {Object.entries(reportData.alertsBySeverity || {}).map(([severity, count]) => {
                                        const colors = {
                                            Critical: 'bg-red-500',
                                            High: 'bg-orange-500',
                                            Medium: 'bg-yellow-500',
                                            Low: 'bg-green-500'
                                        };
                                        const maxCount = Math.max(...Object.values(reportData.alertsBySeverity || {}), 1);
                                        return (
                                            <div key={severity} className="flex items-center gap-3">
                                                <span className="w-20 text-sm text-gray-400">{severity}</span>
                                                <div className="flex-1 h-6 bg-gray-700 rounded overflow-hidden">
                                                    <div
                                                        className={`h-full ${colors[severity]} transition-all`}
                                                        style={{ width: `${(count / maxCount) * 100}%` }}
                                                    />
                                                </div>
                                                <span className="w-8 text-right text-white font-semibold">{count}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardBody>
                        </CardDark>
                    </div>
                );

            case 'compliance':
                return (
                    <CardDark>
                        <CardHeader className="px-6 py-4 border-b border-gray-700">
                            <h3 className="font-semibold text-white flex items-center gap-2">
                                <FileText size={18} />
                                Detailed Metrics
                            </h3>
                        </CardHeader>
                        <CardBody className="p-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {reportData.metrics && Object.entries(reportData.metrics).map(([key, value]) => (
                                    <div key={key} className="bg-[#0d1220] p-4 rounded-lg border border-[#2d3a52] text-center">
                                        <p className="text-2xl font-bold text-white">{value}</p>
                                        <p className="text-sm text-gray-400">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                                    </div>
                                ))}
                            </div>
                        </CardBody>
                    </CardDark>
                );

            default:
                return null;
        }
    };

    return (
        <div className="space-y-6 print:bg-white print:text-black">
            <div className="flex items-center justify-between print:hidden">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Reports & Analytics</h1>
                    <p className="text-gray-400">Generate and view system reports with real data</p>
                </div>
            </div>

            {/* Report Controls */}
            <CardDark className="print:hidden">
                <CardBody className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Report Type</label>
                            <select
                                value={reportType}
                                onChange={(e) => setReportType(e.target.value)}
                                className="input-dark w-full"
                            >
                                <option value="worker-safety">Worker Safety Report</option>
                                <option value="device-performance">Device Performance Report</option>
                                <option value="alert-analytics">Alert Analytics</option>
                                <option value="compliance">Compliance Report</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                className="input-dark w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                className="input-dark w-full"
                            />
                        </div>
                        <div className="flex items-end gap-2">
                            {canExportReports ? (
                                <>
                                    <Button variant="secondary" icon={<Download size={18} />} onClick={exportToCSV}>
                                        Export CSV
                                    </Button>
                                    <Button variant="primary" icon={<FileText size={18} />} onClick={printReport}>
                                        Print PDF
                                    </Button>
                                </>
                            ) : (
                                <span className="text-xs text-gray-500 italic">Export requires Admin access</span>
                            )}
                        </div>
                    </div>
                </CardBody>
            </CardDark>

            {/* Loading State */}
            {isLoading && (
                <div className="flex items-center justify-center h-32">
                    <div className="text-gray-400">Loading report data...</div>
                </div>
            )}

            {/* Error State */}
            {error && (
                <CardDark>
                    <CardBody className="p-6 text-center">
                        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <p className="text-red-400">{error}</p>
                        <Button variant="secondary" className="mt-4" onClick={fetchReport}>
                            Retry
                        </Button>
                    </CardBody>
                </CardDark>
            )}

            {/* Report Content */}
            {!isLoading && !error && reportData && (
                <div className="space-y-6">
                    {/* Print Header */}
                    <div className="hidden print:block mb-8">
                        <h1 className="text-2xl font-bold">{reportType.replace('-', ' ').toUpperCase()} REPORT</h1>
                        <p className="text-gray-600">
                            Period: {dateRange.start} to {dateRange.end}
                        </p>
                        <p className="text-gray-600">Generated: {new Date().toLocaleString()}</p>
                    </div>

                    {/* Metrics */}
                    {renderMetrics()}

                    {/* Detailed Charts */}
                    {renderDetails()}
                </div>
            )}
        </div>
    );
};

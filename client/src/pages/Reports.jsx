import React, { useState, useEffect, useCallback } from 'react';
import { Download, Calendar, FileText, Users, Radio, AlertTriangle, Shield, TrendingUp, BarChart3, PieChart, Brain, Zap, Clock, ThermometerSun, Droplets, Wind, Award } from 'lucide-react';
import { CardDark, CardBody, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { MetricCard } from '../components/ui/MetricCard';
import { reportsApi } from '../utils/api';
import { useAuth, PERMISSIONS } from '../context/AuthContext';
import { useRefresh } from '../context/RefreshContext';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Bar, Line, Doughnut, Pie } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

// Curated color palette
const CHART_COLORS = {
    red: 'rgba(239, 68, 68, 0.85)',
    orange: 'rgba(245, 158, 11, 0.85)',
    yellow: 'rgba(234, 179, 8, 0.85)',
    green: 'rgba(16, 185, 129, 0.85)',
    blue: 'rgba(59, 130, 246, 0.85)',
    indigo: 'rgba(99, 102, 241, 0.85)',
    purple: 'rgba(139, 92, 246, 0.85)',
    pink: 'rgba(236, 72, 153, 0.85)',
    teal: 'rgba(20, 184, 166, 0.85)',
    cyan: 'rgba(6, 182, 212, 0.85)',
};
const CHART_COLORS_LIGHT = {
    red: 'rgba(239, 68, 68, 0.15)',
    orange: 'rgba(245, 158, 11, 0.15)',
    yellow: 'rgba(234, 179, 8, 0.15)',
    green: 'rgba(16, 185, 129, 0.15)',
    blue: 'rgba(59, 130, 246, 0.15)',
    indigo: 'rgba(99, 102, 241, 0.15)',
    purple: 'rgba(139, 92, 246, 0.15)',
    pink: 'rgba(236, 72, 153, 0.15)',
    teal: 'rgba(20, 184, 166, 0.15)',
    cyan: 'rgba(6, 182, 212, 0.15)',
};
const SEVERITY_COLORS = {
    Critical: CHART_COLORS.red,
    High: CHART_COLORS.orange,
    Medium: CHART_COLORS.yellow,
    Low: CHART_COLORS.green,
};
const SEVERITY_BORDERS = {
    Critical: 'rgba(239, 68, 68, 1)',
    High: 'rgba(245, 158, 11, 1)',
    Medium: 'rgba(234, 179, 8, 1)',
    Low: 'rgba(16, 185, 129, 1)',
};

// Shared chart options
const defaultDoughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, pointStyle: 'circle', font: { size: 12 } } },
        tooltip: {
            backgroundColor: 'rgba(31, 41, 55, 0.95)',
            titleFont: { size: 13 },
            bodyFont: { size: 12 },
            padding: 12,
            cornerRadius: 8,
        }
    },
    cutout: '60%',
};

const defaultBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        tooltip: {
            backgroundColor: 'rgba(31, 41, 55, 0.95)',
            titleFont: { size: 13 },
            bodyFont: { size: 12 },
            padding: 12,
            cornerRadius: 8,
        }
    },
    scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#6B7280' } },
        y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 11 }, color: '#6B7280', precision: 0 }, beginAtZero: true }
    }
};

const defaultLineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { position: 'top', labels: { usePointStyle: true, pointStyle: 'circle', font: { size: 12 }, padding: 16 } },
        tooltip: {
            backgroundColor: 'rgba(31, 41, 55, 0.95)',
            titleFont: { size: 13 },
            bodyFont: { size: 12 },
            padding: 12,
            cornerRadius: 8,
            mode: 'index',
            intersect: false,
        }
    },
    scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#6B7280', maxRotation: 45 } },
        y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 11 }, color: '#6B7280', precision: 0 }, beginAtZero: true }
    },
    interaction: { mode: 'nearest', axis: 'x', intersect: false },
};

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
    const fetchReport = useCallback(async () => {
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
    }, [reportType, dateRange]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    // Register refresh
    const { registerRefresh } = useRefresh();
    useEffect(() => { registerRefresh(fetchReport); }, [registerRefresh, fetchReport]);

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
                            title="Avg Uptime"
                            value={`${reportData.summary.avgUptime ?? 'N/A'}%`}
                            icon={TrendingUp}
                            color="bg-[#F59E0B]"
                            subtitle="Device connectivity"
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

    // ===================== CHART RENDERERS =====================

    const renderWorkerSafetyCharts = () => {
        if (!reportData) return null;

        const severityData = reportData.incidentsBySeverity || {};
        const typeData = reportData.incidentsByType || {};
        const statusData = reportData.incidentsByStatus || {};
        const dailyData = reportData.dailyIncidents || [];

        // Doughnut — Incidents by Severity
        const severityChartData = {
            labels: Object.keys(severityData),
            datasets: [{
                data: Object.values(severityData),
                backgroundColor: Object.keys(severityData).map(k => SEVERITY_COLORS[k] || CHART_COLORS.blue),
                borderColor: Object.keys(severityData).map(k => SEVERITY_BORDERS[k] || 'rgba(59,130,246,1)'),
                borderWidth: 2,
            }]
        };

        // Bar — Incidents by Type
        const typeLabels = Object.keys(typeData);
        const palette = [CHART_COLORS.blue, CHART_COLORS.indigo, CHART_COLORS.purple, CHART_COLORS.teal, CHART_COLORS.cyan, CHART_COLORS.pink, CHART_COLORS.orange];
        const typeChartData = {
            labels: typeLabels,
            datasets: [{
                label: 'Count',
                data: Object.values(typeData),
                backgroundColor: typeLabels.map((_, i) => palette[i % palette.length]),
                borderColor: typeLabels.map((_, i) => palette[i % palette.length].replace('0.85', '1')),
                borderWidth: 1,
                borderRadius: 6,
            }]
        };

        // Pie — Incidents by Status
        const statusLabels = Object.keys(statusData);
        const statusColors = [CHART_COLORS.red, CHART_COLORS.orange, CHART_COLORS.green, CHART_COLORS.blue];
        const statusChartData = {
            labels: statusLabels,
            datasets: [{
                data: Object.values(statusData),
                backgroundColor: statusLabels.map((_, i) => statusColors[i % statusColors.length]),
                borderColor: '#ffffff',
                borderWidth: 2,
            }]
        };

        // Line — Daily Incident Trend
        const trendChartData = {
            labels: dailyData.map(d => d.date.slice(5)), // MM-DD format
            datasets: [{
                label: 'Incidents',
                data: dailyData.map(d => d.count),
                borderColor: CHART_COLORS.red,
                backgroundColor: CHART_COLORS_LIGHT.red,
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointHoverRadius: 6,
                pointBackgroundColor: CHART_COLORS.red,
            }]
        };

        const hasSeverity = Object.values(severityData).some(v => v > 0);
        const hasType = typeLabels.length > 0;
        const hasStatus = Object.values(statusData).some(v => v > 0);
        const hasTrend = dailyData.length > 0;

        return (
            <div className="space-y-6">
                {/* Row 1: Doughnut + Pie */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <CardDark>
                        <CardHeader className="px-6 py-4 border-b border-[#E3E6EB]">
                            <h3 className="font-semibold text-[#1F2937] flex items-center gap-2">
                                <PieChart size={18} className="text-[#EF4444]" />
                                Incidents by Severity
                            </h3>
                        </CardHeader>
                        <CardBody className="p-6">
                            <div className="h-64 flex items-center justify-center">
                                {hasSeverity ? (
                                    <Doughnut data={severityChartData} options={defaultDoughnutOptions} />
                                ) : (
                                    <p className="text-[#6B7280] text-center">No incident data for this period</p>
                                )}
                            </div>
                        </CardBody>
                    </CardDark>

                    <CardDark>
                        <CardHeader className="px-6 py-4 border-b border-[#E3E6EB]">
                            <h3 className="font-semibold text-[#1F2937] flex items-center gap-2">
                                <PieChart size={18} className="text-[#3B82F6]" />
                                Incidents by Status
                            </h3>
                        </CardHeader>
                        <CardBody className="p-6">
                            <div className="h-64 flex items-center justify-center">
                                {hasStatus ? (
                                    <Pie data={statusChartData} options={{
                                        ...defaultDoughnutOptions,
                                        cutout: 0,
                                    }} />
                                ) : (
                                    <p className="text-[#6B7280] text-center">No incident data for this period</p>
                                )}
                            </div>
                        </CardBody>
                    </CardDark>
                </div>

                {/* Row 2: Bar chart */}
                <CardDark>
                    <CardHeader className="px-6 py-4 border-b border-[#E3E6EB]">
                        <h3 className="font-semibold text-[#1F2937] flex items-center gap-2">
                            <BarChart3 size={18} className="text-[#6366F1]" />
                            Incidents by Type
                        </h3>
                    </CardHeader>
                    <CardBody className="p-6">
                        <div className="h-72">
                            {hasType ? (
                                <Bar data={typeChartData} options={defaultBarOptions} />
                            ) : (
                                <div className="h-full flex items-center justify-center">
                                    <p className="text-[#6B7280]">No incident types recorded in this period</p>
                                </div>
                            )}
                        </div>
                    </CardBody>
                </CardDark>

                {/* Row 3: Trend line chart */}
                <CardDark>
                    <CardHeader className="px-6 py-4 border-b border-[#E3E6EB]">
                        <h3 className="font-semibold text-[#1F2937] flex items-center gap-2">
                            <TrendingUp size={18} className="text-[#EF4444]" />
                            Daily Incident Trend
                        </h3>
                    </CardHeader>
                    <CardBody className="p-6">
                        <div className="h-72">
                            {hasTrend ? (
                                <Line data={trendChartData} options={defaultLineOptions} />
                            ) : (
                                <div className="h-full flex items-center justify-center">
                                    <p className="text-[#6B7280]">No daily trend data available for this period</p>
                                </div>
                            )}
                        </div>
                    </CardBody>
                </CardDark>

            {/* ══ ANALYTICS INSIGHTS ══ */}
            {reportData.analytics && (
                <div className="space-y-6">
                    <div className="flex items-center gap-3 pt-4">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg">
                            <Brain size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-[#1F2937]">Analytics Insights</h3>
                            <p className="text-sm text-[#6B7280]">AI-powered risk analysis using weighted scoring algorithm</p>
                        </div>
                    </div>

                    {/* Incident Trend */}
                    {reportData.analytics.incidentTrend && (
                        <CardDark className="border-l-4 border-l-purple-500">
                            <CardBody className="p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <TrendingUp size={18} className="text-purple-600" />
                                    <h4 className="font-semibold text-[#1F2937]">Incident Trend Analysis</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-[#EEF1F4] p-4 rounded-lg border border-[#E3E6EB] text-center">
                                        <p className={`text-2xl font-bold ${
                                            reportData.analytics.incidentTrend.direction === 'Rising' ? 'text-red-500' :
                                            reportData.analytics.incidentTrend.direction === 'Falling' ? 'text-green-500' : 'text-blue-500'
                                        }`}>
                                            {reportData.analytics.incidentTrend.direction === 'Rising' ? '📈' :
                                             reportData.analytics.incidentTrend.direction === 'Falling' ? '📉' : '➡️'}
                                            {' '}{reportData.analytics.incidentTrend.direction}
                                        </p>
                                        <p className="text-sm text-[#4B5563] mt-1">Trend Direction</p>
                                    </div>
                                    <div className="bg-[#EEF1F4] p-4 rounded-lg border border-[#E3E6EB] text-center">
                                        <p className="text-2xl font-bold text-[#1F2937]">
                                            {reportData.analytics.incidentTrend.percentageChange > 0 ? '+' : ''}
                                            {reportData.analytics.incidentTrend.percentageChange}%
                                        </p>
                                        <p className="text-sm text-[#4B5563] mt-1">Change vs Previous Period</p>
                                    </div>
                                    <div className="bg-[#EEF1F4] p-4 rounded-lg border border-[#E3E6EB] text-center">
                                        <p className="text-2xl font-bold text-[#1F2937]">{reportData.analytics.incidentTrend.recentAvg || 0}</p>
                                        <p className="text-sm text-[#4B5563] mt-1">Recent Daily Average</p>
                                    </div>
                                </div>
                            </CardBody>
                        </CardDark>
                    )}

                    {/* Worker Risk Scoring */}
                    <CardDark className="border-l-4 border-l-indigo-500">
                        <CardHeader className="px-6 py-4 border-b border-[#E3E6EB]">
                            <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-[#1F2937] flex items-center gap-2">
                                    <Zap size={18} className="text-indigo-600" />
                                    Worker Risk Scoring Algorithm
                                </h4>
                                <div className="flex items-center gap-3 text-xs">
                                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500"></span> High ({reportData.analytics.highRiskWorkers})</span>
                                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500"></span> Medium ({reportData.analytics.mediumRiskWorkers})</span>
                                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500"></span> Low ({reportData.analytics.lowRiskWorkers})</span>
                                </div>
                            </div>
                        </CardHeader>
                        <CardBody className="p-6">
                            <p className="text-xs text-[#6B7280] mb-4 bg-[#EEF1F4] p-3 rounded-lg border border-[#E3E6EB] font-mono">
                                Formula: RiskScore = (Critical×40) + (High×25) + (Medium×15) + (Low×5) + (RecentAlerts×10) + RecencyBonus
                            </p>
                            {reportData.analytics.workerRiskAnalysis?.length > 0 ? (
                                <div className="space-y-3">
                                    {reportData.analytics.workerRiskAnalysis.map((w, i) => (
                                        <div key={i} className="flex items-center gap-4 p-3 rounded-lg border border-[#E3E6EB] bg-white hover:bg-[#EEF1F4] transition-colors">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                                                w.riskLevel === 'High' ? 'bg-red-500' :
                                                w.riskLevel === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                                            }`}>
                                                {w.riskScore}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-[#1F2937]">{w.name}</p>
                                                <p className="text-xs text-[#6B7280]">
                                                    {w.factors.totalIncidents} incidents ({w.factors.criticalIncidents} critical) · {w.factors.recentAlerts} recent alerts
                                                </p>
                                            </div>
                                            <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                                                w.riskLevel === 'High' ? 'bg-red-100 text-red-700' :
                                                w.riskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                                            }`}>
                                                {w.riskLevel} Risk
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[#6B7280] text-center py-4">No risk data — no incidents or alerts recorded for workers</p>
                            )}
                        </CardBody>
                    </CardDark>
                </div>
            )}
        </div>
        );
    };

    const renderDevicePerformanceCharts = () => {
        if (!reportData) return null;

        const statusData = reportData.devicesByStatus || {};
        const typeData = reportData.devicesByType || {};
        const battery = reportData.batteryStats || {};
        const avgReadings = reportData.avgReadings || {};
        const dailySensor = reportData.dailySensorReadings || [];

        // Doughnut — Devices by Status
        const statusColors = { Active: CHART_COLORS.green, Available: CHART_COLORS.blue, Maintenance: CHART_COLORS.yellow, Offline: CHART_COLORS.red };
        const statusBorders = { Active: 'rgba(16,185,129,1)', Available: 'rgba(59,130,246,1)', Maintenance: 'rgba(234,179,8,1)', Offline: 'rgba(239,68,68,1)' };
        const statusChartData = {
            labels: Object.keys(statusData),
            datasets: [{
                data: Object.values(statusData),
                backgroundColor: Object.keys(statusData).map(k => statusColors[k] || CHART_COLORS.blue),
                borderColor: Object.keys(statusData).map(k => statusBorders[k] || 'rgba(59,130,246,1)'),
                borderWidth: 2,
            }]
        };


        // Bar — Device Types
        const typeLabels = Object.keys(typeData);
        const typePalette = [CHART_COLORS.blue, CHART_COLORS.indigo, CHART_COLORS.teal, CHART_COLORS.purple, CHART_COLORS.cyan];
        const typeChartData = {
            labels: typeLabels,
            datasets: [{
                label: 'Count',
                data: Object.values(typeData),
                backgroundColor: typeLabels.map((_, i) => typePalette[i % typePalette.length]),
                borderRadius: 6,
                borderWidth: 1,
                borderColor: typeLabels.map((_, i) => typePalette[i % typePalette.length].replace('0.85', '1')),
            }]
        };

        // Line — Daily Sensor Trends (temperature only — gas/humidity sensors removed)
        const sensorTrendData = {
            labels: dailySensor.map(d => d.date.slice(5)),
            datasets: [
                {
                    label: 'Temperature (°C)',
                    data: dailySensor.map(d => d.avgTemperature),
                    borderColor: CHART_COLORS.red,
                    backgroundColor: CHART_COLORS_LIGHT.red,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 2,
                    pointHoverRadius: 5,
                },
            ]
        };

        const hasStatus = Object.values(statusData).some(v => v > 0);
        const hasType = typeLabels.length > 0;
        const hasSensor = dailySensor.length > 0;

        return (
            <div className="space-y-6">
                {/* Row 1: Doughnut + Battery Bar */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <CardDark>
                        <CardHeader className="px-6 py-4 border-b border-[#E3E6EB]">
                            <h3 className="font-semibold text-[#1F2937] flex items-center gap-2">
                                <PieChart size={18} className="text-[#10B981]" />
                                Devices by Status
                            </h3>
                        </CardHeader>
                        <CardBody className="p-6">
                            <div className="h-64 flex items-center justify-center">
                                {hasStatus ? (
                                    <Doughnut data={statusChartData} options={defaultDoughnutOptions} />
                                ) : (
                                    <p className="text-[#6B7280]">No device data available</p>
                                )}
                            </div>
                        </CardBody>
                    </CardDark>

                    <CardDark>
                        <CardHeader className="px-6 py-4 border-b border-[#E3E6EB]">
                            <h3 className="font-semibold text-[#1F2937] flex items-center gap-2">
                                <BarChart3 size={18} className="text-[#6366F1]" />
                                Devices by Type
                            </h3>
                        </CardHeader>
                        <CardBody className="p-6">
                            <div className="h-64">
                                {hasType ? (
                                    <Bar data={typeChartData} options={defaultBarOptions} />
                                ) : (
                                    <div className="h-full flex items-center justify-center">
                                        <p className="text-[#6B7280]">No device type data</p>
                                    </div>
                                )}
                            </div>
                        </CardBody>
                    </CardDark>
                </div>

                {/* Row 2: Device Types + Sensor Averages */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <CardDark>
                        <CardHeader className="px-6 py-4 border-b border-[#E3E6EB]">
                            <h3 className="font-semibold text-[#1F2937] flex items-center gap-2">
                                <BarChart3 size={18} className="text-[#6366F1]" />
                                Devices by Type
                            </h3>
                        </CardHeader>
                        <CardBody className="p-6">
                            <div className="h-64">
                                {hasType ? (
                                    <Bar data={typeChartData} options={defaultBarOptions} />
                                ) : (
                                    <div className="h-full flex items-center justify-center">
                                        <p className="text-[#6B7280]">No device type data</p>
                                    </div>
                                )}
                            </div>
                        </CardBody>
                    </CardDark>

                    <CardDark>
                        <CardHeader className="px-6 py-4 border-b border-[#E3E6EB]">
                            <h3 className="font-semibold text-[#1F2937] flex items-center gap-2">
                                <TrendingUp size={18} className="text-[#10B981]" />
                                Average Sensor Readings
                            </h3>
                        </CardHeader>
                        <CardBody className="p-6">
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div className="bg-[#EEF1F4] p-4 rounded-lg border border-[#E3E6EB]">
                                    <p className="text-2xl font-bold text-[#1F2937]">{avgReadings.temperature || 0}°C</p>
                                    <p className="text-sm text-[#4B5563]">Avg Temperature</p>
                                </div>
                                <div className="bg-[#EEF1F4] p-4 rounded-lg border border-[#E3E6EB]">
                                    <p className="text-2xl font-bold text-[#1F2937]">{avgReadings.rssi || 0} dBm</p>
                                    <p className="text-sm text-[#4B5563]">Avg WiFi Signal</p>
                                </div>
                            </div>
                        </CardBody>
                    </CardDark>
                </div>

                {/* Row 3: Sensor Trend Line Chart */}
                <CardDark>
                    <CardHeader className="px-6 py-4 border-b border-[#E3E6EB]">
                        <h3 className="font-semibold text-[#1F2937] flex items-center gap-2">
                            <TrendingUp size={18} className="text-[#3B82F6]" />
                            Daily Sensor Trends
                        </h3>
                    </CardHeader>
                    <CardBody className="p-6">
                        <div className="h-80">
                            {hasSensor ? (
                                <Line data={sensorTrendData} options={defaultLineOptions} />
                            ) : (
                                <div className="h-full flex items-center justify-center">
                                    <p className="text-[#6B7280]">No sensor trend data available for this period</p>
                                </div>
                            )}
                        </div>
                    </CardBody>
                </CardDark>

            {/* ══ ANALYTICS INSIGHTS ══ */}
            {reportData.analytics && (
                <div className="space-y-6">
                    <div className="flex items-center gap-3 pt-4">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg">
                            <Brain size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-[#1F2937]">Analytics Insights</h3>
                            <p className="text-sm text-[#6B7280]">Sensor threshold analysis &amp; device reliability scoring</p>
                        </div>
                    </div>

                    {/* Threshold Analysis */}
                    {reportData.analytics.thresholdAnalysis && (
                        <CardDark className="border-l-4 border-l-orange-500">
                            <CardHeader className="px-6 py-4 border-b border-[#E3E6EB]">
                                <h4 className="font-semibold text-[#1F2937] flex items-center gap-2">
                                    <AlertTriangle size={18} className="text-orange-500" />
                                    Sensor Threshold Violations
                                </h4>
                            </CardHeader>
                            <CardBody className="p-6">
                                <p className="text-xs text-[#6B7280] mb-4">Readings exceeding safety thresholds out of {reportData.analytics.thresholdAnalysis.totalReadings.toLocaleString()} total readings</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {Object.entries(reportData.analytics.thresholdAnalysis.violations).map(([key, v]) => (
                                        <div key={key} className={`p-4 rounded-lg border ${
                                            v.count > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                                        }`}>
                                            <div className="flex items-center gap-2 mb-2">
                                                {key === 'temperature' && <ThermometerSun size={16} className="text-red-500" />}
                                                {key === 'humidity' && <Droplets size={16} className="text-blue-500" />}
                                                {key === 'gasLevel' && <Wind size={16} className="text-orange-500" />}
                                                <span className="font-semibold text-sm text-[#1F2937]">{v.label}</span>
                                            </div>
                                            <p className={`text-2xl font-bold ${v.count > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                {v.count} <span className="text-sm font-normal">violations</span>
                                            </p>
                                            <p className="text-xs text-[#6B7280] mt-1">
                                                {v.percentage}% exceeded &gt;{v.threshold}{v.unit}
                                                {v.maxValue !== null && ` · Max: ${v.maxValue}${v.unit}`}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </CardBody>
                        </CardDark>
                    )}

                    {/* Device Reliability */}
                    {reportData.analytics.deviceReliability?.length > 0 && (
                        <CardDark className="border-l-4 border-l-blue-500">
                            <CardHeader className="px-6 py-4 border-b border-[#E3E6EB]">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-[#1F2937] flex items-center gap-2">
                                        <Zap size={18} className="text-blue-600" />
                                        Device Reliability Scoring
                                    </h4>
                                    <span className="text-sm font-semibold text-[#1F2937] bg-[#EEF1F4] px-3 py-1 rounded-lg">
                                        Fleet Score: {reportData.analytics.fleetReliability}%
                                    </span>
                                </div>
                            </CardHeader>
                            <CardBody className="p-6">
                                <div className="space-y-3">
                                    {reportData.analytics.deviceReliability.map((d, i) => (
                                        <div key={i} className="flex items-center gap-4 p-3 rounded-lg border border-[#E3E6EB] bg-white">
                                            <div className="w-full max-w-[100px]">
                                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full ${
                                                        d.uptimeScore >= 80 ? 'bg-green-500' :
                                                        d.uptimeScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                                    }`} style={{ width: `${d.uptimeScore}%` }} />
                                                </div>
                                                <p className="text-xs text-center mt-1 font-mono text-[#6B7280]">{d.uptimeScore}%</p>
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-[#1F2937] text-sm">{d.deviceId}</p>
                                                <p className="text-xs text-[#6B7280]">{d.worker} · Last seen: {d.lastCommunication ? new Date(d.lastCommunication).toLocaleDateString() : 'N/A'}</p>
                                            </div>
                                            <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                                                d.status === 'Excellent' ? 'bg-green-100 text-green-700' :
                                                d.status === 'Good' ? 'bg-blue-100 text-blue-700' :
                                                d.status === 'Fair' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                                {d.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </CardBody>
                        </CardDark>
                    )}
                </div>
            )}
        </div>
        );
    };

    const renderAlertAnalyticsCharts = () => {
        if (!reportData) return null;

        const typeData = reportData.alertsByType || {};
        const severityData = reportData.alertsBySeverity || {};
        const statusData = reportData.alertsByStatus || {};
        const dailyData = reportData.dailyAlerts || [];

        // Doughnut — Alerts by Severity
        const severityChartData = {
            labels: Object.keys(severityData),
            datasets: [{
                data: Object.values(severityData),
                backgroundColor: Object.keys(severityData).map(k => SEVERITY_COLORS[k] || CHART_COLORS.blue),
                borderColor: Object.keys(severityData).map(k => SEVERITY_BORDERS[k] || 'rgba(59,130,246,1)'),
                borderWidth: 2,
            }]
        };

        // Bar — Alerts by Type
        const typeLabels = Object.keys(typeData);
        const typePalette = [CHART_COLORS.blue, CHART_COLORS.indigo, CHART_COLORS.purple, CHART_COLORS.teal, CHART_COLORS.cyan, CHART_COLORS.pink, CHART_COLORS.orange];
        const typeChartData = {
            labels: typeLabels,
            datasets: [{
                label: 'Count',
                data: Object.values(typeData),
                backgroundColor: typeLabels.map((_, i) => typePalette[i % typePalette.length]),
                borderRadius: 6,
                borderWidth: 1,
                borderColor: typeLabels.map((_, i) => typePalette[i % typePalette.length].replace('0.85', '1')),
            }]
        };

        // Pie — Alerts by Status
        const statusLabels = Object.keys(statusData);
        const statusColors = [CHART_COLORS.orange, CHART_COLORS.blue, CHART_COLORS.green];
        const statusChartData = {
            labels: statusLabels,
            datasets: [{
                data: Object.values(statusData),
                backgroundColor: statusLabels.map((_, i) => statusColors[i % statusColors.length]),
                borderColor: '#ffffff',
                borderWidth: 2,
            }]
        };

        // Line — Daily Alert Trend
        const trendData = Array.isArray(dailyData) ? dailyData : [];
        const trendChartData = {
            labels: trendData.map(d => d.date.slice(5)),
            datasets: [{
                label: 'Alerts',
                data: trendData.map(d => d.count),
                borderColor: CHART_COLORS.blue,
                backgroundColor: CHART_COLORS_LIGHT.blue,
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointHoverRadius: 6,
                pointBackgroundColor: CHART_COLORS.blue,
            }]
        };

        const hasSeverity = Object.values(severityData).some(v => v > 0);
        const hasType = typeLabels.length > 0;
        const hasStatus = Object.values(statusData).some(v => v > 0);
        const hasTrend = trendData.length > 0;

        return (
            <div className="space-y-6">
                {/* Row 1: Severity Doughnut + Status Pie */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <CardDark>
                        <CardHeader className="px-6 py-4 border-b border-[#E3E6EB]">
                            <h3 className="font-semibold text-[#1F2937] flex items-center gap-2">
                                <PieChart size={18} className="text-[#EF4444]" />
                                Alerts by Severity
                            </h3>
                        </CardHeader>
                        <CardBody className="p-6">
                            <div className="h-64 flex items-center justify-center">
                                {hasSeverity ? (
                                    <Doughnut data={severityChartData} options={defaultDoughnutOptions} />
                                ) : (
                                    <p className="text-[#6B7280]">No alert data for this period</p>
                                )}
                            </div>
                        </CardBody>
                    </CardDark>

                    <CardDark>
                        <CardHeader className="px-6 py-4 border-b border-[#E3E6EB]">
                            <h3 className="font-semibold text-[#1F2937] flex items-center gap-2">
                                <PieChart size={18} className="text-[#3B82F6]" />
                                Alerts by Status
                            </h3>
                        </CardHeader>
                        <CardBody className="p-6">
                            <div className="h-64 flex items-center justify-center">
                                {hasStatus ? (
                                    <Pie data={statusChartData} options={{
                                        ...defaultDoughnutOptions,
                                        cutout: 0,
                                    }} />
                                ) : (
                                    <p className="text-[#6B7280]">No alert status data for this period</p>
                                )}
                            </div>
                        </CardBody>
                    </CardDark>
                </div>

                {/* Row 2: Alert types bar */}
                <CardDark>
                    <CardHeader className="px-6 py-4 border-b border-[#E3E6EB]">
                        <h3 className="font-semibold text-[#1F2937] flex items-center gap-2">
                            <BarChart3 size={18} className="text-[#6366F1]" />
                            Alerts by Type
                        </h3>
                    </CardHeader>
                    <CardBody className="p-6">
                        <div className="h-72">
                            {hasType ? (
                                <Bar data={typeChartData} options={defaultBarOptions} />
                            ) : (
                                <div className="h-full flex items-center justify-center">
                                    <p className="text-[#6B7280]">No alert types recorded in this period</p>
                                </div>
                            )}
                        </div>
                    </CardBody>
                </CardDark>

                {/* Row 3: Daily trend line */}
                <CardDark>
                    <CardHeader className="px-6 py-4 border-b border-[#E3E6EB]">
                        <h3 className="font-semibold text-[#1F2937] flex items-center gap-2">
                            <TrendingUp size={18} className="text-[#3B82F6]" />
                            Daily Alert Trend
                        </h3>
                    </CardHeader>
                    <CardBody className="p-6">
                        <div className="h-72">
                            {hasTrend ? (
                                <Line data={trendChartData} options={defaultLineOptions} />
                            ) : (
                                <div className="h-full flex items-center justify-center">
                                    <p className="text-[#6B7280]">No daily trend data available for this period</p>
                                </div>
                            )}
                        </div>
                    </CardBody>
                </CardDark>

            {/* ══ ANALYTICS INSIGHTS ══ */}
            {reportData.analytics && (
                <div className="space-y-6">
                    <div className="flex items-center gap-3 pt-4">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg">
                            <Brain size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-[#1F2937]">Analytics Insights</h3>
                            <p className="text-sm text-[#6B7280]">Trend analysis, anomaly detection (Z-Score), &amp; peak hours</p>
                        </div>
                    </div>

                    {/* Trend Analysis */}
                    {reportData.analytics.trendAnalysis && (
                        <CardDark className="border-l-4 border-l-purple-500">
                            <CardBody className="p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <TrendingUp size={18} className="text-purple-600" />
                                    <h4 className="font-semibold text-[#1F2937]">7-Day Moving Average Trend</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-[#EEF1F4] p-4 rounded-lg border border-[#E3E6EB] text-center">
                                        <p className={`text-2xl font-bold ${
                                            reportData.analytics.trendAnalysis.direction === 'Rising' ? 'text-red-500' :
                                            reportData.analytics.trendAnalysis.direction === 'Falling' ? 'text-green-500' : 'text-blue-500'
                                        }`}>
                                            {reportData.analytics.trendAnalysis.direction === 'Rising' ? '📈' :
                                             reportData.analytics.trendAnalysis.direction === 'Falling' ? '📉' : '➡️'}
                                            {' '}{reportData.analytics.trendAnalysis.direction}
                                        </p>
                                        <p className="text-sm text-[#4B5563] mt-1">Alert Trend</p>
                                    </div>
                                    <div className="bg-[#EEF1F4] p-4 rounded-lg border border-[#E3E6EB] text-center">
                                        <p className="text-2xl font-bold text-[#1F2937]">
                                            {reportData.analytics.trendAnalysis.percentageChange > 0 ? '+' : ''}
                                            {reportData.analytics.trendAnalysis.percentageChange}%
                                        </p>
                                        <p className="text-sm text-[#4B5563] mt-1">Period-over-Period Change</p>
                                    </div>
                                    <div className="bg-[#EEF1F4] p-4 rounded-lg border border-[#E3E6EB] text-center">
                                        <p className="text-2xl font-bold text-[#1F2937]">{reportData.analytics.trendAnalysis.recentAvg || 0}</p>
                                        <p className="text-sm text-[#4B5563] mt-1">Daily Average (Recent)</p>
                                    </div>
                                </div>
                            </CardBody>
                        </CardDark>
                    )}

                    {/* Anomaly Detection */}
                    <CardDark className="border-l-4 border-l-red-500">
                        <CardHeader className="px-6 py-4 border-b border-[#E3E6EB]">
                            <h4 className="font-semibold text-[#1F2937] flex items-center gap-2">
                                <Zap size={18} className="text-red-500" />
                                Anomaly Detection (Z-Score Algorithm)
                            </h4>
                        </CardHeader>
                        <CardBody className="p-6">
                            <p className="text-xs text-[#6B7280] mb-4 bg-[#EEF1F4] p-3 rounded-lg border border-[#E3E6EB] font-mono">
                                Flags days where alert count &gt; mean + 2×σ (standard deviations)
                            </p>
                            {reportData.analytics.anomalies?.length > 0 ? (
                                <div className="space-y-2">
                                    {reportData.analytics.anomalies.map((a, i) => (
                                        <div key={i} className="flex items-center gap-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                            <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                                ⚠️
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-red-800">{a.date}</p>
                                                <p className="text-xs text-red-600">
                                                    {a.count} alerts (Z-Score: {a.zScore}) · Threshold: {a.threshold} · Mean: {a.mean}
                                                </p>
                                            </div>
                                            <span className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded-full font-semibold">Anomaly</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <p className="text-green-600 font-medium">✓ No anomalies detected</p>
                                    <p className="text-xs text-[#6B7280] mt-1">All daily alert counts are within normal statistical range</p>
                                </div>
                            )}
                        </CardBody>
                    </CardDark>

                    {/* Peak Hours + Response Time */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Peak Hours */}
                        {reportData.analytics.peakHours && (
                            <CardDark className="border-l-4 border-l-amber-500">
                                <CardHeader className="px-6 py-4 border-b border-[#E3E6EB]">
                                    <h4 className="font-semibold text-[#1F2937] flex items-center gap-2">
                                        <Clock size={18} className="text-amber-500" />
                                        Peak Hours Analysis
                                    </h4>
                                </CardHeader>
                                <CardBody className="p-6">
                                    {reportData.analytics.peakHours.peakHour && (
                                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 text-center">
                                            <p className="text-sm text-amber-700 font-medium">Highest Alert Hour</p>
                                            <p className="text-3xl font-bold text-amber-600">{reportData.analytics.peakHours.peakHour.label}</p>
                                            <p className="text-xs text-amber-600">{reportData.analytics.peakHours.peakHour.count} alerts ({reportData.analytics.peakHours.peakHour.percentage}%)</p>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-6 gap-1">
                                        {reportData.analytics.peakHours.hourData?.slice(6, 18).map((h) => (
                                            <div key={h.hour} className="text-center">
                                                <div className="bg-gray-100 rounded-t-md overflow-hidden" style={{ height: 60 }}>
                                                    <div
                                                        className={`w-full ${
                                                            h.count === reportData.analytics.peakHours.peakHour?.count && h.count > 0
                                                                ? 'bg-amber-500' : 'bg-blue-400'
                                                        }`}
                                                        style={{
                                                            height: `${Math.max(4, h.percentage * 2)}%`,
                                                            marginTop: 'auto',
                                                            position: 'relative',
                                                            top: `${100 - Math.max(4, h.percentage * 2)}%`
                                                        }}
                                                    />
                                                </div>
                                                <p className="text-xs text-[#6B7280] mt-1">{h.label.slice(0, 2)}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-[#6B7280] text-center mt-2">Showing 06:00 – 17:00 (working hours)</p>
                                </CardBody>
                            </CardDark>
                        )}

                        {/* Response Time Distribution */}
                        {reportData.analytics.responseTimeDistribution && (
                            <CardDark className="border-l-4 border-l-green-500">
                                <CardHeader className="px-6 py-4 border-b border-[#E3E6EB]">
                                    <h4 className="font-semibold text-[#1F2937] flex items-center gap-2">
                                        <Clock size={18} className="text-green-500" />
                                        Response Time Distribution
                                    </h4>
                                </CardHeader>
                                <CardBody className="p-6">
                                    <div className="space-y-3">
                                        {[
                                            { label: '< 5 minutes', count: reportData.analytics.responseTimeDistribution.under5min, color: 'bg-green-500' },
                                            { label: '5–15 minutes', count: reportData.analytics.responseTimeDistribution.under15min, color: 'bg-blue-500' },
                                            { label: '15–60 minutes', count: reportData.analytics.responseTimeDistribution.under60min, color: 'bg-yellow-500' },
                                            { label: '> 60 minutes', count: reportData.analytics.responseTimeDistribution.over60min, color: 'bg-red-500' },
                                        ].map((item, i) => {
                                            const total = Object.values(reportData.analytics.responseTimeDistribution).reduce((s, v) => s + v, 0) || 1;
                                            const pct = Math.round((item.count / total) * 100);
                                            return (
                                                <div key={i}>
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="text-[#4B5563]">{item.label}</span>
                                                        <span className="font-medium text-[#1F2937]">{item.count} ({pct}%)</span>
                                                    </div>
                                                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                                        <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardBody>
                            </CardDark>
                        )}
                    </div>
                </div>
            )}
        </div>
        );
    };

    const renderComplianceCharts = () => {
        if (!reportData) return null;

        const summary = reportData.summary || {};
        const metrics = reportData.metrics || {};

        // Bar — Compliance Metrics Comparison
        const complianceChartData = {
            labels: ['Safety Score', 'Device Coverage', 'Incident Resolution', 'Alert Resolution'],
            datasets: [{
                label: 'Percentage',
                data: [
                    summary.safetyScore || 0,
                    summary.deviceCoverage || 0,
                    summary.incidentResolutionRate || 0,
                    summary.alertResolutionRate || 0,
                ],
                backgroundColor: [
                    (summary.safetyScore || 0) >= 80 ? CHART_COLORS.green : (summary.safetyScore || 0) >= 60 ? CHART_COLORS.yellow : CHART_COLORS.red,
                    CHART_COLORS.blue,
                    CHART_COLORS.teal,
                    CHART_COLORS.indigo,
                ],
                borderRadius: 8,
                borderWidth: 1,
                borderColor: [
                    (summary.safetyScore || 0) >= 80 ? 'rgba(16,185,129,1)' : (summary.safetyScore || 0) >= 60 ? 'rgba(234,179,8,1)' : 'rgba(239,68,68,1)',
                    'rgba(59,130,246,1)',
                    'rgba(20,184,166,1)',
                    'rgba(99,102,241,1)',
                ],
            }]
        };

        const complianceBarOptions = {
            ...defaultBarOptions,
            indexAxis: 'y',
            scales: {
                ...defaultBarOptions.scales,
                x: { ...defaultBarOptions.scales.x, max: 100, ticks: { ...defaultBarOptions.scales.x.ticks, callback: v => `${v}%` } },
                y: { ...defaultBarOptions.scales.y, grid: { display: false } },
            }
        };

        // Doughnut — Safety Score Gauge
        const scoreColor = (summary.safetyScore || 0) >= 80 ? CHART_COLORS.green
            : (summary.safetyScore || 0) >= 60 ? CHART_COLORS.yellow
                : CHART_COLORS.red;
        const gaugeData = {
            labels: ['Score', 'Remaining'],
            datasets: [{
                data: [summary.safetyScore || 0, 100 - (summary.safetyScore || 0)],
                backgroundColor: [scoreColor, 'rgba(229,231,235,0.5)'],
                borderWidth: 0,
            }]
        };
        const gaugeOptions = {
            ...defaultDoughnutOptions,
            cutout: '75%',
            plugins: {
                ...defaultDoughnutOptions.plugins,
                legend: { display: false },
                tooltip: { ...defaultDoughnutOptions.plugins.tooltip, filter: (item) => item.dataIndex === 0 },
            },
            rotation: -90,
            circumference: 180,
        };

        return (
            <div className="space-y-6">
                {/* Row 1: Safety Score Gauge + Compliance Bar */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <CardDark>
                        <CardHeader className="px-6 py-4 border-b border-[#E3E6EB]">
                            <h3 className="font-semibold text-[#1F2937] flex items-center gap-2">
                                <Shield size={18} className="text-[#10B981]" />
                                Overall Safety Score
                            </h3>
                        </CardHeader>
                        <CardBody className="p-6">
                            <div className="h-64 flex flex-col items-center justify-center relative">
                                <div className="w-full h-48">
                                    <Doughnut data={gaugeData} options={gaugeOptions} />
                                </div>
                                <div className="absolute bottom-12 text-center">
                                    <p className="text-4xl font-bold text-[#1F2937]">{summary.safetyScore || 0}%</p>
                                    <p className="text-sm text-[#6B7280]">
                                        {(summary.safetyScore || 0) >= 80 ? 'Excellent' : (summary.safetyScore || 0) >= 60 ? 'Needs Improvement' : 'Needs Attention'}
                                    </p>
                                </div>
                            </div>
                        </CardBody>
                    </CardDark>

                    <CardDark>
                        <CardHeader className="px-6 py-4 border-b border-[#E3E6EB]">
                            <h3 className="font-semibold text-[#1F2937] flex items-center gap-2">
                                <BarChart3 size={18} className="text-[#6366F1]" />
                                Compliance Metrics
                            </h3>
                        </CardHeader>
                        <CardBody className="p-6">
                            <div className="h-64">
                                <Bar data={complianceChartData} options={complianceBarOptions} />
                            </div>
                        </CardBody>
                    </CardDark>
                </div>

                {/* Row 2: Detailed Metrics Grid */}
                <CardDark>
                    <CardHeader className="px-6 py-4 border-b border-[#E3E6EB]">
                        <h3 className="font-semibold text-[#1F2937] flex items-center gap-2">
                            <FileText size={18} className="text-[#6FA3D8]" />
                            Detailed Metrics
                        </h3>
                    </CardHeader>
                    <CardBody className="p-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {Object.entries(metrics).map(([key, value]) => (
                                <div key={key} className="bg-[#EEF1F4] p-4 rounded-lg border border-[#E3E6EB] text-center">
                                    <p className="text-2xl font-bold text-[#1F2937]">{value}</p>
                                    <p className="text-sm text-[#4B5563]">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                                </div>
                            ))}
                        </div>
                    </CardBody>
                </CardDark>

            {/* ══ ANALYTICS INSIGHTS ══ */}
            {reportData.analytics && (
                <div className="space-y-6">
                    <div className="flex items-center gap-3 pt-4">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg">
                            <Brain size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-[#1F2937]">Analytics Insights</h3>
                            <p className="text-sm text-[#6B7280]">Weighted scoring formula &amp; automated recommendations</p>
                        </div>
                    </div>

                    {/* Grade + Formula */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <CardDark className="border-l-4 border-l-indigo-500">
                            <CardBody className="p-6 text-center">
                                <Award size={32} className="text-indigo-500 mx-auto mb-3" />
                                <p className="text-sm text-[#6B7280] mb-2">Compliance Grade</p>
                                <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full text-5xl font-black ${
                                    reportData.analytics.gradeColor === 'green' ? 'bg-green-100 text-green-600 border-4 border-green-300' :
                                    reportData.analytics.gradeColor === 'blue' ? 'bg-blue-100 text-blue-600 border-4 border-blue-300' :
                                    reportData.analytics.gradeColor === 'yellow' ? 'bg-yellow-100 text-yellow-600 border-4 border-yellow-300' :
                                    reportData.analytics.gradeColor === 'orange' ? 'bg-orange-100 text-orange-600 border-4 border-orange-300' :
                                    'bg-red-100 text-red-600 border-4 border-red-300'
                                }`}>
                                    {reportData.analytics.grade}
                                </div>
                                <p className="text-sm text-[#4B5563] mt-3 font-medium">
                                    {reportData.analytics.grade === 'A' ? 'Excellent Compliance' :
                                     reportData.analytics.grade === 'B' ? 'Good Compliance' :
                                     reportData.analytics.grade === 'C' ? 'Acceptable — Needs Attention' :
                                     reportData.analytics.grade === 'D' ? 'Below Standard' : 'Critical — Immediate Action Needed'}
                                </p>
                            </CardBody>
                        </CardDark>

                        <CardDark className="border-l-4 border-l-purple-500">
                            <CardHeader className="px-6 py-4 border-b border-[#E3E6EB]">
                                <h4 className="font-semibold text-[#1F2937] flex items-center gap-2">
                                    <Brain size={18} className="text-purple-600" />
                                    Safety Score Formula Breakdown
                                </h4>
                            </CardHeader>
                            <CardBody className="p-6">
                                <p className="text-xs text-[#6B7280] mb-4 bg-[#EEF1F4] p-3 rounded-lg border border-[#E3E6EB] font-mono">
                                    {reportData.analytics.formula}
                                </p>
                                {reportData.analytics.weights && (
                                    <div className="space-y-3">
                                        {Object.entries(reportData.analytics.weights).map(([key, w]) => (
                                            <div key={key}>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="text-[#4B5563]">{key.replace(/([A-Z])/g, ' $1').trim()} ({w.value}% × {w.weight})</span>
                                                    <span className="font-bold text-[#1F2937]">+{w.contribution}</span>
                                                </div>
                                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${w.value}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardBody>
                        </CardDark>
                    </div>

                    {/* Recommendations */}
                    {reportData.analytics.recommendations?.length > 0 && (
                        <CardDark className="border-l-4 border-l-amber-500">
                            <CardHeader className="px-6 py-4 border-b border-[#E3E6EB]">
                                <h4 className="font-semibold text-[#1F2937] flex items-center gap-2">
                                    <Zap size={18} className="text-amber-500" />
                                    Automated Recommendations
                                </h4>
                            </CardHeader>
                            <CardBody className="p-6">
                                <div className="space-y-3">
                                    {reportData.analytics.recommendations.map((rec, i) => (
                                        <div key={i} className={`p-4 rounded-lg border ${
                                            rec.priority === 'Critical' ? 'bg-red-50 border-red-200' :
                                            rec.priority === 'High' ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'
                                        }`}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                                    rec.priority === 'Critical' ? 'bg-red-100 text-red-700' :
                                                    rec.priority === 'High' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                                                }`}>
                                                    {rec.priority}
                                                </span>
                                                <span className="font-semibold text-sm text-[#1F2937]">{rec.area}</span>
                                            </div>
                                            <p className="text-sm text-[#4B5563]">{rec.message}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardBody>
                        </CardDark>
                    )}
                </div>
            )}
        </div>
        );
    };

    // Render charts/details based on report type
    const renderDetails = () => {
        switch (reportType) {
            case 'worker-safety': return renderWorkerSafetyCharts();
            case 'device-performance': return renderDevicePerformanceCharts();
            case 'alert-analytics': return renderAlertAnalyticsCharts();
            case 'compliance': return renderComplianceCharts();
            default: return null;
        }
    };

    return (
        <div className="space-y-6 print:bg-white print:text-black">
            <div className="flex items-center justify-between print:hidden">
                <div>
                    <h1 className="text-3xl font-bold text-[#1F2937] mb-2">Reports & Analytics</h1>
                    <p className="text-[#4B5563]">Generate and view system reports with real data</p>
                </div>
            </div>

            {/* Report Controls */}
            <CardDark className="print:hidden">
                <CardBody className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[#4B5563] mb-2">Report Type</label>
                            <select
                                value={reportType}
                                onChange={(e) => setReportType(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-[#E3E6EB] rounded-lg text-[#1F2937] focus:ring-2 focus:ring-[#6FA3D8] focus:border-[#6FA3D8] transition-all"
                            >
                                <option value="worker-safety">Worker Safety Report</option>
                                <option value="device-performance">Device Performance Report</option>
                                <option value="alert-analytics">Alert Analytics</option>
                                <option value="compliance">Compliance Report</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[#4B5563] mb-2">Start Date</label>
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-[#E3E6EB] rounded-lg text-[#1F2937] focus:ring-2 focus:ring-[#6FA3D8] focus:border-[#6FA3D8] transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[#4B5563] mb-2">End Date</label>
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-[#E3E6EB] rounded-lg text-[#1F2937] focus:ring-2 focus:ring-[#6FA3D8] focus:border-[#6FA3D8] transition-all"
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
                                <span className="text-xs text-[#6B7280] italic">Export requires Admin access</span>
                            )}
                        </div>
                    </div>
                </CardBody>
            </CardDark>

            {/* Loading State */}
            {isLoading && (
                <div className="flex items-center justify-center h-32">
                    <div className="text-[#4B5563]">Loading report data...</div>
                </div>
            )}

            {/* Error State */}
            {error && (
                <CardDark>
                    <CardBody className="p-6 text-center">
                        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <p className="text-red-500 font-medium">{error}</p>
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
                        <p className="text-[#4B5563]">
                            Period: {dateRange.start} to {dateRange.end}
                        </p>
                        <p className="text-[#4B5563]">Generated: {new Date().toLocaleString()}</p>
                    </div>

                    {/* Metrics */}
                    {renderMetrics()}

                    {/* Charts & Detailed Analytics */}
                    {renderDetails()}
                </div>
            )}
        </div>
    );
};

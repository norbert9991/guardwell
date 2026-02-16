import React, { useState, useEffect } from 'react';
import { Download, Calendar, FileText, Users, Radio, AlertTriangle, Shield, TrendingUp, BarChart3, PieChart } from 'lucide-react';
import { CardDark, CardBody, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { MetricCard } from '../components/ui/MetricCard';
import { reportsApi } from '../utils/api';
import { useAuth, PERMISSIONS } from '../context/AuthContext';
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

        // Bar — Battery Distribution
        const batteryChartData = {
            labels: ['Low (< 20%)', 'Medium (20-50%)', 'Good (> 50%)'],
            datasets: [{
                label: 'Devices',
                data: [battery.low || 0, battery.medium || 0, battery.good || 0],
                backgroundColor: [CHART_COLORS.red, CHART_COLORS.yellow, CHART_COLORS.green],
                borderColor: ['rgba(239,68,68,1)', 'rgba(234,179,8,1)', 'rgba(16,185,129,1)'],
                borderWidth: 1,
                borderRadius: 6,
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

        // Line — Daily Sensor Trends
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
                {
                    label: 'Humidity (%)',
                    data: dailySensor.map(d => d.avgHumidity),
                    borderColor: CHART_COLORS.blue,
                    backgroundColor: CHART_COLORS_LIGHT.blue,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 2,
                    pointHoverRadius: 5,
                },
                {
                    label: 'Gas (PPM)',
                    data: dailySensor.map(d => d.avgGas),
                    borderColor: CHART_COLORS.orange,
                    backgroundColor: CHART_COLORS_LIGHT.orange,
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
                                <BarChart3 size={18} className="text-[#F59E0B]" />
                                Battery Distribution
                            </h3>
                        </CardHeader>
                        <CardBody className="p-6">
                            <div className="h-64">
                                <Bar data={batteryChartData} options={defaultBarOptions} />
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
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div className="bg-[#EEF1F4] p-4 rounded-lg border border-[#E3E6EB]">
                                    <p className="text-2xl font-bold text-[#1F2937]">{avgReadings.temperature || 0}°C</p>
                                    <p className="text-sm text-[#4B5563]">Temperature</p>
                                </div>
                                <div className="bg-[#EEF1F4] p-4 rounded-lg border border-[#E3E6EB]">
                                    <p className="text-2xl font-bold text-[#1F2937]">{avgReadings.humidity || 0}%</p>
                                    <p className="text-sm text-[#4B5563]">Humidity</p>
                                </div>
                                <div className="bg-[#EEF1F4] p-4 rounded-lg border border-[#E3E6EB]">
                                    <p className="text-2xl font-bold text-[#1F2937]">{avgReadings.gasLevel || 0}</p>
                                    <p className="text-sm text-[#4B5563]">Gas (PPM)</p>
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
                                        {(summary.safetyScore || 0) >= 80 ? 'Excellent' : (summary.safetyScore || 0) >= 60 ? 'Needs Improvement' : 'Critical'}
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

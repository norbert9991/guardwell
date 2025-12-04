import React, { useState } from 'react';
import { Download, Calendar } from 'lucide-react';
import { CardDark, CardBody, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const Reports = () => {
    const [reportType, setReportType] = useState('worker-safety');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Reports & Analytics</h1>
                <p className="text-gray-400">Generate and view system reports</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <CardDark>
                        <CardHeader className="px-6 py-4 border-b border-gray-700">
                            <h2 className="text-xl font-semibold text-white">Generate Report</h2>
                        </CardHeader>
                        <CardBody className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Report Type</label>
                                <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="input-dark">
                                    <option value="worker-safety">Worker Safety Report</option>
                                    <option value="device-performance">Device Performance Report</option>
                                    <option value="alert-analytics">Alert Analytics</option>
                                    <option value="compliance">Compliance Report</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
                                    <input
                                        type="date"
                                        value={dateRange.start}
                                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                        className="input-dark"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
                                    <input
                                        type="date"
                                        value={dateRange.end}
                                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                        className="input-dark"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button variant="primary" icon={<Download size={18} />}>
                                    Generate PDF
                                </Button>
                                <Button variant="secondary" icon={<Download size={18} />}>
                                    Export Excel
                                </Button>
                            </div>
                        </CardBody>
                    </CardDark>
                </div>

                <div>
                    <CardDark>
                        <CardHeader className="px-6 py-4 border-b border-gray-700">
                            <h3 className="font-semibold text-white">Quick Stats</h3>
                        </CardHeader>
                        <CardBody className="p-6 space-y-4">
                            <div>
                                <p className="text-sm text-gray-400">Total Reports Generated</p>
                                <p className="text-2xl font-bold text-white">156</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">This Month</p>
                                <p className="text-2xl font-bold text-white">24</p>
                            </div>
                        </CardBody>
                    </CardDark>
                </div>
            </div>
        </div>
    );
};

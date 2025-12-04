import React, { useState, useEffect } from 'react';
import { Plus, FileText, AlertTriangle, Clock, Search } from 'lucide-react';
import { CardDark, CardBody } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Badge, SeverityBadge, StatusBadge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { useNavigate } from 'react-router-dom';
import { incidentsApi, workersApi } from '../utils/api';

export const IncidentManagement = () => {
    const navigate = useNavigate();
    const [filter, setFilter] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [incidents, setIncidents] = useState([]);
    const [workers, setWorkers] = useState([]);

    // Fetch incidents and workers from API
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [incidentsRes, workersRes] = await Promise.all([
                    incidentsApi.getAll(),
                    workersApi.getAll()
                ]);
                setIncidents(incidentsRes.data);
                setWorkers(workersRes.data);
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const [formData, setFormData] = useState({
        title: '',
        type: 'Equipment Failure',
        severity: 'Low',
        workerName: '',
        workerId: '',
        description: '',
        location: '',
        witnesses: ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        setShowConfirmModal(true);
    };

    const handleConfirmCreate = async () => {
        setIsSubmitting(true);
        try {
            const response = await incidentsApi.create({
                title: formData.title,
                type: formData.type,
                severity: formData.severity,
                workerName: formData.workerName,
                workerId: formData.workerId || null,
                description: formData.description,
                location: formData.location,
                witnesses: formData.witnesses
            });

            setIncidents(prev => [response.data, ...prev]);

            setFormData({
                title: '',
                type: 'Equipment Failure',
                severity: 'Low',
                workerName: '',
                workerId: '',
                description: '',
                location: '',
                witnesses: ''
            });
            setShowConfirmModal(false);
            setShowCreateModal(false);
        } catch (error) {
            console.error('Failed to create incident:', error);
            alert('Failed to create incident. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const columns = [
        { key: 'title', label: 'Incident Title', sortable: true },
        { key: 'type', label: 'Type', render: (row) => <Badge variant="secondary">{row.type}</Badge> },
        { key: 'severity', label: 'Severity', render: (row) => <SeverityBadge severity={row.severity} /> },
        { key: 'worker', label: 'Worker' },
        { key: 'date', label: 'Date & Time' },
        { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
        {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
                <Button size="sm" variant="outline" onClick={() => navigate(`/incidents/${row.id}`)}>
                    View Details
                </Button>
            )
        }
    ];

    const filteredIncidents = incidents.filter(inc => {
        if (filter === 'all') return true;
        return inc.status.toLowerCase().replace(' ', '-') === filter;
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Incident Management</h1>
                    <p className="text-gray-400">Track and manage safety incidents</p>
                </div>
                <Button icon={<Plus size={18} />} onClick={() => setShowCreateModal(true)}>Create Incident</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MetricCard
                    title="Open Incidents"
                    value={incidents.filter(i => i.status === 'Open').length}
                    icon={FileText}
                    color="bg-[#F59E0B]"
                    subtitle="Require attention"
                />
                <MetricCard
                    title="Under Investigation"
                    value={incidents.filter(i => i.status === 'Under Investigation').length}
                    icon={Search}
                    color="bg-[#3B82F6]"
                    subtitle="Being reviewed"
                />
                <MetricCard
                    title="Critical Incidents"
                    value={incidents.filter(i => i.severity === 'Critical').length}
                    icon={AlertTriangle}
                    color="bg-[#EF4444]"
                    subtitle="High priority"
                />
                <MetricCard
                    title="Avg Resolution"
                    value="2.5 hrs"
                    icon={Clock}
                    color="bg-[#10B981]"
                    subtitle="Response time"
                />
            </div>

            {/* Filter */}
            <CardDark>
                <CardBody className="p-6">
                    <div className="flex gap-4">
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="input-dark"
                        >
                            <option value="all">All Status</option>
                            <option value="open">Open</option>
                            <option value="under-investigation">Under Investigation</option>
                            <option value="resolved">Resolved</option>
                        </select>
                    </div>
                </CardBody>
            </CardDark>

            <CardDark>
                <CardBody className="p-0">
                    <Table columns={columns} data={filteredIncidents} />
                </CardBody>
            </CardDark>

            {/* Create Incident Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="Create Incident Report"
                size="lg"
            >
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Incident Title
                        </label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            className="input"
                            placeholder="Brief description of the incident"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Incident Type
                            </label>
                            <select
                                name="type"
                                value={formData.type}
                                onChange={handleInputChange}
                                className="input"
                            >
                                <option>Equipment Failure</option>
                                <option>Minor Injury</option>
                                <option>Major Injury</option>
                                <option>Near Miss</option>
                                <option>Environmental Hazard</option>
                                <option>Fire/Explosion</option>
                                <option>Chemical Exposure</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Severity
                            </label>
                            <select
                                name="severity"
                                value={formData.severity}
                                onChange={handleInputChange}
                                className="input"
                            >
                                <option>Low</option>
                                <option>Medium</option>
                                <option>High</option>
                                <option>Critical</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Affected Worker
                            </label>
                            <input
                                type="text"
                                name="worker"
                                value={formData.worker}
                                onChange={handleInputChange}
                                className="input"
                                placeholder="Worker name"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Location
                            </label>
                            <input
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleInputChange}
                                className="input"
                                placeholder="Where did it occur?"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description
                        </label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            className="input min-h-[100px]"
                            placeholder="Detailed description of the incident..."
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Witnesses (Optional)
                        </label>
                        <input
                            type="text"
                            name="witnesses"
                            value={formData.witnesses}
                            onChange={handleInputChange}
                            className="input"
                            placeholder="Names of any witnesses"
                        />
                    </div>

                    <div className="flex gap-3 justify-end pt-4">
                        <Button variant="secondary" type="button" onClick={() => setShowCreateModal(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            Create Report
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={handleConfirmCreate}
                title="Create Incident Report?"
                message="Please review the incident details. This will create an official incident report that will be logged in the system."
                variant="warning"
                confirmText="Yes, Create Report"
                cancelText="Go Back"
                loading={isSubmitting}
                data={{
                    'Title': formData.title,
                    'Type': formData.type,
                    'Severity': formData.severity,
                    'Worker': formData.worker,
                    'Location': formData.location || 'Not specified'
                }}
            />
        </div>
    );
};

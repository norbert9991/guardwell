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
import { useToast } from '../context/ToastContext';

export const IncidentManagement = () => {
    const navigate = useNavigate();
    const [filter, setFilter] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [incidents, setIncidents] = useState([]);
    const [workers, setWorkers] = useState([]);
    const toast = useToast();

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
            const selectedWorker = workers.find(w => w.id == formData.workerId);
            const response = await incidentsApi.create({
                title: formData.title,
                type: formData.type,
                severity: formData.severity,
                workerName: selectedWorker?.fullName || '',
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
                workerId: '',
                description: '',
                location: '',
                witnesses: ''
            });
            setShowConfirmModal(false);
            setShowCreateModal(false);
            toast.success('Incident report created successfully');
        } catch (error) {
            console.error('Failed to create incident:', error);
            toast.error('Failed to create incident. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Format date
    const formatDate = (date) => {
        if (!date) return 'Unknown';
        return new Date(date).toLocaleString();
    };

    const columns = [
        { key: 'title', label: 'Incident Title', sortable: true },
        { key: 'type', label: 'Type', render: (row) => <Badge variant="secondary">{row.type}</Badge> },
        { key: 'severity', label: 'Severity', render: (row) => <SeverityBadge severity={row.severity} /> },
        {
            key: 'worker',
            label: 'Worker',
            render: (row) => row.workerName || row.worker?.fullName || 'Unknown'
        },
        {
            key: 'createdAt',
            label: 'Date & Time',
            render: (row) => formatDate(row.createdAt)
        },
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
        return inc.status?.toLowerCase().replace(' ', '-') === filter;
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-[#6B7280]">Loading incidents...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-[#1F2937] mb-2">Incident Management</h1>
                    <p className="text-[#4B5563]">Track and manage safety incidents</p>
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
                    title="Resolved"
                    value={incidents.filter(i => i.status === 'Resolved').length}
                    icon={Clock}
                    color="bg-[#10B981]"
                    subtitle="Completed"
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
                    {filteredIncidents.length === 0 ? (
                        <div className="p-12 text-center">
                            <FileText className="h-16 w-16 text-[#9CA3AF] mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-[#4B5563] mb-2">No Incidents</h3>
                            <p className="text-[#6B7280]">No incidents have been recorded yet.</p>
                        </div>
                    ) : (
                        <Table columns={columns} data={filteredIncidents} />
                    )}
                </CardBody>
            </CardDark>

            {/* Create Incident Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="Create Incident Report"
                size="lg"
            >
                <form onSubmit={handleFormSubmit} className="space-y-5">
                    <div>
                        <label className="label-modal">
                            Incident Title
                        </label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            className="input-modal"
                            placeholder="Brief description of the incident"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label-modal">
                                Incident Type
                            </label>
                            <select
                                name="type"
                                value={formData.type}
                                onChange={handleInputChange}
                                className="input-modal"
                            >
                                <option value="Equipment Failure">Equipment Failure</option>
                                <option value="Minor Injury">Minor Injury</option>
                                <option value="Major Injury">Major Injury</option>
                                <option value="Near Miss">Near Miss</option>
                                <option value="Environmental Hazard">Environmental Hazard</option>
                                <option value="Fire/Explosion">Fire/Explosion</option>
                                <option value="Chemical Exposure">Chemical Exposure</option>
                            </select>
                        </div>
                        <div>
                            <label className="label-modal">
                                Severity
                            </label>
                            <select
                                name="severity"
                                value={formData.severity}
                                onChange={handleInputChange}
                                className="input-modal"
                            >
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                                <option value="Critical">Critical</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label-modal">
                                Affected Worker
                            </label>
                            <select
                                name="workerId"
                                value={formData.workerId}
                                onChange={handleInputChange}
                                className="input-modal"
                                required
                            >
                                <option value="">-- Select Worker --</option>
                                {workers.map(worker => (
                                    <option key={worker.id} value={worker.id}>
                                        {worker.fullName} ({worker.department})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label-modal">
                                Location
                            </label>
                            <input
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleInputChange}
                                className="input-modal"
                                placeholder="Where did it occur?"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="label-modal">
                            Description
                        </label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            className="input-modal"
                            rows={4}
                            placeholder="Detailed description of what happened..."
                            required
                        />
                    </div>

                    <div>
                        <label className="label-modal">
                            Witnesses (Optional)
                        </label>
                        <input
                            type="text"
                            name="witnesses"
                            value={formData.witnesses}
                            onChange={handleInputChange}
                            className="input-modal"
                            placeholder="Names of witnesses, if any"
                        />
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t border-[#2d3a52]/50">
                        <Button variant="secondary" type="button" onClick={() => setShowCreateModal(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            Create Incident
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={handleConfirmCreate}
                isSubmitting={isSubmitting}
                title="Create Incident Report"
                message="Are you sure you want to create this incident report?"
                confirmText="Yes, Create Report"
                variant="warning"
                data={[
                    { label: 'Title', value: formData.title },
                    { label: 'Type', value: formData.type },
                    { label: 'Severity', value: formData.severity },
                    { label: 'Worker', value: workers.find(w => w.id == formData.workerId)?.fullName || 'Not selected' },
                    { label: 'Location', value: formData.location || 'Not specified' }
                ]}
            />
        </div>
    );
};

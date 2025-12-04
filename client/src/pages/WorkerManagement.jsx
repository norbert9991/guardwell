import React, { useState, useEffect } from 'react';
import { Search, Plus, User, Edit, Eye, Power, Users, UserCheck, Radio, UserMinus } from 'lucide-react';
import { CardDark, CardBody } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { useNavigate } from 'react-router-dom';
import { workersApi } from '../utils/api';

export const WorkerManagement = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDept, setFilterDept] = useState('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [workers, setWorkers] = useState([]);

    // Form state
    const [formData, setFormData] = useState({
        employeeNumber: '',
        fullName: '',
        department: 'Manufacturing',
        position: '',
        contactNumber: '',
        email: '',
        emergencyContactName: '',
        emergencyContactNumber: '',
        dateHired: '',
        medicalConditions: ''
    });

    const navigate = useNavigate();

    // Fetch workers on mount
    useEffect(() => {
        const fetchWorkers = async () => {
            try {
                const response = await workersApi.getAll();
                setWorkers(response.data);
            } catch (error) {
                console.error('Failed to fetch workers:', error);
                // Keep empty array if API fails
            } finally {
                setIsLoading(false);
            }
        };
        fetchWorkers();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        // Show confirmation modal instead of submitting directly
        setShowConfirmModal(true);
    };

    const handleConfirmAdd = async () => {
        setIsSubmitting(true);
        try {
            // Call API to create worker
            const response = await workersApi.create(formData);

            // Add new worker to local state
            setWorkers(prev => [...prev, response.data]);

            // Reset and close modals
            setFormData({
                employeeNumber: '',
                fullName: '',
                department: 'Manufacturing',
                position: '',
                contactNumber: '',
                email: '',
                emergencyContactName: '',
                emergencyContactNumber: '',
                dateHired: '',
                medicalConditions: ''
            });
            setShowConfirmModal(false);
            setShowAddModal(false);
        } catch (error) {
            console.error('Failed to add worker:', error);
            alert('Failed to add worker. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const columns = [
        { key: 'employeeNumber', label: 'Employee #', sortable: true },
        {
            key: 'fullName',
            label: 'Name',
            sortable: true,
            render: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <div className="font-medium text-white">{row.fullName}</div>
                        <div className="text-xs text-gray-400">{row.position}</div>
                    </div>
                </div>
            )
        },
        { key: 'department', label: 'Department', sortable: true },
        { key: 'contactNumber', label: 'Contact', sortable: false },
        {
            key: 'assignedDevice',
            label: 'Device',
            render: (row) => row.assignedDevice ? (
                <Badge variant="info">{row.assignedDevice}</Badge>
            ) : (
                <span className="text-gray-500 text-sm">Not Assigned</span>
            )
        },
        {
            key: 'status',
            label: 'Status',
            render: (row) => <StatusBadge status={row.status} />
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate(`/workers/${row.id}`)}
                        className="p-2 hover:bg-dark-lighter rounded text-primary-500"
                        title="View Details"
                    >
                        <Eye size={16} />
                    </button>
                    <button
                        className="p-2 hover:bg-dark-lighter rounded text-gray-400"
                        title="Edit"
                    >
                        <Edit size={16} />
                    </button>
                    <button
                        className="p-2 hover:bg-dark-lighter rounded text-danger"
                        title="Deactivate"
                    >
                        <Power size={16} />
                    </button>
                </div>
            )
        }
    ];

    // Filter workers based on search and department
    const filteredWorkers = workers.filter(worker => {
        const matchesSearch = worker.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            worker.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = filterDept === 'all' || worker.department.toLowerCase() === filterDept;
        return matchesSearch && matchesDept;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Worker Management</h1>
                    <p className="text-gray-400">Manage worker profiles and information</p>
                </div>
                <Button onClick={() => setShowAddModal(true)} icon={<Plus size={18} />}>
                    Add Worker
                </Button>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Total Workers"
                    value={workers.length}
                    icon={Users}
                    color="bg-[#3B82F6]"
                    subtitle="Registered employees"
                />
                <MetricCard
                    title="Active Workers"
                    value={workers.filter(w => w.status === 'Active').length}
                    icon={UserCheck}
                    color="bg-[#00BFA5]"
                    subtitle="Currently active"
                />
                <MetricCard
                    title="With Devices"
                    value={workers.filter(w => w.assignedDevice).length}
                    icon={Radio}
                    color="bg-[#F59E0B]"
                    subtitle="Assigned equipment"
                />
                <MetricCard
                    title="On Leave"
                    value={workers.filter(w => w.status === 'On Leave').length}
                    icon={UserMinus}
                    color="bg-[#6B7280]"
                    subtitle="Currently unavailable"
                />
            </div>

            {/* Filters */}
            <CardDark>
                <CardBody className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search by name, employee number..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="input-dark pl-10"
                            />
                        </div>
                        <select
                            value={filterDept}
                            onChange={(e) => setFilterDept(e.target.value)}
                            className="input-dark"
                        >
                            <option value="all">All Departments</option>
                            <option value="manufacturing">Manufacturing</option>
                            <option value="assembly">Assembly</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="quality">Quality Control</option>
                        </select>
                    </div>
                </CardBody>
            </CardDark>

            {/* Workers Table */}
            <CardDark>
                <CardBody className="p-0">
                    <Table columns={columns} data={filteredWorkers} />
                </CardBody>
            </CardDark>

            {/* Add Worker Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Add New Worker"
                size="lg"
            >
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Employee Number
                            </label>
                            <input
                                type="text"
                                name="employeeNumber"
                                value={formData.employeeNumber}
                                onChange={handleInputChange}
                                className="input"
                                placeholder="EMP-XXX"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Full Name
                            </label>
                            <input
                                type="text"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleInputChange}
                                className="input"
                                placeholder="Juan dela Cruz"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Department
                            </label>
                            <select
                                name="department"
                                value={formData.department}
                                onChange={handleInputChange}
                                className="input"
                            >
                                <option>Manufacturing</option>
                                <option>Assembly</option>
                                <option>Maintenance</option>
                                <option>Quality Control</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Position
                            </label>
                            <input
                                type="text"
                                name="position"
                                value={formData.position}
                                onChange={handleInputChange}
                                className="input"
                                placeholder="Machine Operator"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Contact Number
                            </label>
                            <input
                                type="tel"
                                name="contactNumber"
                                value={formData.contactNumber}
                                onChange={handleInputChange}
                                className="input"
                                placeholder="09171234567"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                className="input"
                                placeholder="worker@cathaymetal.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Emergency Contact Name
                        </label>
                        <input
                            type="text"
                            name="emergencyContactName"
                            value={formData.emergencyContactName}
                            onChange={handleInputChange}
                            className="input"
                            placeholder="Emergency contact name"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Emergency Contact Number
                        </label>
                        <input
                            type="tel"
                            name="emergencyContactNumber"
                            value={formData.emergencyContactNumber}
                            onChange={handleInputChange}
                            className="input"
                            placeholder="09171234567"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Date Hired
                            </label>
                            <input
                                type="date"
                                name="dateHired"
                                value={formData.dateHired}
                                onChange={handleInputChange}
                                className="input"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Medical Conditions (Optional)
                            </label>
                            <input
                                type="text"
                                name="medicalConditions"
                                value={formData.medicalConditions}
                                onChange={handleInputChange}
                                className="input"
                                placeholder="e.g. Asthma, Allergies"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 justify-end pt-4">
                        <Button variant="secondary" type="button" onClick={() => setShowAddModal(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            Add Worker
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={handleConfirmAdd}
                title="Add New Worker?"
                message="Please review the worker details before confirming. This will add a new worker to the system."
                variant="info"
                confirmText="Yes, Add Worker"
                cancelText="Go Back"
                loading={isSubmitting}
                data={{
                    'Employee Number': formData.employeeNumber,
                    'Full Name': formData.fullName,
                    'Department': formData.department,
                    'Position': formData.position,
                    'Contact': formData.contactNumber
                }}
            />
        </div>
    );
};

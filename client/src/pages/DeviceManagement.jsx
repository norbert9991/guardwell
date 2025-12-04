import React, { useState } from 'react';
import { Plus, Search, Settings, Radio, Activity, Wrench, BatteryLow } from 'lucide-react';
import { CardDark, CardBody } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';

export const DeviceManagement = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [devices, setDevices] = useState([
        { id: '1', serialNumber: 'DEV-001', type: 'Vest', assignedWorker: 'Juan dela Cruz', battery: 85, lastComm: '2 min ago', status: 'Active' },
        { id: '2', serialNumber: 'DEV-002', type: 'Helmet', assignedWorker: 'Maria Santos', battery: 62, lastComm: '1 min ago', status: 'Active' },
        { id: '3', serialNumber: 'DEV-003', type: 'Vest', assignedWorker: null, battery: 92, lastComm: '5 min ago', status: 'Available' },
    ]);

    // Form state
    const [formData, setFormData] = useState({
        deviceId: '',
        serialNumber: '',
        type: 'Smart Vest',
        assignedWorker: ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        setShowConfirmModal(true);
    };

    const handleConfirmAdd = async () => {
        setIsSubmitting(true);
        try {
            // TODO: Replace with actual API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            const newDevice = {
                id: String(devices.length + 1),
                serialNumber: formData.serialNumber || formData.deviceId,
                type: formData.type.replace('Smart ', ''),
                assignedWorker: formData.assignedWorker || null,
                battery: 100,
                lastComm: 'Just now',
                status: formData.assignedWorker ? 'Active' : 'Available'
            };
            setDevices(prev => [...prev, newDevice]);

            setFormData({
                deviceId: '',
                serialNumber: '',
                type: 'Smart Vest',
                assignedWorker: ''
            });
            setShowConfirmModal(false);
            setShowAddModal(false);
        } catch (error) {
            console.error('Failed to add device:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const columns = [
        { key: 'serialNumber', label: 'Serial Number', sortable: true },
        {
            key: 'type',
            label: 'Type',
            render: (row) => <Badge variant="info">{row.type}</Badge>
        },
        { key: 'assignedWorker', label: 'Assigned To', sortable: true, render: (row) => row.assignedWorker || <span className="text-gray-500">Unassigned</span> },
        {
            key: 'battery',
            label: 'Battery',
            render: (row) => (
                <span className={row.battery < 20 ? 'text-danger' : row.battery < 50 ? 'text-warning' : 'text-success'}>
                    {row.battery}%
                </span>
            )
        },
        { key: 'lastComm', label: 'Last Communication' },
        { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
        {
            key: 'actions',
            label: 'Actions',
            render: () => (
                <div className="flex gap-2">
                    <Button size="sm" variant="outline">Configure</Button>
                    <Button size="sm" variant="primary">Assign</Button>
                </div>
            )
        }
    ];

    const filteredDevices = devices.filter(device =>
        device.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (device.assignedWorker && device.assignedWorker.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Device Management</h1>
                    <p className="text-gray-400">Manage wearable devices and configurations</p>
                </div>
                <Button icon={<Plus size={18} />} onClick={() => setShowAddModal(true)}>Add Device</Button>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Total Devices"
                    value={devices.length}
                    icon={Radio}
                    color="bg-[#3B82F6]"
                    subtitle="Registered units"
                />
                <MetricCard
                    title="Active"
                    value={devices.filter(d => d.status === 'Active').length}
                    icon={Activity}
                    color="bg-[#00BFA5]"
                    subtitle="Currently in use"
                />
                <MetricCard
                    title="Maintenance"
                    value={devices.filter(d => d.status === 'Maintenance').length}
                    icon={Wrench}
                    color="bg-[#F59E0B]"
                    subtitle="Under repair"
                />
                <MetricCard
                    title="Low Battery"
                    value={devices.filter(d => d.battery < 20).length}
                    icon={BatteryLow}
                    color="bg-[#EF4444]"
                    subtitle="Below 20%"
                />
            </div>

            <CardDark>
                <CardBody className="p-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search devices..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-dark pl-10"
                        />
                    </div>
                </CardBody>
            </CardDark>

            <CardDark>
                <CardBody className="p-0">
                    <Table columns={columns} data={filteredDevices} />
                </CardBody>
            </CardDark>

            {/* Add Device Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Add New Device"
                size="md"
            >
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Device ID
                        </label>
                        <input
                            type="text"
                            name="deviceId"
                            value={formData.deviceId}
                            onChange={handleInputChange}
                            className="input"
                            placeholder="DEV-XXX"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Serial Number
                        </label>
                        <input
                            type="text"
                            name="serialNumber"
                            value={formData.serialNumber}
                            onChange={handleInputChange}
                            className="input"
                            placeholder="GW-XXXXX"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Type
                        </label>
                        <select
                            name="type"
                            value={formData.type}
                            onChange={handleInputChange}
                            className="input"
                        >
                            <option>Smart Vest</option>
                            <option>Smart Helmet</option>
                            <option>Wearable Band</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Assigned Worker (Optional)
                        </label>
                        <input
                            type="text"
                            name="assignedWorker"
                            value={formData.assignedWorker}
                            onChange={handleInputChange}
                            className="input"
                            placeholder="Search worker..."
                        />
                    </div>
                    <div className="flex gap-3 justify-end pt-4">
                        <Button variant="secondary" type="button" onClick={() => setShowAddModal(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            Add Device
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={handleConfirmAdd}
                title="Add New Device?"
                message="Please review the device details before confirming. This will register a new device in the system."
                variant="info"
                confirmText="Yes, Add Device"
                cancelText="Go Back"
                loading={isSubmitting}
                data={{
                    'Device ID': formData.deviceId,
                    'Serial Number': formData.serialNumber,
                    'Type': formData.type,
                    'Assigned To': formData.assignedWorker || 'Unassigned'
                }}
            />
        </div>
    );
};

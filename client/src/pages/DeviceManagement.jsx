import React, { useState, useEffect } from 'react';
import { Plus, Search, Settings, Radio, Activity, Wrench, BatteryLow } from 'lucide-react';
import { CardDark, CardBody } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { devicesApi, workersApi } from '../utils/api';
import { useToast } from '../context/ToastContext';

export const DeviceManagement = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showConfigureModal, setShowConfigureModal] = useState(false);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [devices, setDevices] = useState([]);
    const [workers, setWorkers] = useState([]);
    const toast = useToast();

    // Fetch devices and workers from API
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [devicesRes, workersRes] = await Promise.all([
                    devicesApi.getAll(),
                    workersApi.getAll()
                ]);
                setDevices(devicesRes.data);
                setWorkers(workersRes.data);
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    // Form state
    const [formData, setFormData] = useState({
        deviceId: '',
        serialNumber: '',
        type: 'Vest',
        workerId: ''
    });

    // Assign form state
    const [assignWorkerId, setAssignWorkerId] = useState('');

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
            const response = await devicesApi.create({
                deviceId: formData.deviceId,
                serialNumber: formData.serialNumber,
                type: formData.type,
                workerId: formData.workerId || null
            });

            setDevices(prev => [...prev, response.data]);

            setFormData({
                deviceId: '',
                serialNumber: '',
                type: 'Vest',
                workerId: ''
            });
            setShowConfirmModal(false);
            setShowAddModal(false);
            toast.success('Device added successfully');
        } catch (error) {
            console.error('Failed to add device:', error);
            toast.error('Failed to add device. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAssign = (device) => {
        setSelectedDevice(device);
        setAssignWorkerId(device.workerId || '');
        setShowAssignModal(true);
    };

    const handleConfigure = (device) => {
        setSelectedDevice(device);
        setShowConfigureModal(true);
    };

    const handleConfirmAssign = async () => {
        setIsSubmitting(true);
        try {
            const response = await devicesApi.assign(selectedDevice.id, assignWorkerId || null);

            // Update local state
            setDevices(prev => prev.map(d =>
                d.id === selectedDevice.id ? response.data : d
            ));

            setShowAssignModal(false);
            setSelectedDevice(null);
            toast.success('Device assigned successfully');
        } catch (error) {
            console.error('Failed to assign device:', error);
            toast.error('Failed to assign device. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateStatus = async (status) => {
        setIsSubmitting(true);
        try {
            const response = await devicesApi.update(selectedDevice.id, { status });

            setDevices(prev => prev.map(d =>
                d.id === selectedDevice.id ? response.data : d
            ));

            setShowConfigureModal(false);
            setSelectedDevice(null);
            toast.success(`Device status updated to ${status}`);
        } catch (error) {
            console.error('Failed to update device:', error);
            toast.error('Failed to update device. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Format last communication time
    const formatLastComm = (date) => {
        if (!date) return 'Never';
        const now = new Date();
        const lastComm = new Date(date);
        const diffMs = now - lastComm;
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} hr ago`;
        return lastComm.toLocaleDateString();
    };

    const columns = [
        { key: 'deviceId', label: 'Device ID', sortable: true },
        { key: 'serialNumber', label: 'Serial Number', sortable: true },
        {
            key: 'type',
            label: 'Type',
            render: (row) => <Badge variant="info">{row.type}</Badge>
        },
        {
            key: 'worker',
            label: 'Assigned To',
            sortable: true,
            render: (row) => row.worker?.fullName || <span className="text-gray-500">Unassigned</span>
        },
        {
            key: 'battery',
            label: 'Battery',
            render: (row) => (
                <span className={row.battery < 20 ? 'text-danger' : row.battery < 50 ? 'text-warning' : 'text-success'}>
                    {row.battery}%
                </span>
            )
        },
        {
            key: 'lastCommunication',
            label: 'Last Communication',
            render: (row) => formatLastComm(row.lastCommunication)
        },
        { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
        {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleConfigure(row)}>Configure</Button>
                    <Button size="sm" variant="primary" onClick={() => handleAssign(row)}>Assign</Button>
                </div>
            )
        }
    ];

    const filteredDevices = devices.filter(device =>
        device.deviceId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (device.worker?.fullName && device.worker.fullName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Get unassigned workers for dropdown
    const availableWorkers = workers.filter(w =>
        w.status === 'Active' && !devices.some(d => d.workerId === w.id && d.id !== selectedDevice?.id)
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-400">Loading devices...</div>
            </div>
        );
    }

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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MetricCard
                    title="Total Devices"
                    value={devices.length}
                    icon={Radio}
                    color="bg-[#3B82F6]"
                    subtitle="Registered devices"
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
                <form onSubmit={handleFormSubmit} className="space-y-5">
                    <div>
                        <label className="label-modal">
                            Device ID
                        </label>
                        <input
                            type="text"
                            name="deviceId"
                            value={formData.deviceId}
                            onChange={handleInputChange}
                            className="input-modal"
                            placeholder="DEV-XXX"
                            required
                        />
                    </div>
                    <div>
                        <label className="label-modal">
                            Serial Number
                        </label>
                        <input
                            type="text"
                            name="serialNumber"
                            value={formData.serialNumber}
                            onChange={handleInputChange}
                            className="input-modal"
                            placeholder="GW-XXXXX"
                            required
                        />
                    </div>
                    <div>
                        <label className="label-modal">
                            Type
                        </label>
                        <select
                            name="type"
                            value={formData.type}
                            onChange={handleInputChange}
                            className="select-modal"
                        >
                            <option value="Vest">Smart Vest</option>
                            <option value="Helmet">Smart Helmet</option>
                            <option value="Band">Wearable Band</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-modal">
                            Assign to Worker (Optional)
                        </label>
                        <select
                            name="workerId"
                            value={formData.workerId}
                            onChange={handleInputChange}
                            className="select-modal"
                        >
                            <option value="">-- Select Worker --</option>
                            {workers.filter(w => w.status === 'Active').map(worker => (
                                <option key={worker.id} value={worker.id}>
                                    {worker.fullName} ({worker.department})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-3 justify-end pt-4 border-t border-[#2d3a52]/50">
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
                isSubmitting={isSubmitting}
                title="Add New Device"
                message="Do you want to add this device?"
                confirmText="Yes, Add Device"
                variant="info"
                data={[
                    { label: 'Device ID', value: formData.deviceId },
                    { label: 'Serial Number', value: formData.serialNumber },
                    { label: 'Type', value: formData.type },
                    { label: 'Assigned Worker', value: workers.find(w => w.id == formData.workerId)?.fullName || 'None' }
                ]}
            />

            {/* Assign Device Modal */}
            <Modal
                isOpen={showAssignModal}
                onClose={() => setShowAssignModal(false)}
                title="Assign Device"
                size="md"
            >
                <div className="space-y-5">
                    <div className="bg-[#0d1220] p-4 rounded-lg border border-[#2d3a52]">
                        <p className="text-gray-400 text-sm">Device: <span className="font-semibold text-white">{selectedDevice?.deviceId}</span></p>
                        <p className="text-gray-400 text-sm mt-1">Current: <span className="font-semibold text-white">{selectedDevice?.worker?.fullName || 'Unassigned'}</span></p>
                    </div>
                    <div>
                        <label className="label-modal">
                            Assign to Worker
                        </label>
                        <select
                            value={assignWorkerId}
                            onChange={(e) => setAssignWorkerId(e.target.value)}
                            className="select-modal"
                        >
                            <option value="">-- Unassign --</option>
                            {availableWorkers.map(worker => (
                                <option key={worker.id} value={worker.id}>
                                    {worker.fullName} ({worker.department})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-3 justify-end pt-4 border-t border-[#2d3a52]/50">
                        <Button variant="secondary" onClick={() => setShowAssignModal(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleConfirmAssign} disabled={isSubmitting}>
                            {isSubmitting ? 'Assigning...' : 'Confirm Assignment'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Configure Device Modal */}
            <Modal
                isOpen={showConfigureModal}
                onClose={() => setShowConfigureModal(false)}
                title="Configure Device"
                size="md"
            >
                {selectedDevice && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-4 text-sm bg-[#0d1220] p-4 rounded-lg border border-[#2d3a52]">
                            <div>
                                <p className="text-gray-400">Device ID:</p>
                                <p className="font-semibold text-white">{selectedDevice.deviceId}</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Serial Number:</p>
                                <p className="font-semibold text-white">{selectedDevice.serialNumber}</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Type:</p>
                                <p className="font-semibold text-white">{selectedDevice.type}</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Battery:</p>
                                <p className="font-semibold text-white">{selectedDevice.battery}%</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Firmware:</p>
                                <p className="font-semibold text-white">{selectedDevice.firmwareVersion || 'Unknown'}</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Current Status:</p>
                                <StatusBadge status={selectedDevice.status} />
                            </div>
                        </div>

                        <div className="border-t border-[#2d3a52] pt-4">
                            <h4 className="label-modal mb-3">Change Status</h4>
                            <div className="flex gap-2 flex-wrap">
                                <Button
                                    size="sm"
                                    variant={selectedDevice.status === 'Active' ? 'primary' : 'outline'}
                                    onClick={() => handleUpdateStatus('Active')}
                                    disabled={isSubmitting}
                                >
                                    Active
                                </Button>
                                <Button
                                    size="sm"
                                    variant={selectedDevice.status === 'Available' ? 'primary' : 'outline'}
                                    onClick={() => handleUpdateStatus('Available')}
                                    disabled={isSubmitting}
                                >
                                    Available
                                </Button>
                                <Button
                                    size="sm"
                                    variant={selectedDevice.status === 'Maintenance' ? 'primary' : 'outline'}
                                    onClick={() => handleUpdateStatus('Maintenance')}
                                    disabled={isSubmitting}
                                >
                                    Maintenance
                                </Button>
                                <Button
                                    size="sm"
                                    variant={selectedDevice.status === 'Offline' ? 'primary' : 'outline'}
                                    onClick={() => handleUpdateStatus('Offline')}
                                    disabled={isSubmitting}
                                >
                                    Offline
                                </Button>
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end pt-4 border-t border-[#2d3a52]/50">
                            <Button variant="secondary" onClick={() => setShowConfigureModal(false)}>
                                Close
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

import React, { useState } from 'react';
import { Plus, Phone, AlertTriangle, Shield, Activity, Siren, CheckCircle } from 'lucide-react';
import { CardDark, CardBody, CardHeader } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';

export const EmergencyContacts = () => {
    const [showEmergencyModal, setShowEmergencyModal] = useState(false);
    const [showAddContactModal, setShowAddContactModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [emergencyActive, setEmergencyActive] = useState(false);

    const [contacts, setContacts] = useState([
        { id: '1', name: 'Fire Department', number: '911', type: 'Fire', priority: 1, status: 'Active' },
        { id: '2', name: 'Medical Emergency', number: '911', type: 'Medical', priority: 1, status: 'Active' },
        { id: '3', name: 'Site Manager', number: '09171234567', type: 'Management', priority: 2, status: 'Active' },
    ]);

    const [formData, setFormData] = useState({
        name: '',
        number: '',
        type: 'Fire',
        priority: '1',
        email: '',
        notes: ''
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
            await new Promise(resolve => setTimeout(resolve, 1000));

            const newContact = {
                id: String(contacts.length + 1),
                name: formData.name,
                number: formData.number,
                type: formData.type,
                priority: parseInt(formData.priority),
                status: 'Active'
            };
            setContacts(prev => [...prev, newContact]);

            setFormData({
                name: '',
                number: '',
                type: 'Fire',
                priority: '1',
                email: '',
                notes: ''
            });
            setShowConfirmModal(false);
            setShowAddContactModal(false);
        } catch (error) {
            console.error('Failed to add contact:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const columns = [
        { key: 'name', label: 'Contact Name', sortable: true },
        { key: 'number', label: 'Phone Number' },
        { key: 'type', label: 'Type', render: (row) => <Badge variant="info">{row.type}</Badge> },
        { key: 'priority', label: 'Priority', render: (row) => <Badge variant={row.priority === 1 ? 'danger' : 'secondary'}>P{row.priority}</Badge> },
        { key: 'status', label: 'Status', render: (row) => <Badge variant="success">{row.status}</Badge> },
        {
            key: 'actions',
            label: 'Actions',
            render: () => (
                <div className="flex gap-2">
                    <Button size="sm" variant="outline">Edit</Button>
                    <Button size="sm" variant="secondary">Test Call</Button>
                </div>
            )
        }
    ];

    const handleEmergencyTrigger = () => {
        setEmergencyActive(true);
        setShowEmergencyModal(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Emergency Response</h1>
                    <p className="text-gray-400">Manage emergency protocols and contacts</p>
                </div>
                <Button icon={<Plus size={18} />} onClick={() => setShowAddContactModal(true)}>Add Contact</Button>
            </div>

            {/* Emergency Banner */}
            <div className="bg-gradient-to-r from-red-900/50 to-red-600/20 border border-red-500/50 rounded-xl p-6 flex items-center justify-between relative overflow-hidden">
                <div className="absolute inset-0 bg-red-500/10 animate-pulse-slow pointer-events-none" />
                <div className="flex items-center gap-6 relative z-10">
                    <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse">
                        <Siren className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-1">Emergency Alert System</h2>
                        <p className="text-red-200">Trigger immediate alerts to all emergency contacts and active devices.</p>
                    </div>
                </div>
                <Button
                    variant="danger"
                    size="lg"
                    className="relative z-10 shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] scale-110"
                    onClick={() => setShowEmergencyModal(true)}
                >
                    TRIGGER EMERGENCY
                </Button>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                    title="Total Contacts"
                    value={contacts.length}
                    icon={Phone}
                    color="bg-[#3B82F6]"
                    subtitle="Registered responders"
                />
                <MetricCard
                    title="Medical"
                    value={contacts.filter(c => c.type === 'Medical').length}
                    icon={Activity}
                    color="bg-[#10B981]"
                    subtitle="Medical personnel"
                />
                <MetricCard
                    title="Management"
                    value={contacts.filter(c => c.type === 'Management').length}
                    icon={Shield}
                    color="bg-[#F59E0B]"
                    subtitle="Site supervisors"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Contacts Table */}
                <div className="lg:col-span-2">
                    <CardDark className="h-full">
                        <CardHeader className="px-6 py-4 border-b border-white/10">
                            <h3 className="text-lg font-bold text-white">Contact Directory</h3>
                        </CardHeader>
                        <CardBody className="p-0">
                            <Table columns={columns} data={contacts} />
                        </CardBody>
                    </CardDark>
                </div>

                {/* Response Protocols */}
                <div className="lg:col-span-1">
                    <CardDark className="h-full bg-gradient-to-b from-gray-800/50 to-transparent">
                        <CardHeader className="px-6 py-4 border-b border-white/10">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Shield className="h-5 w-5 text-primary-500" />
                                Response Protocols
                            </h3>
                        </CardHeader>
                        <CardBody className="p-6 space-y-6">
                            <div className="relative pl-6 border-l-2 border-primary-500">
                                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary-500 border-4 border-gray-900" />
                                <h4 className="text-white font-semibold mb-1">Immediate Notification</h4>
                                <p className="text-sm text-gray-400">
                                    Immediate alerts sent via SMS and automated phone calls to all Priority 1 contacts.
                                </p>
                            </div>
                            <div className="relative pl-6 border-l-2 border-primary-500/50">
                                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary-500/50 border-4 border-gray-900" />
                                <h4 className="text-white font-semibold mb-1">Secondary Notification</h4>
                                <p className="text-sm text-gray-400">
                                    Priority 2 and 3 contacts notified within 30 seconds if no acknowledgment received.
                                </p>
                            </div>
                            <div className="relative pl-6 border-l-2 border-gray-700">
                                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-gray-700 border-4 border-gray-900" />
                                <h4 className="text-white font-semibold mb-1">Incident Logging</h4>
                                <p className="text-sm text-gray-400">
                                    All emergency events are automatically logged with timestamps and sensor data snapshots.
                                </p>
                            </div>
                        </CardBody>
                    </CardDark>
                </div>
            </div>

            {/* Emergency Trigger Modal */}
            <Modal
                isOpen={showEmergencyModal}
                onClose={() => setShowEmergencyModal(false)}
                title="Activate Emergency Alert?"
                size="md"
            >
                <div className="text-center p-4">
                    <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="h-10 w-10 text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Confirm Emergency Activation</h3>
                    <p className="text-gray-400 mb-8">
                        This action will trigger immediate alerts to all emergency contacts and activate alarms on all connected devices. This action is logged.
                    </p>
                    <div className="flex gap-3 justify-center">
                        <Button variant="secondary" onClick={() => setShowEmergencyModal(false)} size="lg">
                            Cancel
                        </Button>
                        <Button variant="danger" onClick={handleEmergencyTrigger} size="lg" className="shadow-lg shadow-red-500/20">
                            ACTIVATE ALERT
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Add Contact Modal */}
            <Modal
                isOpen={showAddContactModal}
                onClose={() => setShowAddContactModal(false)}
                title="Add Emergency Contact"
                size="md"
            >
                <form onSubmit={handleFormSubmit} className="space-y-5">
                    <div>
                        <label className="label-modal">
                            Contact Name
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className="input-modal"
                            placeholder="e.g., Fire Department, Site Manager"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label-modal">
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                name="number"
                                value={formData.number}
                                onChange={handleInputChange}
                                className="input-modal"
                                placeholder="09171234567"
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
                                className="input-modal"
                            >
                                <option>Fire</option>
                                <option>Medical</option>
                                <option>Security</option>
                                <option>Management</option>
                                <option>External</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label-modal">
                                Priority
                            </label>
                            <select
                                name="priority"
                                value={formData.priority}
                                onChange={handleInputChange}
                                className="input-modal"
                            >
                                <option value="1">Priority 1 (Immediate)</option>
                                <option value="2">Priority 2 (Secondary)</option>
                                <option value="3">Priority 3 (Tertiary)</option>
                            </select>
                        </div>
                        <div>
                            <label className="label-modal">
                                Email (Optional)
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                className="input-modal"
                                placeholder="contact@email.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="label-modal">
                            Notes (Optional)
                        </label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleInputChange}
                            className="input min-h-[80px]"
                            placeholder="Additional information..."
                        />
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t border-[#2d3a52]/50">
                        <Button variant="secondary" type="button" onClick={() => setShowAddContactModal(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            Add Contact
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={handleConfirmAdd}
                title="Add Emergency Contact?"
                message="This contact will be added to the emergency response directory and may receive alerts during emergencies."
                variant="info"
                confirmText="Yes, Add Contact"
                cancelText="Go Back"
                loading={isSubmitting}
                data={{
                    'Name': formData.name,
                    'Phone': formData.number,
                    'Type': formData.type,
                    'Priority': `Priority ${formData.priority}`
                }}
            />
        </div>
    );
};

import React, { useState, useEffect } from 'react';
import { Plus, Phone, AlertTriangle, Shield, Activity, Siren, CheckCircle, Mail, MessageSquare, Loader2 } from 'lucide-react';
import { CardDark, CardBody, CardHeader } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { contactsApi } from '../utils/api';
import { useToast } from '../context/ToastContext';

export const EmergencyContacts = () => {
    const [showEmergencyModal, setShowEmergencyModal] = useState(false);
    const [showAddContactModal, setShowAddContactModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [emergencyActive, setEmergencyActive] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const toast = useToast();

    const [contacts, setContacts] = useState([]);

    const [formData, setFormData] = useState({
        name: '',
        number: '',
        type: 'Fire',
        priority: '1',
        email: '',
        notes: ''
    });

    // Fetch contacts from API
    useEffect(() => {
        const fetchContacts = async () => {
            try {
                setIsLoading(true);
                const response = await contactsApi.getAll();
                setContacts(response.data);
            } catch (error) {
                console.error('Failed to fetch contacts:', error);
                // Keep empty array if API fails
            } finally {
                setIsLoading(false);
            }
        };
        fetchContacts();
    }, []);

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
            const response = await contactsApi.create({
                ...formData,
                priority: parseInt(formData.priority)
            });

            setContacts(prev => [...prev, response.data]);

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
            toast.success('Emergency contact added successfully');
        } catch (error) {
            console.error('Failed to add contact:', error);
            toast.error('Failed to add contact. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const [showEditModal, setShowEditModal] = useState(false);
    const [showEditConfirm, setShowEditConfirm] = useState(false);
    const [showCallModal, setShowCallModal] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [showSmsModal, setShowSmsModal] = useState(false);
    const [selectedContact, setSelectedContact] = useState(null);
    const [callStatus, setCallStatus] = useState('idle'); // idle, calling, connected, ended
    const [emailMessage, setEmailMessage] = useState('');
    const [smsMessage, setSmsMessage] = useState('');
    const [actionStatus, setActionStatus] = useState('idle'); // idle, sending, sent

    const handleEditContact = (contact) => {
        setSelectedContact(contact);
        setFormData({
            name: contact.name,
            number: contact.number,
            type: contact.type,
            priority: String(contact.priority),
            email: contact.email || '',
            notes: contact.notes || ''
        });
        setShowEditModal(true);
    };

    const handleTestCall = (contact) => {
        setSelectedContact(contact);
        setCallStatus('calling');
        setShowCallModal(true);

        // Simulate call connection after 2 seconds
        setTimeout(() => {
            setCallStatus('connected');
        }, 2000);
    };

    const handleSendEmail = (contact) => {
        setSelectedContact(contact);
        setEmailMessage('');
        setActionStatus('idle');
        setShowEmailModal(true);
    };

    const handleSendSms = (contact) => {
        setSelectedContact(contact);
        setSmsMessage('');
        setActionStatus('idle');
        setShowSmsModal(true);
    };

    const handleConfirmEmail = async () => {
        setActionStatus('sending');
        // Simulate email sending (in production, this would call a backend API)
        setTimeout(() => {
            setActionStatus('sent');
            setTimeout(() => {
                setShowEmailModal(false);
                setActionStatus('idle');
            }, 1500);
        }, 1500);
    };

    const handleConfirmSms = async () => {
        setActionStatus('sending');
        // Simulate SMS sending (in production, this would call a backend API like Twilio)
        setTimeout(() => {
            setActionStatus('sent');
            setTimeout(() => {
                setShowSmsModal(false);
                setActionStatus('idle');
            }, 1500);
        }, 1500);
    };

    const handleEndCall = () => {
        setCallStatus('ended');
        setTimeout(() => {
            setShowCallModal(false);
            setCallStatus('idle');
            setSelectedContact(null);
        }, 1000);
    };

    const handleSaveEdit = () => {
        setShowEditConfirm(true);
    };

    const confirmSaveEdit = async () => {
        setIsSubmitting(true);
        try {
            const response = await contactsApi.update(selectedContact.id, {
                ...formData,
                priority: parseInt(formData.priority)
            });
            setContacts(prev => prev.map(c =>
                c.id === selectedContact.id ? response.data : c
            ));
            setShowEditConfirm(false);
            setShowEditModal(false);
            setSelectedContact(null);
            toast.success('Contact updated successfully');
        } catch (error) {
            console.error('Failed to update contact:', error);
            toast.error('Failed to update contact. Please try again.');
            setShowEditConfirm(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    const columns = [
        { key: 'name', label: 'Contact Name', sortable: true },
        { key: 'number', label: 'Phone Number' },
        { key: 'email', label: 'Email', render: (row) => row.email || <span className="text-gray-500">-</span> },
        { key: 'type', label: 'Type', render: (row) => <Badge variant="info">{row.type}</Badge> },
        { key: 'priority', label: 'Priority', render: (row) => <Badge variant={row.priority === 1 ? 'danger' : 'secondary'}>P{row.priority}</Badge> },
        { key: 'status', label: 'Status', render: (row) => <Badge variant="success">{row.status}</Badge> },
        {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEditContact(row)}>
                        Edit
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => handleTestCall(row)} title="Call">
                        <Phone size={14} />
                    </Button>
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleSendEmail(row)}
                        title="Email"
                        disabled={!row.email}
                        className={!row.email ? 'opacity-50 cursor-not-allowed' : ''}
                    >
                        <Mail size={14} />
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => handleSendSms(row)} title="SMS">
                        <MessageSquare size={14} />
                    </Button>
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

            {/* Edit Contact Modal */}
            <Modal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                title="Edit Contact"
                size="md"
            >
                <div className="space-y-5">
                    <div>
                        <label className="label-modal">Contact Name</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className="input-modal"
                        />
                    </div>
                    <div>
                        <label className="label-modal">Phone Number</label>
                        <input
                            type="tel"
                            name="number"
                            value={formData.number}
                            onChange={handleInputChange}
                            className="input-modal"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label-modal">Type</label>
                            <select
                                name="type"
                                value={formData.type}
                                onChange={handleInputChange}
                                className="input-modal"
                            >
                                <option value="Fire">Fire</option>
                                <option value="Medical">Medical</option>
                                <option value="Police">Police</option>
                                <option value="Management">Management</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="label-modal">Priority</label>
                            <select
                                name="priority"
                                value={formData.priority}
                                onChange={handleInputChange}
                                className="input-modal"
                            >
                                <option value="1">Priority 1 (Highest)</option>
                                <option value="2">Priority 2</option>
                                <option value="3">Priority 3</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-3 justify-end pt-4 border-t border-[#2d3a52]/50">
                        <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveEdit}>
                            Save Changes
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Test Call Modal */}
            <Modal
                isOpen={showCallModal}
                onClose={() => {
                    if (callStatus !== 'calling') {
                        setShowCallModal(false);
                        setCallStatus('idle');
                    }
                }}
                title="Test Call"
                size="sm"
            >
                <div className="text-center py-6">
                    {/* Call Status Display */}
                    <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 ${callStatus === 'calling' ? 'bg-yellow-500/20 animate-pulse' :
                        callStatus === 'connected' ? 'bg-green-500/20' :
                            callStatus === 'ended' ? 'bg-gray-500/20' : 'bg-[#00E5FF]/20'
                        }`}>
                        <Phone className={`h-12 w-12 ${callStatus === 'calling' ? 'text-yellow-500 animate-bounce' :
                            callStatus === 'connected' ? 'text-green-500' :
                                callStatus === 'ended' ? 'text-gray-500' : 'text-[#00E5FF]'
                            }`} />
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2">
                        {selectedContact?.name}
                    </h3>
                    <p className="text-2xl font-mono text-[#00E5FF] mb-4">
                        {selectedContact?.number}
                    </p>

                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${callStatus === 'calling' ? 'bg-yellow-500/20 text-yellow-400' :
                        callStatus === 'connected' ? 'bg-green-500/20 text-green-400' :
                            callStatus === 'ended' ? 'bg-gray-500/20 text-gray-400' : ''
                        }`}>
                        {callStatus === 'calling' && (
                            <>
                                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-ping"></div>
                                Calling...
                            </>
                        )}
                        {callStatus === 'connected' && (
                            <>
                                <CheckCircle size={16} />
                                Connected
                            </>
                        )}
                        {callStatus === 'ended' && 'Call Ended'}
                    </div>

                    {callStatus === 'connected' && (
                        <div className="mt-6">
                            <Button
                                variant="danger"
                                size="lg"
                                className="px-8"
                                onClick={handleEndCall}
                            >
                                End Call
                            </Button>
                        </div>
                    )}

                    {callStatus === 'calling' && (
                        <p className="text-sm text-gray-500 mt-4">
                            This is a test call simulation
                        </p>
                    )}
                </div>
            </Modal>

            {/* Email Modal */}
            <Modal
                isOpen={showEmailModal}
                onClose={() => {
                    if (actionStatus !== 'sending') {
                        setShowEmailModal(false);
                        setActionStatus('idle');
                    }
                }}
                title="Send Email"
                size="md"
            >
                <div className="space-y-4">
                    {actionStatus === 'sent' ? (
                        <div className="text-center py-8">
                            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="h-10 w-10 text-green-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Email Sent!</h3>
                            <p className="text-gray-400">Email successfully sent to {selectedContact?.email}</p>
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="label-modal">To</label>
                                <input
                                    type="text"
                                    value={selectedContact?.email || ''}
                                    disabled
                                    className="input-modal bg-dark-lighter"
                                />
                            </div>
                            <div>
                                <label className="label-modal">Contact Name</label>
                                <input
                                    type="text"
                                    value={selectedContact?.name || ''}
                                    disabled
                                    className="input-modal bg-dark-lighter"
                                />
                            </div>
                            <div>
                                <label className="label-modal">Message</label>
                                <textarea
                                    value={emailMessage}
                                    onChange={(e) => setEmailMessage(e.target.value)}
                                    className="input-modal min-h-[120px]"
                                    placeholder="Enter your message..."
                                />
                            </div>
                            <div className="flex gap-3 justify-end pt-4 border-t border-[#2d3a52]/50">
                                <Button variant="secondary" onClick={() => setShowEmailModal(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleConfirmEmail}
                                    disabled={!emailMessage.trim() || actionStatus === 'sending'}
                                    icon={actionStatus === 'sending' ? <Loader2 className="animate-spin" size={16} /> : <Mail size={16} />}
                                >
                                    {actionStatus === 'sending' ? 'Sending...' : 'Send Email'}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </Modal>

            {/* SMS Modal */}
            <Modal
                isOpen={showSmsModal}
                onClose={() => {
                    if (actionStatus !== 'sending') {
                        setShowSmsModal(false);
                        setActionStatus('idle');
                    }
                }}
                title="Send SMS"
                size="md"
            >
                <div className="space-y-4">
                    {actionStatus === 'sent' ? (
                        <div className="text-center py-8">
                            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="h-10 w-10 text-green-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">SMS Sent!</h3>
                            <p className="text-gray-400">SMS successfully sent to {selectedContact?.number}</p>
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="label-modal">To</label>
                                <input
                                    type="text"
                                    value={selectedContact?.number || ''}
                                    disabled
                                    className="input-modal bg-dark-lighter"
                                />
                            </div>
                            <div>
                                <label className="label-modal">Contact Name</label>
                                <input
                                    type="text"
                                    value={selectedContact?.name || ''}
                                    disabled
                                    className="input-modal bg-dark-lighter"
                                />
                            </div>
                            <div>
                                <label className="label-modal">Message <span className="text-gray-500 text-xs">({smsMessage.length}/160)</span></label>
                                <textarea
                                    value={smsMessage}
                                    onChange={(e) => setSmsMessage(e.target.value.slice(0, 160))}
                                    className="input-modal min-h-[100px]"
                                    placeholder="Enter your message..."
                                    maxLength={160}
                                />
                            </div>
                            <div className="flex gap-3 justify-end pt-4 border-t border-[#2d3a52]/50">
                                <Button variant="secondary" onClick={() => setShowSmsModal(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleConfirmSms}
                                    disabled={!smsMessage.trim() || actionStatus === 'sending'}
                                    icon={actionStatus === 'sending' ? <Loader2 className="animate-spin" size={16} /> : <MessageSquare size={16} />}
                                >
                                    {actionStatus === 'sending' ? 'Sending...' : 'Send SMS'}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </Modal>

            {/* Edit Contact Confirmation Modal */}
            <ConfirmationModal
                isOpen={showEditConfirm}
                onClose={() => setShowEditConfirm(false)}
                onConfirm={confirmSaveEdit}
                loading={isSubmitting}
                title="Save Changes"
                message="Are you sure you want to save these changes to the emergency contact?"
                confirmText="Yes, Save Changes"
                variant="warning"
                data={[
                    { label: 'Name', value: formData.name },
                    { label: 'Phone', value: formData.number },
                    { label: 'Type', value: formData.type },
                    { label: 'Priority', value: `P${formData.priority}` }
                ]}
            />
        </div>
    );
};


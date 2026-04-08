import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Phone, AlertTriangle, Shield, Activity, Siren, CheckCircle, Mail, Loader2, Globe } from 'lucide-react';
import { CardDark, CardBody, CardHeader } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { contactsApi, sensorsApi } from '../utils/api';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';
import { useRefresh } from '../context/RefreshContext';

export const EmergencyContacts = () => {
    const { emitEvent, connected } = useSocket();
    const [showEmergencyModal, setShowEmergencyModal] = useState(false);
    const [showAddContactModal, setShowAddContactModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [emergencyActive, setEmergencyActive] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [beaconActive, setBeaconActive] = useState(false);
    const [beaconMeta, setBeaconMeta] = useState(null);
    const [showBeaconModal, setShowBeaconModal] = useState(false);
    const [beaconLoading, setBeaconLoading] = useState(false);
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
    const fetchContacts = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await contactsApi.getAll();
            setContacts(response.data);
        } catch (error) {
            console.error('Failed to fetch contacts:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchContacts(); }, [fetchContacts]);

    // Register refresh
    const { registerRefresh } = useRefresh();
    useEffect(() => { registerRefresh(fetchContacts); }, [registerRefresh, fetchContacts]);

    // Fetch earthquake beacon status on mount (so navigating away and back shows correct state)
    useEffect(() => {
        const fetchBeaconStatus = async () => {
            try {
                const res = await sensorsApi.getEarthquakeBeaconStatus();
                if (res.data.active) {
                    setBeaconActive(true);
                    setBeaconMeta({ timestamp: res.data.timestamp, initiatedBy: res.data.initiatedBy });
                }
            } catch (err) {
                // Silently fail — beacon status is not critical for page load
            }
        };
        fetchBeaconStatus();
    }, []);

    // Handle Emergency Trigger - uses socket event that server now processes
    const handleEmergencyTrigger = () => {
        if (emitEvent) {
            emitEvent('emergency_broadcast', {
                type: 'System Emergency',
                severity: 'Critical',
                message: 'Emergency triggered from Emergency Contacts page',
                timestamp: new Date().toISOString(),
                source: 'emergency_contacts'
            });
        }

        toast.success('Emergency alert broadcast sent! All devices will be buzzed and contacts notified via email.');

        setEmergencyActive(true);
        setShowEmergencyModal(false);

        // Reset UI after 5 seconds 
        setTimeout(() => setEmergencyActive(false), 5000);
    };

    // Listen for earthquake beacon status updates via socket
    const { socket } = useSocket();
    useEffect(() => {
        if (!socket) return;
        const handleBeaconStatus = (data) => {
            setBeaconActive(data.active);
            if (data.active) {
                setBeaconMeta({ timestamp: data.timestamp, initiatedBy: data.initiatedBy });
            } else {
                setBeaconMeta(null);
            }
        };
        socket.on('earthquake_beacon_status', handleBeaconStatus);
        return () => socket.off('earthquake_beacon_status', handleBeaconStatus);
    }, [socket]);

    // Earthquake Beacon — Activate
    const handleActivateBeacon = async () => {
        setBeaconLoading(true);
        try {
            await sensorsApi.activateEarthquakeBeacon('Safety Officer');
            setBeaconActive(true);
            setBeaconMeta({ timestamp: new Date().toISOString(), initiatedBy: 'Safety Officer' });
            setShowBeaconModal(false);
            toast.success('Earthquake Locator Beacon activated on all devices! Devices will beep every 10 seconds.');
        } catch (error) {
            console.error('Failed to activate beacon:', error);
            toast.error('Failed to activate earthquake beacon. Please try again.');
        } finally {
            setBeaconLoading(false);
        }
    };

    // Earthquake Beacon — Deactivate
    const handleDeactivateBeacon = async () => {
        setBeaconLoading(true);
        try {
            await sensorsApi.deactivateEarthquakeBeacon();
            setBeaconActive(false);
            setBeaconMeta(null);
            toast.success('Earthquake Locator Beacon deactivated.');
        } catch (error) {
            console.error('Failed to deactivate beacon:', error);
            toast.error('Failed to deactivate earthquake beacon.');
        } finally {
            setBeaconLoading(false);
        }
    };

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
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [selectedContact, setSelectedContact] = useState(null);
    const [emailMessage, setEmailMessage] = useState('');
    const [emailSubject, setEmailSubject] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [emailTemplates, setEmailTemplates] = useState([]);
    const [actionStatus, setActionStatus] = useState('idle'); // idle, sending, sent

    // Fetch email templates on mount
    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const response = await contactsApi.getEmailTemplates();
                setEmailTemplates(response.data);
            } catch (error) {
                console.error('Failed to fetch email templates:', error);
            }
        };
        fetchTemplates();
    }, []);

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

    const handleSendEmail = (contact) => {
        setSelectedContact(contact);
        setEmailMessage('');
        setEmailSubject('');
        setSelectedTemplate('');
        setActionStatus('idle');
        setShowEmailModal(true);
    };

    const handleTemplateChange = (key) => {
        setSelectedTemplate(key);
        if (!key) {
            // Custom message — clear fields
            setEmailSubject('');
            setEmailMessage('');
            return;
        }
        const tpl = emailTemplates.find(t => t.key === key);
        if (tpl) {
            setEmailSubject(tpl.subject);
            setEmailMessage(tpl.body);
        }
    };

    const handleConfirmEmail = async () => {
        setActionStatus('sending');
        try {
            const subject = emailSubject.trim() || (selectedTemplate
                ? emailTemplates.find(t => t.key === selectedTemplate)?.subject
                : `GuardWell Alert - ${selectedContact.name}`);
            await contactsApi.sendEmail(
                selectedContact.id,
                subject,
                emailMessage || 'This is a notification from GuardWell Safety Monitoring System.',
                selectedTemplate || null
            );
            setActionStatus('sent');
            toast.success(`Email sent to ${selectedContact.email}`);
            setTimeout(() => {
                setShowEmailModal(false);
                setActionStatus('idle');
            }, 1500);
        } catch (error) {
            console.error('Failed to send email:', error);
            const errorMsg = error.response?.data?.error || 'Failed to send email';
            toast.error(errorMsg);
            setActionStatus('idle');
        }
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
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleSendEmail(row)}
                        title="Send Email"
                        disabled={!row.email}
                        className={!row.email ? 'opacity-50 cursor-not-allowed' : ''}
                    >
                        <Mail size={14} />
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-[#1F2937] mb-2">Emergency Response</h1>
                    <p className="text-[#4B5563]">Manage emergency protocols and contacts</p>
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

            {/* Earthquake Locator Beacon Banner */}
            <div className={`bg-gradient-to-r ${beaconActive ? 'from-amber-600/60 to-orange-500/40 border-amber-400/70' : 'from-amber-900/40 to-orange-700/20 border-amber-500/40'} border rounded-xl p-6 flex items-center justify-between relative overflow-hidden`}>
                {beaconActive && <div className="absolute inset-0 bg-amber-400/10 animate-pulse pointer-events-none" />}
                <div className="flex items-center gap-6 relative z-10">
                    <div className={`w-16 h-16 ${beaconActive ? 'bg-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.6)] animate-pulse' : 'bg-amber-600 shadow-[0_0_15px_rgba(217,119,6,0.4)]'} rounded-full flex items-center justify-center`}>
                        <Globe className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-3">
                            Earthquake Locator Beacon
                            {beaconActive && (
                                <span className="text-xs font-normal bg-amber-400/30 text-amber-100 px-3 py-1 rounded-full uppercase tracking-wider animate-pulse">● Active</span>
                            )}
                        </h2>
                        <p className="text-amber-200 text-sm">
                            {beaconActive
                                ? `Beacon active since ${beaconMeta?.timestamp ? new Date(beaconMeta.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'now'} — all devices beeping (2s on / 8s rest)`
                                : 'Activate a periodic beep on all devices to help locate trapped workers during earthquakes or building collapses.'
                            }
                        </p>
                    </div>
                </div>
                {beaconActive ? (
                    <Button
                        variant="secondary"
                        size="lg"
                        className="relative z-10 border-amber-300 text-amber-900 bg-amber-100 hover:bg-amber-200 font-bold"
                        onClick={handleDeactivateBeacon}
                        disabled={beaconLoading}
                    >
                        {beaconLoading ? 'Deactivating...' : 'DEACTIVATE BEACON'}
                    </Button>
                ) : (
                    <Button
                        variant="danger"
                        size="lg"
                        className="relative z-10 bg-amber-600 hover:bg-amber-500 border-amber-500 shadow-[0_0_15px_rgba(217,119,6,0.4)] hover:shadow-[0_0_25px_rgba(217,119,6,0.6)] font-bold"
                        onClick={() => setShowBeaconModal(true)}
                        disabled={beaconLoading}
                    >
                        ACTIVATE BEACON
                    </Button>
                )}
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
                        <CardHeader className="px-6 py-4 border-b border-[#E3E6EB]">
                            <h3 className="text-lg font-bold text-[#1F2937]">Contact Directory</h3>
                        </CardHeader>
                        <CardBody className="p-0">
                            <Table columns={columns} data={contacts} />
                        </CardBody>
                    </CardDark>
                </div>

                {/* Response Protocols */}
                <div className="lg:col-span-1">
                    <CardDark className="h-full">
                        <CardHeader className="px-6 py-4 border-b border-[#E3E6EB]">
                            <h3 className="text-lg font-bold text-[#1F2937] flex items-center gap-2">
                                <Shield className="h-5 w-5 text-[#6FA3D8]" />
                                Response Protocols
                            </h3>
                        </CardHeader>
                        <CardBody className="p-6 space-y-6">
                            <div className="relative pl-6 border-l-2 border-[#6FA3D8]">
                                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-[#6FA3D8] border-4 border-white" />
                                <h4 className="text-[#1F2937] font-semibold mb-1">Immediate Notification</h4>
                                <p className="text-sm text-[#4B5563]">
                                    Immediate email alerts sent to all Priority 1 contacts when an emergency is triggered.
                                </p>
                            </div>
                            <div className="relative pl-6 border-l-2 border-[#6FA3D8]/50">
                                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-[#6FA3D8]/50 border-4 border-white" />
                                <h4 className="text-[#1F2937] font-semibold mb-1">Secondary Notification</h4>
                                <p className="text-sm text-[#4B5563]">
                                    Priority 2 and 3 contacts notified within 30 seconds if no acknowledgment received.
                                </p>
                            </div>
                            <div className="relative pl-6 border-l-2 border-[#9CA3AF]">
                                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-[#9CA3AF] border-4 border-white" />
                                <h4 className="text-[#1F2937] font-semibold mb-1">Incident Logging</h4>
                                <p className="text-sm text-[#4B5563]">
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
                    <h3 className="text-xl font-bold text-[#1F2937] mb-2">Confirm Emergency Activation</h3>
                    <p className="text-[#4B5563] mb-8">
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

            {/* Earthquake Beacon Confirmation Modal */}
            <Modal
                isOpen={showBeaconModal}
                onClose={() => setShowBeaconModal(false)}
                title="🌍 Activate Earthquake Locator Beacon?"
                size="md"
            >
                <div className="space-y-5">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Globe className="h-10 w-10 text-amber-600" />
                        </div>
                        <h3 className="text-xl font-bold text-[#1F2937] mb-2">Earthquake Locator Beacon</h3>
                        <p className="text-[#4B5563]">
                            This will instruct <strong>all active devices</strong> to emit a periodic beep
                            (2 seconds on, 8 seconds rest) to help rescue teams locate trapped workers.
                        </p>
                    </div>

                    <div className="bg-[#EEF1F4] rounded-lg p-4 border border-[#E3E6EB]">
                        <h4 className="text-sm font-semibold text-[#1F2937] mb-3">How it works:</h4>
                        <ul className="space-y-2 text-sm text-[#4B5563]">
                            <li className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                                Devices start beeping immediately upon receiving the command
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                                Beeping continues <strong>even if WiFi disconnects</strong>
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                                2 second buzzer / 8 second rest — repeating cycle
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                                Must be manually deactivated by an admin
                            </li>
                        </ul>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-bold text-yellow-700 mb-1">Important Notice</h4>
                                <p className="text-xs text-yellow-800 leading-relaxed">
                                    This is a <strong>last-resort</strong> emergency feature designed for earthquakes and building collapses.
                                    Devices will continue beeping until manually deactivated or restarted.
                                    All activations are <strong>logged</strong> with timestamp and operator information.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-[#E3E6EB]">
                        <Button variant="secondary" className="flex-1" onClick={() => setShowBeaconModal(false)}>
                            Cancel
                        </Button>
                        <Button
                            className="flex-1 font-bold bg-amber-600 hover:bg-amber-500 border-amber-500 text-white"
                            onClick={handleActivateBeacon}
                            disabled={beaconLoading}
                        >
                            {beaconLoading ? 'Activating...' : 'ACTIVATE BEACON'}
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
                    <div>
                        <label className="label-modal">Email</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            className="input-modal"
                            placeholder="contact@email.com"
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
                            <h3 className="text-xl font-bold text-[#1F2937] mb-2">Email Sent!</h3>
                            <p className="text-[#4B5563]">Email successfully sent to {selectedContact?.email}</p>
                        </div>
                    ) : (
                        <>
                            {/* Recipient info */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="label-modal">To</label>
                                    <input
                                        type="text"
                                        value={selectedContact?.email || ''}
                                        disabled
                                        className="input-modal opacity-70"
                                    />
                                </div>
                                <div>
                                    <label className="label-modal">Contact Name</label>
                                    <input
                                        type="text"
                                        value={selectedContact?.name || ''}
                                        disabled
                                        className="input-modal opacity-70"
                                    />
                                </div>
                            </div>

                            {/* Template selector */}
                            <div>
                                <label className="label-modal">Email Template</label>
                                <select
                                    value={selectedTemplate}
                                    onChange={(e) => handleTemplateChange(e.target.value)}
                                    className="input-modal"
                                >
                                    <option value="">✉️ Custom Message (no template)</option>
                                    {emailTemplates.map(tpl => (
                                        <option key={tpl.key} value={tpl.key}>{tpl.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Status badge (shown when template selected) */}
                            {selectedTemplate && (() => {
                                const tpl = emailTemplates.find(t => t.key === selectedTemplate);
                                return tpl ? (
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-[#6b7280] font-medium">Status:</span>
                                        <span
                                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-white"
                                            style={{ backgroundColor: tpl.statusColor || '#3B82F6' }}
                                        >
                                            {tpl.status}
                                        </span>
                                        <span className="text-xs text-[#9ca3af] ml-1">This label will appear in the email header</span>
                                    </div>
                                ) : null;
                            })()}

                            {/* Subject */}
                            <div>
                                <label className="label-modal">Subject</label>
                                <input
                                    type="text"
                                    value={emailSubject}
                                    onChange={(e) => setEmailSubject(e.target.value)}
                                    className="input-modal"
                                    placeholder={selectedTemplate ? '' : 'e.g. GuardWell Alert - Site Update'}
                                />
                            </div>

                            {/* Body */}
                            <div>
                                <label className="label-modal">
                                    Message Body
                                    {selectedTemplate && (
                                        <span className="ml-2 text-[#6fa3d8] text-xs font-normal">Pre-filled from template — feel free to edit</span>
                                    )}
                                </label>
                                <textarea
                                    value={emailMessage}
                                    onChange={(e) => setEmailMessage(e.target.value)}
                                    className="input-modal min-h-[160px] font-mono text-sm"
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


import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, FileText, AlertTriangle, Clock, User, MapPin,
    CheckCircle, Plus, MessageSquare, Activity, XCircle, Archive
} from 'lucide-react';
import { CardDark, CardBody, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge, SeverityBadge, StatusBadge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { incidentsApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export const IncidentDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [incident, setIncident] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal states
    const [showAddNoteModal, setShowAddNoteModal] = useState(false);
    const [showAddActionModal, setShowAddActionModal] = useState(false);
    const [showUpdateStatusModal, setShowUpdateStatusModal] = useState(false);
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form states
    const [noteText, setNoteText] = useState('');
    const [actionText, setActionText] = useState('');
    const [newStatus, setNewStatus] = useState('');
    const [resolution, setResolution] = useState('');

    // Fetch incident data
    useEffect(() => {
        const fetchIncident = async () => {
            try {
                const response = await incidentsApi.getById(id);
                setIncident(response.data);
                setNewStatus(response.data.status);
            } catch (err) {
                console.error('Failed to fetch incident:', err);
                setError('Failed to load incident details');
            } finally {
                setIsLoading(false);
            }
        };
        fetchIncident();
    }, [id]);

    // Format date
    const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleString();
    };

    // Handle add note
    const handleAddNote = async () => {
        if (!noteText.trim()) return;
        setIsSubmitting(true);
        try {
            const response = await incidentsApi.addNote(id, noteText, user?.fullName || 'Operator');
            setIncident(response.data);
            setNoteText('');
            setShowAddNoteModal(false);
        } catch (err) {
            console.error('Failed to add note:', err);
            alert('Failed to add note');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle add action
    const handleAddAction = async () => {
        if (!actionText.trim()) return;
        setIsSubmitting(true);
        try {
            const response = await incidentsApi.addAction(id, actionText, user?.fullName || 'Operator');
            setIncident(response.data);
            setActionText('');
            setShowAddActionModal(false);
        } catch (err) {
            console.error('Failed to add action:', err);
            alert('Failed to add action');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle update status
    const handleUpdateStatus = async () => {
        setIsSubmitting(true);
        try {
            const response = await incidentsApi.update(id, { status: newStatus });
            setIncident(response.data);
            setShowUpdateStatusModal(false);
        } catch (err) {
            console.error('Failed to update status:', err);
            alert('Failed to update status');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle close incident
    const handleCloseIncident = async () => {
        setIsSubmitting(true);
        try {
            const response = await incidentsApi.close(id, resolution);
            setIncident(response.data);
            setShowCloseModal(false);
        } catch (err) {
            console.error('Failed to close incident:', err);
            alert('Failed to close incident');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-400">Loading incident details...</div>
            </div>
        );
    }

    if (error || !incident) {
        return (
            <div className="space-y-6">
                <Button variant="secondary" icon={<ArrowLeft size={18} />} onClick={() => navigate('/incidents')}>
                    Back to Incidents
                </Button>
                <CardDark>
                    <CardBody className="p-12 text-center">
                        <AlertTriangle className="h-16 w-16 text-danger mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-400 mb-2">Error Loading Incident</h3>
                        <p className="text-gray-500">{error || 'Incident not found'}</p>
                    </CardBody>
                </CardDark>
            </div>
        );
    }

    const notes = incident.notes || [];
    const actionsTaken = incident.actionsTaken || [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="secondary" icon={<ArrowLeft size={18} />} onClick={() => navigate('/incidents')}>
                        Back
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-[#1F2937]">{incident.title}</h1>
                        <p className="text-[#4B5563]">Incident #{incident.id}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <SeverityBadge severity={incident.severity} />
                    <StatusBadge status={incident.status} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Incident Details */}
                    <CardDark>
                        <CardHeader className="px-6 py-4 border-b border-[#E3E6EB]">
                            <h2 className="text-lg font-semibold text-[#1F2937] flex items-center gap-2">
                                <FileText size={20} />
                                Incident Details
                            </h2>
                        </CardHeader>
                        <CardBody className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-[#4B5563]">Type</label>
                                    <p className="text-[#1F2937] mt-1">
                                        <Badge variant="secondary">{incident.type}</Badge>
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm text-[#4B5563]">Date & Time</label>
                                    <p className="text-[#1F2937] mt-1 flex items-center gap-2">
                                        <Clock size={16} className="text-[#6B7280]" />
                                        {formatDate(incident.createdAt)}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm text-[#4B5563]">Affected Worker</label>
                                    <p className="text-[#1F2937] mt-1 flex items-center gap-2">
                                        <User size={16} className="text-[#6B7280]" />
                                        {incident.workerName || incident.worker?.fullName || 'Unknown'}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm text-[#4B5563]">Location</label>
                                    <p className="text-[#1F2937] mt-1 flex items-center gap-2">
                                        <MapPin size={16} className="text-[#6B7280]" />
                                        {incident.location || 'Not specified'}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm text-[#4B5563]">Description</label>
                                <p className="text-[#4B5563] mt-2 bg-[#EEF1F4] p-4 rounded-lg border border-[#E3E6EB]">
                                    {incident.description || 'No description provided'}
                                </p>
                            </div>

                            {incident.witnesses && (
                                <div>
                                    <label className="text-sm text-[#4B5563]">Witnesses</label>
                                    <p className="text-[#4B5563] mt-1">{incident.witnesses}</p>
                                </div>
                            )}

                            {incident.resolution && (
                                <div className="pt-4 border-t border-[#E3E6EB]">
                                    <label className="text-sm text-[#4B5563]">Resolution</label>
                                    <p className="text-[#4B5563] mt-2 bg-green-50 p-4 rounded-lg border border-green-200">
                                        {incident.resolution}
                                    </p>
                                    {incident.resolvedAt && (
                                        <p className="text-sm text-gray-500 mt-2">
                                            Resolved on {formatDate(incident.resolvedAt)}
                                        </p>
                                    )}
                                </div>
                            )}
                        </CardBody>
                    </CardDark>

                    {/* Actions Taken */}
                    <CardDark>
                        <CardHeader className="px-6 py-4 border-b border-[#E3E6EB] flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-[#1F2937] flex items-center gap-2">
                                <Activity size={20} />
                                Actions Taken ({actionsTaken.length})
                            </h2>
                            <Button size="sm" icon={<Plus size={16} />} onClick={() => setShowAddActionModal(true)}>
                                Add Action
                            </Button>
                        </CardHeader>
                        <CardBody className="p-6">
                            {actionsTaken.length === 0 ? (
                                <p className="text-[#6B7280] text-center py-4">No actions recorded yet</p>
                            ) : (
                                <div className="space-y-3">
                                    {actionsTaken.map((action, index) => (
                                        <div key={action.id || index} className="bg-[#EEF1F4] p-4 rounded-lg border border-[#E3E6EB]">
                                            <div className="flex items-start justify-between">
                                                <p className="text-[#4B5563]">{action.action}</p>
                                                <Badge variant="info" className="text-xs ml-2 shrink-0">
                                                    {action.performedBy}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">{formatDate(action.timestamp)}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardBody>
                    </CardDark>

                    {/* Notes */}
                    <CardDark>
                        <CardHeader className="px-6 py-4 border-b border-[#E3E6EB] flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-[#1F2937] flex items-center gap-2">
                                <MessageSquare size={20} />
                                Notes ({notes.length})
                            </h2>
                            <Button size="sm" icon={<Plus size={16} />} onClick={() => setShowAddNoteModal(true)}>
                                Add Note
                            </Button>
                        </CardHeader>
                        <CardBody className="p-6">
                            {notes.length === 0 ? (
                                <p className="text-[#6B7280] text-center py-4">No notes added yet</p>
                            ) : (
                                <div className="space-y-3">
                                    {notes.map((note, index) => (
                                        <div key={note.id || index} className="bg-[#EEF1F4] p-4 rounded-lg border border-[#E3E6EB]">
                                            <div className="flex items-start justify-between">
                                                <p className="text-[#4B5563]">{note.note}</p>
                                                <Badge variant="secondary" className="text-xs ml-2 shrink-0">
                                                    {note.addedBy}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">{formatDate(note.timestamp)}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardBody>
                    </CardDark>
                </div>

                {/* Sidebar Actions */}
                <div className="space-y-6">
                    <CardDark>
                        <CardHeader className="px-6 py-4 border-b border-[#E3E6EB]">
                            <h3 className="font-semibold text-[#1F2937]">Quick Actions</h3>
                        </CardHeader>
                        <CardBody className="p-4 space-y-3">
                            <Button
                                variant="outline"
                                className="w-full justify-start"
                                icon={<Activity size={18} />}
                                onClick={() => setShowUpdateStatusModal(true)}
                                disabled={incident.status === 'Closed'}
                            >
                                Update Status
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full justify-start"
                                icon={<Plus size={18} />}
                                onClick={() => setShowAddActionModal(true)}
                            >
                                Log Action
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full justify-start"
                                icon={<MessageSquare size={18} />}
                                onClick={() => setShowAddNoteModal(true)}
                            >
                                Add Note
                            </Button>
                            {incident.status !== 'Closed' && (
                                <Button
                                    variant="primary"
                                    className="w-full justify-start"
                                    icon={<CheckCircle size={18} />}
                                    onClick={() => setShowCloseModal(true)}
                                >
                                    Close Incident
                                </Button>
                            )}
                        </CardBody>
                    </CardDark>

                    {/* Timeline */}
                    <CardDark>
                        <CardHeader className="px-6 py-4 border-b border-[#E3E6EB]">
                            <h3 className="font-semibold text-[#1F2937]">Timeline</h3>
                        </CardHeader>
                        <CardBody className="p-4">
                            <div className="space-y-4">
                                <div className="flex gap-3">
                                    <div className="w-2 h-2 mt-2 rounded-full bg-blue-500" />
                                    <div>
                                        <p className="text-sm text-[#1F2937]">Incident Created</p>
                                        <p className="text-xs text-[#6B7280]">{formatDate(incident.createdAt)}</p>
                                    </div>
                                </div>
                                {actionsTaken.map((action, index) => (
                                    <div key={index} className="flex gap-3">
                                        <div className="w-2 h-2 mt-2 rounded-full bg-yellow-500" />
                                        <div>
                                            <p className="text-sm text-[#1F2937]">Action: {action.action.substring(0, 30)}...</p>
                                            <p className="text-xs text-[#6B7280]">{formatDate(action.timestamp)}</p>
                                        </div>
                                    </div>
                                ))}
                                {incident.resolvedAt && (
                                    <div className="flex gap-3">
                                        <div className="w-2 h-2 mt-2 rounded-full bg-green-500" />
                                        <div>
                                            <p className="text-sm text-[#1F2937]">Incident Resolved</p>
                                            <p className="text-xs text-[#6B7280]">{formatDate(incident.resolvedAt)}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardBody>
                    </CardDark>
                </div>
            </div>

            {/* Add Note Modal */}
            <Modal
                isOpen={showAddNoteModal}
                onClose={() => setShowAddNoteModal(false)}
                title="Add Note"
                size="md"
            >
                <div className="space-y-4">
                    <div>
                        <label className="label-modal">Note</label>
                        <textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            className="input-modal"
                            rows={4}
                            placeholder="Enter your note..."
                        />
                    </div>
                    <div className="flex gap-3 justify-end">
                        <Button variant="secondary" onClick={() => setShowAddNoteModal(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddNote} disabled={isSubmitting || !noteText.trim()}>
                            {isSubmitting ? 'Adding...' : 'Add Note'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Add Action Modal */}
            <Modal
                isOpen={showAddActionModal}
                onClose={() => setShowAddActionModal(false)}
                title="Log Action Taken"
                size="md"
            >
                <div className="space-y-4">
                    <div>
                        <label className="label-modal">Action Description</label>
                        <textarea
                            value={actionText}
                            onChange={(e) => setActionText(e.target.value)}
                            className="input-modal"
                            rows={4}
                            placeholder="Describe the action taken..."
                        />
                    </div>
                    <div className="flex gap-3 justify-end">
                        <Button variant="secondary" onClick={() => setShowAddActionModal(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddAction} disabled={isSubmitting || !actionText.trim()}>
                            {isSubmitting ? 'Adding...' : 'Log Action'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Update Status Modal */}
            <Modal
                isOpen={showUpdateStatusModal}
                onClose={() => setShowUpdateStatusModal(false)}
                title="Update Status"
                size="md"
            >
                <div className="space-y-4">
                    <div>
                        <label className="label-modal">New Status</label>
                        <select
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                            className="input-modal"
                        >
                            <option value="Open">Open</option>
                            <option value="Under Investigation">Under Investigation</option>
                            <option value="Resolved">Resolved</option>
                        </select>
                    </div>
                    <div className="flex gap-3 justify-end">
                        <Button variant="secondary" onClick={() => setShowUpdateStatusModal(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdateStatus} disabled={isSubmitting}>
                            {isSubmitting ? 'Updating...' : 'Update Status'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Close Incident Modal */}
            <Modal
                isOpen={showCloseModal}
                onClose={() => setShowCloseModal(false)}
                title="Close Incident"
                size="md"
            >
                <div className="space-y-4">
                    <p className="text-gray-400">
                        Are you sure you want to close this incident? Please provide a resolution summary.
                    </p>
                    <div>
                        <label className="label-modal">Resolution Summary</label>
                        <textarea
                            value={resolution}
                            onChange={(e) => setResolution(e.target.value)}
                            className="input-modal"
                            rows={4}
                            placeholder="Describe how this incident was resolved..."
                            required
                        />
                    </div>
                    <div className="flex gap-3 justify-end">
                        <Button variant="secondary" onClick={() => setShowCloseModal(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCloseIncident} disabled={isSubmitting || !resolution.trim()}>
                            {isSubmitting ? 'Closing...' : 'Close Incident'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

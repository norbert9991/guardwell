import React, { useState, useEffect } from 'react';
import {
    Users,
    Plus,
    Search,
    Edit,
    Trash2,
    Key,
    Shield,
    CheckCircle,
    XCircle,
    AlertTriangle
} from 'lucide-react';
import { CardDark, CardBody, CardHeader } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';
import { Button } from '../components/ui/Button';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Table } from '../components/ui/Table';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { usersApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export const AdminManagement = () => {
    const { user: currentUser, isHeadAdmin } = useAuth();
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: '',
        role: 'Safety Officer',
        department: '',
        phone: ''
    });

    const [newPassword, setNewPassword] = useState('');

    // Fetch users
    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await usersApi.getAll();
            setUsers(response.data);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            const response = await usersApi.create(formData);
            setUsers(prev => [response.data, ...prev]);
            setShowAddModal(false);
            setFormData({
                email: '',
                password: '',
                fullName: '',
                role: 'Safety Officer',
                department: '',
                phone: ''
            });
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to create user');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditUser = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            const response = await usersApi.update(selectedUser.id, {
                fullName: formData.fullName,
                role: formData.role,
                department: formData.department,
                phone: formData.phone,
                status: formData.status
            });
            setUsers(prev => prev.map(u => u.id === selectedUser.id ? response.data : u));
            setShowEditModal(false);
            setSelectedUser(null);
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to update user');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResetPassword = async () => {
        if (!newPassword || newPassword.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            await usersApi.resetPassword(selectedUser.id, newPassword);
            setShowPasswordModal(false);
            setSelectedUser(null);
            setNewPassword('');
            alert('Password reset successfully!');
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to reset password');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteUser = async () => {
        setIsSubmitting(true);

        try {
            await usersApi.delete(selectedUser.id);
            setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
            setShowDeleteConfirm(false);
            setSelectedUser(null);
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to delete user');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModal = (user) => {
        setSelectedUser(user);
        setFormData({
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            department: user.department || '',
            phone: user.phone || '',
            status: user.status
        });
        setError('');
        setShowEditModal(true);
    };

    const openPasswordModal = (user) => {
        setSelectedUser(user);
        setNewPassword('');
        setError('');
        setShowPasswordModal(true);
    };

    const openDeleteConfirm = (user) => {
        setSelectedUser(user);
        setShowDeleteConfirm(true);
    };

    const getRoleBadge = (role) => {
        const colors = {
            'Head Admin': 'danger',
            'Admin': 'warning',
            'Safety Officer': 'info'
        };
        return <Badge variant={colors[role] || 'secondary'}>{role}</Badge>;
    };

    const columns = [
        {
            key: 'fullName',
            label: 'Name',
            sortable: true,
            render: (row) => (
                <div>
                    <p className="font-medium text-white">{row.fullName}</p>
                    <p className="text-xs text-gray-400">{row.email}</p>
                </div>
            )
        },
        { key: 'role', label: 'Role', render: (row) => getRoleBadge(row.role) },
        { key: 'department', label: 'Department', render: (row) => row.department || '-' },
        { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
        {
            key: 'lastLogin',
            label: 'Last Login',
            render: (row) => row.lastLogin ? new Date(row.lastLogin).toLocaleString() : 'Never'
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (row) => {
                // Don't allow editing/deleting Head Admin unless you are Head Admin
                const canModify = isHeadAdmin || row.role !== 'Head Admin';
                const canDelete = isHeadAdmin && row.role !== 'Head Admin' && row.id !== currentUser.id;

                return (
                    <div className="flex gap-2">
                        {canModify && (
                            <>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openEditModal(row)}
                                >
                                    <Edit size={14} />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openPasswordModal(row)}
                                >
                                    <Key size={14} />
                                </Button>
                            </>
                        )}
                        {canDelete && (
                            <Button
                                size="sm"
                                variant="danger"
                                onClick={() => openDeleteConfirm(row)}
                            >
                                <Trash2 size={14} />
                            </Button>
                        )}
                    </div>
                );
            }
        }
    ];

    const filteredUsers = users.filter(user =>
        user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-400">Loading users...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Admin Management</h1>
                    <p className="text-gray-400">Manage system administrators and safety officers</p>
                </div>
                <Button icon={<Plus size={18} />} onClick={() => {
                    setFormData({
                        email: '',
                        password: '',
                        fullName: '',
                        role: 'Safety Officer',
                        department: '',
                        phone: ''
                    });
                    setError('');
                    setShowAddModal(true);
                }}>
                    Add User
                </Button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MetricCard
                    title="Total Users"
                    value={users.length}
                    icon={Users}
                    color="bg-[#3B82F6]"
                    subtitle="Registered accounts"
                />
                <MetricCard
                    title="Head Admin"
                    value={users.filter(u => u.role === 'Head Admin').length}
                    icon={Shield}
                    color="bg-[#EF4444]"
                    subtitle="Super administrators"
                />
                <MetricCard
                    title="Admins"
                    value={users.filter(u => u.role === 'Admin').length}
                    icon={Shield}
                    color="bg-[#F59E0B]"
                    subtitle="System administrators"
                />
                <MetricCard
                    title="Safety Officers"
                    value={users.filter(u => u.role === 'Safety Officer').length}
                    icon={CheckCircle}
                    color="bg-[#10B981]"
                    subtitle="Field monitors"
                />
            </div>

            {/* Search */}
            <CardDark>
                <CardBody className="p-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search users by name, email, or role..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-dark pl-10"
                        />
                    </div>
                </CardBody>
            </CardDark>

            {/* Users Table */}
            <CardDark>
                <CardBody className="p-0">
                    {filteredUsers.length === 0 ? (
                        <div className="p-12 text-center">
                            <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-gray-400 mb-2">No Users Found</h3>
                            <p className="text-gray-500">No users match your search criteria.</p>
                        </div>
                    ) : (
                        <Table columns={columns} data={filteredUsers} />
                    )}
                </CardBody>
            </CardDark>

            {/* Add User Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Add New User"
                size="md"
            >
                <form onSubmit={handleAddUser} className="space-y-5">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm flex items-center gap-2">
                            <AlertTriangle size={16} />
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="label-modal">Email *</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            className="input-modal"
                            required
                        />
                    </div>

                    <div>
                        <label className="label-modal">Password * (min 8 characters)</label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            className="input-modal"
                            minLength={8}
                            required
                        />
                    </div>

                    <div>
                        <label className="label-modal">Full Name *</label>
                        <input
                            type="text"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleInputChange}
                            className="input-modal"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label-modal">Role</label>
                            <select
                                name="role"
                                value={formData.role}
                                onChange={handleInputChange}
                                className="input-modal"
                            >
                                <option value="Safety Officer">Safety Officer</option>
                                {isHeadAdmin && <option value="Admin">Admin</option>}
                            </select>
                        </div>
                        <div>
                            <label className="label-modal">Department</label>
                            <input
                                type="text"
                                name="department"
                                value={formData.department}
                                onChange={handleInputChange}
                                className="input-modal"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="label-modal">Phone</label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            className="input-modal"
                        />
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t border-[#2d3a52]/50">
                        <Button variant="secondary" type="button" onClick={() => setShowAddModal(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Creating...' : 'Create User'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Edit User Modal */}
            <Modal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                title="Edit User"
                size="md"
            >
                <form onSubmit={handleEditUser} className="space-y-5">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm flex items-center gap-2">
                            <AlertTriangle size={16} />
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="label-modal">Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            className="input-modal bg-[#1a2235] opacity-60 cursor-not-allowed"
                            disabled
                        />
                        <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                    </div>

                    <div>
                        <label className="label-modal">Full Name *</label>
                        <input
                            type="text"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleInputChange}
                            className="input-modal"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label-modal">Role</label>
                            <select
                                name="role"
                                value={formData.role}
                                onChange={handleInputChange}
                                className="input-modal"
                                disabled={selectedUser?.role === 'Head Admin'}
                            >
                                <option value="Safety Officer">Safety Officer</option>
                                {isHeadAdmin && <option value="Admin">Admin</option>}
                                {selectedUser?.role === 'Head Admin' && <option value="Head Admin">Head Admin</option>}
                            </select>
                        </div>
                        <div>
                            <label className="label-modal">Status</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleInputChange}
                                className="input-modal"
                                disabled={selectedUser?.role === 'Head Admin'}
                            >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                                <option value="Suspended">Suspended</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label-modal">Department</label>
                            <input
                                type="text"
                                name="department"
                                value={formData.department}
                                onChange={handleInputChange}
                                className="input-modal"
                            />
                        </div>
                        <div>
                            <label className="label-modal">Phone</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                className="input-modal"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t border-[#2d3a52]/50">
                        <Button variant="secondary" type="button" onClick={() => setShowEditModal(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Reset Password Modal */}
            <Modal
                isOpen={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
                title="Reset Password"
                size="sm"
            >
                <div className="space-y-5">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm flex items-center gap-2">
                            <AlertTriangle size={16} />
                            {error}
                        </div>
                    )}

                    <p className="text-gray-400">
                        Reset password for <strong>{selectedUser?.fullName}</strong>
                    </p>

                    <div>
                        <label className="label-modal">New Password (min 8 characters)</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="input-modal"
                            minLength={8}
                        />
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t border-[#2d3a52]/50">
                        <Button variant="secondary" onClick={() => setShowPasswordModal(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleResetPassword} disabled={isSubmitting}>
                            {isSubmitting ? 'Resetting...' : 'Reset Password'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation */}
            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDeleteUser}
                isSubmitting={isSubmitting}
                title="Delete User"
                message={`Are you sure you want to delete ${selectedUser?.fullName}? This action cannot be undone.`}
                confirmText="Delete User"
                variant="danger"
            />
        </div>
    );
};

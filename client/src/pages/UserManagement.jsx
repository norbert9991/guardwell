import React, { useState } from 'react';
import { Plus, User, Users, UserCheck, UserX } from 'lucide-react';
import { CardDark, CardBody } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge, StatusBadge } from '../components/ui/Badge';

export const UserManagement = () => {
    const users = [
        { id: '1', name: 'Admin User', email: 'admin@cathaymetal.com', role: 'Admin', department: 'Operations', status: 'Active' },
        { id: '2', name: 'Safety Officer', email: 'safety@cathaymetal.com', role: 'Safety Officer', department: 'Safety', status: 'Active' },
    ];

    const columns = [
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'role', label: 'Role', render: (row) => <Badge variant="primary">{row.role}</Badge> },
        { key: 'department', label: 'Department' },
        { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
        {
            key: 'actions',
            label: 'Actions',
            render: () => (
                <div className="flex gap-2">
                    <Button size="sm" variant="outline">Edit</Button>
                    <Button size="sm" variant="secondary">Reset Password</Button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
                    <p className="text-gray-400">Manage user accounts and permissions</p>
                </div>
                <Button icon={<Plus size={18} />}>Add User</Button>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                    title="Total Admins"
                    value={users.length}
                    icon={Users}
                    color="bg-[#3B82F6]"
                    subtitle="System administrators"
                />
                <MetricCard
                    title="Active"
                    value={users.filter(u => u.status === 'Active').length}
                    icon={UserCheck}
                    color="bg-[#00BFA5]"
                    subtitle="Currently active"
                />
                <MetricCard
                    title="Inactive"
                    value={users.filter(u => u.status !== 'Active').length}
                    icon={UserX}
                    color="bg-[#6B7280]"
                    subtitle="Disabled accounts"
                />
            </div>

            <CardDark>
                <CardBody className="p-0">
                    <Table columns={columns} data={users} />
                </CardBody>
            </CardDark>
        </div>
    );
};

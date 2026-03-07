import React from 'react';
import { CardDark, CardBody } from '../components/ui/Card';
import { Table } from '../components/ui/Table';

export const AuditLog = () => {
    const logs = [
        { id: '1', user: 'Admin User', action: 'Login', resource: 'System', timestamp: '2024-11-29 14:30:15', status: 'Success' },
        { id: '2', user: 'Safety Officer', action: 'Create', resource: 'Incident Report', timestamp: '2024-11-29 14:25:42', status: 'Success' },
    ];

    const columns = [
        { key: 'timestamp', label: 'Timestamp', sortable: true },
        { key: 'user', label: 'User' },
        { key: 'action', label: 'Action' },
        { key: 'resource', label: 'Resource' },
        { key: 'status', label: 'Status' },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-[#1F2937] mb-2">Audit Log</h1>
                <p className="text-gray-400">System activity log and audit trail</p>
            </div>

            <CardDark>
                <CardBody className="p-0">
                    <Table columns={columns} data={logs} />
                </CardBody>
            </CardDark>
        </div>
    );
};

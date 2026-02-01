import React from 'react';
import { cn } from '../../utils/cn';

export const Badge = ({ children, variant = 'info', className, ...props }) => {
    const variants = {
        success: 'badge-success',
        warning: 'badge-warning',
        danger: 'badge-danger',
        info: 'badge-info',
        primary: 'bg-primary-500 text-white',
        secondary: 'bg-gray-500 text-white',
    };

    return (
        <span className={cn('badge', variants[variant], className)} {...props}>
            {children}
        </span>
    );
};

export const StatusBadge = ({ status }) => {
    const getVariant = (status) => {
        switch (status?.toLowerCase()) {
            case 'active':
            case 'online':
            case 'resolved':
            case 'present':
                return 'success';
            case 'warning':
            case 'pending':
            case 'late':
                return 'warning';
            case 'critical':
            case 'offline':
            case 'inactive':
            case 'absent':
                return 'danger';
            default:
                return 'secondary';
        }
    };

    return (
        <Badge variant={getVariant(status)}>
            {status}
        </Badge>
    );
};

export const SeverityBadge = ({ severity }) => {
    const variants = {
        Low: 'info',
        Medium: 'warning',
        High: 'warning',
        Critical: 'danger',
    };

    return (
        <Badge variant={variants[severity] || 'info'}>
            {severity}
        </Badge>
    );
};

import React from 'react';
import { cn } from '../../utils/cn';

export const Card = ({ children, className, ...props }) => {
    return (
        <div className={cn('card', className)} {...props}>
            {children}
        </div>
    );
};

export const CardDark = ({ children, className, hover = true, ...props }) => {
    return (
        <div
            className={cn(
                'card-dark',
                hover && 'hover:border-primary-500/50',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
};

export const CardHeader = ({ children, className, ...props }) => {
    return (
        <div className={cn('px-6 py-4 border-b border-white/10', className)} {...props}>
            {children}
        </div>
    );
};

export const CardBody = ({ children, className, ...props }) => {
    return (
        <div className={cn('px-6 py-4', className)} {...props}>
            {children}
        </div>
    );
};

export const CardFooter = ({ children, className, ...props }) => {
    return (
        <div className={cn('px-6 py-4 border-t border-white/10 bg-white/5', className)} {...props}>
            {children}
        </div>
    );
};

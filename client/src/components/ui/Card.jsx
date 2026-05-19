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
                'bg-white rounded-xl border border-[#E3E6EB] transition-all duration-300',
                hover && 'hover:border-[#6FA3D8]/50 hover:shadow-lg',
                className
            )}
            style={{ boxShadow: '0 2px 8px rgba(214, 219, 226, 0.5)' }}
            {...props}
        >
            {children}
        </div>
    );
};

export const CardHeader = ({ children, className, ...props }) => {
    return (
        <div className={cn('px-6 py-4 border-b border-[#E3E6EB]', className)} {...props}>
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
        <div className={cn('px-6 py-4 border-t border-[#E3E6EB] bg-[#EEF1F4]/50', className)} {...props}>
            {children}
        </div>
    );
};

import React from 'react';
import { TrendingUp } from 'lucide-react';
import { CardDark, CardBody } from './Card';

export const MetricCard = ({ title, value, icon: Icon, color, subtitle, trend, className = '' }) => {
    return (
        <CardDark className={`hover:scale-105 transition-transform duration-300 relative overflow-hidden group animate-fade-in ${className}`}>
            <div className={`absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-300 bg-gradient-to-br ${color.replace('bg-', 'from-')} to-transparent`} />
            <CardBody className="p-6 relative z-10">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-[#4B5563] mb-1 tracking-wide uppercase">{title}</p>
                        <h3 className="text-3xl font-bold text-[#1F2937] mb-2 tracking-tight">{value}</h3>
                        {subtitle && <p className="text-sm text-[#6B7280]">{subtitle}</p>}
                        {trend && (
                            <div className="flex items-center gap-1 mt-2 text-[#22c55e]">
                                <TrendingUp size={14} />
                                <span className="text-xs font-medium">{trend}</span>
                            </div>
                        )}
                    </div>
                    <div className={`p-4 rounded-xl ${color} shadow-lg group-hover:shadow-xl transition-shadow duration-300`}>
                        <Icon className="h-8 w-8 text-white" />
                    </div>
                </div>
            </CardBody>
        </CardDark>
    );
};

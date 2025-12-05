import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Radio,
    Activity,
    AlertTriangle,
    FileText,
    BarChart3,
    Phone,
    Settings,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';

export const Sidebar = () => {
    const [collapsed, setCollapsed] = useState(false);
    const location = useLocation();
    const { isAdmin } = useAuth();

    const menuItems = [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/', roles: ['Admin', 'Safety Officer'] },
        { name: 'Live Monitoring', icon: Activity, path: '/live-monitoring', roles: ['Admin', 'Safety Officer'] },
        { name: 'Workers', icon: Users, path: '/workers', roles: ['Admin', 'Safety Officer'] },
        { name: 'Devices', icon: Radio, path: '/devices', roles: ['Admin', 'Safety Officer'] },
        { name: 'Alerts', icon: AlertTriangle, path: '/alerts', roles: ['Admin', 'Safety Officer'] },
        { name: 'Incidents', icon: FileText, path: '/incidents', roles: ['Admin', 'Safety Officer'] },
        { name: 'Reports', icon: BarChart3, path: '/reports', roles: ['Admin', 'Safety Officer'] },
        { name: 'Emergency Contacts', icon: Phone, path: '/emergency-contacts', roles: ['Admin'] },
        { name: 'User Management', icon: Users, path: '/admin/users', roles: ['Admin'] },
        { name: 'System Settings', icon: Settings, path: '/admin', roles: ['Admin'] },
    ];

    const filteredMenuItems = menuItems.filter(item =>
        isAdmin || item.roles.includes('Safety Officer')
    );

    return (
        <div className={cn(
            'glass border-r border-white/10 transition-all duration-300 flex flex-col h-screen sticky top-0',
            collapsed ? 'w-20' : 'w-64'
        )}>
            {/* Collapse Button */}
            <div className="p-4 flex justify-end">
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                    {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                </button>
            </div>

            {/* Menu Items */}
            <nav className="flex-1 px-3 space-y-2 py-4">
                {filteredMenuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden',
                                isActive
                                    ? 'bg-gradient-to-r from-[#00BFA5]/20 to-[#009479]/20 text-[#00BFA5] shadow-[0_0_15px_rgba(0,191,165,0.15)] border border-[#00BFA5]/20'
                                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 hover:translate-x-1'
                            )}
                            title={collapsed ? item.name : ''}
                        >
                            <Icon size={20} className={cn("flex-shrink-0 transition-colors", isActive ? "text-[#00BFA5]" : "group-hover:text-white")} />
                            {!collapsed && (
                                <span className="font-medium tracking-wide">{item.name}</span>
                            )}
                            {isActive && !collapsed && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00BFA5] shadow-[0_0_8px_#00BFA5]" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            {!collapsed && (
                <div className="p-6 border-t border-white/10 bg-black/20">
                    <p className="text-xs text-gray-500 text-center font-medium tracking-wider uppercase">
                        GuardWell v1.0
                    </p>
                    <p className="text-xs text-gray-600 text-center mt-1">
                        Cathay Metal Inc.
                    </p>
                </div>
            )}
        </div>
    );
};

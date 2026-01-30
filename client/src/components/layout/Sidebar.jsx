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
    ChevronRight,
    Shield,
    ShieldCheck,
    Bell
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { cn } from '../../utils/cn';

export const Sidebar = () => {
    const [collapsed, setCollapsed] = useState(false);
    const location = useLocation();
    const { isAdmin, isHeadAdmin, userRole } = useAuth();
    const { emergencyAlerts } = useSocket();

    // Count pending emergencies
    const pendingEmergencies = emergencyAlerts.filter(e => !e.acknowledged && e.status !== 'Resolved').length;

    // Menu items with minimum role required
    const menuItems = [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/', minRole: 'Safety Officer' },
        { name: 'Live Monitoring', icon: Activity, path: '/live-monitoring', minRole: 'Safety Officer' },
        { name: 'Workers', icon: Users, path: '/workers', minRole: 'Safety Officer' },
        { name: 'Devices', icon: Radio, path: '/devices', minRole: 'Safety Officer' },
        { name: 'Alerts', icon: AlertTriangle, path: '/alerts', minRole: 'Safety Officer', badge: pendingEmergencies },
        { name: 'Incidents', icon: FileText, path: '/incidents', minRole: 'Safety Officer' },
        { name: 'Reports', icon: BarChart3, path: '/reports', minRole: 'Safety Officer' },
        { name: 'Emergency Contacts', icon: Phone, path: '/emergency-contacts', minRole: 'Admin' },
        { name: 'User Management', icon: Users, path: '/admin/users', minRole: 'Head Admin' },
        { name: 'System Settings', icon: Settings, path: '/admin', minRole: 'Head Admin' },
    ];

    // Role hierarchy for filtering
    const roleHierarchy = { 'Head Admin': 3, 'Admin': 2, 'Safety Officer': 1 };
    const userLevel = roleHierarchy[userRole] || 0;

    const filteredMenuItems = menuItems.filter(item => {
        const requiredLevel = roleHierarchy[item.minRole] || 0;
        return userLevel >= requiredLevel;
    });

    // Role badge colors
    const getRoleBadge = () => {
        if (isHeadAdmin) return { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: Shield };
        if (isAdmin) return { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: ShieldCheck };
        return { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Activity };
    };

    const roleBadge = getRoleBadge();
    const RoleIcon = roleBadge.icon;

    return (
        <div className={cn(
            'glass border-r border-white/10 transition-all duration-300 flex flex-col h-screen sticky top-0',
            collapsed ? 'w-20' : 'w-64'
        )}>
            {/* Role Badge */}
            {!collapsed && (
                <div className="px-4 pt-4">
                    <div className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium',
                        roleBadge.color
                    )}>
                        <RoleIcon size={14} />
                        <span>{userRole}</span>
                    </div>
                </div>
            )}

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
                            {/* Emergency badge */}
                            {item.badge > 0 && (
                                <span className={cn(
                                    "ml-auto px-2 py-0.5 text-xs font-bold rounded-full",
                                    "bg-red-500 text-white animate-pulse"
                                )}>
                                    {item.badge}
                                </span>
                            )}
                            {isActive && !collapsed && !item.badge && (
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


import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, User, LogOut, Shield, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Badge } from '../ui/Badge';
import { ConfirmationModal } from '../ui/ConfirmationModal';

export const Navbar = () => {
    const { user, logout } = useAuth();
    const { connected, alerts } = useSocket();
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const pendingAlerts = alerts.filter(a => a.status === 'Pending').length;

    const handleLogoutClick = () => {
        setShowLogoutConfirm(true);
    };

    const handleConfirmLogout = () => {
        setShowLogoutConfirm(false);
        logout();
    };

    return (
        <>
            <nav className="bg-dark-light border-b border-gray-700 sticky top-0 z-40">
                <div className="px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <div className="flex items-center">
                            <div className="flex-shrink-0 flex items-center">
                                <div className="bg-primary-500 p-2 rounded-lg">
                                    <Shield className="h-8 w-8 text-white" />
                                </div>
                                <div className="ml-3">
                                    <h1 className="text-xl font-bold text-white">GuardWell</h1>
                                    <p className="text-xs text-gray-400">Safety Monitoring System</p>
                                </div>
                            </div>
                        </div>

                        {/* Right side */}
                        <div className="flex items-center gap-4">
                            {/* Connection Status */}
                            <div className="flex items-center gap-2">
                                <div className={`status-dot ${connected ? 'status-online' : 'status-offline'}`} />
                                <span className="text-sm text-gray-400">
                                    {connected ? 'Connected' : 'Disconnected'}
                                </span>
                            </div>

                            {/* Emergency Button */}
                            <Link to="/emergency">
                                <button className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-semibold rounded-lg flex items-center gap-2 shadow-lg hover:shadow-red-500/25 transition-all duration-200 text-sm">
                                    <AlertCircle size={16} />
                                    <span className="hidden sm:inline">Emergency</span>
                                </button>
                            </Link>

                            {/* Notifications */}
                            <Link to="/alerts" className="relative">
                                <button className="p-2.5 rounded-lg hover:bg-white/10 transition-colors border border-transparent hover:border-white/10">
                                    <Bell className="h-5 w-5 text-gray-400 hover:text-white transition-colors" />
                                    {pendingAlerts > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 shadow-lg shadow-red-500/30">
                                            {pendingAlerts > 9 ? '9+' : pendingAlerts}
                                        </span>
                                    )}
                                </button>
                            </Link>

                            {/* User Menu */}
                            <div className="flex items-center gap-3 pl-4 border-l border-gray-700">
                                <div className="text-right">
                                    <p className="text-sm font-medium text-white">{user?.name}</p>
                                    <p className="text-xs text-gray-400">{user?.role}</p>
                                </div>
                                <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
                                    <User className="h-6 w-6 text-white" />
                                </div>
                                <button
                                    onClick={handleLogoutClick}
                                    className="p-2 rounded-lg hover:bg-dark-lighter text-gray-400 hover:text-white transition-colors"
                                    title="Logout"
                                >
                                    <LogOut size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Logout Confirmation Modal */}
            <ConfirmationModal
                isOpen={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                onConfirm={handleConfirmLogout}
                title="Confirm Logout"
                message="Are you sure you want to logout? You will need to sign in again to access the system."
                variant="warning"
                confirmText="Logout"
                cancelText="Cancel"
            />
        </>
    );
};

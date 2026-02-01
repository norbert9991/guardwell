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
            <nav className="bg-white border-b border-[#E3E6EB] sticky top-0 z-40 shadow-sm">
                <div className="px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <div className="flex items-center">
                            <div className="flex-shrink-0 flex items-center">
                                <div className="bg-gradient-to-br from-[#E85D2A] to-[#F4A261] p-2 rounded-lg">
                                    <Shield className="h-8 w-8 text-white" />
                                </div>
                                <div className="ml-3">
                                    <h1 className="text-xl font-bold text-[#1F2937]">GuardWell</h1>
                                    <p className="text-xs text-[#6B7280]">Safety Monitoring System</p>
                                </div>
                            </div>
                        </div>

                        {/* Right side */}
                        <div className="flex items-center gap-4">
                            {/* Connection Status */}
                            <div className="flex items-center gap-2">
                                <div className={`status-dot ${connected ? 'status-online' : 'status-offline'}`} />
                                <span className="text-sm text-[#6B7280]">
                                    {connected ? 'Connected' : 'Disconnected'}
                                </span>
                            </div>

                            {/* Emergency Button */}
                            <Link to="/emergency">
                                <button className="px-4 py-2 bg-gradient-to-r from-[#E85D2A] to-[#c44a1f] hover:from-[#c44a1f] hover:to-[#a33d19] text-white font-semibold rounded-lg flex items-center gap-2 shadow-lg hover:shadow-[#E85D2A]/25 transition-all duration-200 text-sm">
                                    <AlertCircle size={16} />
                                    <span className="hidden sm:inline">Emergency</span>
                                </button>
                            </Link>

                            {/* Notifications */}
                            <Link to="/alerts" className="relative">
                                <button className="p-2.5 rounded-lg hover:bg-[#EEF1F4] transition-colors border border-transparent hover:border-[#E3E6EB]">
                                    <Bell className="h-5 w-5 text-[#6B7280] hover:text-[#1F2937] transition-colors" />
                                    {pendingAlerts > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-[#E85D2A] text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 shadow-lg shadow-[#E85D2A]/30">
                                            {pendingAlerts > 9 ? '9+' : pendingAlerts}
                                        </span>
                                    )}
                                </button>
                            </Link>

                            {/* User Menu */}
                            <div className="flex items-center gap-3 pl-4 border-l border-[#E3E6EB]">
                                <div className="text-right">
                                    <p className="text-sm font-medium text-[#1F2937]">{user?.name}</p>
                                    <p className="text-xs text-[#6B7280]">{user?.role}</p>
                                </div>
                                <div className="w-10 h-10 bg-gradient-to-br from-[#6FA3D8] to-[#2F4A6D] rounded-full flex items-center justify-center">
                                    <User className="h-6 w-6 text-white" />
                                </div>
                                <button
                                    onClick={handleLogoutClick}
                                    className="p-2 rounded-lg hover:bg-[#EEF1F4] text-[#6B7280] hover:text-[#1F2937] transition-colors"
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

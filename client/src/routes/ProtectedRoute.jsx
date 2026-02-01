import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldX, Lock } from 'lucide-react';

export const ProtectedRoute = ({ children, requireAdmin = false, requiredRole = null }) => {
    const { isAuthenticated, isAdmin, canAccessRoute, userRole, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0f1a]">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#00BFA5]"></div>
                    <p className="mt-4 text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Check role-based access
    const hasAccess = requiredRole
        ? canAccessRoute(requiredRole)
        : requireAdmin
            ? isAdmin
            : true;

    if (!hasAccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0f1a]">
                <div className="text-center max-w-md mx-auto p-8">
                    <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShieldX className="h-10 w-10 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">Access Denied</h2>
                    <p className="text-gray-400 mb-4">
                        You don't have permission to access this page.
                    </p>
                    <div className="bg-[#1a2235] rounded-lg p-4 border border-[#2d3a52] mb-6">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Your Role:</span>
                            <span className="text-white font-medium">{userRole || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm mt-2">
                            <span className="text-gray-500">Required:</span>
                            <span className="text-yellow-400 font-medium">
                                {requiredRole || (requireAdmin ? 'Admin or higher' : 'Authenticated')}
                            </span>
                        </div>
                    </div>
                    <a
                        href="/"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-[#00BFA5] text-white rounded-lg hover:bg-[#00a896] transition-colors font-medium"
                    >
                        <Lock size={18} />
                        Return to Dashboard
                    </a>
                </div>
            </div>
        );
    }

    return children;
};


import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { GlobalEmergencyAlert } from './components/GlobalEmergencyAlert';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { LiveMonitoring } from './pages/LiveMonitoring';
import { WorkerManagement } from './pages/WorkerManagement';
import { WorkerProfile } from './pages/WorkerProfile';
import { DeviceManagement } from './pages/DeviceManagement';
import { AlertManagement } from './pages/AlertManagement';
import { IncidentManagement } from './pages/IncidentManagement';
import { IncidentDetail } from './pages/IncidentDetail';
import { Reports } from './pages/Reports';
import { EmergencyContacts } from './pages/EmergencyContacts';
import { AdminManagement } from './pages/AdminManagement';
import { AuditLog } from './pages/AuditLog';
import { SystemAdmin } from './pages/SystemAdmin';

// Layout wrapper for authenticated pages
const LayoutWrapper = ({ children }) => {
    return (
        <div className="flex h-screen bg-dark overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Navbar />
                <main className="flex-1 overflow-y-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    );
};

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <SocketProvider>
                    <ToastProvider>
                        <Routes>
                            {/* Public Routes */}
                            <Route path="/login" element={<Login />} />

                            {/* Protected Routes */}
                            <Route
                                path="/"
                                element={
                                    <ProtectedRoute>
                                        <LayoutWrapper>
                                            <Dashboard />
                                        </LayoutWrapper>
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/live-monitoring"
                                element={
                                    <ProtectedRoute>
                                        <LayoutWrapper>
                                            <LiveMonitoring />
                                        </LayoutWrapper>
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/workers"
                                element={
                                    <ProtectedRoute>
                                        <LayoutWrapper>
                                            <WorkerManagement />
                                        </LayoutWrapper>
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/workers/:id"
                                element={
                                    <ProtectedRoute>
                                        <LayoutWrapper>
                                            <WorkerProfile />
                                        </LayoutWrapper>
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/devices"
                                element={
                                    <ProtectedRoute>
                                        <LayoutWrapper>
                                            <DeviceManagement />
                                        </LayoutWrapper>
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/alerts"
                                element={
                                    <ProtectedRoute>
                                        <LayoutWrapper>
                                            <AlertManagement />
                                        </LayoutWrapper>
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/incidents"
                                element={
                                    <ProtectedRoute>
                                        <LayoutWrapper>
                                            <IncidentManagement />
                                        </LayoutWrapper>
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/incidents/:id"
                                element={
                                    <ProtectedRoute>
                                        <LayoutWrapper>
                                            <IncidentDetail />
                                        </LayoutWrapper>
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/reports"
                                element={
                                    <ProtectedRoute>
                                        <LayoutWrapper>
                                            <Reports />
                                        </LayoutWrapper>
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/emergency-contacts"
                                element={
                                    <ProtectedRoute requireAdmin>
                                        <LayoutWrapper>
                                            <EmergencyContacts />
                                        </LayoutWrapper>
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/admin/users"
                                element={
                                    <ProtectedRoute requireAdmin>
                                        <LayoutWrapper>
                                            <AdminManagement />
                                        </LayoutWrapper>
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/admin/audit"
                                element={
                                    <ProtectedRoute requireAdmin>
                                        <LayoutWrapper>
                                            <AuditLog />
                                        </LayoutWrapper>
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/admin"
                                element={
                                    <ProtectedRoute requireAdmin>
                                        <LayoutWrapper>
                                            <SystemAdmin />
                                        </LayoutWrapper>
                                    </ProtectedRoute>
                                }
                            />

                            {/* Catch all redirect */}
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>

                        {/* Global Emergency Alert - shows on ALL pages */}
                        <GlobalEmergencyAlert />
                    </ToastProvider>
                </SocketProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;

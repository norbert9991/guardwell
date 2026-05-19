import React, { useState } from 'react';
import { CardDark, CardBody, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AlertTriangle } from 'lucide-react';

const STORAGE_KEY = 'guardwell_global_emergency_enabled';

export const SystemSettings = () => {
    const [globalEmergencyEnabled, setGlobalEmergencyEnabled] = useState(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored === null ? true : stored === 'true';
    });

    const handleToggleGlobalEmergency = (checked) => {
        setGlobalEmergencyEnabled(checked);
        localStorage.setItem(STORAGE_KEY, String(checked));
        // Dispatch storage event so GlobalEmergencyAlert picks it up in real-time
        window.dispatchEvent(new Event('storage'));
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-[#1F2937] mb-2">System Settings</h1>
                <p className="text-[#4B5563]">Configure system parameters and settings</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CardDark>
                    <CardHeader className="px-6 py-4 border-b border-[#E3E6EB]">
                        <h3 className="font-semibold text-[#1F2937]">Security Settings</h3>
                    </CardHeader>
                    <CardBody className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[#4B5563] mb-2">Password Policy</label>
                            <select className="input-modal">
                                <option>Minimum 8 characters</option>
                                <option>Minimum 12 characters</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[#4B5563] mb-2">Session Timeout (minutes)</label>
                            <input type="number" defaultValue="30" className="input-modal" />
                        </div>
                        <Button variant="primary">Save Changes</Button>
                    </CardBody>
                </CardDark>

                <CardDark>
                    <CardHeader className="px-6 py-4 border-b border-[#E3E6EB]">
                        <h3 className="font-semibold text-[#1F2937]">Notification Settings</h3>
                    </CardHeader>
                    <CardBody className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[#4B5563] mb-2">Email Notifications</label>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" defaultChecked className="rounded" />
                                <span className="text-sm text-[#4B5563]">Enable email notifications</span>
                            </label>
                        </div>


                        {/* Global Emergency Alert Overlay Toggle */}
                        <div className="pt-3 mt-3 border-t border-[#E3E6EB]">
                            <label className="block text-sm font-medium text-[#1F2937] mb-1">Global Emergency Alert Overlay</label>
                            <p className="text-xs text-[#6B7280] mb-3">
                                When enabled, a full-screen overlay blocks the interface until emergencies are acknowledged. Alerts are still logged in the Emergency Queue regardless.
                            </p>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={globalEmergencyEnabled}
                                        onChange={(e) => handleToggleGlobalEmergency(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-300 peer-checked:bg-[#6FA3D8] rounded-full transition-colors duration-200"></div>
                                    <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transform peer-checked:translate-x-5 transition-transform duration-200"></div>
                                </div>
                                <span className={`text-sm font-medium ${globalEmergencyEnabled ? 'text-[#1F2937]' : 'text-[#9CA3AF]'}`}>
                                    {globalEmergencyEnabled ? 'Enabled' : 'Disabled'}
                                </span>
                            </label>
                            {!globalEmergencyEnabled && (
                                <div className="mt-3 flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                                    <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                                    <span className="text-xs text-amber-700">
                                        The full-screen emergency overlay is disabled. Critical alerts will only appear in the Emergency Queue panel and browser notifications.
                                    </span>
                                </div>
                            )}
                        </div>

                        <Button variant="primary">Save Changes</Button>
                    </CardBody>
                </CardDark>
            </div>
        </div>
    );
};

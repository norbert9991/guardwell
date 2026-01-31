import React from 'react';
import { CardDark, CardBody, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const SystemSettings = () => {
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
                        <div>
                            <label className="block text-sm font-medium text-[#4B5563] mb-2">SMS Notifications</label>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" defaultChecked className="rounded" />
                                <span className="text-sm text-[#4B5563]">Enable SMS notifications</span>
                            </label>
                        </div>
                        <Button variant="primary">Save Changes</Button>
                    </CardBody>
                </CardDark>
            </div>
        </div>
    );
};

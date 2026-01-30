import React from 'react';
import { CardDark, CardBody, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const SystemSettings = () => {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-[#1F2937] mb-2">System Settings</h1>
                <p className="text-gray-400">Configure system parameters and settings</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CardDark>
                    <CardHeader className="px-6 py-4 border-b border-gray-700">
                        <h3 className="font-semibold text-white">Security Settings</h3>
                    </CardHeader>
                    <CardBody className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Password Policy</label>
                            <select className="input-dark">
                                <option>Minimum 8 characters</option>
                                <option>Minimum 12 characters</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Session Timeout (minutes)</label>
                            <input type="number" defaultValue="30" className="input-dark" />
                        </div>
                        <Button variant="primary">Save Changes</Button>
                    </CardBody>
                </CardDark>

                <CardDark>
                    <CardHeader className="px-6 py-4 border-b border-gray-700">
                        <h3 className="font-semibold text-white">Notification Settings</h3>
                    </CardHeader>
                    <CardBody className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Email Notifications</label>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" defaultChecked className="rounded" />
                                <span className="text-sm text-gray-300">Enable email notifications</span>
                            </label>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">SMS Notifications</label>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" defaultChecked className="rounded" />
                                <span className="text-sm text-gray-300">Enable SMS notifications</span>
                            </label>
                        </div>
                        <Button variant="primary">Save Changes</Button>
                    </CardBody>
                </CardDark>
            </div>
        </div>
    );
};

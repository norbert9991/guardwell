import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';

export const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await login(email, password);

        if (result.success) {
            navigate('/');
        } else {
            setError(result.error || 'Invalid email or password');
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#EEF1F4] via-white to-[#E3E6EB] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#6FA3D8]/20 rounded-full blur-[100px] animate-pulse-slow" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#1E3A5F]/10 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
                <div className="absolute top-[20%] right-[20%] w-[300px] h-[300px] bg-[#6FA3D8]/10 rounded-full blur-[80px] animate-float" />
            </div>

            {/* Login Card */}
            <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in border border-[#E3E6EB]">
                {/* Header */}
                <div className="px-8 py-8 text-center relative">
                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#6FA3D8]/10 to-transparent pointer-events-none" />
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-[#6FA3D8]/10 rounded-2xl shadow-lg mb-6 backdrop-blur-xl border border-[#E3E6EB] relative z-10 animate-float">
                        <Shield className="h-10 w-10 text-[#1E3A5F] drop-shadow-[0_0_10px_rgba(111,163,216,0.5)]" />
                    </div>
                    <h1 className="text-3xl font-bold text-[#1F2937] mb-2 tracking-tight">GuardWell</h1>
                    <p className="text-[#4B5563] text-sm font-medium tracking-wide uppercase">Industrial Safety Monitoring System</p>
                </div>

                {/* Form */}
                <div className="px-8 pb-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Email */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-[#4B5563] ml-1">
                                Email Address
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-[#6B7280] group-focus-within:text-[#6FA3D8] transition-colors" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full h-12 pl-10 pr-4 bg-[#EEF1F4] border border-[#E3E6EB] rounded-lg text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#6FA3D8]/50 focus:border-[#6FA3D8] transition-all"
                                    placeholder="Enter your email"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-[#4B5563] ml-1">
                                Password
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-[#6B7280] group-focus-within:text-[#6FA3D8] transition-colors" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full h-12 pl-10 pr-4 bg-[#EEF1F4] border border-[#E3E6EB] rounded-lg text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#6FA3D8]/50 focus:border-[#6FA3D8] transition-all"
                                    placeholder="Enter your password"
                                    required
                                />
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2 animate-slide-in">
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="w-full h-12 text-lg bg-[#1E3A5F] hover:bg-[#2C4A6E] shadow-lg hover:shadow-xl transition-all duration-300"
                            size="lg"
                            loading={loading}
                        >
                            Sign In
                        </Button>
                    </form>

                    {/* Help Text */}
                    <div className="mt-6 text-center">
                        <p className="text-sm text-[#6B7280]">
                            Authorized personnel only. Contact your administrator for access.
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-6 text-center text-[#6B7280] text-xs tracking-wider uppercase">
                <p>© 2024 Cathay Metal Inc. All rights reserved.</p>
            </div>
        </div>
    );
};

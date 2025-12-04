import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, User, Lock, Info } from 'lucide-react';
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
            setError('Invalid email or password');
        }

        setLoading(false);
    };

    const demoCredentials = [
        { label: 'Demo Credentials:', title: true },
        { label: 'Head Admin', email: 'headAdmin', password: 'headAdmin123' },
        { label: 'Admin', email: 'admin', password: 'admin123' },
        { label: 'Safety Officer', email: 'safety', password: 'safety123' },
    ];

    const fillDemo = (email, password) => {
        setEmail(email);
        setPassword(password);
    };

    return (
        <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,#151B2B_0%,#0B0F19_100%)]" />
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary-500/20 rounded-full blur-[100px] animate-pulse-slow" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-secondary-500/20 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
                <div className="absolute top-[20%] right-[20%] w-[300px] h-[300px] bg-primary-500/10 rounded-full blur-[80px] animate-float" />
            </div>

            {/* Login Card */}
            <div className="relative glass-card w-full max-w-md overflow-hidden animate-fade-in border-t border-white/10">
                {/* Header */}
                <div className="px-8 py-8 text-center relative">
                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary-500/10 to-transparent pointer-events-none" />
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-white/5 rounded-2xl shadow-lg mb-6 backdrop-blur-xl border border-white/10 relative z-10 animate-float">
                        <Shield className="h-10 w-10 text-primary-500 drop-shadow-[0_0_10px_rgba(0,229,255,0.5)]" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">GuardWell</h1>
                    <p className="text-gray-400 text-sm font-medium tracking-wide uppercase">Industrial Safety Monitoring System</p>
                </div>

                {/* Form */}
                <div className="px-8 pb-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Email */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-300 ml-1">
                                Username
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-gray-500 group-focus-within:text-primary-500 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input-dark pl-10 bg-black/20 border-white/10 focus:border-primary-500/50 focus:bg-black/40"
                                    placeholder="Enter your username"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-300 ml-1">
                                Password
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-primary-500 transition-colors" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-dark pl-10 bg-black/20 border-white/10 focus:border-primary-500/50 focus:bg-black/40"
                                    placeholder="Enter your password"
                                    required
                                />
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2 animate-slide-in">
                                <Info className="h-4 w-4" />
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="w-full h-12 text-lg shadow-[0_0_20px_rgba(0,229,255,0.3)] hover:shadow-[0_0_30px_rgba(0,229,255,0.5)] transition-all duration-300"
                            size="lg"
                            loading={loading}
                        >
                            Sign In
                        </Button>
                    </form>

                    {/* Demo Credentials */}
                    <div className="mt-8 bg-white/5 border border-white/5 rounded-xl p-4 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-3">
                            <Info className="h-4 w-4 text-primary-400" />
                            <span className="text-sm font-medium text-gray-300">Demo Credentials</span>
                        </div>
                        <div className="space-y-2">
                            {demoCredentials.map((cred, index) => (
                                cred.title ? (
                                    <p key={index} className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{cred.label}</p>
                                ) : (
                                    <div
                                        key={index}
                                        onClick={() => fillDemo(cred.email, cred.password)}
                                        className="text-xs text-gray-400 hover:text-white cursor-pointer hover:bg-white/5 px-3 py-2 rounded-lg transition-all duration-200 flex items-center justify-between group"
                                    >
                                        <span className="font-medium text-gray-300 group-hover:text-primary-400 transition-colors">{cred.label}</span>
                                        <span className="font-mono opacity-70">{cred.email}</span>
                                    </div>
                                )
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-6 text-center text-gray-500 text-xs tracking-wider uppercase">
                <p>© 2024 Cathay Metal Inc. All rights reserved.</p>
            </div>
        </div>
    );
};

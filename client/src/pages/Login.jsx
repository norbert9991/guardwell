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

            {/* Animated Grid Pattern */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: `
                            linear-gradient(to right, #2F4A6D 1px, transparent 1px),
                            linear-gradient(to bottom, #2F4A6D 1px, transparent 1px)
                        `,
                        backgroundSize: '60px 60px',
                    }}
                />
            </div>

            {/* Floating Gradient Orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Primary Blue Orb - Top Left */}
                <div
                    className="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-30"
                    style={{
                        background: 'radial-gradient(circle, #6FA3D8 0%, transparent 70%)',
                        top: '-15%',
                        left: '-10%',
                        animation: 'float 8s ease-in-out infinite',
                    }}
                />

                {/* Dark Blue Orb - Bottom Right */}
                <div
                    className="absolute w-[500px] h-[500px] rounded-full blur-[100px] opacity-20"
                    style={{
                        background: 'radial-gradient(circle, #2F4A6D 0%, transparent 70%)',
                        bottom: '-10%',
                        right: '-5%',
                        animation: 'float 10s ease-in-out infinite reverse',
                    }}
                />

                {/* Accent Orange Glow - Center Right */}
                <div
                    className="absolute w-[300px] h-[300px] rounded-full blur-[80px] opacity-15"
                    style={{
                        background: 'radial-gradient(circle, #F4A261 0%, transparent 70%)',
                        top: '40%',
                        right: '10%',
                        animation: 'pulse 6s ease-in-out infinite',
                    }}
                />

                {/* Secondary Blue Orb - Mid Left */}
                <div
                    className="absolute w-[400px] h-[400px] rounded-full blur-[90px] opacity-25"
                    style={{
                        background: 'radial-gradient(circle, #6FA3D8 0%, transparent 70%)',
                        top: '50%',
                        left: '-5%',
                        animation: 'float 12s ease-in-out infinite',
                        animationDelay: '2s',
                    }}
                />
            </div>

            {/* Floating Geometric Shapes */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Rotating Square */}
                <div
                    className="absolute w-24 h-24 border-2 border-[#6FA3D8]/20 rounded-lg"
                    style={{
                        top: '15%',
                        left: '15%',
                        animation: 'spin 20s linear infinite, float 8s ease-in-out infinite',
                    }}
                />

                {/* Rotating Diamond */}
                <div
                    className="absolute w-16 h-16 border-2 border-[#2F4A6D]/15 rotate-45"
                    style={{
                        top: '25%',
                        right: '20%',
                        animation: 'spin 25s linear infinite reverse, float 10s ease-in-out infinite',
                    }}
                />

                {/* Circle Outline */}
                <div
                    className="absolute w-32 h-32 border-2 border-[#6FA3D8]/10 rounded-full"
                    style={{
                        bottom: '20%',
                        left: '10%',
                        animation: 'pulse 8s ease-in-out infinite, float 12s ease-in-out infinite',
                    }}
                />

                {/* Small Triangle using borders */}
                <div
                    className="absolute w-0 h-0"
                    style={{
                        borderLeft: '20px solid transparent',
                        borderRight: '20px solid transparent',
                        borderBottom: '35px solid rgba(47, 74, 109, 0.1)',
                        top: '60%',
                        right: '15%',
                        animation: 'float 9s ease-in-out infinite',
                        animationDelay: '1s',
                    }}
                />

                {/* Hexagon-ish shape using clip-path */}
                <div
                    className="absolute w-20 h-20 bg-gradient-to-br from-[#6FA3D8]/10 to-[#2F4A6D]/10"
                    style={{
                        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                        bottom: '30%',
                        right: '25%',
                        animation: 'spin 30s linear infinite, float 11s ease-in-out infinite',
                    }}
                />
            </div>

            {/* Animated Lines */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                <svg className="absolute w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#6FA3D8" stopOpacity="0" />
                            <stop offset="50%" stopColor="#6FA3D8" stopOpacity="0.5" />
                            <stop offset="100%" stopColor="#6FA3D8" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    {/* Diagonal lines */}
                    <line x1="0" y1="100%" x2="40%" y2="0" stroke="url(#lineGradient)" strokeWidth="1" style={{ animation: 'slideLineUp 15s linear infinite' }} />
                    <line x1="20%" y1="100%" x2="60%" y2="0" stroke="url(#lineGradient)" strokeWidth="1" style={{ animation: 'slideLineUp 18s linear infinite', animationDelay: '3s' }} />
                    <line x1="60%" y1="100%" x2="100%" y2="0" stroke="url(#lineGradient)" strokeWidth="1" style={{ animation: 'slideLineUp 20s linear infinite', animationDelay: '6s' }} />
                </svg>
            </div>

            {/* Floating Particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(12)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1.5 h-1.5 bg-[#6FA3D8]/40 rounded-full"
                        style={{
                            left: `${10 + (i * 7)}%`,
                            top: `${20 + (i % 4) * 20}%`,
                            animation: `float ${6 + (i % 4) * 2}s ease-in-out infinite`,
                            animationDelay: `${i * 0.5}s`,
                        }}
                    />
                ))}
            </div>

            {/* Login Card */}
            <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in border border-[#E3E6EB]">
                {/* Subtle Top Gradient */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#6FA3D8] via-[#2F4A6D] to-[#6FA3D8]" />

                {/* Header */}
                <div className="px-8 py-8 text-center relative">
                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#6FA3D8]/10 to-transparent pointer-events-none" />
                    <div
                        className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#6FA3D8]/20 to-[#2F4A6D]/10 rounded-2xl shadow-lg mb-6 backdrop-blur-xl border border-[#E3E6EB] relative z-10"
                        style={{ animation: 'float 6s ease-in-out infinite' }}
                    >
                        <Shield className="h-10 w-10 text-[#2F4A6D] drop-shadow-[0_0_10px_rgba(111,163,216,0.5)]" />
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

                        {/* Submit Button - Updated to use system colors */}
                        <Button
                            type="submit"
                            className="w-full h-12 text-lg bg-gradient-to-r from-[#6FA3D8] to-[#2F4A6D] hover:from-[#5B93C8] hover:to-[#3D5A7D] shadow-lg hover:shadow-xl transition-all duration-300"
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

            {/* CSS Keyframes for animations */}
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-20px); }
                }
                
                @keyframes pulse {
                    0%, 100% { opacity: 0.15; transform: scale(1); }
                    50% { opacity: 0.25; transform: scale(1.05); }
                }
                
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                
                @keyframes slideLineUp {
                    0% { opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { opacity: 0; }
                }
            `}</style>
        </div>
    );
};

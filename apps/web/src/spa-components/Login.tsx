import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { 
    Pill, 
    Lock, 
    Mail, 
    Eye, 
    EyeOff, 
    ArrowRight, 
    ShieldCheck, 
    Activity, 
    AlertCircle, 
    Sparkles,
    CheckCircle2,
    Building2
} from 'lucide-react';

export const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const login = useAuthStore((state) => state.login);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to login. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickFill = (demoEmail: string, demoPass: string) => {
        setEmail(demoEmail);
        setPassword(demoPass);
        setError('');
    };

    return (
        <div className="relative min-h-screen w-full bg-slate-950 text-white flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden">
            {/* Ambient Background Light Orbs */}
            <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
            <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

            {/* Subtle Grid overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293715_1px,transparent_1px),linear-gradient(to_bottom,#1f293715_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none"></div>

            <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                
                {/* Left Branding / Features Side */}
                <div className="lg:col-span-6 space-y-6 text-left hidden lg:block pr-6">
                    <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium tracking-wide">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Pharmacy POS & ERP v1.0</span>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                            <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg shadow-indigo-500/10">
                                <img src="/favicon.svg" alt="PharmaFlow Logo" className="w-9 h-9" />
                            </div>
                            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                                PharmaFlow ERP
                            </h1>
                        </div>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Comprehensive cloud platform designed for modern pharmacy operations, stock precision, sales checkout, and compliant prescription workflows.
                        </p>
                    </div>

                    {/* Highlights */}
                    <div className="space-y-3 pt-2">
                        <div className="flex items-start space-x-3 text-sm text-slate-300">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                            <span>Real-time Stock, Expiry & Low-Stock Alerts</span>
                        </div>
                        <div className="flex items-start space-x-3 text-sm text-slate-300">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                            <span>High-speed POS Terminal & Purchase Management</span>
                        </div>
                        <div className="flex items-start space-x-3 text-sm text-slate-300">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                            <span>Role-Based Access Control & Comprehensive Audit Logs</span>
                        </div>
                    </div>

                    <div className="pt-4 flex items-center space-x-6 text-xs text-slate-500 border-t border-slate-800/80">
                        <div className="flex items-center space-x-1.5">
                            <ShieldCheck className="w-4 h-4 text-indigo-400" />
                            <span>JWT Authenticated</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                            <Activity className="w-4 h-4 text-emerald-400" />
                            <span>Live POS Terminal</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                            <Building2 className="w-4 h-4 text-slate-400" />
                            <span>Multi-Role Access</span>
                        </div>
                    </div>
                </div>

                {/* Right Login Form Card */}
                <div className="lg:col-span-6 w-full max-w-md mx-auto">
                    <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-7 shadow-2xl shadow-black/50">
                        
                        {/* Header for Mobile & Desktop Card */}
                        <div className="mb-6 text-center lg:text-left">
                            <div className="lg:hidden inline-flex items-center justify-center p-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-md mb-3">
                                <img src="/favicon.svg" alt="PharmaFlow Logo" className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">Sign In to Account</h2>
                            <p className="text-xs text-slate-400 mt-1">Enter your credentials to access your workspace</p>
                        </div>

                        {/* Error Alert */}
                        {error && (
                            <div className="mb-5 flex items-start space-x-2.5 bg-rose-500/10 border border-rose-500/30 p-3.5 rounded-xl text-rose-300 text-xs leading-relaxed animate-in fade-in">
                                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Email Input */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                                        <Mail className="w-4 h-4" />
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@pharmacy.com"
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Password Input */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                    Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                                        <Lock className="w-4 h-4" />
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••••••"
                                        required
                                        className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 focus:outline-none"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 active:scale-[0.99] text-white font-medium text-sm rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Signing in...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Sign In</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Demo Accounts Quick Fill */}
                        <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                                Quick Demo Sign-In
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleQuickFill('owner@pharmacy.com', 'Owner@1234')}
                                    className="px-2.5 py-2 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-950/30 text-[11px] font-medium text-slate-300 hover:text-indigo-300 transition-all flex flex-col items-center gap-1 group"
                                >
                                    <span className="font-semibold text-indigo-400 group-hover:scale-105 transition-transform">Owner</span>
                                    <span className="text-[10px] text-slate-500">Full Access</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleQuickFill('pharmacist@pharmacy.com', 'Pharma@1234')}
                                    className="px-2.5 py-2 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-950/30 text-[11px] font-medium text-slate-300 hover:text-emerald-300 transition-all flex flex-col items-center gap-1 group"
                                >
                                    <span className="font-semibold text-emerald-400 group-hover:scale-105 transition-transform">Pharmacist</span>
                                    <span className="text-[10px] text-slate-500">Inventory/Rx</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleQuickFill('cashier@pharmacy.com', 'Cashier@1234')}
                                    className="px-2.5 py-2 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-cyan-500/50 hover:bg-cyan-950/30 text-[11px] font-medium text-slate-300 hover:text-cyan-300 transition-all flex flex-col items-center gap-1 group"
                                >
                                    <span className="font-semibold text-cyan-400 group-hover:scale-105 transition-transform">Cashier</span>
                                    <span className="text-[10px] text-slate-500">POS Checkout</span>
                                </button>
                            </div>
                        </div>

                    </div>

                    <p className="text-center text-xs text-slate-600 mt-4">
                        Protected by Role-Based Access &amp; JWT Authentication
                    </p>
                </div>
            </div>
        </div>
    );
};
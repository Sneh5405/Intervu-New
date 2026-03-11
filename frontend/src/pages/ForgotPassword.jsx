import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const ForgotPassword = () => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({ email: '' });
    const [resetData, setResetData] = useState({ otp: '', newPassword: '' });
    const [userId, setUserId] = useState(null);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleForgotSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');
        try {
            const response = await api.post('/forgot-password', formData);
            setUserId(response.data.userId);
            setMessage(response.data.message);
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to request password reset. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');
        try {
            const response = await api.post('/reset-password', {
                userId,
                otp: resetData.otp,
                newPassword: resetData.newPassword
            });
            setMessage(response.data.message);
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reset password. Please check the OTP.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0f1c] p-4 relative overflow-hidden">
            {/* Ambient Background Efects */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px] -z-10 animate-blob"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[128px] -z-10 animate-blob animation-delay-2000"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_100%)] pointer-events-none -z-10"></div>

            <div className="w-full max-w-[420px] relative z-10 transition-all duration-300 hover:transform hover:-translate-y-1">
                <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/5 rounded-3xl p-8 sm:p-10 shadow-[0_0_40px_-15px_rgba(79,70,229,0.3)]">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-blue-500 mb-6 shadow-lg shadow-indigo-500/30 group">
                            <span className="text-2xl font-black tracking-tighter text-white group-hover:scale-110 transition-transform">IV</span>
                        </div>
                        <h2 className="text-3xl font-extrabold bg-gradient-to-br from-white to-slate-300 bg-clip-text text-transparent">
                            {step === 1 ? "Forgot Password" : "Reset Password"}
                        </h2>
                        <p className="text-slate-400 mt-2.5 font-medium text-sm">
                            {step === 1 ? "We'll send you an OTP to reset your password" : "Enter the OTP sent to your email and a new password"}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </div>
                    )}
                    {message && (
                        <div className="mb-5 p-3.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            {message}
                        </div>
                    )}

                    {step === 1 && (
                        <form onSubmit={handleForgotSubmit} className="space-y-4">
                            <Input
                                label="Email address"
                                type="email"
                                name="email"
                                placeholder="name@company.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />

                            <Button
                                type="submit"
                                className="w-full py-3.5 mt-4 text-sm font-bold bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 transition-all shadow-lg hover:shadow-indigo-500/25 border-none"
                                disabled={loading}
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Sending OTP...
                                    </span>
                                ) : 'Send OTP'}
                            </Button>

                            <div className="relative mt-6 mb-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-700/50"></div>
                                </div>
                                <div className="relative flex justify-center text-xs">
                                    <span className="px-2 bg-slate-900/60 text-slate-500 font-medium">Or</span>
                                </div>
                            </div>

                            <p className="text-center text-slate-400 text-sm font-medium mt-6">
                                Remember your password?{' '}
                                <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors">
                                    Log in
                                </Link>
                            </p>
                        </form>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleResetSubmit} className="space-y-6">
                            <Input
                                label="One-Time Password"
                                value={resetData.otp}
                                onChange={(e) => setResetData({ ...resetData, otp: e.target.value })}
                                placeholder="123456"
                                className="tracking-[0.5em] text-xl font-mono py-4 bg-slate-900/80 text-center"
                                maxLength={6}
                                required
                            />
                            <Input
                                label="New Password"
                                type="password"
                                name="newPassword"
                                placeholder="••••••••"
                                value={resetData.newPassword}
                                onChange={(e) => setResetData({ ...resetData, newPassword: e.target.value })}
                                required
                            />
                            <Button
                                type="submit"
                                className="w-full py-3.5 text-sm font-bold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 transition-all shadow-lg hover:shadow-green-500/25 border-none"
                                disabled={loading}
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Resetting password...
                                    </span>
                                ) : 'Reset Password'}
                            </Button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;

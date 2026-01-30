import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';

const Signup = () => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'INTERVIEWEE'
    });
    const [otp, setOtp] = useState('');
    const [userId, setUserId] = useState(null);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');
        try {
            const response = await api.post('/signup', formData);
            setUserId(response.data.userId);
            setMessage(response.data.message);
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.message || 'Signup failed');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');
        try {
            const response = await api.post('/verify-otp', { userId, otp });
            setMessage(response.data.message);
            // Auto login or redirect
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
            <div className="w-full max-w-md">
                <Card
                    title={step === 1 ? "Create Account" : "Verify Email"}
                    subtitle={step === 1 ? "Join InterVue today" : `Enter the OTP sent to ${formData.email}`}
                >
                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                    {message && (
                        <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                            {message}
                        </div>
                    )}

                    {step === 1 && (
                        <form onSubmit={handleSignup} className="space-y-4">
                            <Input
                                label="Full Name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                            />
                            <Input
                                label="Email"
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                            <Input
                                label="Password"
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />

                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-slate-300 ml-1">Role</label>
                                <select
                                    name="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    className="bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                                >
                                    <option value="INTERVIEWEE">Interviewee</option>
                                    <option value="INTERVIEWER">Interviewer</option>
                                    <option value="HR">HR</option>
                                </select>
                            </div>

                            <Button
                                type="submit"
                                className="w-full mt-2"
                                disabled={loading}
                            >
                                {loading ? 'Creating account...' : 'Sign Up'}
                            </Button>

                            <p className="text-center text-slate-400 text-sm mt-4">
                                Already have an account?{' '}
                                <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
                                    Log in
                                </Link>
                            </p>
                        </form>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleVerify} className="space-y-6">
                            <Input
                                label="One-Time Password"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                placeholder="123456"
                                className="text-center tracking-widest text-lg"
                                maxLength={6}
                                required
                            />
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={loading}
                            >
                                {loading ? 'Verifying...' : 'Verify OTP'}
                            </Button>
                        </form>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default Signup;

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const AssessmentInvite = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const [inviteDetails, setInviteDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchInvite = async () => {
            try {
                const response = await api.get(`/assessments/invite/${token}`);
                setInviteDetails(response.data);
            } catch (err) {
                setError(err.response?.data?.error || "Invalid or expired invite link.");
            } finally {
                setLoading(false);
            }
        };
        fetchInvite();
    }, [token]);

    const handleAccept = async () => {
        if (!user) {
            navigate(`/signup?returnUrl=${encodeURIComponent(location.pathname)}`);
            return;
        }

        try {
            const res = await api.post(`/assessments/invite/${token}/accept`);
            navigate(`/oa/exam/${res.data.assessmentId}`);
        } catch (err) {
            alert(err.response?.data?.error || "Failed to accept invite.");
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className="bg-slate-900 p-8 rounded-2xl border border-red-500/30 text-center max-w-md w-full shadow-2xl">
                <div className="text-5xl mb-4">🚫</div>
                <h1 className="text-2xl font-bold text-red-400 mb-3">Invite Unavailable</h1>
                <p className="text-slate-400">{error}</p>
                <button onClick={() => navigate('/')} className="mt-6 text-indigo-400 hover:text-indigo-300 font-medium">Return Home</button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-lg w-full shadow-[0_0_40px_rgba(79,70,229,0.1)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                
                <div className="text-center mb-8 pt-4">
                    <div className="w-20 h-20 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-6 text-4xl border border-indigo-500/20 shadow-inner">
                        💻
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">You've Been Invited!</h1>
                    <p className="text-slate-400 text-lg">Join the assessment to show your skills</p>
                </div>

                <div className="bg-slate-950 rounded-2xl p-6 mb-8 border border-slate-800 shadow-inner">
                    <h2 className="text-xl font-bold text-white mb-4 text-center">{inviteDetails.assessmentTitle}</h2>
                    <div className="flex justify-center items-center gap-4 text-slate-300 text-sm">
                        <span className="bg-slate-800 px-4 py-2 rounded-xl border border-slate-700 flex items-center gap-2 font-mono">
                            <span className="text-lg">⏱</span> {inviteDetails.duration} Minutes
                        </span>
                    </div>
                </div>

                <div className="text-sm text-slate-400 mb-8 p-5 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                    <p className="font-bold text-amber-400 mb-3 flex items-center gap-2"><span>⚠️</span> Before you begin:</p>
                    <ul className="list-disc list-inside space-y-2 text-slate-300">
                        <li>Ensure you have a stable internet connection.</li>
                        <li>Do not refresh the browser once the exam starts.</li>
                        <li>The timer cannot be paused under any circumstances.</li>
                        <li>Submit your answers before the time runs out.</li>
                    </ul>
                </div>

                {inviteDetails.status === 'INVITED' ? (
                    <button 
                        onClick={handleAccept}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg py-4 px-4 rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:shadow-[0_0_30px_rgba(79,70,229,0.6)] transform hover:-translate-y-0.5"
                    >
                        {!user ? 'Sign up to Accept' : 'Accept & Register'}
                    </button>
                ) : inviteDetails.status === 'COMPLETED' ? (
                    <div className="text-center text-emerald-400 font-bold p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-lg">
                        ✅ You have already completed this assessment.
                    </div>
                ) : (
                    <button 
                        onClick={() => navigate(`/oa/exam/${inviteDetails.assessmentId}`)} 
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg py-4 px-4 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] transform hover:-translate-y-0.5"
                    >
                        Resume Exam
                    </button>
                )}
            </div>
        </div>
    );
};

export default AssessmentInvite;

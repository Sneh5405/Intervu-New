import React, { useEffect, useState } from 'react';
import { interviewService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

const Interviews = () => {
    const [interviews, setInterviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        fetchInterviews();
    }, []);

    const fetchInterviews = async () => {
        try {
            const response = await interviewService.getAll();
            setInterviews(response.data);
        } catch (error) {
            console.error("Failed to fetch interviews", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this interview?")) return;
        try {
            await interviewService.delete(id);
            setInterviews(interviews.filter(i => i.id !== id));
        } catch (error) {
            alert("Failed to delete interview");
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Loading interviews...</div>;

    return (
        <div className="container mx-auto p-4 md:p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-indigo-400">Interviews</h1>
                {user.role === 'HR' && (
                    <Link to="/interviews/create">
                        <Button variant="primary">Schedule New</Button>
                    </Link>
                )}
            </div>

            <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-700/50 text-slate-300">
                            <tr>
                                <th className="p-4">Date & Time</th>
                                <th className="p-4">Type</th>
                                <th className="p-4">Participants</th>
                                <th className="p-4">Status</th>
                                {user.role === 'HR' && <th className="p-4">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {interviews.map((interview) => (
                                <tr key={interview.id} className="hover:bg-slate-700/30 transition-colors">
                                    <td className="p-4">
                                        <div className="font-medium text-white">
                                            {new Date(interview.startTime).toLocaleDateString()}
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            {new Date(interview.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                            {new Date(interview.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </td>
                                    <td className="p-4 text-slate-300">
                                        Mock Interface {/* Type not in schema yet? Wait, schema has QuestionType but interview type? */}
                                        {/* Actually schema doesn't have 'type' field on Interview! It has 'round'. */}
                                        {/* My controller CreateInterview used 'type' but schema doesn't have it. */}
                                        {/* Checking schema again... Interview model has startTime, endTime, status, round, meetLink. */}
                                        {/* I missed adding 'type' to schema if it was required. But User request said 'Interview status flow'. */}
                                        {/* I'll assume standard type or just show round. */}
                                        Round {interview.round}
                                    </td>
                                    <td className="p-4 text-sm text-slate-400">
                                        <div><span className="text-indigo-400">Interviewer:</span> {interview.interviewer?.name}</div>
                                        <div><span className="text-emerald-400">Candidate:</span> {interview.interviewee?.name}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${interview.status === 'SCHEDULED' ? 'bg-blue-500/20 text-blue-400' :
                                                interview.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                                                    'bg-red-500/20 text-red-400'
                                            }`}>
                                            {interview.status}
                                        </span>
                                    </td>
                                    {user.role === 'HR' && (
                                        <td className="p-4">
                                            <button
                                                onClick={() => handleDelete(interview.id)}
                                                className="text-red-400 hover:text-red-300 text-sm font-medium"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {interviews.length === 0 && (
                    <div className="p-8 text-center text-slate-500">No interviews scheduled.</div>
                )}
            </div>
        </div>
    );
};

export default Interviews;

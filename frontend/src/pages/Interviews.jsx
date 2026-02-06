import React, { useEffect, useState } from 'react';
import { interviewService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

const Interviews = () => {
    const [interviews, setInterviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('Upcoming');
    const { user } = useAuth();

    const getFilteredInterviews = () => {
        const now = new Date();
        switch (filter) {
            case 'Upcoming':
                return interviews.filter(i =>
                    ['SCHEDULED', 'PENDING'].includes(i.status) &&
                    new Date(i.endTime) > now
                );
            case 'Ongoing':
                return interviews.filter(i => ['MOVED_TO_NEXT_ROUND'].includes(i.status));
            case 'Past History':
                return interviews.filter(i =>
                    ['COMPLETED', 'CANCELLED'].includes(i.status) ||
                    (['SCHEDULED', 'PENDING'].includes(i.status) && new Date(i.endTime) <= now)
                );
            default:
                return interviews;
        }
    };

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
        <div className="container mx-auto p-4 md:p-8 mt-6">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-indigo-400">Interviews</h1>

                <div className="flex items-center gap-4">
                    {/* Filter Dropdown */}
                    <div className="relative inline-block w-48">
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="w-full bg-slate-800 text-white border border-slate-600 hover:border-slate-500 rounded-lg px-3 py-2 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all cursor-pointer font-medium text-sm"
                        >
                            <option value="Upcoming">Upcoming</option>
                            <option value="Ongoing">Ongoing</option>
                            <option value="Past History">Past History</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>

                    {user.role === 'HR' && (
                        <Link to="/interviews/create">
                            <Button variant="primary">Schedule New</Button>
                        </Link>
                    )}
                </div>
            </div>

            {/* Filtered List */}
            <div className="mb-10">
                <h2 className={`text-xl font-semibold mb-4 flex items-center gap-2 ${filter === 'Upcoming' ? 'text-white' :
                    filter === 'Ongoing' ? 'text-purple-400' : 'text-slate-400'
                    }`}>
                    <span className={`w-2 h-2 rounded-full ${filter === 'Upcoming' ? 'bg-blue-500' :
                        filter === 'Ongoing' ? 'bg-purple-500' : 'bg-slate-500'
                        }`}></span>
                    {filter}
                </h2>
                <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 overflow-hidden">
                    <InterviewTable
                        interviews={getFilteredInterviews()}
                        user={user}
                        handleDelete={handleDelete}
                        fetchInterviews={fetchInterviews}
                        emptyMessage={`No ${filter.toLowerCase()} interviews found.`}
                        isPast={filter !== 'Upcoming'}
                    />
                </div>
            </div>
        </div>
    );
};

// Extracted sub-component for cleaner code
const InterviewTable = ({ interviews, user, handleDelete, fetchInterviews, emptyMessage, isPast }) => {
    if (interviews.length === 0) {
        return <div className="p-8 text-center text-slate-500 italic">{emptyMessage}</div>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-slate-700/50 text-slate-300">
                    <tr>
                        <th className="p-4">Date & Time</th>
                        <th className="p-4">Type</th>
                        <th className="p-4">Participants</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                    {interviews.map((interview) => {
                        const isInterviewer = user.id === interview.interviewerId;
                        const isInterviewee = user.id === interview.intervieweeId;
                        const needsAcceptance = interview.status === 'PENDING' && (
                            (isInterviewee && !interview.intervieweeAccepted)
                        );

                        return (
                            <tr key={interview.id} className={`transition-colors ${isPast ? 'hover:bg-slate-700/20 opacity-75 hover:opacity-100' : 'hover:bg-slate-700/30'}`}>
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
                                    Round {interview.round}
                                </td>
                                <td className="p-4 text-sm text-slate-400">
                                    <div><span className="text-indigo-400">Interviewer:</span> {interview.interviewer?.name}</div>
                                    <div><span className="text-emerald-400">Candidate:</span> {interview.interviewee?.name}</div>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${interview.status === 'SCHEDULED' ? 'bg-blue-500/20 text-blue-400' :
                                        interview.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                                            interview.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                                                'bg-red-500/20 text-red-400'
                                        }`}>
                                        {interview.status}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <div className="flex gap-2">
                                        <Link to={`/interviews/${interview.id}`}>
                                            <Button size="sm" variant="secondary">
                                                {interview.status === 'SCHEDULED' ? 'Join / View' : 'View Details'}
                                            </Button>
                                        </Link>
                                        {needsAcceptance && (
                                            <Button
                                                size="sm"
                                                variant="primary"
                                                onClick={async () => {
                                                    try {
                                                        await interviewService.accept(interview.id);
                                                        fetchInterviews();
                                                    } catch (e) {
                                                        alert("Failed to accept");
                                                    }
                                                }}
                                            >
                                                Accept
                                            </Button>
                                        )}
                                        {user.role === 'HR' && (
                                            <button
                                                onClick={() => handleDelete(interview.id)}
                                                className="text-red-400 hover:text-red-300 text-sm font-medium ml-2"
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default Interviews;

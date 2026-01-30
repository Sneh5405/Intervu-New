import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { interviewService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Button from '../components/ui/Button';
import QuestionRunner from '../components/QuestionRunner/QuestionRunner';
import VideoChat from '../components/VideoChat/VideoChat';

const InterviewDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [interview, setInterview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [viewMode, setViewMode] = useState('DETAILS'); // DETAILS | RUNNER

    useEffect(() => {
        fetchInterview();
    }, [id]);

    const fetchInterview = async () => {
        try {
            const response = await interviewService.getById(id);
            setInterview(response.data);
        } catch (error) {
            console.error("Failed to fetch interview", error);
            // alert("Failed to load interview details"); 
            // Maybe redirect if 404/403
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (newStatus) => {
        try {
            await interviewService.update(id, { status: newStatus });
            setInterview({ ...interview, status: newStatus });
        } catch (error) {
            alert("Failed to update status");
        }
    };

    const handleNextRound = async () => {
        if (!window.confirm("Create next round for this interview?")) return;
        try {
            await interviewService.nextRound(id, {});
            alert("Next round created successfully!");
            navigate('/interviews'); // Redirect to list to see new round
        } catch (error) {
            console.error(error);
            alert("Failed to create next round");
        }
    };

    const startInterview = () => {
        if (interview.questions && interview.questions.length > 0) {
            setViewMode('RUNNER');
        } else {
            alert("No questions assigned to this interview.");
        }
    };

    // Socket Logic
    const socket = useSocket();
    const [participants, setParticipants] = useState([]);

    useEffect(() => {
        if (socket && viewMode === 'RUNNER') {
            socket.emit('join-room', id);

            socket.on('user-connected', (userId) => {
                console.log("User connected:", userId);
                setParticipants(prev => [...prev, userId]); // Simple list for now
            });

            return () => {
                socket.off('user-connected');
            }
        }
    }, [socket, viewMode, id]);

    if (loading) return <div className="p-8 text-center text-slate-400">Loading details...</div>;
    if (!interview) return <div className="p-8 text-center text-red-400">Interview not found or access denied.</div>;

    const isHR = user.role === 'HR';
    const isInterviewer = user.id === interview.interviewerId;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-4xl">
            <div className={`bg-slate-800 rounded-xl shadow-lg border border-slate-700 overflow-hidden ${viewMode === 'RUNNER' ? 'h-[calc(100vh-40px)]' : ''}`}>
                <div className="p-6 border-b border-slate-700 flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-2">
                            {viewMode === 'RUNNER' ? 'Interview Session' : 'Interview Details'}
                        </h1>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${interview.status === 'SCHEDULED' ? 'bg-blue-500/20 text-blue-400' :
                            interview.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                                'bg-red-500/20 text-red-500'
                            }`}>
                            {interview.status}
                        </span>
                    </div>

                    <div className="flex gap-2">
                        {viewMode === 'RUNNER' && (
                            <Button variant="ghost" onClick={() => setViewMode('DETAILS')}>
                                Back to Details
                            </Button>
                        )}
                        {isHR && viewMode !== 'RUNNER' && (
                            <Button variant="ghost" className="text-red-400 hover:text-red-300" onClick={handleDelete}>
                                Delete Interview
                            </Button>
                        )}
                    </div>
                </div>

                {viewMode === 'RUNNER' ? (
                    <div className="p-4 h-full bg-slate-900 relative">
                        <QuestionRunner
                            questionAssignment={interview.questions[currentQuestionIndex]}
                            interviewId={id}
                            onNext={() => setCurrentQuestionIndex(prev => Math.min(prev + 1, interview.questions.length - 1))}
                            onPrevious={() => setCurrentQuestionIndex(prev => Math.max(prev - 1, 0))}
                            isFirst={currentQuestionIndex === 0}
                            isLast={currentQuestionIndex === interview.questions.length - 1}
                        />
                        {/* Video Chat Overlay */}
                        <VideoChat interviewId={id} isInterviewer={isInterviewer} />
                    </div>
                ) : (
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* ... Existing Details Content ... */}
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-slate-400 text-sm uppercase tracking-wider mb-1">Time</h3>
                                <div className="text-lg font-medium">
                                    {new Date(interview.startTime).toLocaleDateString()}
                                </div>
                                <div className="text-slate-300">
                                    {new Date(interview.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                    {new Date(interview.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-slate-400 text-sm uppercase tracking-wider mb-1">Participants</h3>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="w-24 text-slate-500">Interviewer:</span>
                                        <span className="text-indigo-400 font-medium">{interview.interviewer?.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-24 text-slate-500">Candidate:</span>
                                        <span className="text-emerald-400 font-medium">{interview.interviewee?.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-24 text-slate-500">HR Owner:</span>
                                        <span className="text-slate-300">{interview.hr?.name}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <h3 className="text-slate-400 text-sm uppercase tracking-wider mb-1">Metadata</h3>
                                <div className="text-slate-300">Round: {interview.round || 1}</div>
                                {interview.meetLink && (
                                    <div className="mt-2">
                                        <a href={interview.meetLink} target="_blank" rel="noreferrer" className="text-blue-400 underline">
                                            Join Meeting
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* Actions for Interviewer */}
                            {isInterviewer && interview.status !== 'COMPLETED' && (
                                <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600">
                                    <h3 className="text-white font-medium mb-3">Interviewer Actions</h3>
                                    <div className="space-y-2">
                                        <Button
                                            onClick={startInterview}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white w-full"
                                        >
                                            Start Interview Session
                                        </Button>
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={() => handleStatusUpdate('COMPLETED')}
                                                className="bg-green-600 hover:bg-green-700 text-white w-full"
                                            >
                                                Mark as Completed
                                            </Button>
                                            <Button
                                                onClick={() => handleStatusUpdate('CANCELLED')}
                                                className="bg-red-600 hover:bg-red-700 text-white w-full"
                                            >
                                                Mark as Cancelled
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* HR can also update status if needed via general edit, but for now simple buttons */}
                            {isHR && interview.status !== 'COMPLETED' && (
                                <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600">
                                    <h3 className="text-white font-medium mb-3">Override Status</h3>
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() => handleStatusUpdate('COMPLETED')}
                                            variant="secondary"
                                            className="text-xs"
                                        >
                                            Complete
                                        </Button>
                                        <Button
                                            onClick={() => handleStatusUpdate('CANCELLED')}
                                            variant="secondary"
                                            className="text-xs text-red-400"
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InterviewDetail;

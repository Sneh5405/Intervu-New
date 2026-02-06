import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { interviewService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Button from '../components/ui/Button';
import QuestionRunner from '../components/QuestionRunner/QuestionRunner';
import VideoChat from '../components/VideoChat/VideoChat';
import AddQuestionModal from '../components/AddQuestionModal';

const InterviewDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [interview, setInterview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [viewMode, setViewMode] = useState('DETAILS'); // DETAILS | RUNNER

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [newStartTime, setNewStartTime] = useState('');
    const [newEndTime, setNewEndTime] = useState('');

    // Question Modal
    const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);

    useEffect(() => {
        fetchInterview();
    }, [id]);

    const fetchInterview = async () => {
        try {
            const response = await interviewService.getById(id);
            setInterview(response.data);
            // Initialize edit state just in case
            if (response.data) {
                setNewStartTime(response.data.startTime);
                setNewEndTime(response.data.endTime);
            }
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

    const handleTimeUpdate = async () => {
        try {
            await interviewService.update(id, {
                startTime: new Date(newStartTime),
                endTime: new Date(newEndTime)
            });
            setInterview({
                ...interview,
                startTime: newStartTime,
                endTime: newEndTime
            });
            setIsEditing(false);
            alert("Interview time updated successfully");
        } catch (error) {
            console.error("Failed to update time", error);
            alert("Failed to update interview time");
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
        if (!interview.questions || interview.questions.length === 0) {
            // Warn but allow joining
            if (!window.confirm("No questions are assigned to this interview. Join video session anyway?")) {
                return;
            }
        }
        setViewMode('RUNNER');
    };

    // Socket Logic
    const socket = useSocket();
    const [participants, setParticipants] = useState([]);

    useEffect(() => {
        if (socket && viewMode === 'RUNNER') {
            socket.emit('join-room', id);

            socket.on('user-connected', (userId) => {
                console.log("User connected:", userId);
                setParticipants(prev => [...prev, userId]);
            });

            socket.on('question-added', () => {
                console.log("Question added, refreshing...");
                fetchInterview();
            });

            return () => {
                socket.off('user-connected');
                socket.off('question-added');
            }
        }
    }, [socket, viewMode, id]);

    const handleAddQuestion = async (questionId) => {
        try {
            await interviewService.addQuestion(id, { questionId });
            // Refresh interview data
            const response = await interviewService.getById(id);
            setInterview(response.data);
            setIsQuestionModalOpen(false);
            alert("Question added successfully!");
        } catch (error) {
            console.error("Failed to add question", error);
            alert("Failed to add question");
        }
    };

    // Add logic to delete interview
    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to delete this interview?")) return;
        try {
            await interviewService.delete(id);
            navigate('/interviews');
        } catch (error) {
            alert("Failed to delete interview");
        }
    }

    if (loading) return <div className="p-8 text-center text-slate-400">Loading details...</div>;
    if (!interview) return <div className="p-8 text-center text-red-400">Interview not found or access denied.</div>;

    const isHR = user.role === 'HR';
    const isInterviewer = user.id === interview.interviewerId;
    const isCandidate = user.id === interview.intervieweeId;

    return (
        <div className={`container mx-auto p-4 md:p-8 ${viewMode === 'RUNNER' ? 'max-w-full' : 'max-w-4xl'}`}>
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
                            isLast={currentQuestionIndex === (interview.questions.length ? interview.questions.length - 1 : 0)}
                        />

                        {/* Interviewer Controls Overlay */}
                        {isInterviewer && (
                            <div className="absolute top-4 right-4 z-40 bg-slate-900/80 backdrop-blur rounded-lg p-2 border border-slate-700 shadow-xl">
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => setIsQuestionModalOpen(true)}
                                >
                                    + Add Question
                                </Button>
                            </div>
                        )}

                        {/* Video Chat Overlay */}
                        <VideoChat interviewId={id} isInterviewer={isInterviewer} />
                    </div>
                ) : (
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* ... Existing Details Content ... */}
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <h3 className="text-slate-400 text-sm uppercase tracking-wider">Time</h3>
                                    {isHR && !isEditing && (
                                        <button
                                            onClick={() => {
                                                setNewStartTime(interview.startTime);
                                                setNewEndTime(interview.endTime);
                                                setIsEditing(true);
                                            }}
                                            className="text-xs text-blue-400 hover:text-blue-300"
                                        >
                                            Edit
                                        </button>
                                    )}
                                </div>

                                {isEditing ? (
                                    <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600 space-y-3">
                                        <div>
                                            <label className="text-xs text-slate-400 block mb-1">Start Time</label>
                                            <input
                                                type="datetime-local"
                                                value={new Date(newStartTime).toISOString().slice(0, 16)}
                                                onChange={(e) => setNewStartTime(e.target.value)}
                                                className="w-full bg-slate-800 border-slate-600 rounded text-sm px-2 py-1 text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400 block mb-1">End Time</label>
                                            <input
                                                type="datetime-local"
                                                value={new Date(newEndTime).toISOString().slice(0, 16)}
                                                onChange={(e) => setNewEndTime(e.target.value)}
                                                className="w-full bg-slate-800 border-slate-600 rounded text-sm px-2 py-1 text-white"
                                            />
                                        </div>
                                        <div className="flex gap-2 justify-end mt-2">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => setIsEditing(false)}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={handleTimeUpdate}
                                            >
                                                Save
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-lg font-medium">
                                            {new Date(interview.startTime).toLocaleDateString()}
                                        </div>
                                        <div className="text-slate-300">
                                            {new Date(interview.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                            {new Date(interview.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </>
                                )}
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

                                <div className="text-slate-300">Round: {interview.round || 1}</div>
                                {interview.meetLink && (
                                    <div className="mt-2">
                                        <a href={interview.meetLink} target="_blank" rel="noreferrer" className="text-blue-400 underline">
                                            Join Meeting
                                        </a>
                                    </div>
                                )}
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <h3 className="text-slate-400 text-sm uppercase tracking-wider">Questions</h3>
                                    {(isHR || isInterviewer) && (
                                        <button
                                            onClick={() => setIsQuestionModalOpen(true)}
                                            className="text-xs text-indigo-400 hover:text-indigo-300"
                                        >
                                            + Add
                                        </button>
                                    )}
                                </div>

                                {interview.questions && interview.questions.length > 0 ? (
                                    <div className="space-y-2">
                                        {interview.questions.map((q, idx) => (
                                            <div key={q.questionId} className="bg-slate-700/30 p-2 rounded text-sm text-slate-300 flex justify-between">
                                                <span className="truncate">{idx + 1}. {q.question?.text}</span>
                                                <span className={`text-xs px-1.5 py-0.5 rounded ml-2 whitespace-nowrap ${q.question?.difficulty === 'EASY' ? 'bg-green-500/10 text-green-400' :
                                                    q.question?.difficulty === 'HARD' ? 'bg-red-500/10 text-red-400' :
                                                        'bg-yellow-500/10 text-yellow-400'
                                                    }`}>
                                                    {q.question?.difficulty}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-slate-500 text-sm italic">
                                        No questions assigned yet.
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

                            {/* Actions for Candidate */}
                            {isCandidate && interview.status === 'SCHEDULED' && (
                                <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600">
                                    <h3 className="text-white font-medium mb-3">Candidate Actions</h3>
                                    <Button
                                        onClick={startInterview}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white w-full"
                                    >
                                        Join Interview
                                    </Button>
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

                <AddQuestionModal
                    isOpen={isQuestionModalOpen}
                    onClose={() => setIsQuestionModalOpen(false)}
                    onAdd={handleAddQuestion}
                />
            </div>
        </div>
    );
};

export default InterviewDetail;

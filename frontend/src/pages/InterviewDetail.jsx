import React, { useEffect, useState, useCallback } from 'react';
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

    const fetchInterview = useCallback(async (inSession = false) => {
        try {
            const response = await interviewService.getById(id, inSession);
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
    }, [id]);

    useEffect(() => {
        fetchInterview();
    }, [id, fetchInterview]);

    const handleStatusUpdate = async (newStatus) => {
        try {
            await interviewService.update(id, { status: newStatus });
            setInterview({ ...interview, status: newStatus });
            if (newStatus === 'CANCELLED') {
                navigate('/interviews');
            }
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

    const startInterview = async () => {
        const isCandidateUser = user.id === interview.intervieweeId;
        if (isCandidateUser) {
            try {
                // Fetch interview with inSession=true to get the questions
                const response = await interviewService.getById(id, true);
                setInterview(response.data);
                if (!response.data.questions || response.data.questions.length === 0) {
                    if (!window.confirm("No questions are assigned to this interview. Join video session anyway?")) {
                        return;
                    }
                }
                setViewMode('RUNNER');
            } catch (err) {
                console.error("Failed to fetch interview for runner", err);
                alert("Failed to join interview session");
            }
        } else {
            if (!interview.questions || interview.questions.length === 0) {
                // Warn but allow joining
                if (!window.confirm("No questions are assigned to this interview. Join video session anyway?")) {
                    return;
                }
            }
            setViewMode('RUNNER');
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
                setParticipants(prev => [...prev, userId]);
            });

            socket.on('question-added', () => {
                console.log("Question added, refreshing...");
                fetchInterview(true);
            });

            socket.on('answer-updated', ({ questionId, candidateAnswer, senderId }) => {
                // Ignore if we are the one who typed it to avoid cursor jumping
                if (user && senderId === user.id) return;

                setInterview(prev => {
                    if (!prev) return prev;
                    const updatedQuestions = prev.questions.map(q => {
                        if (q.questionId === questionId) {
                            return { ...q, candidateAnswer };
                        }
                        return q;
                    });
                    return { ...prev, questions: updatedQuestions };
                });
            });

            return () => {
                socket.off('user-connected');
                socket.off('question-added');
                socket.off('answer-updated');
            }
        }
    }, [socket, viewMode, id, fetchInterview, user]);

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

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );
    if (!interview) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className="bg-slate-900 border border-rose-500/30 rounded p-8 text-center max-w-md w-full shadow-2xl font-mono text-xs">
                <div className="text-4xl mb-4">🚫</div>
                <h1 className="text-base font-bold text-rose-450 mb-2">interview_not_found</h1>
                <p className="text-slate-500 mb-6">// Access denied or resource has been deleted</p>
                <Button onClick={() => navigate('/interviews')} variant="outline">~/back_to_interviews</Button>
            </div>
        </div>
    );

    const isHR = user.role === 'HR';
    const isInterviewer = user.id === interview.interviewerId;
    const isCandidate = user.id === interview.intervieweeId;

    return (
        <div className="min-h-screen bg-slate-950 bg-grid-pattern pt-20 pb-12">
            <div className={`container mx-auto p-4 md:p-8 ${viewMode === 'RUNNER' ? 'max-w-full' : 'max-w-4xl'}`}>
                <div className={`bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-lg shadow-2xl overflow-hidden flex flex-col ${viewMode === 'RUNNER' ? 'h-[calc(100vh-120px)]' : ''}`}>
                    {/* Console Header Bar */}
                    <div className="flex items-center justify-between border-b border-slate-800/60 px-4 py-2.5 bg-slate-950/60 select-none">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/70"></span>
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70"></span>
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70"></span>
                        </div>
                        <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">
                            {viewMode === 'RUNNER' ? 'interview_session.sh' : 'interview_details.stdout'}
                        </span>
                    </div>

                    <div className="p-6 border-b border-slate-800/80 flex justify-between items-center bg-slate-900/40">
                        <div>
                            <h1 className="text-xl font-mono font-bold text-slate-100 flex items-center gap-2">
                                <span className="text-blue-500">&gt;</span> {viewMode === 'RUNNER' ? 'interview_session()' : 'get_interview_details()'}
                            </h1>
                            <div className="mt-2 flex items-center gap-2">
                                <span className={`px-2.5 py-0.5 rounded font-mono text-[10px] font-bold tracking-wider ${
                                    (interview.status === 'SCHEDULED' && new Date() >= new Date(interview.startTime) && new Date() <= new Date(interview.endTime)) ? 'bg-purple-500/10 text-purple-400 border border-purple-550/20' :
                                    interview.status === 'SCHEDULED' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                    interview.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20' :
                                        'bg-rose-500/10 text-rose-450 border border-rose-500/20'
                                    }`}>
                                    {(interview.status === 'SCHEDULED' && new Date() >= new Date(interview.startTime) && new Date() <= new Date(interview.endTime)) ? 'ONGOING' : interview.status}
                                </span>
                                <span className="text-slate-500 text-xs font-mono">// round: {interview.round || 1}</span>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {viewMode === 'RUNNER' && (
                                <Button variant="secondary" onClick={() => setViewMode('DETAILS')} className="py-1 px-3 text-xs">
                                    ~/back_to_details
                                </Button>
                            )}
                            {isHR && viewMode !== 'RUNNER' && (
                                <Button variant="ghost" className="text-rose-400 hover:text-rose-300 py-1 px-3 text-xs" onClick={handleDelete}>
                                    delete_interview()
                                </Button>
                            )}
                        </div>
                    </div>

                    {viewMode === 'RUNNER' ? (
                        <div className="p-4 h-full bg-slate-950 relative min-h-[500px]">
                            <QuestionRunner
                                questionAssignment={interview.questions[currentQuestionIndex]}
                                interviewId={id}
                                socket={socket}
                                onNext={() => setCurrentQuestionIndex(prev => Math.min(prev + 1, interview.questions.length - 1))}
                                onPrevious={() => setCurrentQuestionIndex(prev => Math.max(prev - 1, 0))}
                                isFirst={currentQuestionIndex === 0}
                                isLast={currentQuestionIndex === (interview.questions.length ? interview.questions.length - 1 : 0)}
                                isReadOnly={!isCandidate && !isInterviewer}
                            />

                            {/* Interviewer Controls Overlay */}
                            {isInterviewer && (
                                <div className="absolute top-4 right-4 z-40 bg-slate-900/95 border border-slate-800 rounded p-2 shadow-2xl flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsQuestionModalOpen(true)}
                                        className="py-1 px-3 text-xs"
                                    >
                                        + add_question()
                                    </Button>
                                </div>
                            )}

                            {/* Video Chat Overlay */}
                            <VideoChat interviewId={id} isInterviewer={isInterviewer} />
                        </div>
                    ) : (
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-900/20">
                            <div className="space-y-6">
                                {/* Time metrics */}
                                <div className="bg-slate-950/80 border border-slate-800/80 p-5 rounded font-mono text-xs text-slate-400 space-y-3 shadow-inner">
                                    <div className="flex justify-between items-center mb-1 border-b border-slate-850 pb-2">
                                        <span className="text-slate-500 font-bold uppercase tracking-wider">// Time Schedule</span>
                                        {isHR && !isEditing && (
                                            <button
                                                onClick={() => {
                                                    setNewStartTime(interview.startTime);
                                                    setNewEndTime(interview.endTime);
                                                    setIsEditing(true);
                                                }}
                                                className="text-[10px] text-blue-400 hover:text-blue-300 font-bold"
                                            >
                                                edit_schedule()
                                            </button>
                                        )}
                                    </div>

                                    {isEditing ? (
                                        <div className="bg-slate-900/50 p-4 rounded border border-slate-800 space-y-3">
                                            <div>
                                                <label className="text-[10px] text-slate-500 uppercase block mb-1">start_time</label>
                                                <input
                                                    type="datetime-local"
                                                    value={new Date(newStartTime).toISOString().slice(0, 16)}
                                                    onChange={(e) => setNewStartTime(e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-850 rounded text-xs px-3 py-1.5 text-white font-mono outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-500 uppercase block mb-1">end_time</label>
                                                <input
                                                    type="datetime-local"
                                                    value={new Date(newEndTime).toISOString().slice(0, 16)}
                                                    onChange={(e) => setNewEndTime(e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-850 rounded text-xs px-3 py-1.5 text-white font-mono outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div className="flex gap-2 justify-end mt-3">
                                                <Button
                                                    variant="secondary"
                                                    onClick={() => setIsEditing(false)}
                                                    className="py-1 px-3 text-[11px]"
                                                >
                                                    cancel()
                                                </Button>
                                                <Button
                                                    onClick={handleTimeUpdate}
                                                    className="py-1 px-3 text-[11px]"
                                                >
                                                    save_changes()
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-1 text-slate-350">
                                            <div><span className="text-slate-550">const</span> dateStr = <span className="text-blue-400">"{new Date(interview.startTime).toLocaleDateString()}"</span>;</div>
                                            <div>
                                                <span className="text-slate-550">const</span> timeWindow = <span className="text-indigo-400">"{new Date(interview.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(interview.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}"</span>;
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Active workers */}
                                <div className="bg-slate-950/80 border border-slate-800/80 p-5 rounded font-mono text-xs text-slate-400 space-y-2.5 shadow-inner">
                                    <div className="text-slate-500 font-bold uppercase tracking-wider mb-1 border-b border-slate-850 pb-2">// active_participants</div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-slate-550">const</span> interviewer = <span className="text-indigo-400">"{interview.interviewer?.name}"</span>;
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-slate-550">const</span> candidate = <span className="text-emerald-450">"{interview.interviewee?.name}"</span>;
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-slate-550">const</span> hrOwner = <span className="text-slate-305">"{interview.hr?.name}"</span>;
                                    </div>
                                </div>

                                {/* Room links */}
                                {interview.meetLink && (
                                    <div className="bg-slate-950/80 border border-slate-800/80 p-5 rounded font-mono text-xs text-slate-400 shadow-inner">
                                        <span className="text-slate-550">const</span> meetingLink = <a href={interview.meetLink} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 underline font-bold">"{interview.meetLink}"</a>;
                                    </div>
                                )}
                            </div>

                            <div className="space-y-6">
                                {(!isCandidate || interview.status === 'COMPLETED') && (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center mb-1">
                                            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">// allocated_questions.json</h3>
                                            {(isHR || isInterviewer) && interview.status !== 'COMPLETED' && (
                                                <button
                                                    onClick={() => setIsQuestionModalOpen(true)}
                                                    className="text-xs font-mono text-indigo-400 hover:text-indigo-300 font-bold"
                                                >
                                                    add_question()
                                                </button>
                                            )}
                                        </div>

                                        {interview.questions && interview.questions.length > 0 ? (
                                            <div className="space-y-4">
                                                {interview.questions.map((q, idx) => {
                                                    const showDetailedAnswers = interview.status === 'COMPLETED';
                                                    return (
                                                        <div key={q.questionId} className="bg-slate-950/60 border border-slate-800 rounded p-4 space-y-3">
                                                            <div className="flex justify-between items-start">
                                                                <span className="text-slate-200 font-mono text-xs font-semibold">{idx + 1}. {q.question?.text}</span>
                                                                <div className="flex items-center gap-2 ml-4 shrink-0 select-none">
                                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                                                                        q.question?.difficulty === 'EASY' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                                                        q.question?.difficulty === 'HARD' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                                                            'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                                        }`}>
                                                                        {q.question?.difficulty}
                                                                    </span>
                                                                    <span className="text-slate-500 text-[10px] font-mono">
                                                                        {q.question?.type}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {showDetailedAnswers && (
                                                                <div className="grid grid-cols-1 gap-4 mt-2 pt-3 border-t border-slate-850 text-xs font-mono">
                                                                    <div>
                                                                        <div className="text-slate-500 mb-1">// candidate_solution.stdout</div>
                                                                        {q.candidateAnswer ? (
                                                                            q.question?.type === 'CODE' ? (
                                                                                <pre className="bg-slate-950 p-3 rounded border border-slate-850 font-mono text-[11px] overflow-x-auto text-slate-350 max-h-40">
                                                                                    {q.candidateAnswer}
                                                                                </pre>
                                                                            ) : (
                                                                                <div className="bg-slate-950 p-3 rounded border border-slate-850 text-slate-300">
                                                                                    {q.candidateAnswer}
                                                                                </div>
                                                                            )
                                                                        ) : (
                                                                            <div className="text-slate-600 italic p-3 bg-slate-950 rounded border border-slate-850 text-center">
                                                                                empty_buffer
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-slate-500 mb-1">// verification_key.stdout</div>
                                                                        {q.question?.correctAnswer ? (
                                                                            q.question?.type === 'CODE' ? (
                                                                                <pre className="bg-slate-950 p-3 rounded border border-slate-850 font-mono text-[11px] overflow-x-auto text-emerald-450/90 max-h-40">
                                                                                    {q.question.correctAnswer}
                                                                                </pre>
                                                                            ) : (
                                                                                <div className="p-3 rounded border border-emerald-950/30 text-emerald-400 bg-emerald-500/5 font-medium">
                                                                                    {q.question.correctAnswer}
                                                                                </div>
                                                                            )
                                                                        ) : (
                                                                            <div className="text-slate-600 italic p-3 bg-slate-950 rounded border border-slate-850 text-center">
                                                                                not_specified
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="text-slate-500 font-mono text-xs italic p-4 border border-dashed border-slate-800 rounded bg-slate-900/5 text-center">
                                                // no_questions_linked
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Actions for Interviewer */}
                                {isInterviewer && interview.status !== 'COMPLETED' && (
                                    <div className="bg-slate-950/80 border border-slate-850 p-5 rounded font-mono text-xs">
                                        <h3 className="text-slate-400 font-bold uppercase tracking-wider mb-4 border-b border-slate-850 pb-2">// room_operations</h3>
                                        <div className="space-y-3">
                                            <Button
                                                onClick={startInterview}
                                                className="w-full py-2.5 text-xs text-center"
                                            >
                                                start_interview_room()
                                            </Button>
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={() => handleStatusUpdate('COMPLETED')}
                                                    className="w-full py-2 bg-emerald-600 border-emerald-500/20 text-slate-950 hover:bg-emerald-500 text-xs"
                                                >
                                                    close_session()
                                                </Button>
                                                <Button
                                                    onClick={() => handleStatusUpdate('CANCELLED')}
                                                    className="w-full py-2 bg-rose-600 border-rose-500/20 text-slate-950 hover:bg-rose-500 text-xs"
                                                >
                                                    cancel_session()
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Actions for Candidate */}
                                {isCandidate && interview.status === 'SCHEDULED' && (
                                    <div className="bg-slate-950/80 border border-slate-850 p-5 rounded font-mono text-xs">
                                        <h3 className="text-slate-400 font-bold uppercase tracking-wider mb-4 border-b border-slate-850 pb-2">// environment_operations</h3>
                                        <Button
                                            onClick={startInterview}
                                            className="w-full py-2.5"
                                        >
                                            spawn_and_join_room()
                                        </Button>
                                    </div>
                                )}

                                {/* HR Override buttons */}
                                {isHR && interview.status !== 'COMPLETED' && (
                                    <div className="bg-slate-950/80 border border-slate-850 p-5 rounded font-mono text-xs">
                                        <h3 className="text-slate-400 font-bold uppercase tracking-wider mb-4 border-b border-slate-850 pb-2">// hr_override_status</h3>
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={() => handleStatusUpdate('COMPLETED')}
                                                variant="secondary"
                                                className="w-full py-1.5 text-[11px]"
                                            >
                                                force_complete()
                                            </Button>
                                            <Button
                                                onClick={() => handleStatusUpdate('CANCELLED')}
                                                variant="secondary"
                                                className="w-full text-rose-400 py-1.5 text-[11px]"
                                            >
                                                force_cancel()
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
        </div>
    );
};

export default InterviewDetail;

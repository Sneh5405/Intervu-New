import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Editor from '@monaco-editor/react';

const AssessmentExam = () => {
    const { id } = useParams(); 
    const navigate = useNavigate();
    const [questions, setQuestions] = useState([]);
    const [activeIdx, setActiveIdx] = useState(0);
    const [loading, setLoading] = useState(true);
    const [answers, setAnswers] = useState({}); 
    const [timeLeft, setTimeLeft] = useState(0);
    const [waitingMode, setWaitingMode] = useState(false);
    const [targetStartTime, setTargetStartTime] = useState(null);
    const [waitLeft, setWaitLeft] = useState(0);

    const startExam = async () => {
        try {
            const res = await api.post(`/assessments/${id}/start`);
            setQuestions(res.data.questions);
            setTimeLeft(res.data.duration); 
            setWaitingMode(false);
            setLoading(false);
        } catch (err) {
            if (err.response?.data?.isEarly) {
                setWaitingMode(true);
                setTargetStartTime(err.response.data.startTime);
                setLoading(false);
            } else {
                console.error(err);
                alert("Could not start exam. Have you accepted the invite or already completed it?");
                navigate('/');
            }
        }
    };

    useEffect(() => {
        startExam();
    }, [id]);

    useEffect(() => {
        if (!waitingMode || !targetStartTime) return;
        
        const calcWait = () => {
            const now = new Date();
            const start = new Date(targetStartTime);
            const diff = Math.floor((start - now) / 1000);
            return diff > 0 ? diff : 0;
        };

        setWaitLeft(calcWait());

        const timerId = setInterval(() => {
            const w = calcWait();
            setWaitLeft(w);
            if (w <= 0) {
                clearInterval(timerId);
                setLoading(true);
                startExam();
            }
        }, 1000);

        return () => clearInterval(timerId);
    }, [waitingMode, targetStartTime]);

    useEffect(() => {
        if (timeLeft <= 0 && !loading) {
            handleFinish();
            return;
        }
        const timerId = setInterval(() => setTimeLeft(t => t - 1), 1000);
        return () => clearInterval(timerId);
    }, [timeLeft, loading]);

    const formatTime = (seconds) => {
        if (!seconds || seconds < 0) return '00:00';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
    };

    const handleCodeChange = (value) => {
        const qId = questions[activeIdx].questionId;
        setAnswers({ ...answers, [qId]: value });
    };

    const saveAnswer = async () => {
        if(questions.length === 0) return;
        const qId = questions[activeIdx].questionId;
        const answer = answers[qId];
        if(!answer) return;
        
        try {
            await api.post(`/assessments/${id}/submit`, { questionId: qId, answer });
        } catch (err) {
            console.error(err);
        }
    };

    const handleFinish = async () => {
        if (timeLeft > 0 && !window.confirm("Are you sure you want to submit your exam? You cannot undo this.")) return;
        try {
            await saveAnswer(); 
            await api.post(`/assessments/${id}/finish`);
            navigate('/');
            alert("Exam submitted successfully!");
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return (
        <div className="h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-400 font-mono">Initializing Sandbox Environment...</p>
        </div>
    );

    if (waitingMode) return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                <div className="text-5xl mb-6 mt-4">⏳</div>
                <h1 className="text-3xl font-bold text-white mb-2">Assessment Starting Soon</h1>
                <p className="text-slate-400 mb-8">Please wait. The exam will automatically launch when the timer reaches zero.</p>
                <div className="text-5xl font-mono font-bold text-indigo-400 bg-slate-950 py-6 rounded-2xl border border-slate-800 shadow-inner">
                    {formatTime(waitLeft)}
                </div>
            </div>
        </div>
    );

    const activeQuestion = questions[activeIdx]?.question;

    return (
        <div className="h-screen flex flex-col bg-slate-950 text-white font-sans overflow-hidden">
            {/* HackerRank Style Header */}
            <header className="h-14 bg-[#1e1e1e] border-b border-[#333] flex items-center justify-between px-6 shrink-0 shadow-md z-10">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center font-bold text-white tracking-tighter">IV</div>
                    <div className="font-semibold text-slate-200 tracking-wide text-sm border-l border-slate-700 pl-4">Online Assessment Environment</div>
                </div>
                
                <div className={`font-mono text-xl font-bold bg-[#2d2d2d] px-4 py-1.5 rounded-md border border-[#444] shadow-inner ${timeLeft < 300 ? 'text-red-400 animate-pulse border-red-500/50 bg-red-500/10' : 'text-emerald-400'}`}>
                    {formatTime(timeLeft)}
                </div>
                
                <button onClick={handleFinish} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded font-bold text-sm transition-colors shadow-lg shadow-emerald-600/20">
                    Submit Test
                </button>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Left Pane - Questions (HackerRank Layout) */}
                <div className="w-1/2 flex flex-col border-r border-[#333] bg-[#0d1117] overflow-hidden">
                    {/* Question Nav Tabs */}
                    <div className="flex bg-[#161b22] px-2 pt-2 overflow-x-auto border-b border-[#30363d] hide-scrollbar shrink-0 gap-1">
                        {questions.map((q, idx) => (
                            <button 
                                key={q.id} 
                                onClick={() => { saveAnswer(); setActiveIdx(idx); }}
                                className={`px-4 py-2 rounded-t-lg font-bold text-sm transition-all border-t border-x ${activeIdx === idx 
                                        ? 'bg-[#0d1117] text-white border-[#30363d] border-b-transparent shadow-[0_-2px_10px_rgba(255,255,255,0.05)]' 
                                        : answers[q.questionId] 
                                            ? 'bg-[#161b22] text-emerald-400 hover:text-emerald-300 border-transparent border-b-[#30363d]' 
                                            : 'bg-[#161b22] text-slate-500 hover:text-slate-300 border-transparent border-b-[#30363d]'}`}
                                style={{ marginBottom: activeIdx === idx ? '-1px' : '0' }}
                            >
                                Question {idx + 1}
                                {answers[q.questionId] && activeIdx !== idx && <span className="ml-2">✓</span>}
                            </button>
                        ))}
                    </div>

                    {/* Question Content */}
                    <div className="flex-1 overflow-y-auto p-8 prose prose-invert max-w-none prose-pre:bg-[#161b22] prose-pre:border prose-pre:border-[#30363d]">
                        <div className="mb-6 pb-4 border-b border-[#30363d]">
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-2xl font-bold text-white m-0">{activeQuestion?.text}</h2>
                            </div>
                            <div className="flex gap-2">
                                <span className="bg-[#21262d] text-xs px-2 py-1 rounded font-mono text-slate-300 border border-[#30363d]">{activeQuestion?.type}</span>
                                <span className={`text-xs px-2 py-1 rounded font-bold border ${activeQuestion?.difficulty === 'EASY' ? 'bg-green-500/10 text-green-400 border-green-500/20' : activeQuestion?.difficulty === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{activeQuestion?.difficulty}</span>
                            </div>
                        </div>
                        
                        {/* MCQ Options */}
                        {activeQuestion?.type === 'MCQ' && (
                            <div className="mt-8 space-y-4">
                                {activeQuestion.options?.map((opt, i) => (
                                    <label key={i} className={`flex items-start gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all
                                        ${answers[activeQuestion.id] === opt ? 'bg-indigo-600/10 border-indigo-500 shadow-sm shadow-indigo-500/10' : 'bg-[#161b22] border-[#30363d] hover:border-slate-500'}`}>
                                        <div className="mt-0.5">
                                            <input 
                                                type="radio" 
                                                name={`q-${activeQuestion.id}`} 
                                                value={opt} 
                                                checked={answers[activeQuestion.id] === opt}
                                                onChange={() => setAnswers({ ...answers, [activeQuestion.id]: opt })}
                                                className="w-5 h-5 accent-indigo-500 bg-[#0d1117] border-[#30363d]"
                                            />
                                        </div>
                                        <span className="text-lg text-slate-200 leading-snug">{opt}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                        
                        {/* Code Problem Statement Placeholder */}
                        {activeQuestion?.type === 'CODE' && (
                            <div className="text-slate-300 text-base leading-relaxed">
                                <p>Write a program to solve the problem described above. Your code will be evaluated against hidden test cases.</p>
                                <h3 className="text-white font-semibold mt-6 mb-2">Input Format</h3>
                                <p>Standard input containing the parameters.</p>
                                <h3 className="text-white font-semibold mt-6 mb-2">Output Format</h3>
                                <p>Return or print the expected result.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Pane - Monaco Editor */}
                <div className="w-1/2 flex flex-col bg-[#1e1e1e]">
                    {activeQuestion?.type === 'CODE' ? (
                        <>
                            <div className="h-10 bg-[#252526] border-b border-[#333] flex items-center px-4 shrink-0 justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-red-500/80"></span>
                                    <span className="w-3 h-3 rounded-full bg-yellow-500/80"></span>
                                    <span className="w-3 h-3 rounded-full bg-green-500/80"></span>
                                    <span className="text-xs font-mono text-slate-400 ml-4">solution.js</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">JavaScript (Node.js)</span>
                                </div>
                            </div>
                            <div className="flex-1 relative">
                                <Editor
                                    height="100%"
                                    defaultLanguage="javascript"
                                    theme="vs-dark"
                                    value={answers[activeQuestion.id] || "/**\n * @param {any} input\n * @return {any}\n */\nfunction solve() {\n    // Write your code here\n    \n}\n"}
                                    onChange={handleCodeChange}
                                    options={{
                                        minimap: { enabled: false },
                                        fontSize: 14,
                                        padding: { top: 16 },
                                        scrollBeyondLastLine: false,
                                        smoothScrolling: true,
                                        cursorBlinking: "smooth",
                                        fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                                        renderLineHighlight: "all",
                                    }}
                                />
                                <div className="absolute bottom-4 right-6 flex gap-3">
                                    <button onClick={saveAnswer} className="bg-[#2d2d2d] border border-[#444] hover:bg-[#3d3d3d] text-slate-300 px-4 py-2 rounded text-sm font-bold shadow-lg transition-colors">
                                        Save Draft
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-[#1e1e1e] border-l border-[#333]">
                            <div className="text-7xl mb-6 opacity-30">⌨️</div>
                            <h3 className="text-xl font-bold text-slate-400 mb-2">No code editor required</h3>
                            <p className="text-sm font-medium text-slate-500">Please select the correct option on the left side.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AssessmentExam;

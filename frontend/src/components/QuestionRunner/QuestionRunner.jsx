import React, { useState, useEffect } from 'react';
import CodeEditor from './CodeEditor';
import Button from '../ui/Button';
import { interviewService, submissionService } from '../../services/api';

// Simple debounce hook
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};

const QuestionRunner = ({ questionAssignment, interviewId, socket, onNext, onPrevious, isLast, isFirst, isReadOnly }) => {
    const question = questionAssignment?.question;

    // Initial state from backend (candidateAnswer)
    const [answer, setAnswer] = useState(questionAssignment?.candidateAnswer || '');
    const [saveStatus, setSaveStatus] = useState('saved'); // saved, saving, error

    const debouncedAnswer = useDebounce(answer, 2000); // Auto-save fallback after 2s of inactivity

    // Horizontal split resizing state and handler
    const [leftWidth, setLeftWidth] = useState(50); // percentage

    const handleHorizontalMouseDown = (e) => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = leftWidth;
        const container = e.currentTarget.parentElement;
        const containerWidth = container.getBoundingClientRect().width;

        const handleMouseMove = (moveEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaPercent = (deltaX / containerWidth) * 100;
            const newWidth = Math.max(25, Math.min(75, startWidth + deltaPercent));
            setLeftWidth(newWidth);
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    // Update local state when switching questions
    useEffect(() => {
        setAnswer(questionAssignment?.candidateAnswer || '');
        setSaveStatus('saved');
    }, [questionAssignment]);

    // Auto-save fallback effect (when socket CRDT is not active)
    useEffect(() => {
        if (!socket && !isReadOnly && debouncedAnswer !== (questionAssignment?.candidateAnswer || '') && debouncedAnswer !== '') {
            saveAnswerToBackend(debouncedAnswer);
        }
    }, [debouncedAnswer, isReadOnly, questionAssignment, socket]);

    const saveAnswerToBackend = async (value) => {
        setSaveStatus('saving');
        try {
            await interviewService.saveAnswer(interviewId, {
                questionId: question.id,
                answer: value
            });
            setSaveStatus('saved');
        } catch (error) {
            console.error("Auto-save failed", error);
            setSaveStatus('error');
        }
    };

    const handleAnswerChange = (newValue) => {
        setAnswer(newValue);
        if (saveStatus !== 'saving') setSaveStatus('unsaved');
    };

    const handleRunCode = async (code, language) => {
        if (!question.testCases || question.testCases.length === 0) {
            return "No test cases established for this question. Unable to evaluate.";
        }

        try {
            const res = await submissionService.submitBatch({
                code,
                language,
                testCases: question.testCases,
                questionId: question.id
            });

            const { results, passedCount, totalCount, allPassed } = res.data;

            if (allPassed) {
                return `✅ Accepted! All ${totalCount} test cases passed.`;
            }

            const firstFailed = results.find(r => !r.passed);
            if (firstFailed) {
                if (firstFailed.status === "FAILED" || firstFailed.status === "TIMEOUT") {
                    return `❌ Failed on Test Case #${firstFailed.testCaseIndex}\n\nStatus: ${firstFailed.status}\nError Details:\n${firstFailed.actualOutput}`;
                }
                return `❌ Wrong Answer on Test Case #${firstFailed.testCaseIndex}\n\nInput:\n${firstFailed.input}\n\nExpected Output:\n${firstFailed.expectedOutput}\n\nActual Output:\n${firstFailed.actualOutput}`;
            }

            return `Passed ${passedCount}/${totalCount} test cases.`;
        } catch (err) {
            console.error("Code evaluation error:", err);
            return `Evaluation Service Error: ${err.response?.data?.error || err.message || "Failed to contact execution engine"}`;
        }
    };

    if (!question) return <div className="text-center text-slate-400 p-8">No question selected.</div>;

    const renderRightPanel = () => {
        switch (question.type) {
            case 'CODE':
                return (
                    <CodeEditor
                        value={answer}
                        onChange={handleAnswerChange}
                        onRun={handleRunCode}
                        isReadOnly={isReadOnly}
                        socket={socket}
                        interviewId={interviewId}
                        questionId={question.id}
                    />
                );
            case 'MCQ':
                return (
                    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-lg p-6 flex flex-col shadow-inner h-full overflow-y-auto">
                        <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-850 pb-2">// select_option.config</h3>
                        <div className="space-y-3">
                            {question.options && question.options.map((option, idx) => (
                                <label 
                                    key={idx} 
                                    className={`flex items-center gap-3 p-4 rounded cursor-pointer border font-mono text-xs transition-all ${
                                        answer === option 
                                        ? 'bg-blue-500/10 border-blue-500 text-blue-400' 
                                        : 'bg-slate-950/80 hover:bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name={`mcq-option-${question.id}`}
                                        value={option}
                                        checked={answer === option}
                                        onChange={(e) => handleAnswerChange(e.target.value)}
                                        className="w-4 h-4 text-blue-500 focus:ring-0 focus:ring-offset-0 disabled:opacity-50"
                                        disabled={isReadOnly}
                                    />
                                    <span>{option}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                );
            case 'SCENARIO':
                return (
                    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-lg p-6 flex flex-col shadow-inner h-full">
                        <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-850 pb-2">// write_response.txt</h3>
                        <textarea
                            value={answer}
                            onChange={(e) => handleAnswerChange(e.target.value)}
                            className="w-full flex-1 bg-slate-950 border border-slate-850 rounded p-4 text-slate-200 font-mono text-xs outline-none focus:ring-1 focus:ring-blue-500/50 resize-none shadow-inner"
                            placeholder={isReadOnly ? "/* Candidate's response is empty */" : "/* Type your technical explanation here... */"}
                            disabled={isReadOnly}
                        />
                    </div>
                );
            default:
                return <div className="text-slate-450 font-mono text-xs">Unsupported question type</div>;
        }
    };

    const getDifficultyColor = (difficulty) => {
        switch (difficulty) {
            case 'EASY': return 'text-green-400 bg-green-400/10 border-green-500/20';
            case 'MEDIUM': return 'text-yellow-400 bg-yellow-400/10 border-yellow-500/20';
            case 'HARD': return 'text-rose-450 bg-rose-500/10 border-rose-500/20';
            default: return 'text-slate-400 bg-slate-400/10 border-slate-500/20';
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)]">
            {/* Header / Navigation Controls */}
            <div className="flex justify-between items-center mb-4 px-1 shrink-0">
                <div className="flex gap-2">
                    <Button
                        variant="secondary"
                        onClick={onPrevious}
                        disabled={isFirst}
                        className="text-xs py-1 px-3"
                    >
                        ← prev_question()
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={onNext}
                        disabled={isLast}
                        className="text-xs py-1 px-3"
                    >
                        next_question() →
                    </Button>
                </div>

                {/* Auto-save Status */}
                <div className="text-[10px] font-mono font-medium uppercase tracking-wider">
                    {saveStatus === 'saved' && <span className="text-slate-550">status: saved</span>}
                    {saveStatus === 'saving' && <span className="text-blue-400 animate-pulse">status: saving...</span>}
                    {saveStatus === 'unsaved' && <span className="text-amber-500">status: unsaved_changes</span>}
                    {saveStatus === 'error' && <span className="text-rose-500 font-bold">status: save_failed</span>}
                </div>

                <div className="flex items-center gap-2 select-none">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getDifficultyColor(question.difficulty)}`}>
                        {question.difficulty}
                    </span>
                    <span className="text-slate-500 text-xs font-mono">
                        {question.type}
                    </span>
                </div>
            </div>

            <div className="flex-1 flex flex-row min-h-0 gap-1 select-none">
                {/* Left Panel: Question Details */}
                <div 
                    style={{ width: `${leftWidth}%` }} 
                    className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-lg p-6 overflow-y-auto flex flex-col shadow-inner relative"
                >
                    <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-blue-500/10 to-indigo-500/10"></div>
                    <h2 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-850 pb-2">// readme.md</h2>
                    <div className="prose prose-invert max-w-none text-slate-300 font-sans text-sm leading-relaxed">
                        <p className="whitespace-pre-wrap">{question.text}</p>
                    </div>

                    {question.testCases && question.testCases.length > 0 && (
                        <div className="mt-8 border-t border-slate-850 pt-4">
                            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-3">// example_test_cases.json</h3>
                            <div className="space-y-3">
                                {question.testCases.map((tc, idx) => (
                                    <div key={idx} className="bg-slate-950 border border-slate-850 rounded p-4 font-mono text-xs text-slate-350 space-y-1.5 shadow-inner">
                                        <div><span className="text-slate-500">test_case[{idx}]:</span></div>
                                        <div className="pl-3"><span className="text-slate-500">const</span> stdin = <span className="text-blue-400">"{tc.input}"</span>;</div>
                                        <div className="pl-3"><span className="text-slate-500">const</span> expected = <span className="text-emerald-450">"{tc.output}"</span>;</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Draggable Divider */}
                <div
                    className="w-1.5 cursor-col-resize bg-slate-950 hover:bg-blue-500 active:bg-blue-600 transition-colors shrink-0 flex items-center justify-center group"
                    onMouseDown={handleHorizontalMouseDown}
                    title="Drag to resize panels"
                >
                    <div className="w-0.5 h-8 bg-slate-800 group-hover:bg-white rounded transition-colors" />
                </div>

                {/* Right Panel: Editor / Interaction */}
                <div 
                    style={{ width: `${100 - leftWidth}%` }} 
                    className="min-h-0 flex flex-col"
                >
                    {renderRightPanel()}
                </div>
            </div>
        </div>
    );
};

export default QuestionRunner;

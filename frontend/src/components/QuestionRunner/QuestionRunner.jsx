import React, { useState, useEffect, useCallback } from 'react';
import CodeEditor from './CodeEditor';
import Button from '../ui/Button';
import { interviewService } from '../../services/api'; // Adjust path if needed

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

const QuestionRunner = ({ questionAssignment, interviewId, onNext, onPrevious, isLast, isFirst }) => {
    const question = questionAssignment?.question;

    // Initial state from backend (candidateAnswer)
    const [answer, setAnswer] = useState(questionAssignment?.candidateAnswer || '');
    const [saveStatus, setSaveStatus] = useState('saved'); // saved, saving, error

    const debouncedAnswer = useDebounce(answer, 2000); // Auto-save after 2s of inactivity

    // Update local state when switching questions
    useEffect(() => {
        setAnswer(questionAssignment?.candidateAnswer || '');
        setSaveStatus('saved');
    }, [questionAssignment]);

    // Auto-save effect
    useEffect(() => {
        if (debouncedAnswer !== (questionAssignment?.candidateAnswer || '') && debouncedAnswer !== '') {
            saveAnswerToBackend(debouncedAnswer);
        }
    }, [debouncedAnswer]);

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

    if (!question) return <div className="text-center text-slate-400 p-8">No question selected.</div>;

    const renderRightPanel = () => {
        switch (question.type) {
            case 'CODE':
                return <CodeEditor value={answer} onChange={handleAnswerChange} />;
            case 'MCQ':
                return (
                    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 h-full">
                        <h3 className="text-lg font-medium text-white mb-4">Select the correct answer:</h3>
                        <div className="space-y-3">
                            {question.options && question.options.map((option, idx) => (
                                <label key={idx} className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer border transition-all ${answer === option ? 'bg-blue-500/20 border-blue-500' : 'bg-slate-700/50 hover:bg-slate-700 border-transparent hover:border-blue-500/50'}`}>
                                    <input
                                        type="radio"
                                        name={`mcq-option-${question.id}`} // Unique name per question
                                        value={option}
                                        checked={answer === option}
                                        onChange={(e) => handleAnswerChange(e.target.value)}
                                        className="w-4 h-4 text-blue-500"
                                    />
                                    <span className="text-slate-300">{option}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                );
            case 'SCENARIO':
                return (
                    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 h-full">
                        <h3 className="text-lg font-medium text-white mb-4">Your Response:</h3>
                        <textarea
                            value={answer}
                            onChange={(e) => handleAnswerChange(e.target.value)}
                            className="w-full h-full min-h-[300px] bg-slate-900 border border-slate-600 rounded-lg p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Type your answer here..."
                        />
                    </div>
                );
            default:
                return <div className="text-slate-400">Unsupported question type</div>;
        }
    };

    const getDifficultyColor = (difficulty) => {
        switch (difficulty) {
            case 'EASY': return 'text-green-400 bg-green-400/10';
            case 'MEDIUM': return 'text-yellow-400 bg-yellow-400/10';
            case 'HARD': return 'text-red-400 bg-red-400/10';
            default: return 'text-slate-400 bg-slate-400/10';
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-100px)]">
            {/* Header / Navigation Controls */}
            <div className="flex justify-between items-center mb-4 px-1">
                <div className="flex gap-2">
                    <Button
                        variant="secondary"
                        onClick={onPrevious}
                        disabled={isFirst}
                        className="text-sm py-1"
                    >
                        ← Previous
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={onNext}
                        disabled={isLast}
                        className="text-sm py-1"
                    >
                        Next →
                    </Button>
                </div>

                {/* Auto-save Status */}
                <div className="text-xs font-medium uppercase tracking-wider">
                    {saveStatus === 'saved' && <span className="text-slate-500">Saved</span>}
                    {saveStatus === 'saving' && <span className="text-blue-400 animate-pulse">Saving...</span>}
                    {saveStatus === 'unsaved' && <span className="text-yellow-500">Unsaved changes</span>}
                    {saveStatus === 'error' && <span className="text-red-500">Save Failed</span>}
                </div>

                <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getDifficultyColor(question.difficulty)}`}>
                        {question.difficulty}
                    </span>
                    <span className="text-slate-400 text-sm font-mono">
                        {question.type}
                    </span>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
                {/* Left Panel: Question Details */}
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 overflow-y-auto">
                    <h2 className="text-xl font-bold text-white mb-4">Problem Description</h2>
                    <div className="prose prose-invert max-w-none text-slate-300">
                        <p className="whitespace-pre-wrap">{question.text}</p>
                    </div>

                    {question.testCases && question.testCases.length > 0 && (
                        <div className="mt-8">
                            <h3 className="text-md font-semibold text-white mb-3">Example Test Cases</h3>
                            <div className="space-y-3">
                                {question.testCases.map((tc, idx) => (
                                    <div key={idx} className="bg-slate-900/50 rounded-lg p-3 border border-slate-700 font-mono text-sm">
                                        <div className="mb-1"><span className="text-slate-500">Input:</span> <span className="text-indigo-300">{tc.input}</span></div>
                                        <div><span className="text-slate-500">Output:</span> <span className="text-emerald-300">{tc.output}</span></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Panel: Editor / Interaction */}
                <div className="min-h-0 flex flex-col">
                    {renderRightPanel()}
                </div>
            </div>
        </div>
    );
};

export default QuestionRunner;

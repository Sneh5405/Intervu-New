import React, { useState, useEffect } from 'react';
import { questionService } from '../services/api';
import Button from './ui/Button';

const AddQuestionModal = ({ isOpen, onClose, onAdd }) => {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchQuestions();
        }
    }, [isOpen]);

    const fetchQuestions = async () => {
        setLoading(true);
        try {
            const response = await questionService.getAll({
                search: searchTerm,
                limit: 20
            });
            setQuestions(response.data.questions);
        } catch (error) {
            console.error("Failed to fetch questions", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchQuestions();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-slate-800 rounded-xl shadow-2xl border border-slate-700 w-full max-w-2xl max-h-[80vh] flex flex-col">
                <div className="p-6 border-b border-slate-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Add Question to Interview</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
                </div>

                <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <input
                            type="text"
                            className="bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white w-full focus:outline-none focus:border-indigo-500"
                            placeholder="Search questions by text..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Button type="submit" variant="primary">Search</Button>
                    </form>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {loading ? (
                        <div className="text-center text-slate-400 py-8">Loading questions...</div>
                    ) : questions.length === 0 ? (
                        <div className="text-center text-slate-400 py-8">No questions found.</div>
                    ) : (
                        questions.map(q => (
                            <div key={q.id} className="flex items-center justify-between bg-slate-700/30 p-4 rounded-lg border border-slate-700 hover:border-indigo-500/50 transition-colors">
                                <div>
                                    <h3 className="text-white font-medium line-clamp-1">{q.text}</h3>
                                    <div className="flex gap-2 mt-1">
                                        <span className={`text-xs px-2 py-0.5 rounded ${q.difficulty === 'EASY' ? 'bg-green-500/20 text-green-400' :
                                                q.difficulty === 'HARD' ? 'bg-red-500/20 text-red-400' :
                                                    'bg-yellow-500/20 text-yellow-400'
                                            }`}>{q.difficulty}</span>
                                        <span className="text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded">{q.type}</span>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => onAdd(q.id)}
                                >
                                    Add
                                </Button>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 border-t border-slate-700 flex justify-end">
                    <Button variant="ghost" onClick={onClose}>Close</Button>
                </div>
            </div>
        </div>
    );
};

export default AddQuestionModal;

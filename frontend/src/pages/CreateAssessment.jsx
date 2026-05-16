import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const CreateAssessment = () => {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [duration, setDuration] = useState(60);
    const [startTime, setStartTime] = useState('');
    const [availableQuestions, setAvailableQuestions] = useState([]);
    const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchQuestions();
    }, []);

    const fetchQuestions = async () => {
        try {
            const response = await api.get('/questions');
            setAvailableQuestions(response.data.questions || []);
        } catch (error) {
            console.error(error);
        }
    };

    const toggleQuestion = (id) => {
        if (selectedQuestionIds.includes(id)) {
            setSelectedQuestionIds(selectedQuestionIds.filter(qId => qId !== id));
        } else {
            setSelectedQuestionIds([...selectedQuestionIds, id]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (selectedQuestionIds.length === 0) return alert("Select at least one question.");
        setLoading(true);
        try {
            const res = await api.post('/assessments', {
                title,
                description,
                duration: parseInt(duration),
                startTime: startTime || null
            });

            await api.post(`/assessments/${res.data.id}/questions`, {
                questionIds: selectedQuestionIds
            });

            navigate('/assessments');
        } catch (error) {
            console.error(error);
            alert("Failed to create assessment");
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8 text-indigo-400">Create Online Assessment</h1>
            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Details Section */}
                <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-lg">
                    <h2 className="text-xl font-bold mb-6 text-white border-b border-slate-700 pb-3">1. Assessment Details</h2>
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-300 mb-2">Assessment Title</label>
                            <input required value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" placeholder="e.g. Senior Backend Engineer - Node.js" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-300 mb-2">Instructions / Description</label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)} rows="3" className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" placeholder="Instructions for the candidates..."></textarea>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Duration (Minutes)</label>
                            <input type="number" required value={duration} onChange={e => setDuration(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" min="10" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Start Time (Optional)</label>
                            <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
                        </div>
                    </div>
                </div>

                {/* Questions Section */}
                <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-lg">
                    <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-3">
                        <h2 className="text-xl font-bold text-white">2. Select Questions</h2>
                        <span className="bg-indigo-600/20 text-indigo-400 px-3 py-1 rounded-full text-sm font-bold border border-indigo-500/30">
                            {selectedQuestionIds.length} Selected
                        </span>
                    </div>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {availableQuestions.map(q => (
                            <div key={q.id} onClick={() => toggleQuestion(q.id)} className={`p-5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-4 ${selectedQuestionIds.includes(q.id) ? 'bg-indigo-600/10 border-indigo-500 shadow-sm shadow-indigo-500/20' : 'bg-slate-900/50 border-slate-700 hover:border-slate-500'}`}>
                                <div className="mt-1">
                                    <input type="checkbox" checked={selectedQuestionIds.includes(q.id)} readOnly className="w-5 h-5 rounded border-slate-500 text-indigo-600 bg-slate-900 focus:ring-indigo-500 focus:ring-offset-slate-900" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-semibold text-slate-200 text-lg leading-tight">{q.text}</h4>
                                    <div className="flex gap-2 mt-3">
                                        <span className="text-xs font-mono font-bold bg-slate-800 border border-slate-600 text-slate-300 px-2.5 py-1 rounded-md">{q.type}</span>
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${q.difficulty === 'EASY' ? 'bg-green-500/10 text-green-400 border-green-500/20' : q.difficulty === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{q.difficulty}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {availableQuestions.length === 0 && (
                            <div className="text-center p-8 border border-dashed border-slate-600 rounded-xl bg-slate-900/50 text-slate-400">
                                No questions available in the bank. Go to Questions to create some.
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t border-slate-700">
                    <button type="button" onClick={() => navigate('/assessments')} className="px-6 py-3 rounded-lg font-medium bg-slate-800 border border-slate-600 hover:bg-slate-700 transition-colors">Cancel</button>
                    <button type="submit" disabled={loading} className="px-8 py-3 rounded-lg font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-50">
                        {loading ? 'Creating...' : 'Launch Assessment'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateAssessment;

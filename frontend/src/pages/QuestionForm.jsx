import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { questionService } from '../services/api';
import Button from '../components/ui/Button';

const QuestionForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = !!id;

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        text: '',
        type: 'MCQ',
        difficulty: 'MEDIUM',
        tags: '', // comma separated string for input
        options: [], // For MCQ: array of strings
        correctAnswer: '',
        testCases: [] // For CODE: array of objects {input, output}
    });

    useEffect(() => {
        if (isEdit) {
            const fetchQuestion = async () => {
                try {
                    const response = await questionService.getById(id);
                    const q = response.data;
                    setFormData({
                        text: q.text,
                        type: q.type,
                        difficulty: q.difficulty,
                        tags: q.tags ? q.tags.join(', ') : '',
                        options: q.options || [],
                        correctAnswer: q.correctAnswer || '',
                        testCases: q.testCases || []
                    });
                } catch (error) {
                    console.error("Failed to fetch question details", error);
                    // navigate('/questions');
                }
            };
            fetchQuestion();
        }
    }, [id, isEdit, navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // MCQ Options handlers
    const handleOptionChange = (index, value) => {
        const newOptions = [...formData.options];
        newOptions[index] = value;
        setFormData(prev => ({ ...prev, options: newOptions }));
    };

    const addOption = () => {
        setFormData(prev => ({ ...prev, options: [...prev.options, ''] }));
    };

    const removeOption = (index) => {
        const newOptions = formData.options.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, options: newOptions }));
    };

    // Code Test Cases handlers
    const handleTestCaseChange = (index, field, value) => {
        const newTestCases = [...formData.testCases];
        newTestCases[index] = { ...newTestCases[index], [field]: value };
        setFormData(prev => ({ ...prev, testCases: newTestCases }));
    };

    const addTestCase = () => {
        setFormData(prev => ({ ...prev, testCases: [...prev.testCases, { input: '', output: '' }] }));
    };

    const removeTestCase = (index) => {
        const newTestCases = formData.testCases.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, testCases: newTestCases }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                ...formData,
                tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
            };

            if (isEdit) {
                await questionService.update(id, payload);
            } else {
                await questionService.create(payload);
            }
            navigate('/questions');
        } catch (error) {
            console.error("Failed to save question", error);
            alert("Failed to save question");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
            <h1 className="text-3xl font-bold text-white mb-8">
                {isEdit ? 'Edit Question' : 'Create New Question'}
            </h1>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Basic Info */}
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 space-y-4">
                    <h2 className="text-xl font-semibold text-white mb-4">Basic Information</h2>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Question Text</label>
                        <textarea
                            name="text"
                            required
                            value={formData.text}
                            onChange={handleChange}
                            rows={3}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Type</label>
                            <select
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="MCQ">Multiple Choice</option>
                                <option value="SCENARIO">Scenario Based</option>
                                <option value="CODE">Coding Problem</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Difficulty</label>
                            <select
                                name="difficulty"
                                value={formData.difficulty}
                                onChange={handleChange}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="EASY">Easy</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HARD">Hard</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Tags (comma separated)</label>
                        <input
                            type="text"
                            name="tags"
                            value={formData.tags}
                            onChange={handleChange}
                            placeholder="javascript, react, backend"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* Type Specific Fields */}
                {formData.type === 'MCQ' && (
                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 space-y-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-white">Options</h2>
                            <Button type="button" variant="ghost" onClick={addOption} className="text-sm">
                                + Add Option
                            </Button>
                        </div>

                        {formData.options.map((option, index) => (
                            <div key={index} className="flex gap-2">
                                <input
                                    type="text"
                                    value={option}
                                    onChange={(e) => handleOptionChange(index, e.target.value)}
                                    placeholder={`Option ${index + 1}`}
                                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <Button type="button" variant="ghost" onClick={() => removeOption(index)} className="text-red-400 hover:text-red-300">
                                    ✕
                                </Button>
                            </div>
                        ))}

                        <div className="mt-4">
                            <label className="block text-sm font-medium text-slate-300 mb-2">Correct Answer (Exact Match)</label>
                            <input
                                type="text"
                                name="correctAnswer"
                                value={formData.correctAnswer}
                                onChange={handleChange}
                                placeholder="Enter the text of the correct option"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                )}

                {formData.type === 'CODE' && (
                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 space-y-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-white">Test Cases</h2>
                            <Button type="button" variant="ghost" onClick={addTestCase} className="text-sm">
                                + Add Test Case
                            </Button>
                        </div>

                        {formData.testCases.map((testCase, index) => (
                            <div key={index} className="space-y-2 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-slate-400">Case {index + 1}</span>
                                    <Button type="button" variant="ghost" onClick={() => removeTestCase(index)} className="text-red-400 hover:text-red-300 p-1 h-auto text-xs">
                                        Delete
                                    </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="text"
                                        value={testCase.input}
                                        onChange={(e) => handleTestCaseChange(index, 'input', e.target.value)}
                                        placeholder="Input"
                                        className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <input
                                        type="text"
                                        value={testCase.output}
                                        onChange={(e) => handleTestCaseChange(index, 'output', e.target.value)}
                                        placeholder="Expected Output"
                                        className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex justify-end gap-4 pt-4">
                    <Button type="button" variant="secondary" onClick={() => navigate('/questions')}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? 'Saving...' : 'Save Question'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default QuestionForm;

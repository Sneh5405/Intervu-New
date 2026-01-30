import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { questionService } from '../services/api';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

const Questions = () => {
    const { user } = useAuth();
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        search: '',
        difficulty: '',
        type: '',
        page: 1
    });
    const [totalPages, setTotalPages] = useState(1);

    const fetchQuestions = async () => {
        setLoading(true);
        try {
            const response = await questionService.getAll(filters);
            setQuestions(response.data.questions);
            setTotalPages(response.data.totalPages);
        } catch (error) {
            console.error("Failed to fetch questions", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuestions();
    }, [filters.page, filters.difficulty, filters.type]);

    const handleSearch = (e) => {
        e.preventDefault();
        setFilters(prev => ({ ...prev, page: 1 }));
        fetchQuestions();
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this question?")) {
            try {
                await questionService.delete(id);
                fetchQuestions();
            } catch (error) {
                console.error("Failed to delete question", error);
            }
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Question Bank</h1>
                    <p className="text-slate-400">Manage your interview questions library</p>
                </div>
                {(user.role === 'HR' || user.role === 'INTERVIEWER') && (
                    <Link to="/questions/create">
                        <Button>Add New Question</Button>
                    </Link>
                )}
            </div>

            {/* Filters */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4 mb-8">
                <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="col-span-1 md:col-span-2">
                        <input
                            type="text"
                            name="search"
                            placeholder="Search questions..."
                            value={filters.search}
                            onChange={handleFilterChange}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <select
                        name="difficulty"
                        value={filters.difficulty}
                        onChange={handleFilterChange}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Difficulties</option>
                        <option value="EASY">Easy</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HARD">Hard</option>
                    </select>
                    <select
                        name="type"
                        value={filters.type}
                        onChange={handleFilterChange}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Types</option>
                        <option value="MCQ">MCQ</option>
                        <option value="SCENARIO">Scenario</option>
                        <option value="CODE">Code</option>
                    </select>
                </form>
            </div>

            {/* Questions List */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                </div>
            ) : (
                <div className="space-y-4">
                    {questions.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            No questions found. Try adjusting your filters.
                        </div>
                    ) : (
                        questions.map((question) => (
                            <div key={question.id} className="bg-slate-800/40 rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-colors">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
                                                {question.difficulty}
                                            </span>
                                            <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/10 text-blue-400">
                                                {question.type}
                                            </span>
                                            {question.tags && question.tags.map((tag, idx) => (
                                                <span key={idx} className="px-2 py-1 rounded text-xs font-medium bg-slate-700 text-slate-300">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                        <h3 className="text-lg font-medium text-white mb-2">{question.text}</h3>
                                        <div className="text-sm text-slate-400">
                                            Created by {question.createdBy?.name || 'Unknown'}
                                        </div>
                                    </div>

                                    {(user.role === 'HR' || user.role === 'INTERVIEWER') && (
                                        <div className="flex gap-2">
                                            <Link to={`/questions/${question.id}/edit`}>
                                                <Button variant="ghost" className="p-2 h-auto text-sm">Edit</Button>
                                            </Link>
                                            <Button
                                                variant="ghost"
                                                className="p-2 h-auto text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                                onClick={() => handleDelete(question.id)}
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                    <Button
                        variant="secondary"
                        disabled={filters.page === 1}
                        onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                    >
                        Previous
                    </Button>
                    <span className="text-slate-400">
                        Page {filters.page} of {totalPages}
                    </span>
                    <Button
                        variant="secondary"
                        disabled={filters.page === totalPages}
                        onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    );
};

export default Questions;

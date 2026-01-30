import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { interviewService } from '../services/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const CreateInterview = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [interviewers, setInterviewers] = useState([]);
    const [interviewees, setInterviewees] = useState([]);

    const [formData, setFormData] = useState({
        startTime: '',
        duration: 60, // minutes
        interviewerId: '',
        intervieweeId: '',
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            // Using admin endpoint to get all users
            const response = await api.get('/admin/users');
            const users = response.data;
            setInterviewers(users.filter(u => u.role === 'INTERVIEWER' && u.status === 'ACTIVE'));
            setInterviewees(users.filter(u => u.role === 'INTERVIEWEE' && u.status === 'ACTIVE'));
        } catch (error) {
            console.error("Failed to fetch users", error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const start = new Date(formData.startTime);
            const end = new Date(start.getTime() + formData.duration * 60000);

            await interviewService.create({
                startTime: start.toISOString(),
                endTime: end.toISOString(),
                hrId: JSON.parse(localStorage.getItem('user')).id, // Current HR
                interviewerId: parseInt(formData.interviewerId),
                intervieweeId: parseInt(formData.intervieweeId),
                type: 'TECHNICAL' // Hardcoded for now as schema doesn't strictly enforce generic type
            });

            navigate('/interviews');
        } catch (error) {
            console.error("Create failed", error);
            alert("Failed to create interview. Check console.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-2xl">
            <h1 className="text-3xl font-bold mb-6 text-indigo-400">Schedule Interview</h1>

            <form onSubmit={handleSubmit} className="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Start Time</label>
                    <Input
                        type="datetime-local"
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        required
                        className="w-full bg-slate-900 border-slate-700 text-white"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Duration (minutes)</label>
                    <Input
                        type="number"
                        value={formData.duration}
                        onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                        min="15"
                        step="15"
                        required
                        className="w-full bg-slate-900 border-slate-700 text-white"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Interviewer</label>
                    <select
                        className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        value={formData.interviewerId}
                        onChange={(e) => setFormData({ ...formData, interviewerId: e.target.value })}
                        required
                    >
                        <option value="">Select Interviewer</option>
                        {interviewers.map(u => (
                            <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Candidate</label>
                    <select
                        className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        value={formData.intervieweeId}
                        onChange={(e) => setFormData({ ...formData, intervieweeId: e.target.value })}
                        required
                    >
                        <option value="">Select Candidate</option>
                        {interviewees.map(u => (
                            <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                        ))}
                    </select>
                </div>

                <div className="flex gap-4 pt-4">
                    <Button type="button" variant="ghost" onClick={() => navigate('/interviews')} className="w-full">
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" loading={loading} className="w-full">
                        Schedule
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default CreateInterview;

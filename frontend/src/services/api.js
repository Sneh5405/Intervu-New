import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    withCredentials: true,
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        // ... handled in AuthContext but global handler here if needed
        return Promise.reject(error);
    }
);

export const interviewService = {
    getAll: () => api.get('/interviews'),
    getById: (id, inSession = false) => api.get(`/interviews/${id}${inSession ? '?inSession=true' : ''}`),
    create: (data) => api.post('/interviews', data),
    update: (id, data) => api.patch(`/interviews/${id}`, data),
    delete: (id) => api.delete(`/interviews/${id}`),
    saveAnswer: (id, data) => api.post(`/interviews/${id}/answer`, data),
    addQuestion: (id, data) => api.post(`/interviews/${id}/questions`, data),
    nextRound: (id, data) => api.post(`/interviews/${id}/next-round`, data),
    accept: (id) => api.post(`/interviews/${id}/accept`),
};

export const questionService = {
    getAll: (params) => api.get('/questions', { params }),
    getById: (id) => api.get(`/questions/${id}`),
    create: (data) => api.post('/questions', data),
    update: (id, data) => api.put(`/questions/${id}`, data),
    delete: (id) => api.delete(`/questions/${id}`),
};

export const submissionService = {
    submit: (data) => api.post('/submissions', data),
    submitBatch: (data) => api.post('/submissions/batch', data),
    poll: (id) => api.get(`/submissions/${id}`),
};

export default api;

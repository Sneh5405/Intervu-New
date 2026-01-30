import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3000/api',
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
    getById: (id) => api.get(`/interviews/${id}`),
    create: (data) => api.post('/interviews', data),
    update: (id, data) => api.patch(`/interviews/${id}`, data),
    delete: (id) => api.delete(`/interviews/${id}`),
    saveAnswer: (id, data) => api.post(`/interviews/${id}/answer`, data),
    nextRound: (id, data) => api.post(`/interviews/${id}/next-round`, data),
};

export const questionService = {
    getAll: (params) => api.get('/questions', { params }),
    getById: (id) => api.get(`/questions/${id}`),
    create: (data) => api.post('/questions', data),
    update: (id, data) => api.put(`/questions/${id}`, data),
    delete: (id) => api.delete(`/questions/${id}`),
};

export default api;

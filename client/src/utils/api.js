import axios from 'axios';

// API base URL - configured via environment variable for Railway deployment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Create axios instance with default config
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 10000
});

// Request interceptor for auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Handle unauthorized - redirect to login
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// ======================
// Workers API
// ======================
export const workersApi = {
    getAll: (includeArchived = false) => api.get('/workers', { params: { includeArchived } }),
    getById: (id) => api.get(`/workers/${id}`),
    create: (data) => api.post('/workers', data),
    update: (id, data) => api.put(`/workers/${id}`, data),
    archive: (id) => api.patch(`/workers/${id}/archive`),
    restore: (id) => api.patch(`/workers/${id}/restore`),
    delete: (id) => api.delete(`/workers/${id}`)
};

// ======================
// Devices API
// ======================
export const devicesApi = {
    getAll: (includeArchived = false) => api.get('/devices', { params: { includeArchived } }),
    getById: (id) => api.get(`/devices/${id}`),
    create: (data) => api.post('/devices', data),
    update: (id, data) => api.put(`/devices/${id}`, data),
    assign: (id, workerId) => api.post(`/devices/${id}/assign`, { workerId }),
    archive: (id) => api.patch(`/devices/${id}/archive`),
    restore: (id) => api.patch(`/devices/${id}/restore`),
    delete: (id) => api.delete(`/devices/${id}`)
};

// ======================
// Sensors API
// ======================
export const sensorsApi = {
    getLatest: (deviceId) => api.get(`/sensors/latest/${deviceId}`),
    getHistory: (deviceId, limit = 100) => api.get(`/sensors/history/${deviceId}`, { params: { limit } }),
    sendNudge: (deviceId, message = '', sentBy = 'Safety Officer') => api.post(`/sensors/nudge/${deviceId}`, { message, sentBy })
};

// ======================
// Alerts API
// ======================
export const alertsApi = {
    getAll: (params = {}) => api.get('/alerts', { params }),
    getById: (id) => api.get(`/alerts/${id}`),
    getActive: () => api.get('/alerts/active'),
    // Acknowledge now accepts optional notes for quick notes feature
    acknowledge: (id, acknowledgedBy, notes = null) => api.post(`/alerts/${id}/acknowledge`, { acknowledgedBy, notes }),
    batchAcknowledge: (alertIds, acknowledgedBy, notes = null) => api.post('/alerts/batch-acknowledge', { alertIds, acknowledgedBy, notes }),
    assign: (id, assignedTo) => api.post(`/alerts/${id}/assign`, { assignedTo }),
    resolve: (id, notes) => api.post(`/alerts/${id}/resolve`, { notes }),
    updateNotes: (id, notes) => api.patch(`/alerts/${id}/notes`, { notes }),
    archive: (id) => api.patch(`/alerts/${id}/archive`)
};

// ======================
// Incidents API
// ======================
export const incidentsApi = {
    getAll: (params = {}) => api.get('/incidents', { params }),
    getById: (id) => api.get(`/incidents/${id}`),
    create: (data) => api.post('/incidents', data),
    update: (id, data) => api.put(`/incidents/${id}`, data),
    resolve: (id, resolution) => api.post(`/incidents/${id}/resolve`, { resolution }),
    close: (id, resolution) => api.post(`/incidents/${id}/close`, { resolution }),
    addNote: (id, note, addedBy) => api.post(`/incidents/${id}/note`, { note, addedBy }),
    addAction: (id, action, performedBy) => api.post(`/incidents/${id}/action`, { action, performedBy }),
    updateWorkerStatus: (id, workerStatus) => api.patch(`/incidents/${id}/worker-status`, { workerStatus }),
    archive: (id) => api.patch(`/incidents/${id}/archive`),
    delete: (id) => api.delete(`/incidents/${id}`)
};

// ======================
// Emergency Contacts API
// ======================
export const contactsApi = {
    getAll: (includeArchived = false) => api.get('/contacts', { params: { includeArchived } }),
    getById: (id) => api.get(`/contacts/${id}`),
    create: (data) => api.post('/contacts', data),
    update: (id, data) => api.put(`/contacts/${id}`, data),
    archive: (id) => api.patch(`/contacts/${id}/archive`),
    delete: (id) => api.delete(`/contacts/${id}`)
};

// ======================
// Auth API
// ======================
export const authApi = {
    login: (email, password) => api.post('/auth/login', { email, password }),
    validate: () => api.get('/auth/validate'),
    me: () => api.get('/auth/me'),
    changePassword: (currentPassword, newPassword) => api.post('/auth/change-password', { currentPassword, newPassword })
};

// ======================
// Users API (Admin only)
// ======================
export const usersApi = {
    getAll: () => api.get('/users'),
    getById: (id) => api.get(`/users/${id}`),
    create: (data) => api.post('/users', data),
    update: (id, data) => api.put(`/users/${id}`, data),
    resetPassword: (id, newPassword) => api.post(`/users/${id}/reset-password`, { newPassword }),
    delete: (id) => api.delete(`/users/${id}`)
};

// ======================
// Reports API
// ======================
export const reportsApi = {
    getWorkerSafety: (startDate, endDate) => api.get('/reports/worker-safety', { params: { startDate, endDate } }),
    getDevicePerformance: (startDate, endDate) => api.get('/reports/device-performance', { params: { startDate, endDate } }),
    getAlertAnalytics: (startDate, endDate) => api.get('/reports/alert-analytics', { params: { startDate, endDate } }),
    getCompliance: (startDate, endDate) => api.get('/reports/compliance', { params: { startDate, endDate } })
};

export default api;



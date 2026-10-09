import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('fraudguard_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if expired/invalid
      localStorage.removeItem('fraudguard_token');
      localStorage.removeItem('fraudguard_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  getMe: () => api.get('/auth/me'),
  getUsers: () => api.get('/auth/users'),
};

export const dashboardAPI = {
  getSummary: () => api.get('/dashboard/summary'),
  getTrends: () => api.get('/dashboard/trends'),
  getRiskDistribution: () => api.get('/dashboard/risk-distribution'),
  getFraudTypes: () => api.get('/dashboard/fraud-types'),
  getTopProviders: () => api.get('/dashboard/top-providers'),
  getAmountVsRisk: () => api.get('/dashboard/amount-vs-risk'),
  getFinancialExposure: () => api.get('/dashboard/financial-exposure'),
};

export const claimsAPI = {
  getClaims: (params) => api.get('/claims', { params }),
  getClaim: (id) => api.get(`/claims/${id}`),
  createClaim: (data) => api.post('/claims', data),
  updateClaim: (id, data) => api.put(`/claims/${id}`, data),
  deleteClaim: (id) => api.delete(`/claims/${id}`),
};

export const fraudAPI = {
  analyzeClaim: (id) => api.post(`/fraud/analyze/${id}`),
  getFraudDetails: (id) => api.get(`/fraud/${id}`),
  getRules: () => api.get('/fraud/rules'),
  updateRule: (code, data) => api.put(`/fraud/rules/${code}`, data),
};

export const reviewQueueAPI = {
  getQueue: (params) => api.get('/review-queue', { params }),
  updateAction: (id, data) => api.put(`/review-queue/${id}`, data),
};

export const investigationsAPI = {
  getInvestigations: (params) => api.get('/investigations', { params }),
  getInvestigation: (id) => api.get(`/investigations/${id}`),
  createInvestigation: (data) => api.post('/investigations', data),
  updateInvestigation: (id, data) => api.put(`/investigations/${id}`, data),
  addNote: (id, data) => api.post(`/investigations/${id}/notes`, data),
  addEvidence: (id, data) => api.post(`/investigations/${id}/evidence`, data),
};

export const providersAPI = {
  getProviders: (params) => api.get('/providers', { params }),
  getProvider: (id) => api.get(`/providers/${id}`),
};

export const patientsAPI = {
  getPatients: (params) => api.get('/patients', { params }),
  getPatient: (id) => api.get(`/patients/${id}`),
};

export const reportsAPI = {
  getFraudSummary: () => api.get('/reports/fraud-summary'),
  getProviderRisk: () => api.get('/reports/provider-risk'),
  getFinancialExposure: () => api.get('/reports/financial-exposure'),
  getRulePerformance: () => api.get('/reports/rule-performance'),
  exportCSV: (type) => `${API_BASE_URL}/reports/export/csv?report_type=${type}`,
  downloadCSV: (type) => api.get(`/reports/export/csv?report_type=${type}`, { responseType: 'blob' }),
};

export const auditLogsAPI = {
  getLogs: (params) => api.get('/audit-logs', { params }),
};

export const notificationsAPI = {
  getNotifications: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

export const demoAPI = {
  getStatus: () => api.get('/demo/status'),
  generate: (claimsCount, seed = 42) => api.post('/demo/generate', { claims_count: claimsCount, seed }),
  reset: () => api.post('/demo/reset'),
};

export const assistantAPI = {
  query: (query, claimId = null, invId = null) =>
    api.post('/assistant/query', {
      question: query,
      query,
      claim_id: claimId,
      investigation_id: invId
    }),
};

export default api;

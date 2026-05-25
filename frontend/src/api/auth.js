import apiClient from './client';

export const authAPI = {
  register: async (data) => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  login: async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },

  verifyOTP: async (userId, otp, purpose) => {
    const response = await apiClient.post('/auth/verify-otp', { userId, otp, purpose });
    return response.data;
  },

  verifyTOTP: async (userId, token) => {
    const response = await apiClient.post('/auth/verify-totp', { userId, token });
    return response.data;
  },

  resendOTP: async (userId, purpose) => {
    const response = await apiClient.post('/auth/resend-otp', { userId, purpose });
    return response.data;
  },

  requestPasswordReset: async (email) => {
    const response = await apiClient.post('/auth/request-password-reset', { email });
    return response.data;
  },

  resetPassword: async (userId, otp, newPassword) => {
    const response = await apiClient.post('/auth/reset-password', { userId, otp, newPassword });
    return response.data;
  },

  listUsers: async (params) => {
    const response = await apiClient.get('/auth/users', { params });
    return response.data;
  },

  updateUserRole: async (userId, role) => {
    const response = await apiClient.patch(`/auth/users/${userId}/role`, { role });
    return response.data;
  },

  updateUserStatus: async (userId, isActive) => {
    const response = await apiClient.patch(`/auth/users/${userId}/status`, { isActive });
    return response.data;
  },

  deleteUser: async (userId) => {
    const response = await apiClient.delete(`/auth/users/${userId}`);
    return response.data;
  },
};

export const documentAPI = {
  getAll: async (params) => {
    const response = await apiClient.get('/documents', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`/documents/${id}`);
    return response.data;
  },

  create: async (data) => {
    const config = data instanceof FormData
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : undefined;
    const response = await apiClient.post('/documents', data, config);
    return response.data;
  },

  update: async (id, data) => {
    const response = await apiClient.put(`/documents/${id}`, data);
    return response.data;
  },

  reupload: async (id, formData) => {
    const response = await apiClient.post(`/documents/${id}/reupload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  updateStatus: async (id, data) => {
    const response = await apiClient.patch(`/documents/${id}/status`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/documents/${id}`);
    return response.data;
  },

  download: async (id) => {
    return apiClient.get(`/documents/${id}/download`, { responseType: 'blob' });
  },

  previewText: async (id) => {
    const response = await apiClient.get(`/documents/${id}/preview-text`);
    return response.data;
  },

  share: async (id, data) => {
    const response = await apiClient.post(`/documents/${id}/share`, data);
    return response.data;
  },

  getAccessLogs: async (id) => {
    const response = await apiClient.get(`/documents/${id}/access-logs`);
    return response.data;
  },

  bulkUpload: async (formData) => {
    const response = await apiClient.post('/documents/bulk/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  getVersions: async (id) => {
    const response = await apiClient.get(`/documents/${id}/versions`);
    return response.data;
  },

  compareVersions: async (id, v1, v2) => {
    const response = await apiClient.get(`/documents/${id}/versions/compare`, { params: { v1, v2 } });
    return response.data;
  },

  restoreVersion: async (id, versionId) => {
    const response = await apiClient.post(`/documents/${id}/versions/${versionId}/restore`);
    return response.data;
  },
};

export const analysisAPI = {
  getStats: async () => {
    const response = await apiClient.get('/analysis/stats/overview');
    return response.data;
  },

  analyzeDocument: async (documentId, data = {}) => {
    const response = await apiClient.post(`/analysis/${documentId}/analyze`, data);
    return response.data;
  },

  getInsights: async (documentId) => {
    const response = await apiClient.get(`/analysis/${documentId}/insights`);
    return response.data;
  },

  getStatus: async (documentId) => {
    const response = await apiClient.get(`/analysis/${documentId}/status`);
    return response.data;
  },

  bulkAnalyze: async (documentIds) => {
    const response = await apiClient.post('/analysis/bulk/analyze', { documentIds });
    return response.data;
  },

  getTrend: async (days = 30) => {
    const response = await apiClient.get('/analysis/trend/history', { params: { days } });
    return response.data;
  },
};

export const complianceAPI = {
  getPolicies: async (params) => {
    const response = await apiClient.get('/compliance/policies', { params });
    return response.data;
  },

  createPolicy: async (data) => {
    const response = await apiClient.post('/compliance/policies', data);
    return response.data;
  },

  updatePolicy: async (policyId, data) => {
    const response = await apiClient.put(`/compliance/policies/${policyId}`, data);
    return response.data;
  },

  checkDocument: async (payload) => {
    const response = await apiClient.post('/compliance/check', payload);
    return response.data;
  },

  bulkCheck: async (payload) => {
    const response = await apiClient.post('/compliance/check/bulk', payload);
    return response.data;
  },

  getReports: async (params) => {
    const response = await apiClient.get('/compliance/reports', { params });
    return response.data;
  },

  getViolation: async (violationId) => {
    const response = await apiClient.get(`/compliance/violations/${violationId}`);
    return response.data;
  },

  requestException: async (data) => {
    const response = await apiClient.post('/compliance/exceptions/request', data);
    return response.data;
  },
};

export const auditAPI = {
  generateReport: async (data) => {
    const response = await apiClient.post('/audits/reports', data);
    return response.data;
  },

  listReports: async (params) => {
    const response = await apiClient.get('/audits/reports', { params });
    return response.data;
  },

  getReport: async (reportId) => {
    const response = await apiClient.get(`/audits/reports/${reportId}`);
    return response.data;
  },

  exportReport: async (reportId, format = 'PDF') => {
    const response = await apiClient.get(`/audits/reports/${reportId}/export`, { params: { format } });
    return response.data;
  },

  scheduleReport: async (data) => {
    const response = await apiClient.post('/audits/reports/schedule', data);
    return response.data;
  },

  distributeReport: async (reportId, data) => {
    const response = await apiClient.post(`/audits/reports/${reportId}/distribute`, data);
    return response.data;
  },

  archiveReport: async (reportId) => {
    const response = await apiClient.post(`/audits/reports/${reportId}/archive`);
    return response.data;
  },
};

export const auditLogAPI = {
  getAll: async (params) => {
    const response = await apiClient.get('/audit-logs', { params });
    return response.data;
  },

  getActivity: async (params) => {
    const response = await apiClient.get('/audit-logs/activity', { params });
    return response.data;
  },

  getSecurityEvents: async () => {
    const response = await apiClient.get('/audit-logs/security/events');
    return response.data;
  },

  getAnomalies: async () => {
    const response = await apiClient.get('/audit-logs/anomalies');
    return response.data;
  },

  exportLog: async () => {
    const response = await apiClient.get('/audit-logs/export');
    return response.data;
  },
};

export const dashboardAPI = {
  getOverview: async () => {
    const response = await apiClient.get('/dashboard');
    return response.data;
  },

  getMetrics: async () => {
    const response = await apiClient.get('/dashboard/metrics');
    return response.data;
  },

  getNotifications: async () => {
    const response = await apiClient.get('/dashboard/notifications');
    return response.data;
  },

  getSystemHealth: async () => {
    const response = await apiClient.get('/dashboard/system-health');
    return response.data;
  },

  getAuditTrend: async (days = 7) => {
    const response = await apiClient.get('/dashboard/audit-trend', { params: { days } });
    return response.data;
  },

  getComplianceOverview: async () => {
    const response = await apiClient.get('/dashboard/compliance-overview');
    return response.data;
  },
};

export const workflowAPI = {
  getAll: async () => {
    const response = await apiClient.get('/workflows');
    return response.data;
  },

  create: async (data) => {
    const response = await apiClient.post('/workflows', data);
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`/workflows/${id}`);
    return response.data;
  },

  start: async (id) => {
    const response = await apiClient.post(`/workflows/${id}/start`);
    return response.data;
  },

  getTaskQueue: async () => {
    const response = await apiClient.get('/workflows/tasks/queue');
    return response.data;
  },

  completeTask: async (taskId) => {
    const response = await apiClient.post(`/workflows/tasks/${taskId}/complete`);
    return response.data;
  },

  reassignTask: async (taskId, data) => {
    const response = await apiClient.post(`/workflows/tasks/${taskId}/reassign`, data);
    return response.data;
  },
};

export const taskAPI = {
  getAll: async (params) => {
    const response = await apiClient.get('/tasks', { params });
    return response.data;
  },

  create: async (data) => {
    const response = await apiClient.post('/tasks', data);
    return response.data;
  },

  update: async (taskId, data) => {
    const response = await apiClient.put(`/tasks/${taskId}`, data);
    return response.data;
  },

  updateStatus: async (taskId, status) => {
    const response = await apiClient.patch(`/tasks/${taskId}/status`, { status });
    return response.data;
  },

  assign: async (taskId, userId) => {
    const response = await apiClient.patch(`/tasks/${taskId}/assign`, { userId });
    return response.data;
  },

  delete: async (taskId) => {
    const response = await apiClient.delete(`/tasks/${taskId}`);
    return response.data;
  },

  getOverview: async () => {
    const response = await apiClient.get('/tasks/overview');
    return response.data;
  },
};

export const searchAPI = {
  search: async (query, params) => {
    const response = await apiClient.post('/search/documents', { query, ...params });
    return response.data;
  },

  advanced: async (filters) => {
    const response = await apiClient.post('/search/advanced', filters);
    return response.data;
  },

  saveSearch: async (data) => {
    const response = await apiClient.post('/search/saved', data);
    return response.data;
  },

  getSaved: async () => {
    const response = await apiClient.get('/search/saved');
    return response.data;
  },

  getHistory: async () => {
    const response = await apiClient.get('/search/history');
    return response.data;
  },
};

export const retentionAPI = {
  getPolicies: async () => {
    const response = await apiClient.get('/retention/policies');
    return response.data;
  },

  createPolicy: async (data) => {
    const response = await apiClient.post('/retention/policies', data);
    return response.data;
  },

  getExpiring: async () => {
    const response = await apiClient.get('/retention/expiring');
    return response.data;
  },

  getArchived: async () => {
    const response = await apiClient.get('/retention/archived');
    return response.data;
  },

  archiveDocument: async (data) => {
    const response = await apiClient.post('/retention/archive', data);
    return response.data;
  },

  restore: async (documentId) => {
    const response = await apiClient.post(`/retention/restore/${documentId}`);
    return response.data;
  },

  setLegalHold: async (data) => {
    const response = await apiClient.post('/retention/legal-hold', data);
    return response.data;
  },
};

export const securityAPI = {
  getDocumentSecurity: async (documentId) => {
    const response = await apiClient.get(`/security/documents/${documentId}`);
    return response.data;
  },

  updateClassification: async (documentId, level) => {
    const response = await apiClient.patch(`/security/documents/${documentId}/classification`, { classificationLevel: level });
    return response.data;
  },

  updatePermissions: async (documentId, permissions) => {
    const response = await apiClient.patch(`/security/documents/${documentId}/permissions`, permissions);
    return response.data;
  },

  getAuditTrail: async (documentId) => {
    const response = await apiClient.get(`/security/documents/${documentId}/trail`);
    return response.data;
  },
};

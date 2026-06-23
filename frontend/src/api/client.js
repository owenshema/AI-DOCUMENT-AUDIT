import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests; strip JSON Content-Type for multipart uploads
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.data instanceof FormData) {
      // Let the browser set multipart boundary — default application/json breaks file uploads
      if (typeof config.headers?.set === 'function') {
        config.headers.set('Content-Type', undefined);
      } else {
        delete config.headers['Content-Type'];
        delete config.headers['content-type'];
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle response errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';
    const isAuthRequest = /\/auth\/(login|register|verify-otp|verify-totp|resend-otp|forgot-password|reset-password)/.test(requestUrl);

    // Do not hard-redirect on failed login/register.
    if (status === 401 && !isAuthRequest) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    if (status === 403 && !isAuthRequest) {
      const msg = error.response?.data?.error || '';
      if (/pending|deactivated|inactive/i.test(msg)) {
        window.location.href = '/pending-approval';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

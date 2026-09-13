import axios from 'axios';
import { API_BASE_URL } from '../config/env';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to attach JWT token
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('gtf_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {}
  return config;
});

// Response interceptor to handle token expiry / refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('gtf_refresh_token');
        if (refreshToken) {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken }, { timeout: 10000 });
          if (res.data?.success && res.data?.data?.accessToken) {
            const newAccess = res.data.data.accessToken;
            localStorage.setItem('gtf_access_token', newAccess);
            originalRequest.headers.Authorization = `Bearer ${newAccess}`;
            return api(originalRequest);
          }
        }
      } catch (refreshErr) {
        localStorage.removeItem('gtf_access_token');
        localStorage.removeItem('gtf_refresh_token');
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  getMe: () => api.get('/auth/me')
};

export const roomApi = {
  create: (settings) => api.post('/rooms', { settings }),
  get: (code) => api.get(`/rooms/${code}`),
  list: () => api.get('/rooms')
};

export const catalogApi = {
  getAll: () => api.get('/catalog'),
  getPlaylist: (params) => api.get('/catalog/playlist', { params }),
  getByCategory: (category) => api.get(`/catalog/${category}`)
};

export const scoreApi = {
  recordResult: (data) => api.post('/scores/result', data),
  getLeaderboard: (limit = 10) => api.get('/scores/leaderboard', { params: { limit } })
};

export const healthApi = {
  check: () => api.get('/health')
};

export default api;

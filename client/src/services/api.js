import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Token expired — let AuthContext handle redirect
      window.dispatchEvent(new Event('auth:expired'));
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  getMe: () => api.get('/api/auth/me'),
  logout: () => api.post('/api/auth/logout'),
  getProviders: () => api.get('/api/auth/providers'),
  requestMagicLink: (email) => api.post('/api/auth/magic/request', { email }),
};

export const userApi = {
  updateProfile: (formData) => api.patch('/api/users/profile', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  togglePause: () => api.patch('/api/users/pause'),
  getContacts: () => api.get('/api/users/contacts'),
  saveContact: (savedUserId, notes = '') => api.post('/api/users/contacts', { savedUserId, notes }),
  deleteContact: (connectionId) => api.delete(`/api/users/contacts/${connectionId}`),
  reportUser: (reportedId, reason) => api.post('/api/users/report', { reportedId, reason }),
  getOnlineCount: () => api.get('/api/users/online-count'),
};

export default api;

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
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
  getPublicProfile: (id) => api.get(`/api/users/${id}`),
  reportUser: (reportedId, reason, sessionId) => api.post('/api/users/report', { reportedId, reason, sessionId }),
  blockUser: (userId) => api.post('/api/users/block', { userId }),
  unblockUser: (userId) => api.post('/api/users/unblock', { userId }),
  getOnlineCount: () => api.get('/api/users/online-count'),
};

export const connectionApi = {
  list: () => api.get('/api/connections'),
  save: (peerId) => api.post('/api/connections/save', { peerId }),
  getMessages: (connectionId) => api.get(`/api/connections/${connectionId}/messages`),
  sendMessage: (connectionId, text) => api.post(`/api/connections/${connectionId}/messages`, { text }),
};

export const postApi = {
  feed: (page = 0) => api.get(`/api/posts?page=${page}`),
  create: (data) => api.post('/api/posts', data),
  react: (id, emoji) => api.post(`/api/posts/${id}/react`, { emoji }),
  comment: (id, text) => api.post(`/api/posts/${id}/comment`, { text }),
  remove: (id) => api.delete(`/api/posts/${id}`),
};

export const roomApi = {
  create: (title) => api.post('/api/rooms', { title }),
  get: (roomId) => api.get(`/api/rooms/${roomId}`),
};

export default api;

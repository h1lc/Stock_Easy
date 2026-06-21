import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
});

// Attach token from storage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('stockeasy_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('stockeasy_token');
      localStorage.removeItem('stockeasy_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

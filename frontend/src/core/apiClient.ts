import axios from 'axios';
import { useAuthStore } from './authStore';

// Axios client dùng chung. Interceptor tự gắn Bearer token và X-Organization-Id
// cho mọi request — bám đúng quy ước backend (auth + multi-org).
export const apiClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const { token, organizationId } = useAuthStore.getState();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Các route /auth/* không cần X-Organization-Id.
  if (organizationId && !config.url?.startsWith('/auth/')) {
    config.headers['X-Organization-Id'] = String(organizationId);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Hết hạn token -> đăng xuất, đẩy về login.
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  },
);

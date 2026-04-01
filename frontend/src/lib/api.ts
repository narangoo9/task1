import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_PREFIX = '/api/v1';
// Always use absolute API base URL (client + server).
// Using relative URLs in the browser would hit Next.js (:3000) instead of the API (:4001).
const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001').replace(/\/$/, '');

export const api = axios.create({
  baseURL: `${BASE_URL}${API_PREFIX}`,
  withCredentials: true, // Send cookies (refresh token)
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ---- Request interceptor: attach access token ----
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Import lazily to avoid circular deps
  const { useAuthStore } = require('@/store/authStore');
  const token = useAuthStore.getState().accessToken;
  const tenantId = useAuthStore.getState().tenantId;
  const isAuthRequest = config.url?.includes('/auth/');

  if (token && !isAuthRequest) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (tenantId && !isAuthRequest) {
    config.headers['X-Tenant-ID'] = tenantId;
  }

  return config;
});

// ---- Response interceptor: auto-refresh on 401 ----
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry) {
      // Avoid hitting /auth/refresh in a loop
      if (original.url?.includes('/auth/refresh')) {
        const { useAuthStore } = require('@/store/authStore');
        useAuthStore.getState().clearAuth();
        // Auth хуудсууд дээр refresh fail болох нь хэвийн (cookie байхгүй үед).
        // Энд хүчээр navigation хийхээр login page өөрийгөө дахин дахин reload (анивчих) хийдэг.
        if (typeof window !== 'undefined') {
          const path = window.location.pathname;
          const onAuthRoute = path.startsWith('/auth/');
          if (!onAuthRoute) {
            window.location.href = '/auth/login';
          }
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue requests while refresh is in flight
        return new Promise((resolve) => {
          subscribeTokenRefresh((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          });
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const res = await api.post('/auth/refresh');
        const newToken = res.data.accessToken;

        const { useAuthStore } = require('@/store/authStore');
        useAuthStore.getState().setToken(newToken);

        onRefreshed(newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshError) {
        const { useAuthStore } = require('@/store/authStore');
        useAuthStore.getState().clearAuth();
        if (typeof window !== 'undefined') {
          const path = window.location.pathname;
          const onAuthRoute = path.startsWith('/auth/');
          if (!onAuthRoute) {
            window.location.href = '/auth/login';
          }
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;

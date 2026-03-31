import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Build time дээр NEXT_PUBLIC_API_URL хоосон string ("") болж inline хийгдвэл
// `??` fallback ажиллахгүй тул `||` ашиглаж relative URL болгохоос сэргийлнэ.
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
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

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (tenantId) {
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

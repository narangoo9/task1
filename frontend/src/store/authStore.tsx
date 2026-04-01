'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createContext, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  tenantId: string | null;
  role: string | null;
  isLoading: boolean;
  setAuth: (user: User, token: string, tenantId: string, role: string) => void;
  setToken: (token: string) => void;
  finishLoading: () => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      tenantId: null,
      role: null,
      isLoading: true,

      setAuth: (user, accessToken, tenantId, role) =>
        set({ user, accessToken, tenantId, role, isLoading: false }),

      setToken: (accessToken) => set({ accessToken }),

      finishLoading: () => set({ isLoading: false }),

      clearAuth: () =>
        set({ user: null, accessToken: null, tenantId: null, role: null, isLoading: false }),
    }),
    {
      name: 'taskflow-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        tenantId: state.tenantId,
        role: state.role,
        // Never persist access token — refresh on load
      }),
    }
  )
);

// Context for server-side compatible access (not currently used elsewhere)
const AuthContext = createContext<null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setAuth, setToken, finishLoading, clearAuth } = useAuthStore();

  useEffect(() => {
    // On mount, attempt silent token refresh
    const refresh = async () => {
      const { user } = useAuthStore.getState();
      const path = window.location.pathname;
      const onAuthRoute = path.startsWith('/auth/');

      if (onAuthRoute && !user) {
        finishLoading();
        return;
      }

      try {
        const res = await api.post('/auth/refresh');
        setToken(res.data.accessToken);

        if (!user) {
          const meRes = await api.get('/auth/me');
          const { tenants, ...userData } = meRes.data;
          const primaryTenant = tenants?.[0];
          setAuth(userData, res.data.accessToken, primaryTenant?.tenantId, primaryTenant?.role);
          return;
        }

        finishLoading();
      } catch {
        clearAuth();
      }
    };

    refresh();
  }, [clearAuth, finishLoading, setAuth, setToken]);

  return <AuthContext.Provider value={null}>{children}</AuthContext.Provider>;
}

'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createContext, useContext, useEffect, ReactNode } from 'react';
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
  const { setAuth, setToken, clearAuth, user } = useAuthStore();

  useEffect(() => {
    // On mount, attempt silent token refresh
    const refresh = async () => {
      try {
        const res = await api.post('/auth/refresh');
        setToken(res.data.accessToken);

        if (!user) {
          const meRes = await api.get('/auth/me');
          const { tenants, ...userData } = meRes.data;
          const primaryTenant = tenants?.[0];
          setAuth(userData, res.data.accessToken, primaryTenant?.tenantId, primaryTenant?.role);
        }
      } catch {
        clearAuth();
      }
    };

    refresh();
  }, []);

  return <AuthContext.Provider value={null}>{children}</AuthContext.Provider>;
}


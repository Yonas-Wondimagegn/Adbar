import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';

export type UserRole = 'BUYER' | 'SELLER' | 'CLIENT' | 'FREELANCER' | 'MODERATOR' | 'COMPLIANCE_OFFICER' | 'ADMIN';

interface User {
  id: string;
  name: string;
  email: string;
  roles: UserRole[];
  activeRole: UserRole;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  setActiveRole: (role: UserRole) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        try {
          const response = await api.post('/auth/login', { email, password });
          const { user, accessToken, token: rawToken } = response.data; const token = accessToken || rawToken;
          if (!user.roles || user.roles.length === 0) {
            user.roles = ['BUYER'];
          }
          if (!user.activeRole) {
            user.activeRole = user.roles[0];
          }
          set({ user, token, isAuthenticated: true });
        } catch (error: any) {
          throw new Error(error.response?.data?.message || 'Login failed');
        }
      },

      register: async (name: string, email: string, password: string) => {
        try {
          const response = await api.post('/auth/register', { name, email, password });
          const { user, accessToken, token: rawToken } = response.data; const token = accessToken || rawToken;
          if (!user.roles || user.roles.length === 0) {
            user.roles = ['BUYER'];
          }
          if (!user.activeRole) {
            user.activeRole = user.roles[0];
          }
          set({ user, token, isAuthenticated: true });
        } catch (error: any) {
          throw new Error(error.response?.data?.message || 'Registration failed');
        }
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },

      loadUser: async () => {
        try {
          const response = await api.get('/auth/me');
          const user = response.data.user;
          if (!user.roles || user.roles.length === 0) {
            user.roles = ['BUYER'];
          }
          if (!user.activeRole) {
            user.activeRole = user.roles[0];
          }
          set({ user, isAuthenticated: true });
        } catch {
          set({ user: null, token: null, isAuthenticated: false });
        }
      },

      setActiveRole: (role: UserRole) => {
        const { user } = get();
        if (user && user.roles.includes(role)) {
          set({ user: { ...user, activeRole: role } });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);


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

function normalizeUser(rawUser: any, token?: string): { user: User; token: string } {
  const roles: UserRole[] = (rawUser.roles || []).map((r: any) =>
    typeof r === 'string' ? r : r.role
  ) as UserRole[];
  if (roles.length === 0) roles.push('BUYER');
  const name = rawUser.firstName
    ? `${rawUser.firstName} ${rawUser.lastName || ''}`.trim()
    : rawUser.name || rawUser.email || 'User';
  return {
    user: { id: rawUser.id || rawUser.sub, name, email: rawUser.email, roles, activeRole: roles[0] },
    token: token || '',
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: async (email, password) => {
        try {
          const { data } = await api.post('/auth/login', { email, password });
          const accessToken = data.accessToken || data.token || data.data?.accessToken;
          const rawUser = data.user || data.data?.user;
          const { user, token } = normalizeUser(rawUser, accessToken);
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          set({ user, token, isAuthenticated: true });
        } catch (error: any) {
          throw new Error(error.response?.data?.message || 'Login failed');
        }
      },
      register: async (name, email, password) => {
        try {
          const [firstName, ...rest] = name.split(' ');
          const { data } = await api.post('/auth/register', {
            firstName, lastName: rest.join(' '), email, password, roles: ['BUYER'],
          });
          const accessToken = data.accessToken || data.token || data.data?.accessToken;
          const rawUser = data.user || data.data?.user;
          const { user, token } = normalizeUser(rawUser, accessToken);
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          set({ user, token, isAuthenticated: true });
        } catch (error: any) {
          throw new Error(error.response?.data?.message || 'Registration failed');
        }
      },
      logout: () => {
        delete api.defaults.headers.common['Authorization'];
        set({ user: null, token: null, isAuthenticated: false });
      },
      loadUser: async () => {
        try {
          const { data } = await api.get('/auth/me');
          const rawUser = data.user || data.data?.user || data;
          const { user } = normalizeUser(rawUser);
          set({ user, isAuthenticated: true });
        } catch {
          set({ user: null, token: null, isAuthenticated: false });
        }
      },
      setActiveRole: (role) => {
        const { user } = get();
        if (user?.roles.includes(role)) set({ user: { ...user, activeRole: role } });
      },
    }),
    { name: 'auth-storage', partialize: (s) => ({ token: s.token, user: s.user }) }
  )
);

'use client';

import { useAuthStore } from '@/stores/authStore';

export function useAuth() {
  const { user, token, login, logout, register, isAuthenticated } = useAuthStore();

  return {
    user,
    token,
    isAuthenticated,
    login,
    logout,
    register,
  };
}

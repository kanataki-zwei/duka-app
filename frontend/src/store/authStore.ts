import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Company } from '@/types';

export type UserRole = 'admin' | 'shop_attendant';

interface AuthState {
  user: User | null;
  company: Company | null;
  accessToken: string | null;
  role: UserRole | null;
  setAuth: (user: User, company: Company | null, accessToken: string) => void;
  setCompany: (company: Company) => void;
  setRole: (role: UserRole) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      company: null,
      accessToken: null,
      role: null,

      setAuth: (user, company, accessToken) => {
        localStorage.setItem('access_token', accessToken);
        set({ user, company, accessToken });
      },

      setCompany: (company) => {
        set({ company });
      },

      setRole: (role) => {
        set({ role });
      },

      logout: () => {
        localStorage.removeItem('access_token');
        set({ user: null, company: null, accessToken: null, role: null });
      },

      isAuthenticated: () => {
        return !!get().accessToken;
      },

      isAdmin: () => {
        return get().role === 'admin';
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
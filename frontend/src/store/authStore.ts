import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Company } from '@/types';

interface AuthState {
  user: User | null;
  company: Company | null;
  accessToken: string | null;
  setAuth: (user: User, company: Company | null, accessToken: string) => void;
  setCompany: (company: Company) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      company: null,
      accessToken: null,

      setAuth: (user, company, accessToken) => {
        // Save to localStorage for axios interceptor
        localStorage.setItem('access_token', accessToken);
        set({ user, company, accessToken });
      },

      setCompany: (company) => {
        set({ company });
      },

      logout: () => {
        localStorage.removeItem('access_token');
        set({ user: null, company: null, accessToken: null });
      },

      isAuthenticated: () => {
        return !!get().accessToken;
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
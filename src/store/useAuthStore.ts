import { create } from 'zustand';
import api, { clearFallbackAuthToken } from '../api/axios';
import { normalizeUserRole, type UserRole } from '../utils/auth';

interface User {
  id: number;
  username: string;
  name: string;
  email?: string | null;
  role: UserRole;
  studentId?: number | null;
  class_id?: string | null;
}

const normalizeUser = (user: User): User => ({
  ...user,
  role: normalizeUserRole(user?.role) || 'STUDENT',
});

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  authInitialized: boolean;
  initializeAuth: () => Promise<void>;
  login: (user: User) => void;
  setUser: (user: User) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  authInitialized: false,
  initializeAuth: async () => {
    // Alternative strategy: if we just logged out, don't even try to re-fetch auth
    const justLoggedOut = localStorage.getItem('qlsv_just_logged_out');
    if (justLoggedOut === 'true') {
      localStorage.removeItem('qlsv_just_logged_out');
      set({ user: null, isAuthenticated: false, authInitialized: true });
      return;
    }

    try {
      const res = await api.get('/auth/me');
      set({ user: normalizeUser(res.data.user), isAuthenticated: true, authInitialized: true });
    } catch (_error) {
      set((state) => {
        // A slow /auth/me request from the login page must not undo a login
        // that completed while the request was still in flight.
        if (state.isAuthenticated) {
          return { authInitialized: true };
        }

        return { user: null, isAuthenticated: false, authInitialized: true };
      });
    }
  },
  login: (user) => {
    localStorage.removeItem('qlsv_just_logged_out');
    set({ user: normalizeUser(user), isAuthenticated: true, authInitialized: true });
  },
  setUser: (user) => {
    set({ user: normalizeUser(user), isAuthenticated: true, authInitialized: true });
  },
  logout: async () => {
    // 1. Mark as logged out locally immediately
    localStorage.setItem('qlsv_just_logged_out', 'true');
    clearFallbackAuthToken();
    
    // 2. Clear all potentially sensitive local data
    sessionStorage.clear();
    
    try {
      // 3. Inform server to clear cookies
      await api.post('/auth/logout');
    } catch (_error) {
      // ignore
    } finally {
      // 4. Reset store state
      set({ user: null, isAuthenticated: false, authInitialized: true });
    }
  },
}));

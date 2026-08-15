import { create } from 'zustand';
import api, { clearFallbackAuthToken } from '../api/axios';
import { normalizeUserRole, type UserRole } from '../utils/auth';

interface User {
  id: number;
  username: string;
  name: string;
  email?: string | null;
  phone?: string | null;
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
    if (justLoggedOut) {
      const loggedOutTime = parseInt(justLoggedOut, 10);
      const isRecentLogout = !isNaN(loggedOutTime) && (Date.now() - loggedOutTime < 8000);
      
      if (justLoggedOut === 'true' || isRecentLogout) {
        // Clear after a small timeout to allow React Strict Mode remounts to see the flag
        setTimeout(() => {
          localStorage.removeItem('qlsv_just_logged_out');
        }, 1000);
        set({ user: null, isAuthenticated: false, authInitialized: true });
        return;
      } else {
        localStorage.removeItem('qlsv_just_logged_out');
      }
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
    // 1. Mark as logged out locally immediately with a timestamp
    localStorage.setItem('qlsv_just_logged_out', Date.now().toString());
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

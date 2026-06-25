import { create } from 'zustand';
import apiClient from '../api/client';
import { authStorage } from '../utils/authStorage';
import { normalizeRole } from '../config/roles';

const normalizeUser = (user) => (user ? { ...user, role: normalizeRole(user.role) } : user);
const useAuthStore = create((set, get) => ({
  user:            null,
  token:           null,
  isAuthenticated: false,
  isDarkMode:      localStorage.getItem('theme') !== 'light',

  setUser: (user) => {
    const normalized = normalizeUser(user);
    authStorage.setUser(normalized);
    set({ user: normalized });
  },

  setToken: (token) => {
    authStorage.setToken(token);
    set({ token, isAuthenticated: !!token });
  },

  logout: () => {
    authStorage.clear();
    set({ user: null, token: null, isAuthenticated: false });
  },

  toggleTheme: () => {
    const next = !get().isDarkMode;
    localStorage.setItem('theme', next ? 'dark' : 'light');
    if (next) document.documentElement.classList.add('dark');
    else      document.documentElement.classList.remove('dark');
    set({ isDarkMode: next });
  },

  hydrateAuth: async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    const theme = localStorage.getItem('theme');
    const dark  = theme !== 'light';
    if (dark) document.documentElement.classList.add('dark');
    else      document.documentElement.classList.remove('dark');

    const publicPaths = ['/', '/login', '/register', '/forgot-password'];
    if (publicPaths.includes(window.location.pathname)) {
      authStorage.clear();
      set({ token: null, user: null, isAuthenticated: false, isDarkMode: dark });
      return;
    }

    const token = authStorage.getToken();

    if (!token) {
      set({ token: null, user: null, isAuthenticated: false, isDarkMode: dark });
      return;
    }

    try {
      const res = await apiClient.get('/auth/me');
      const user = normalizeUser(res.data?.user || res.data);
      authStorage.setUser(user);
      set({ token, user, isAuthenticated: true, isDarkMode: dark });
    } catch {
      authStorage.clear();
      set({ token: null, user: null, isAuthenticated: false, isDarkMode: dark });
    }
  },
}));

export default useAuthStore;

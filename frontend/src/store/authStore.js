import { create } from 'zustand';
import apiClient from '../api/client';

const useAuthStore = create((set, get) => ({
  user:            null,
  token:           null,
  isAuthenticated: false,
  isDarkMode:      localStorage.getItem('theme') !== 'light',

  setUser:  (user)  => set({ user }),

  setToken: (token) => {
    if (token) localStorage.setItem('token', token);
    else       localStorage.removeItem('token');
    set({ token, isAuthenticated: !!token });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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
    const token = localStorage.getItem('token');
    const theme = localStorage.getItem('theme');
    const dark  = theme !== 'light';

    if (dark) document.documentElement.classList.add('dark');
    else      document.documentElement.classList.remove('dark');

    // No token stored — not authenticated
    if (!token) {
      set({ token: null, user: null, isAuthenticated: false, isDarkMode: dark });
      return;
    }

    // Validate token with server
    try {
      const res = await apiClient.get('/auth/me');
      const user = res.data?.user || res.data;
      localStorage.setItem('user', JSON.stringify(user));
      set({ token, user, isAuthenticated: true, isDarkMode: dark });
    } catch {
      // Token invalid or expired — clear everything and force re-login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      set({ token: null, user: null, isAuthenticated: false, isDarkMode: dark });
    }
  },
}));

export default useAuthStore;

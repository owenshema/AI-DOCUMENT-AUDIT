import { create } from 'zustand';

const useAuthStore = create((set, get) => ({
  user:            null,
  token:           localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),
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

  hydrateAuth: () => {
    const token   = localStorage.getItem('token');
    const rawUser = localStorage.getItem('user');
    const theme   = localStorage.getItem('theme');
    const dark    = theme !== 'light';
    let user = null;
    if (rawUser) {
      try { user = JSON.parse(rawUser); } catch { localStorage.removeItem('user'); }
    }
    if (dark) document.documentElement.classList.add('dark');
    else      document.documentElement.classList.remove('dark');
    set({ token, user, isAuthenticated: !!token, isDarkMode: dark });
  },
}));

export default useAuthStore;

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const PUBLIC_PATHS = ['/', '/login', '/register', '/forgot-password'];

export default function SessionGuard() {
  const location = useLocation();
  const logout = useAuthStore(s => s.logout);

  useEffect(() => {
    if (PUBLIC_PATHS.includes(location.pathname)) {
      logout();
    }
  }, [location.pathname, logout]);

  return null;
}

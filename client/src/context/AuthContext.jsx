import { createContext, useContext, useState, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('stockeasy_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const _setSession = (token, userData) => {
    localStorage.setItem('stockeasy_token', token);
    localStorage.setItem('stockeasy_user', JSON.stringify(userData));
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  };

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    _setSession(data.token, data.user);
    return data.user;
  }, []);

  const register = useCallback(async (email, password, name) => {
    const { data } = await api.post('/auth/register', { email, password, name });
    _setSession(data.token, data.user);
    return data.user;
  }, []);

  // Appelé par la page /auth/callback après Google OAuth
  const setSessionFromOAuth = useCallback((token, userData) => {
    _setSession(token, userData);
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch (_) {}
    localStorage.removeItem('stockeasy_token');
    localStorage.removeItem('stockeasy_user');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  }, []);

  const hasPermission = useCallback((role) => {
    const hierarchy = { GERANT: 3, MAGASINIER: 2, COMMERCIAL: 1 };
    return (hierarchy[user?.role] || 0) >= (hierarchy[role] || 0);
  }, [user]);

  const canWrite = user?.role === 'GERANT' || user?.role === 'MAGASINIER';
  const isGerant = user?.role === 'GERANT';

  return (
    <AuthContext.Provider value={{ user, login, register, logout, setSessionFromOAuth, hasPermission, canWrite, isGerant }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

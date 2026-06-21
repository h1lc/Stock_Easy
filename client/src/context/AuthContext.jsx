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

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('stockeasy_token', data.token);
    localStorage.setItem('stockeasy_user', JSON.stringify(data.user));
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
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
    <AuthContext.Provider value={{ user, login, logout, hasPermission, canWrite, isGerant }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

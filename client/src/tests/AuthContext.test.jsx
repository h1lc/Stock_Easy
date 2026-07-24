import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '../context/AuthContext';

vi.mock('../api/axios', () => ({
  default: {
    post: vi.fn().mockResolvedValue({
      data: { token: 'fake-token', user: { id: 1, email: 'test@test.com', role: 'GERANT', name: 'Test' } },
    }),
    defaults: { headers: { common: {} } },
  },
}));

function TestComponent({ onAuth }) {
  const auth = useAuth();
  onAuth(auth);
  return null;
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with null user if no token stored', () => {
    let auth;
    render(<AuthProvider><TestComponent onAuth={a => { auth = a; }} /></AuthProvider>);
    expect(auth.user).toBeNull();
  });

  it('isGerant is false for non-gerant user', () => {
    localStorage.setItem('stockeasy_user', JSON.stringify({ role: 'COMMERCIAL' }));
    let auth;
    render(<AuthProvider><TestComponent onAuth={a => { auth = a; }} /></AuthProvider>);
    expect(auth.isGerant).toBe(false);
  });

  it('isGerant is true for gerant user', () => {
    localStorage.setItem('stockeasy_user', JSON.stringify({ role: 'GERANT' }));
    let auth;
    render(<AuthProvider><TestComponent onAuth={a => { auth = a; }} /></AuthProvider>);
    expect(auth.isGerant).toBe(true);
  });

  it('canWrite is true for MAGASINIER', () => {
    localStorage.setItem('stockeasy_user', JSON.stringify({ role: 'MAGASINIER' }));
    let auth;
    render(<AuthProvider><TestComponent onAuth={a => { auth = a; }} /></AuthProvider>);
    expect(auth.canWrite).toBe(true);
  });

  it('canWrite is false for COMMERCIAL', () => {
    localStorage.setItem('stockeasy_user', JSON.stringify({ role: 'COMMERCIAL' }));
    let auth;
    render(<AuthProvider><TestComponent onAuth={a => { auth = a; }} /></AuthProvider>);
    expect(auth.canWrite).toBe(false);
  });

  it('logout clears user', async () => {
    localStorage.setItem('stockeasy_user', JSON.stringify({ role: 'GERANT' }));
    localStorage.setItem('stockeasy_token', 'token');
    let auth;
    render(<AuthProvider><TestComponent onAuth={a => { auth = a; }} /></AuthProvider>);
    // logout() est asynchrone : il notifie le serveur (revocation du refresh
    // token) avant de purger le stockage local. Il faut donc l'attendre.
    await act(async () => { await auth.logout(); });
    expect(localStorage.getItem('stockeasy_token')).toBeNull();
    expect(localStorage.getItem('stockeasy_user')).toBeNull();
    expect(auth.user).toBeNull();
  });
});

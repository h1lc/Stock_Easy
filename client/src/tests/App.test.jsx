import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    defaults: { headers: { common: {} } },
  },
}));

import App from '../App';

beforeEach(() => localStorage.clear());

describe('App — routage', () => {
  it('renvoie un visiteur non authentifie vers la page de connexion', async () => {
    window.history.pushState({}, '', '/products');
    render(<App />);

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
    );
  });

  it('sert les pages publiques sans authentification', async () => {
    window.history.pushState({}, '', '/register');
    render(<App />);

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /creer un compte/i })).toBeInTheDocument()
    );
  });

  it('redirige une URL inconnue plutot que d\'afficher une page vide', async () => {
    window.history.pushState({}, '', '/route-qui-nexiste-pas');
    render(<App />);

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
    );
  });
});

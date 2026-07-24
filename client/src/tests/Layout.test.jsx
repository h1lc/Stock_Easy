import { screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, USERS } from './helpers';
import Layout from '../components/Layout';

const mockLogout = vi.fn();
const mockNavigate = vi.fn();
let currentUser = USERS.gerant;

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: currentUser, logout: mockLogout }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate, Outlet: () => <div>contenu</div> };
});

beforeEach(() => {
  vi.clearAllMocks();
  currentUser = USERS.gerant;
});

describe('Layout — navigation selon le role', () => {
  it('donne au Gerant l\'acces a toutes les rubriques', () => {
    renderWithProviders(<Layout />);
    ['Tableau de bord', 'Produits', 'Mouvements de stock', 'Alertes', 'Bons de commande']
      .forEach(label => expect(screen.getByRole('link', { name: label })).toBeInTheDocument());
  });

  it('masque le tableau de bord au Magasinier', () => {
    currentUser = USERS.magasinier;
    renderWithProviders(<Layout />);

    expect(screen.queryByRole('link', { name: 'Tableau de bord' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mouvements de stock' })).toBeInTheDocument();
  });

  it('limite le Commercial a la consultation', () => {
    currentUser = USERS.commercial;
    renderWithProviders(<Layout />);

    // Pas de tableau de bord ni d'ecrans de saisie
    expect(screen.queryByRole('link', { name: 'Tableau de bord' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Mouvements de stock' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Bons de commande' })).not.toBeInTheDocument();
    // Mais acces aux ecrans de consultation
    expect(screen.getByRole('link', { name: 'Produits' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Alertes' })).toBeInTheDocument();
  });
});

describe('Layout — accessibilite', () => {
  it('expose un lien d\'evitement vers le contenu principal (RGAA 12.7)', () => {
    renderWithProviders(<Layout />);
    const skip = screen.getByRole('link', { name: /aller au contenu principal/i });

    expect(skip).toHaveAttribute('href', '#main-content');
    // La cible doit exister et etre focusable par programme
    const main = document.getElementById('main-content');
    expect(main).toBeInTheDocument();
    expect(main).toHaveAttribute('tabindex', '-1');
  });

  it('identifie la navigation principale pour les lecteurs d\'ecran', () => {
    renderWithProviders(<Layout />);
    expect(screen.getByRole('navigation', { name: 'Navigation principale' })).toBeInTheDocument();
  });
});

describe('Layout — identite et deconnexion', () => {
  it('affiche le nom et le role traduit de l\'utilisateur', () => {
    renderWithProviders(<Layout />);
    expect(screen.getByText('Jean Dupont')).toBeInTheDocument();
    expect(screen.getByText('Gérant')).toBeInTheDocument();
  });

  it('deconnecte puis renvoie vers la page de connexion', () => {
    renderWithProviders(<Layout />);
    fireEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));

    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});

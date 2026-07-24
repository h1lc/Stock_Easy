import { screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, PRODUCTS, USERS } from './helpers';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();
let currentAuth = { user: USERS.gerant, isGerant: true, canWrite: true };

vi.mock('../api/axios', () => ({
  default: {
    get: (...a) => mockGet(...a),
    post: (...a) => mockPost(...a),
    put: (...a) => mockPut(...a),
    delete: (...a) => mockDelete(...a),
    defaults: { headers: { common: {} } },
  },
}));

vi.mock('../context/AuthContext', () => ({ useAuth: () => currentAuth }));

// Recharts mesure le DOM, indisponible sous jsdom : on neutralise le graphique.
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return { ...actual, ResponsiveContainer: ({ children }) => <div>{children}</div> };
});

import Dashboard from '../pages/Dashboard';
import Products from '../pages/Products';
import Alerts from '../pages/Alerts';
import ProtectedRoute from '../components/ProtectedRoute';

beforeEach(() => {
  // mockReset (et non clearAllMocks) : il faut aussi effacer les
  // implementations, sinon une promesse jamais resolue fuit sur les tests
  // suivants et fige leurs requetes.
  [mockGet, mockPost, mockPut, mockDelete].forEach(m => m.mockReset());
  currentAuth = { user: USERS.gerant, isGerant: true, canWrite: true };
});

// ───────────────────────────────────────────────────────────── Dashboard
describe('Dashboard — indicateurs du Gerant', () => {
  const DATA = {
    kpis: { stockValue: 4535.21, totalProducts: 5, lowStockCount: 3, outOfStockCount: 1 },
    movementsByDay: [{ date: '2026-07-23', entrees: 4, sorties: 0 }],
    recentMovements: [],
    topAlerts: [{ id: 2, reference: 'PAP-002', name: 'Stylo bille bleu', quantity: 8, minThreshold: 15 }],
  };

  it('affiche les indicateurs cles renvoyes par l\'API', async () => {
    mockGet.mockResolvedValue({ data: DATA });
    renderWithProviders(<Dashboard />);

    expect(await screen.findByText('5')).toBeInTheDocument();   // produits totaux
    expect(screen.getByText('3')).toBeInTheDocument();          // alertes
    expect(screen.getByText('1')).toBeInTheDocument();          // ruptures
    expect(mockGet).toHaveBeenCalledWith('/dashboard');
  });

  it('signale le chargement aux lecteurs d\'ecran', () => {
    mockGet.mockReturnValue(new Promise(() => {})); // jamais resolue
    renderWithProviders(<Dashboard />);
    expect(screen.getByText(/chargement/i)).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────── Products
describe('Products — liste et archivage', () => {
  beforeEach(() => {
    mockGet.mockResolvedValue({ data: { data: PRODUCTS, total: PRODUCTS.length, page: 1, limit: 20 } });
  });

  it('affiche les produits avec leur statut de stock', async () => {
    renderWithProviders(<Products />);

    expect(await screen.findByText('Ramette de papier A4')).toBeInTheDocument();
    expect(screen.getByText('Bureau réglable')).toBeInTheDocument();
    // Le statut n'est pas porte uniquement par la couleur (RGAA 3.1)
    expect(screen.getByText('Rupture')).toBeInTheDocument();
    expect(screen.getAllByText('Faible').length).toBeGreaterThan(0);
  });

  it('propose la creation et l\'archivage au Gerant', async () => {
    renderWithProviders(<Products />);

    expect(await screen.findByRole('button', { name: /nouveau produit/i })).toBeInTheDocument();
    expect(await screen.findAllByRole('button', { name: /^Archiver / })).not.toHaveLength(0);
  });

  it('masque la creation et l\'archivage au Commercial', async () => {
    currentAuth = { user: USERS.commercial, isGerant: false, canWrite: false };
    renderWithProviders(<Products />);

    // La liste reste consultable...
    expect(await screen.findByText('Ramette de papier A4')).toBeInTheDocument();
    // ...mais aucune action d'ecriture n'est exposee
    expect(screen.queryByRole('button', { name: /nouveau produit/i })).not.toBeInTheDocument();
    expect(screen.queryAllByRole('button', { name: /^Archiver / })).toHaveLength(0);
  });

  it('demande confirmation avant d\'archiver, sans appeler l\'API immediatement', async () => {
    renderWithProviders(<Products />);
    const archiver = await screen.findAllByRole('button', { name: /^Archiver / });

    fireEvent.click(archiver[0]);

    // Une modale accessible s'ouvre — l'archivage n'est pas encore parti
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(mockDelete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Archiver', exact: true }));
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('/products/1'));
  });

  it('n\'archive rien si l\'utilisateur annule', async () => {
    renderWithProviders(<Products />);
    const archiver = await screen.findAllByRole('button', { name: /^Archiver / });
    fireEvent.click(archiver[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(mockDelete).not.toHaveBeenCalled();
  });
});

// ──────────────────────────────────────────────────────────────── Alerts
describe('Alerts — seuils de stock', () => {
  const ALERTS = [
    { id: 3, reference: 'MOB-002', name: 'Bureau réglable', quantity: 0, minThreshold: 2, severity: 'RUPTURE', supplier: { name: 'Bureau Plus' } },
    { id: 2, reference: 'PAP-002', name: 'Stylo bille bleu', quantity: 8, minThreshold: 15, severity: 'ALERTE', supplier: { name: 'Bureau Plus' } },
  ];

  it('separe les ruptures des stocks faibles', async () => {
    mockGet.mockResolvedValue({ data: { data: ALERTS } });
    renderWithProviders(<Alerts />);

    expect(await screen.findByText('Bureau réglable')).toBeInTheDocument();
    expect(screen.getByText('Rupture')).toBeInTheDocument();
    expect(screen.getByText('Stock faible')).toBeInTheDocument();
  });

  it('propose la generation des commandes au Gerant uniquement', async () => {
    mockGet.mockResolvedValue({ data: { data: ALERTS } });
    renderWithProviders(<Alerts />);
    expect(await screen.findByRole('button', { name: /g[ée]n[ée]rer les commandes/i })).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────── ProtectedRoute
describe('ProtectedRoute — garde de route', () => {
  it('laisse passer un utilisateur authentifie', () => {
    currentAuth = { user: USERS.gerant };
    const { container } = renderWithProviders(<ProtectedRoute />);
    // Aucune redirection : le composant rend son Outlet (vide ici)
    expect(container).toBeInTheDocument();
  });

  it('redirige un visiteur non authentifie', () => {
    currentAuth = { user: null };
    const { container } = renderWithProviders(<ProtectedRoute />);
    expect(container.innerHTML).toBe('');
  });
});

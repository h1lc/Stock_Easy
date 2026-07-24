import { screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, PRODUCTS, USERS } from './helpers';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
let currentAuth = { user: USERS.gerant, isGerant: true, canWrite: true };

vi.mock('../api/axios', () => ({
  default: {
    get: (...a) => mockGet(...a),
    post: (...a) => mockPost(...a),
    patch: (...a) => mockPatch(...a),
    defaults: { headers: { common: {} } },
  },
}));

vi.mock('../context/AuthContext', () => ({ useAuth: () => currentAuth }));

import StockMovements from '../pages/StockMovements';
import Orders from '../pages/Orders';

const MOVEMENTS = [
  { id: 1, type: 'ENTREE', quantity: 4, reason: 'Réception fournisseur', createdAt: '2026-07-22T10:27:40Z', product: { reference: 'MOB-001', name: 'Chaise de bureau' }, user: { name: 'Jean Dupont' } },
  { id: 2, type: 'SORTIE', quantity: 2, reason: null, createdAt: '2026-07-22T09:37:55Z', product: { reference: 'MOB-001', name: 'Chaise de bureau' }, user: { name: 'Pierre Martin' } },
];

const ORDERS = [
  {
    id: 1, reference: 'BC-AUTO-1', status: 'BROUILLON', totalPrice: 1527.57,
    createdAt: '2026-07-22T00:00:00Z',
    supplier: { id: 1, name: 'Bureau Plus' },
    createdBy: { name: 'Jean Dupont' },
    lines: [{ id: 1, quantity: 22, unitPrice: 3.49, product: { name: 'Stylo bille bleu' } }],
  },
];

beforeEach(() => {
  [mockGet, mockPost, mockPatch].forEach(m => m.mockReset());
  currentAuth = { user: USERS.gerant, isGerant: true, canWrite: true };
});

// ─────────────────────────────────────────────────────── StockMovements
describe('StockMovements — saisie et historique', () => {
  const withData = () => {
    mockGet.mockImplementation((url) =>
      url === '/products'
        ? Promise.resolve({ data: { data: PRODUCTS, total: PRODUCTS.length } })
        : Promise.resolve({ data: { data: MOVEMENTS, total: MOVEMENTS.length } })
    );
  };

  it('affiche l\'historique avec l\'auteur de chaque mouvement', async () => {
    withData();
    renderWithProviders(<StockMovements />);

    expect(await screen.findAllByText('Chaise de bureau')).toHaveLength(2);
    // La tracabilite est un besoin metier explicite : qui a saisi quoi
    expect(screen.getByText('Jean Dupont')).toBeInTheDocument();
    expect(screen.getByText('Pierre Martin')).toBeInTheDocument();
  });

  it('filtre l\'historique par type de mouvement', async () => {
    withData();
    renderWithProviders(<StockMovements />);
    await screen.findAllByText('Chaise de bureau');

    fireEvent.click(screen.getByRole('button', { name: /^Entrées$/i }));

    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith('/stock/movements', { params: { type: 'ENTREE' } })
    );
  });

  it('ouvre le formulaire de saisie pour un profil autorise', async () => {
    withData();
    renderWithProviders(<StockMovements />);

    fireEvent.click(await screen.findByRole('button', { name: /saisir un mouvement/i }));
    expect(await screen.findByLabelText(/^Produit/)).toBeInTheDocument();
  });

  it('interdit la saisie au Commercial', async () => {
    currentAuth = { user: USERS.commercial, isGerant: false, canWrite: false };
    withData();
    renderWithProviders(<StockMovements />);

    await screen.findAllByText('Chaise de bureau');
    expect(screen.queryByRole('button', { name: /saisir un mouvement/i })).not.toBeInTheDocument();
  });

  it('remonte l\'erreur de stock insuffisant renvoyee par l\'API', async () => {
    withData();
    mockPost.mockRejectedValue({ response: { data: { error: 'Stock insuffisant. Disponible: 8' } } });
    renderWithProviders(<StockMovements />);

    fireEvent.click(await screen.findByRole('button', { name: /saisir un mouvement/i }));

    // La liste des produits n'est chargee qu'a l'ouverture du formulaire :
    // sans attendre ses options, le select resterait vide et la soumission
    // serait ignoree.
    await screen.findByRole('option', { name: /Stylo bille bleu/ });

    fireEvent.change(screen.getByLabelText(/^Produit/), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText(/^Type/), { target: { value: 'SORTIE' } });
    fireEvent.change(screen.getByLabelText(/^Quantité/), { target: { value: '999' } });
    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));

    expect(await screen.findByText(/stock insuffisant/i)).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────────────────────── Orders
describe('Orders — bons de commande', () => {
  beforeEach(() => {
    mockGet.mockResolvedValue({ data: { data: ORDERS, total: ORDERS.length } });
  });

  it('affiche le bon avec son fournisseur, ses lignes et son statut', async () => {
    renderWithProviders(<Orders />);

    expect(await screen.findByText('Bureau Plus')).toBeInTheDocument();
    expect(screen.getByText('BC-AUTO-1')).toBeInTheDocument();
    expect(screen.getAllByText('Brouillon').length).toBeGreaterThan(0);
    expect(screen.getByText('Stylo bille bleu')).toBeInTheDocument();
  });

  it('filtre les bons par statut', async () => {
    renderWithProviders(<Orders />);
    await screen.findByText('Bureau Plus');

    fireEvent.click(screen.getByRole('button', { name: /^Envoyé$/i }));

    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith('/orders', { params: { status: 'ENVOYE' } })
    );
  });

  it('permet au Gerant de faire avancer le workflow', async () => {
    mockPatch.mockResolvedValue({ data: {} });
    renderWithProviders(<Orders />);

    fireEvent.click(await screen.findByRole('button', { name: /^Marquer BC-AUTO-1 comme envoyé$/ }));

    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith('/orders/1/status', { status: 'ENVOYE' })
    );
  });

  it('n\'expose aucune action de workflow au Commercial', async () => {
    currentAuth = { user: USERS.commercial, isGerant: false, canWrite: false };
    renderWithProviders(<Orders />);

    expect(await screen.findByText('Bureau Plus')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Marquer BC-AUTO-1 comme envoyé$/ })).not.toBeInTheDocument();
  });
});

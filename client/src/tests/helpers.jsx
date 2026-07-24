import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Rend un composant avec les fournisseurs dont dependent les pages :
 * React Query (appels API) et le routeur.
 *
 * `retry: false` evite que React Query ne reessaie en boucle lorsqu'un test
 * simule volontairement une erreur reseau.
 */
export function renderWithProviders(ui, { route = '/' } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </QueryClientProvider>
    ),
  };
}

/** Utilisateurs de reference, alignes sur le jeu de donnees d'amorcage. */
export const USERS = {
  gerant: { id: 1, name: 'Jean Dupont', email: 'gerant@dupont-fils.fr', role: 'GERANT' },
  magasinier: { id: 2, name: 'Pierre Martin', email: 'magasinier@dupont-fils.fr', role: 'MAGASINIER' },
  commercial: { id: 3, name: 'Sophie Bernard', email: 'commercial@dupont-fils.fr', role: 'COMMERCIAL' },
};

export const PRODUCTS = [
  { id: 1, reference: 'PAP-001', name: 'Ramette de papier A4', price: 5.99, quantity: 150, minThreshold: 20, unit: 'unité', category: { id: 1, name: 'Papeterie' }, supplier: { id: 1, name: 'Bureau Plus' } },
  { id: 2, reference: 'PAP-002', name: 'Stylo bille bleu', price: 3.49, quantity: 8, minThreshold: 15, unit: 'unité', category: { id: 1, name: 'Papeterie' }, supplier: { id: 1, name: 'Bureau Plus' } },
  { id: 3, reference: 'MOB-002', name: 'Bureau réglable', price: 349.99, quantity: 0, minThreshold: 2, unit: 'unité', category: { id: 2, name: 'Mobilier' }, supplier: { id: 1, name: 'Bureau Plus' } },
];

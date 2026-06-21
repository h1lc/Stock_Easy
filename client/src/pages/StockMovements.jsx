import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const fetchMovements = (params) => api.get('/stock/movements', { params }).then(r => r.data);
const fetchProducts = () => api.get('/products', { params: { limit: 200 } }).then(r => r.data);

export default function StockMovements() {
  const { canWrite } = useAuth();
  const qc = useQueryClient();
  const [type, setType] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ productId: '', type: 'ENTREE', quantity: '', reason: '' });
  const [error, setError] = useState('');

  const { data: movData, isLoading } = useQuery({ queryKey: ['movements', type], queryFn: () => fetchMovements({ type }) });
  const { data: prodData } = useQuery({ queryKey: ['products-all'], queryFn: fetchProducts, enabled: showForm });

  const mutation = useMutation({
    mutationFn: (payload) => api.post('/stock/movements', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movements'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['alerts'] });
      setShowForm(false);
      setForm({ productId: '', type: 'ENTREE', quantity: '', reason: '' });
      setError('');
    },
    onError: (err) => setError(err.response?.data?.error || 'Erreur lors de la saisie'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.productId || !form.quantity) return;
    mutation.mutate({ ...form, quantity: Number(form.quantity) });
  };

  const movements = movData?.data || [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Mouvements de stock</h2>
        {canWrite && (
          <button className="btn-primary" onClick={() => setShowForm(s => !s)}>
            {showForm ? 'Annuler' : '+ Saisir un mouvement'}
          </button>
        )}
      </div>

      {/* Formulaire de saisie */}
      {showForm && (
        <div className="card mb-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Nouveau mouvement</h3>
          {error && <div role="alert" className="mb-3 text-sm text-danger-700 bg-danger-100 p-3 rounded-lg">{error}</div>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Saisie de mouvement de stock">
            <div>
              <label htmlFor="mov-product" className="label">Produit *</label>
              <select id="mov-product" className="input" value={form.productId} onChange={e => setForm(f => ({ ...f, productId: e.target.value }))} required aria-required="true">
                <option value="">Sélectionner…</option>
                {(prodData?.data || []).map(p => (
                  <option key={p.id} value={p.id}>{p.name} (stock: {p.quantity})</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="mov-type" className="label">Type *</label>
              <select id="mov-type" className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} aria-required="true">
                <option value="ENTREE">Entrée</option>
                <option value="SORTIE">Sortie</option>
              </select>
            </div>
            <div>
              <label htmlFor="mov-qty" className="label">Quantité *</label>
              <input id="mov-qty" type="number" min="1" className="input" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} required aria-required="true" />
            </div>
            <div>
              <label htmlFor="mov-reason" className="label">Motif</label>
              <input id="mov-reason" className="input" placeholder="Réception fournisseur…" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
            </div>
            <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
              <button type="submit" className="btn-primary" disabled={mutation.isPending} aria-busy={mutation.isPending}>
                {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-2 mb-4">
        {['', 'ENTREE', 'SORTIE'].map(t => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${type === t ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            aria-pressed={type === t}
          >
            {t === '' ? 'Tous' : t === 'ENTREE' ? 'Entrées' : 'Sorties'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center" role="status" aria-label="Chargement">
            <div className="animate-spin w-6 h-6 border-4 border-primary-500 border-t-transparent rounded-full mx-auto" aria-hidden="true" />
            <span className="sr-only">Chargement…</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Historique des mouvements de stock">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantité</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Motif</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Saisi par</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {movements.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Aucun mouvement enregistré</td></tr>
                ) : movements.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{new Date(m.createdAt).toLocaleString('fr-FR')}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{m.product.name}</div>
                      <div className="text-xs text-gray-400">{m.product.reference}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={m.type === 'ENTREE' ? 'badge-success' : 'badge-danger'}>
                        {m.type === 'ENTREE' ? '↑ Entrée' : '↓ Sortie'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{m.quantity}</td>
                    <td className="px-4 py-3 text-gray-500">{m.reason || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{m.user?.name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

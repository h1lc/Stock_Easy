import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';

const fetchProducts = (params) => api.get('/products', { params }).then(r => r.data);

function ProductModal({ product, onClose, onSave }) {
  const [form, setForm] = useState({
    reference: product?.reference || '',
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || '',
    minThreshold: product?.minThreshold || 5,
    unit: product?.unit || 'unité',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la sauvegarde');
    }
  };

  const isEdit = !!product;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 id="modal-title" className="text-lg font-semibold">{isEdit ? 'Modifier le produit' : 'Nouveau produit'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Fermer la fenêtre">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4" aria-label={isEdit ? 'Formulaire de modification' : 'Formulaire de création'}>
          {error && <div role="alert" className="text-sm text-danger-700 bg-danger-100 p-3 rounded-lg">{error}</div>}

          {!isEdit && (
            <div>
              <label htmlFor="ref" className="label">Référence *</label>
              <input id="ref" className="input" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} required />
            </div>
          )}
          <div>
            <label htmlFor="pname" className="label">Nom *</label>
            <input id="pname" className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label htmlFor="desc" className="label">Description</label>
            <textarea id="desc" className="input" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="price" className="label">Prix unitaire (€) *</label>
              <input id="price" type="number" step="0.01" min="0" className="input" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required />
            </div>
            <div>
              <label htmlFor="threshold" className="label">Seuil minimum</label>
              <input id="threshold" type="number" min="0" className="input" value={form.minThreshold} onChange={e => setForm(f => ({ ...f, minThreshold: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn-primary">{isEdit ? 'Enregistrer' : 'Créer'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Products() {
  const { isGerant } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [modal, setModal] = useState(null); // null | 'create' | product object

  const { data, isLoading } = useQuery({
    queryKey: ['products', { search, lowStock }],
    queryFn: () => fetchProducts({ search, lowStock }),
  });

  const createMutation = useMutation({
    mutationFn: (form) => api.post('/products', form),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...form }) => api.put(`/products/${id}`, form),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });

  // Produit dont l'archivage est en attente de confirmation (null = aucune)
  const [pendingArchive, setPendingArchive] = useState(null);

  const confirmArchive = () => {
    deleteMutation.mutate(pendingArchive.id);
    setPendingArchive(null);
  };

  const products = data?.data || [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Produits</h2>
        {isGerant && (
          <button className="btn-primary" onClick={() => setModal('create')}>
            + Nouveau produit
          </button>
        )}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-64">
          <label htmlFor="search" className="sr-only">Rechercher un produit</label>
          <input
            id="search"
            className="input"
            placeholder="Rechercher un produit…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Rechercher un produit"
          />
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={lowStock}
            onChange={e => setLowStock(e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          Stock faible uniquement
        </label>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center" role="status" aria-label="Chargement des produits">
            <div className="animate-spin w-6 h-6 border-4 border-primary-500 border-t-transparent rounded-full mx-auto" aria-hidden="true" />
            <span className="sr-only">Chargement…</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Liste des produits">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Référence</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catégorie</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Prix</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Seuil</th>
                  <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                  {isGerant && <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={isGerant ? 8 : 7} className="px-4 py-8 text-center text-gray-400">
                      Aucun produit trouvé
                    </td>
                  </tr>
                ) : products.map(p => {
                  const isLow = p.quantity <= p.minThreshold;
                  const isOut = p.quantity === 0;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.reference}</td>
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-gray-500">{p.category?.name || '—'}</td>
                      <td className="px-4 py-3 text-right">{p.price.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>
                      <td className="px-4 py-3 text-right font-semibold">{p.quantity}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{p.minThreshold}</td>
                      <td className="px-4 py-3 text-center">
                        {isOut
                          ? <span className="badge-danger">Rupture</span>
                          : isLow
                          ? <span className="badge-warning">Faible</span>
                          : <span className="badge-success">OK</span>}
                      </td>
                      {isGerant && (
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setModal(p)}
                            className="text-primary-600 hover:text-primary-700 text-xs font-medium mr-3"
                            aria-label={`Modifier ${p.name}`}
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => setPendingArchive(p)}
                            className="text-danger-500 hover:text-danger-700 text-xs font-medium"
                            aria-label={`Archiver ${p.name}`}
                          >
                            Archiver
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <ProductModal
          product={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSave={(form) =>
            modal === 'create'
              ? createMutation.mutateAsync(form)
              : updateMutation.mutateAsync({ id: modal.id, ...form })
          }
        />
      )}

      {pendingArchive && (
        <ConfirmDialog
          title="Archiver ce produit ?"
          message={`"${pendingArchive.name}" (${pendingArchive.reference}) n'apparaitra plus dans la liste. L'historique des mouvements est conserve et l'operation reste reversible en base.`}
          confirmLabel="Archiver"
          destructive
          onConfirm={confirmArchive}
          onCancel={() => setPendingArchive(null)}
        />
      )}
    </div>
  );
}

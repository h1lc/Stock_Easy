import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const fetchOrders = (params) => api.get('/orders', { params }).then(r => r.data);

const STATUS_LABELS = {
  BROUILLON: { label: 'Brouillon', badge: 'badge-blue' },
  ENVOYE: { label: 'Envoyé', badge: 'badge-warning' },
  RECU: { label: 'Reçu', badge: 'badge-success' },
  ANNULE: { label: 'Annulé', badge: 'badge-danger' },
};

export default function Orders() {
  const { isGerant } = useAuth();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['orders', statusFilter],
    queryFn: () => fetchOrders({ status: statusFilter || undefined }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/orders/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });

  const orders = data?.data || [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Bons de commande</h2>
      </div>

      {/* Filtres statut */}
      <div className="flex flex-wrap gap-2 mb-6" role="group" aria-label="Filtrer par statut">
        {[['', 'Tous'], ['BROUILLON', 'Brouillon'], ['ENVOYE', 'Envoyé'], ['RECU', 'Reçu'], ['ANNULE', 'Annulé']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setStatusFilter(val)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === val ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            aria-pressed={statusFilter === val}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="card flex justify-center p-8" role="status" aria-label="Chargement">
          <div className="animate-spin w-6 h-6 border-4 border-primary-500 border-t-transparent rounded-full" aria-hidden="true" />
          <span className="sr-only">Chargement…</span>
        </div>
      ) : orders.length === 0 ? (
        <div className="card text-center text-gray-400 py-12">
          Aucun bon de commande
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <article key={order.id} className="card" aria-label={`Bon de commande ${order.reference}`}>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={STATUS_LABELS[order.status]?.badge || 'badge-blue'}>
                      {STATUS_LABELS[order.status]?.label}
                    </span>
                    <span className="text-sm font-mono text-gray-500">{order.reference}</span>
                  </div>
                  <p className="font-semibold text-gray-900">{order.supplier.name}</p>
                  <p className="text-sm text-gray-500">
                    Créé par {order.createdBy.name} le {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary-700">
                    {order.totalPrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </p>
                  <p className="text-xs text-gray-500">{order.lines.length} ligne(s)</p>
                </div>
              </div>

              {/* Lignes */}
              <div className="border border-gray-100 rounded-lg overflow-hidden mb-4">
                <table className="w-full text-sm" aria-label={`Lignes du bon ${order.reference}`}>
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500">Produit</th>
                      <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500">Qté</th>
                      <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500">P.U.</th>
                      <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {order.lines.map(l => (
                      <tr key={l.id}>
                        <td className="px-3 py-2">{l.product.name}</td>
                        <td className="px-3 py-2 text-right">{l.quantity}</td>
                        <td className="px-3 py-2 text-right">{l.unitPrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>
                        <td className="px-3 py-2 text-right font-medium">{(l.quantity * l.unitPrice).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Actions statut */}
              {isGerant && order.status !== 'RECU' && order.status !== 'ANNULE' && (
                <div className="flex gap-2" role="group" aria-label={`Actions pour le bon ${order.reference}`}>
                  {order.status === 'BROUILLON' && (
                    <button
                      className="btn-primary text-xs"
                      onClick={() => statusMutation.mutate({ id: order.id, status: 'ENVOYE' })}
                      aria-label={`Marquer ${order.reference} comme envoyé`}
                    >
                      Marquer comme envoyé
                    </button>
                  )}
                  {order.status === 'ENVOYE' && (
                    <button
                      className="btn-primary text-xs"
                      onClick={() => statusMutation.mutate({ id: order.id, status: 'RECU' })}
                      aria-label={`Marquer ${order.reference} comme reçu`}
                    >
                      Marquer comme reçu
                    </button>
                  )}
                  <button
                    className="btn-secondary text-xs"
                    onClick={() => statusMutation.mutate({ id: order.id, status: 'ANNULE' })}
                    aria-label={`Annuler le bon ${order.reference}`}
                  >
                    Annuler
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

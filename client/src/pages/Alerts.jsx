import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const fetchAlerts = () => api.get('/alerts').then(r => r.data);

export default function Alerts() {
  const { isGerant } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({ queryKey: ['alerts'], queryFn: fetchAlerts, refetchInterval: 60_000 });

  const autoOrderMutation = useMutation({
    mutationFn: () => api.post('/orders/auto'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      alert('Bons de commande générés automatiquement !');
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center" role="status" aria-label="Chargement des alertes">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" aria-hidden="true" />
        <span className="sr-only">Chargement…</span>
      </div>
    );
  }

  const alerts = data?.data || [];
  const ruptures = alerts.filter(a => a.severity === 'RUPTURE');
  const faibles = alerts.filter(a => a.severity === 'ALERTE');

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Alertes de stock</h2>
          <p className="text-sm text-gray-500 mt-1">
            {alerts.length === 0 ? 'Aucune alerte' : `${alerts.length} produit(s) nécessitent votre attention`}
          </p>
        </div>
        {isGerant && alerts.length > 0 && (
          <button
            className="btn-primary"
            onClick={() => autoOrderMutation.mutate()}
            disabled={autoOrderMutation.isPending}
            aria-busy={autoOrderMutation.isPending}
          >
            {autoOrderMutation.isPending ? 'Génération…' : '🛒 Générer les commandes'}
          </button>
        )}
      </div>

      {alerts.length === 0 && (
        <div className="card bg-success-50 border-success-200 text-success-700" role="status">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">✓</span>
            <div>
              <p className="font-semibold">Tous les stocks sont suffisants</p>
              <p className="text-sm mt-1">Aucun produit n'a atteint son seuil minimum.</p>
            </div>
          </div>
        </div>
      )}

      {ruptures.length > 0 && (
        <section className="mb-6" aria-labelledby="ruptures-heading">
          <h3 id="ruptures-heading" className="text-base font-semibold text-danger-700 mb-3 flex items-center gap-2">
            <span aria-hidden="true">🔴</span> Ruptures de stock ({ruptures.length})
          </h3>
          <div className="space-y-3">
            {ruptures.map(a => (
              <AlertCard key={a.id} alert={a} />
            ))}
          </div>
        </section>
      )}

      {faibles.length > 0 && (
        <section aria-labelledby="faibles-heading">
          <h3 id="faibles-heading" className="text-base font-semibold text-warning-700 mb-3 flex items-center gap-2">
            <span aria-hidden="true">🟡</span> Stock faible ({faibles.length})
          </h3>
          <div className="space-y-3">
            {faibles.map(a => (
              <AlertCard key={a.id} alert={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function AlertCard({ alert: a }) {
  return (
    <article
      className={`card border-l-4 ${a.severity === 'RUPTURE' ? 'border-l-danger-500 bg-danger-50' : 'border-l-warning-500 bg-warning-50'}`}
      aria-label={`Alerte pour ${a.name}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={a.severity === 'RUPTURE' ? 'badge-danger' : 'badge-warning'}>
              {a.severity === 'RUPTURE' ? 'Rupture' : 'Stock faible'}
            </span>
            <span className="text-xs text-gray-500 font-mono">{a.reference}</span>
          </div>
          <h4 className="font-semibold text-gray-900">{a.name}</h4>
          {a.supplier && (
            <p className="text-sm text-gray-500 mt-1">Fournisseur : {a.supplier.name}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className={`text-2xl font-bold ${a.severity === 'RUPTURE' ? 'text-danger-700' : 'text-warning-700'}`}>
            {a.quantity}
          </p>
          <p className="text-xs text-gray-500">/ {a.minThreshold} min</p>
          {a.deficit > 0 && (
            <p className="text-xs text-gray-600 mt-1">Déficit : {a.deficit}</p>
          )}
        </div>
      </div>
    </article>
  );
}

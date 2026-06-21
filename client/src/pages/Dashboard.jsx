import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';
import api from '../api/axios';

const fetchDashboard = () => api.get('/dashboard').then(r => r.data);

function KpiCard({ label, value, unit = '', color = 'text-gray-900' }) {
  return (
    <div className="card">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>
        {value}
        {unit && <span className="text-lg ml-1 font-normal text-gray-500">{unit}</span>}
      </p>
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({ queryKey: ['dashboard'], queryFn: fetchDashboard });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center" role="status" aria-label="Chargement du tableau de bord">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" aria-hidden="true" />
        <span className="sr-only">Chargement en cours…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8" role="alert">
        <div className="card text-danger-700 bg-danger-50 border-danger-200">
          Erreur de chargement du tableau de bord.
        </div>
      </div>
    );
  }

  const { kpis, movementsByDay, recentMovements, topAlerts } = data;

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Tableau de bord</h2>

      {/* KPIs */}
      <section aria-labelledby="kpi-heading">
        <h3 id="kpi-heading" className="sr-only">Indicateurs clés</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard label="Valeur du stock" value={kpis.stockValue.toLocaleString('fr-FR')} unit="€" color="text-primary-700" />
          <KpiCard label="Produits totaux" value={kpis.totalProducts} />
          <KpiCard label="Alertes stock" value={kpis.lowStockCount} color={kpis.lowStockCount > 0 ? 'text-warning-700' : 'text-success-700'} />
          <KpiCard label="Ruptures" value={kpis.outOfStockCount} color={kpis.outOfStockCount > 0 ? 'text-danger-700' : 'text-success-700'} />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Graphique mouvements */}
        <section className="card lg:col-span-2" aria-labelledby="chart-heading">
          <h3 id="chart-heading" className="text-base font-semibold text-gray-900 mb-4">
            Mouvements des 7 derniers jours
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={movementsByDay} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="entrees" name="Entrées" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="sorties" name="Sorties" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        {/* Alertes */}
        <section className="card" aria-labelledby="alerts-heading">
          <h3 id="alerts-heading" className="text-base font-semibold text-gray-900 mb-4">
            Produits en alerte
          </h3>
          {topAlerts.length === 0 ? (
            <p className="text-sm text-success-700">Aucune alerte en cours ✓</p>
          ) : (
            <ul className="space-y-3" role="list">
              {topAlerts.map(p => (
                <li key={p.id} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.reference}</p>
                  </div>
                  <span className={p.severity === 'RUPTURE' ? 'badge-danger' : 'badge-warning'}>
                    {p.quantity} / {p.minThreshold}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Derniers mouvements */}
      <section className="card" aria-labelledby="movements-heading">
        <h3 id="movements-heading" className="text-base font-semibold text-gray-900 mb-4">
          Derniers mouvements
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Liste des derniers mouvements de stock">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th scope="col" className="pb-2 font-medium">Date</th>
                <th scope="col" className="pb-2 font-medium">Produit</th>
                <th scope="col" className="pb-2 font-medium">Type</th>
                <th scope="col" className="pb-2 font-medium text-right">Qté</th>
              </tr>
            </thead>
            <tbody>
              {recentMovements.map(m => (
                <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 text-gray-500">{new Date(m.createdAt).toLocaleDateString('fr-FR')}</td>
                  <td className="py-2 font-medium">{m.product.name}</td>
                  <td className="py-2">
                    <span className={m.type === 'ENTREE' ? 'badge-success' : 'badge-danger'}>
                      {m.type === 'ENTREE' ? 'Entrée' : 'Sortie'}
                    </span>
                  </td>
                  <td className="py-2 text-right font-semibold">{m.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

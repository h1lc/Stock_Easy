import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_LABELS = { GERANT: 'Gérant', MAGASINIER: 'Magasinier', COMMERCIAL: 'Commercial' };

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Tableau de bord', icon: '📊', roles: ['GERANT'] },
  { to: '/products', label: 'Produits', icon: '📦', roles: ['GERANT', 'MAGASINIER', 'COMMERCIAL'] },
  { to: '/stock', label: 'Mouvements de stock', icon: '↕️', roles: ['GERANT', 'MAGASINIER'] },
  { to: '/alerts', label: 'Alertes', icon: '🔔', roles: ['GERANT', 'MAGASINIER', 'COMMERCIAL'] },
  { to: '/orders', label: 'Bons de commande', icon: '🛒', roles: ['GERANT', 'MAGASINIER'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const visibleNav = NAV_ITEMS.filter(item => item.roles.includes(user?.role));

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <nav className="w-64 bg-white border-r border-gray-200 flex flex-col" aria-label="Navigation principale">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-primary-700">StockEasy</h1>
          <p className="text-xs text-gray-500 mt-1">Dupont &amp; Fils</p>
        </div>

        <ul className="flex-1 p-4 space-y-1" role="list">
          {visibleNav.map(({ to, label, icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
                aria-label={label}
              >
                <span aria-hidden="true">{icon}</span>
                {label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm"
              aria-hidden="true"
            >
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500">{ROLE_LABELS[user?.role]}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="btn-secondary w-full text-sm"
            aria-label="Se déconnecter"
          >
            Déconnexion
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-auto" id="main-content" tabIndex="-1">
        <Outlet />
      </main>
    </div>
  );
}

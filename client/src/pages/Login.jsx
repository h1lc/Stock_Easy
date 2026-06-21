import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      navigate(user.role === 'GERANT' ? '/dashboard' : '/products');
    } catch (err) {
      setError(err.response?.data?.error || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-gray-100 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-700">StockEasy</h1>
          <p className="text-gray-500 mt-2">Dupont &amp; Fils — Gestion de stock</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Connexion</h2>

          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="mb-4 p-3 rounded-lg bg-danger-100 text-danger-700 text-sm border border-danger-200"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate aria-label="Formulaire de connexion">
            <div className="mb-4">
              <label htmlFor="email" className="label">
                Adresse email
              </label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="exemple@dupont-fils.fr"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
                autoComplete="email"
                aria-required="true"
                aria-describedby={error ? 'login-error' : undefined}
              />
            </div>

            <div className="mb-6">
              <label htmlFor="password" className="label">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
                autoComplete="current-password"
                aria-required="true"
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading || !form.email || !form.password}
              aria-busy={loading}
            >
              {loading ? 'Connexion en cours...' : 'Se connecter'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs font-medium text-gray-600 mb-2">Comptes de démonstration :</p>
            <div className="space-y-1 text-xs text-gray-500">
              <p>Gérant : gerant@dupont-fils.fr</p>
              <p>Magasinier : magasinier@dupont-fils.fr</p>
              <p>Commercial : commercial@dupont-fils.fr</p>
              <p className="font-medium text-gray-600 mt-1">Mot de passe : Password123!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

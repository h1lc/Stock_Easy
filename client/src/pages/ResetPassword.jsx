import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../api/axios';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [form, setForm] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-gray-100 px-4">
        <div className="card max-w-md w-full text-center">
          <p className="text-danger-600 mb-4">Lien invalide ou expire.</p>
          <Link to="/forgot-password" className="btn-primary">Nouvelle demande</Link>
        </div>
      </div>
    );
  }

  const validate = () => {
    const e = {};
    if (form.password.length < 8) e.password = '8 caracteres minimum';
    else if (!/[A-Z]/.test(form.password)) e.password = 'Une majuscule requise';
    else if (!/[0-9]/.test(form.password)) e.password = 'Un chiffre requis';
    if (form.password !== form.confirm) e.confirm = 'Les mots de passe ne correspondent pas';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setServerError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password: form.password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setServerError(err.response?.data?.error || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-gray-100 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-700">StockEasy</h1>
        </div>
        <div className="card">
          {success ? (
            <div className="text-center">
              <div className="text-4xl mb-4">&#x2705;</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Mot de passe reinitialise !</h2>
              <p className="text-gray-600 text-sm mb-4">Redirection vers la connexion dans 3 secondes...</p>
              <Link to="/login" className="btn-primary inline-block">Se connecter maintenant</Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Nouveau mot de passe</h2>
              <p className="text-gray-500 text-sm mb-6">Choisissez un nouveau mot de passe securise.</p>

              {serverError && (
                <div role="alert" className="mb-4 p-3 rounded-lg bg-danger-100 text-danger-700 text-sm border border-danger-200">
                  {serverError}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className="mb-4">
                  <label htmlFor="password" className="label">Nouveau mot de passe</label>
                  <input
                    id="password"
                    type="password"
                    className={"input" + (errors.password ? " border-danger-500" : "")}
                    placeholder="Min. 8 car., 1 majuscule, 1 chiffre"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    autoComplete="new-password"
                    aria-required="true"
                  />
                  {errors.password && <p className="text-danger-600 text-xs mt-1" role="alert">{errors.password}</p>}
                </div>
                <div className="mb-6">
                  <label htmlFor="confirm" className="label">Confirmer le mot de passe</label>
                  <input
                    id="confirm"
                    type="password"
                    className={"input" + (errors.confirm ? " border-danger-500" : "")}
                    placeholder="Retapez votre mot de passe"
                    value={form.confirm}
                    onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                    autoComplete="new-password"
                    aria-required="true"
                  />
                  {errors.confirm && <p className="text-danger-600 text-xs mt-1" role="alert">{errors.confirm}</p>}
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full" aria-busy={loading}>
                  {loading ? 'Reinitialisation...' : 'Reinitialiser le mot de passe'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
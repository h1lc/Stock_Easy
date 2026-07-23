import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email) { setError("Veuillez saisir votre email"); return; }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.error || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-gray-100 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-700">StockEasy</h1>
          <p className="text-gray-500 mt-2">Dupont & Fils - Gestion de stock</p>
        </div>

        <div className="card">
          {submitted ? (
            <div className="text-center">
              <div className="text-4xl mb-4">&#x2709;&#xFE0F;</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Email envoye !</h2>
              <p className="text-gray-600 text-sm mb-6">
                Si un compte existe pour <strong>{email}</strong>, vous recevrez un email avec un lien de reinitialisation valable 1 heure.
              </p>
              <Link to="/login" className="btn-primary inline-block">Retour a la connexion</Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Mot de passe oublie</h2>
              <p className="text-gray-500 text-sm mb-6">Saisissez votre email, nous vous enverrons un lien de reinitialisation.</p>

              {error && (
                <div role="alert" aria-live="assertive" className="mb-4 p-3 rounded-lg bg-danger-100 text-danger-700 text-sm border border-danger-200">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className="mb-5">
                  <label htmlFor="email" className="label">Adresse email</label>
                  <input
                    id="email"
                    type="email"
                    className="input"
                    placeholder="exemple@dupont-fils.fr"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                    aria-required="true"
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full" aria-busy={loading}>
                  {loading ? 'Envoi en cours...' : 'Envoyer le lien'}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-5">
                <Link to="/login" className="text-primary-600 hover:underline">Retour a la connexion</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
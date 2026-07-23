import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || '';
const GOOGLE_AUTH_URL = `${API_BASE}/api/auth/google`;

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Le nom est requis';
    if (!form.email) e.email = "L'email est requis";
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
      await register(form.email, form.password, form.name);
      navigate('/products');
    } catch (err) {
      setServerError(err.response?.data?.error || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const field = (id, label, type, placeholder, autoComplete) => (
    <div className="mb-4">
      <label htmlFor={id} className="label">{label}</label>
      <input
        id={id}
        type={type}
        className={"input" + (errors[id] ? " border-danger-500" : "")}
        placeholder={placeholder}
        value={form[id]}
        onChange={e => setForm(f => ({ ...f, [id]: e.target.value }))}
        autoComplete={autoComplete}
        aria-required="true"
        aria-describedby={errors[id] ? `${id}-error` : undefined}
      />
      {errors[id] && <p id={`${id}-error`} className="text-danger-600 text-xs mt-1" role="alert">{errors[id]}</p>}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-gray-100 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-700">StockEasy</h1>
          <p className="text-gray-500 mt-2">Dupont & Fils - Gestion de stock</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Creer un compte</h2>

          {serverError && (
            <div role="alert" aria-live="assertive" className="mb-4 p-3 rounded-lg bg-danger-100 text-danger-700 text-sm border border-danger-200">
              {serverError}
            </div>
          )}

          <a href={GOOGLE_AUTH_URL} className="flex items-center justify-center gap-3 w-full border border-gray-300 rounded-lg py-2.5 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors mb-4" aria-label="S'inscrire avec Google">
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
            </svg>
            Continuer avec Google
          </a>

          <div className="flex items-center gap-3 mb-4">
            <hr className="flex-1 border-gray-200" />
            <span className="text-xs text-gray-400">ou</span>
            <hr className="flex-1 border-gray-200" />
          </div>

          <form onSubmit={handleSubmit} noValidate aria-label="Formulaire d'inscription">
            {field('name', 'Nom complet', 'text', 'Jean Dupont', 'name')}
            {field('email', 'Adresse email', 'email', 'jean@dupont-fils.fr', 'email')}
            {field('password', 'Mot de passe', 'password', 'Min. 8 car., 1 majuscule, 1 chiffre', 'new-password')}
            {field('confirm', 'Confirmer le mot de passe', 'password', 'Retapez votre mot de passe', 'new-password')}
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2" aria-busy={loading}>
              {loading ? 'Creation du compte...' : 'Creer mon compte'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Deja un compte ?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">Se connecter</Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Les nouveaux comptes ont le role Observateur par defaut. Un Gerant peut modifier les roles.
        </p>
      </div>
    </div>
  );
}
import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthCallback() {
  const { setSessionFromOAuth } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const token = searchParams.get('token');
    const userStr = searchParams.get('user');

    if (!token || !userStr) {
      navigate('/login?error=google');
      return;
    }

    try {
      const user = JSON.parse(decodeURIComponent(userStr));
      setSessionFromOAuth(token, user);
      navigate(user.role === 'GERANT' ? '/dashboard' : '/products', { replace: true });
    } catch {
      navigate('/login?error=google');
    }
    // Volontairement execute une seule fois au montage : le garde `handled`
    // empeche tout rejeu, et les parametres d'URL ne changent pas ici.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-gray-100">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" aria-hidden="true" />
        <p className="text-gray-600">Connexion en cours...</p>
      </div>
    </div>
  );
}
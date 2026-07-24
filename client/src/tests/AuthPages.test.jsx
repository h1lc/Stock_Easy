import { screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from './helpers';

const mockPost = vi.fn();
const mockNavigate = vi.fn();
const mockRegister = vi.fn();
const mockSetSessionFromOAuth = vi.fn();

vi.mock('../api/axios', () => ({
  default: { post: (...a) => mockPost(...a), defaults: { headers: { common: {} } } },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ register: mockRegister, setSessionFromOAuth: mockSetSessionFromOAuth }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

import Register from '../pages/Register';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import AuthCallback from '../pages/AuthCallback';

beforeEach(() => {
  vi.clearAllMocks();
  mockPost.mockResolvedValue({ data: {} });
});

// ───────────────────────────────────────────────────────────── Register
describe('Register — creation de compte', () => {
  const fill = (values) => {
    Object.entries(values).forEach(([label, value]) => {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    });
  };

  const VALID = {
    'Nom complet': 'Marie Curie',
    'Adresse email': 'marie@dupont-fils.fr',
    'Mot de passe': 'Password123',
    'Confirmer le mot de passe': 'Password123',
  };

  it('cree le compte lorsque le formulaire est valide', async () => {
    mockRegister.mockResolvedValue({});
    renderWithProviders(<Register />);
    fill(VALID);
    fireEvent.click(screen.getByRole('button', { name: /creer mon compte/i }));

    await waitFor(() =>
      expect(mockRegister).toHaveBeenCalledWith('marie@dupont-fils.fr', 'Password123', 'Marie Curie')
    );
    expect(mockNavigate).toHaveBeenCalledWith('/products');
  });

  it('refuse un mot de passe sans majuscule ni chiffre', async () => {
    renderWithProviders(<Register />);
    fill({ ...VALID, 'Mot de passe': 'motdepasse', 'Confirmer le mot de passe': 'motdepasse' });
    fireEvent.click(screen.getByRole('button', { name: /creer mon compte/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/majuscule/i);
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('refuse deux mots de passe differents', async () => {
    renderWithProviders(<Register />);
    fill({ ...VALID, 'Confirmer le mot de passe': 'Autre1234' });
    fireEvent.click(screen.getByRole('button', { name: /creer mon compte/i }));

    expect(await screen.findByText(/ne correspondent pas/i)).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('affiche l\'erreur renvoyee par le serveur', async () => {
    mockRegister.mockRejectedValue({ response: { data: { error: 'Un compte avec cet email existe deja' } } });
    renderWithProviders(<Register />);
    fill(VALID);
    fireEvent.click(screen.getByRole('button', { name: /creer mon compte/i }));

    expect(await screen.findByText(/existe deja/i)).toBeInTheDocument();
  });

  it('annonce que le nouveau compte est en consultation seule', () => {
    renderWithProviders(<Register />);
    expect(screen.getByText(/role Observateur par defaut/i)).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────────────── ForgotPassword
describe('ForgotPassword — demande de reinitialisation', () => {
  it('confirme l\'envoi sans reveler si le compte existe', async () => {
    renderWithProviders(<ForgotPassword />);
    fireEvent.change(screen.getByLabelText('Adresse email'), {
      target: { value: 'inconnu@dupont-fils.fr' },
    });
    fireEvent.click(screen.getByRole('button', { name: /envoyer le lien/i }));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith('/auth/forgot-password', { email: 'inconnu@dupont-fils.fr' })
    );
    // Le message reste conditionnel : il n'affirme pas que le compte existe
    expect(await screen.findByText(/si un compte existe/i)).toBeInTheDocument();
  });

  it('exige une saisie avant d\'appeler le serveur', async () => {
    renderWithProviders(<ForgotPassword />);
    fireEvent.click(screen.getByRole('button', { name: /envoyer le lien/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(mockPost).not.toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────── ResetPassword
describe('ResetPassword — nouveau mot de passe', () => {
  it('refuse d\'afficher le formulaire sans jeton dans l\'URL', () => {
    renderWithProviders(<ResetPassword />, { route: '/reset-password' });

    expect(screen.getByText(/lien invalide ou expire/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reinitialiser/i })).not.toBeInTheDocument();
  });

  it('transmet le jeton de l\'URL avec le nouveau mot de passe', async () => {
    renderWithProviders(<ResetPassword />, { route: '/reset-password?token=jeton-test' });

    fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), { target: { value: 'Password123' } });
    fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), { target: { value: 'Password123' } });
    fireEvent.click(screen.getByRole('button', { name: /reinitialiser/i }));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith('/auth/reset-password', {
        token: 'jeton-test',
        password: 'Password123',
      })
    );
  });

  it('applique la meme politique de mot de passe qu\'a l\'inscription', async () => {
    renderWithProviders(<ResetPassword />, { route: '/reset-password?token=jeton-test' });

    fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), { target: { value: 'court' } });
    fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), { target: { value: 'court' } });
    fireEvent.click(screen.getByRole('button', { name: /reinitialiser/i }));

    expect(await screen.findByText(/8 caracteres minimum/i)).toBeInTheDocument();
    expect(mockPost).not.toHaveBeenCalled();
  });
});

// ────────────────────────────────────────────────────────── AuthCallback
describe('AuthCallback — retour de Google', () => {
  it('ouvre la session puis oriente selon le role', async () => {
    const user = { id: 1, email: 'g@d.fr', name: 'Jean', role: 'GERANT' };
    const route = `/auth/callback?token=jeton-google&user=${encodeURIComponent(JSON.stringify(user))}`;
    renderWithProviders(<AuthCallback />, { route });

    await waitFor(() =>
      expect(mockSetSessionFromOAuth).toHaveBeenCalledWith('jeton-google', user)
    );
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });

  it('renvoie vers le login si les parametres sont absents', async () => {
    renderWithProviders(<AuthCallback />, { route: '/auth/callback' });

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/login?error=google'));
    expect(mockSetSessionFromOAuth).not.toHaveBeenCalled();
  });

  it('renvoie vers le login si les donnees utilisateur sont corrompues', async () => {
    renderWithProviders(<AuthCallback />, { route: '/auth/callback?token=t&user=%7Bcasse' });

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/login?error=google'));
  });
});

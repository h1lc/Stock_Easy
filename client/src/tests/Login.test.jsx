import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Login from '../pages/Login';

const mockLogin = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderLogin() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe('Login page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email and password fields', () => {
    renderLogin();
    expect(screen.getByLabelText(/adresse email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mot de passe/i)).toBeInTheDocument();
  });

  it('disables submit button when fields are empty', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /se connecter/i })).toBeDisabled();
  });

  it('enables submit when fields are filled', () => {
    renderLogin();
    fireEvent.change(screen.getByLabelText(/adresse email/i), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByLabelText(/mot de passe/i), { target: { value: 'password' } });
    expect(screen.getByRole('button', { name: /se connecter/i })).not.toBeDisabled();
  });

  it('calls login with correct credentials', async () => {
    mockLogin.mockResolvedValue({ role: 'GERANT' });
    renderLogin();
    fireEvent.change(screen.getByLabelText(/adresse email/i), { target: { value: 'gerant@test.fr' } });
    fireEvent.change(screen.getByLabelText(/mot de passe/i), { target: { value: 'Password123!' } });
    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }));
    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('gerant@test.fr', 'Password123!'));
  });

  it('shows error message on failed login', async () => {
    mockLogin.mockRejectedValue({ response: { data: { error: 'Identifiants incorrects' } } });
    renderLogin();
    fireEvent.change(screen.getByLabelText(/adresse email/i), { target: { value: 'bad@test.fr' } });
    fireEvent.change(screen.getByLabelText(/mot de passe/i), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Identifiants incorrects'));
  });
});

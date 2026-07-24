import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * L'intercepteur ne peut pas etre teste via de vrais appels reseau. On
 * remplace donc axios.create par une fausse instance qui capture les
 * gestionnaires enregistres, puis on les invoque directement.
 */
const handlers = { request: null, responseOk: null, responseErr: null };

const fakeInstance = vi.fn(); // appel direct api(config) = rejeu de la requete
fakeInstance.post = vi.fn();
fakeInstance.defaults = { headers: { common: {} } };
fakeInstance.interceptors = {
  request: { use: (fn) => { handlers.request = fn; } },
  response: { use: (ok, err) => { handlers.responseOk = ok; handlers.responseErr = err; } },
};

vi.mock('axios', () => ({ default: { create: () => fakeInstance } }));

await import('../api/axios');

beforeEach(() => {
  localStorage.clear();
  fakeInstance.mockReset();
  fakeInstance.post.mockReset();
  fakeInstance.defaults.headers.common = {};
});

describe('Intercepteur de requete', () => {
  it('joint le jeton d\'acces quand il existe', () => {
    localStorage.setItem('stockeasy_token', 'jeton-abc');
    const config = handlers.request({ headers: {} });
    expect(config.headers.Authorization).toBe('Bearer jeton-abc');
  });

  it('n\'ajoute aucun en-tete si l\'utilisateur n\'est pas connecte', () => {
    const config = handlers.request({ headers: {} });
    expect(config.headers.Authorization).toBeUndefined();
  });
});

describe('Renouvellement silencieux sur 401', () => {
  const unauthorized = (url = '/products') => ({
    response: { status: 401 },
    config: { url, headers: {} },
  });

  it('renouvelle le jeton puis rejoue la requete initiale', async () => {
    fakeInstance.post.mockResolvedValue({
      data: { token: 'nouveau-jeton', user: { id: 1, role: 'GERANT' } },
    });
    fakeInstance.mockResolvedValue({ data: 'ok' });

    const result = await handlers.responseErr(unauthorized());

    expect(fakeInstance.post).toHaveBeenCalledWith('/auth/refresh');
    // Le nouveau jeton est persiste et rejoue sur la requete d'origine
    expect(localStorage.getItem('stockeasy_token')).toBe('nouveau-jeton');
    expect(fakeInstance).toHaveBeenCalledWith(
      expect.objectContaining({ headers: { Authorization: 'Bearer nouveau-jeton' } })
    );
    expect(result).toEqual({ data: 'ok' });
  });

  it('purge la session et redirige quand le renouvellement echoue', async () => {
    localStorage.setItem('stockeasy_token', 'perime');
    localStorage.setItem('stockeasy_user', '{}');
    fakeInstance.post.mockRejectedValue(new Error('refresh refuse'));

    delete window.location;
    window.location = { href: '' };

    await expect(handlers.responseErr(unauthorized())).rejects.toThrow('refresh refuse');

    expect(localStorage.getItem('stockeasy_token')).toBeNull();
    expect(localStorage.getItem('stockeasy_user')).toBeNull();
    expect(window.location.href).toBe('/login?session=expired');
  });

  it('ne tente pas de renouveler un echec de connexion', async () => {
    const err = { response: { status: 401 }, config: { url: '/auth/login', headers: {} } };
    await expect(handlers.responseErr(err)).rejects.toBe(err);
    expect(fakeInstance.post).not.toHaveBeenCalled();
  });

  it('ne boucle pas si le renouvellement lui-meme renvoie 401', async () => {
    const err = { response: { status: 401 }, config: { url: '/auth/refresh', headers: {} } };
    await expect(handlers.responseErr(err)).rejects.toBe(err);
    expect(fakeInstance.post).not.toHaveBeenCalled();
  });

  it('laisse passer les erreurs qui ne sont pas des 401', async () => {
    const err = { response: { status: 500 }, config: { url: '/products', headers: {} } };
    await expect(handlers.responseErr(err)).rejects.toBe(err);
    expect(fakeInstance.post).not.toHaveBeenCalled();
  });

  it('transmet les reponses valides sans modification', () => {
    const res = { status: 200, data: { ok: true } };
    expect(handlers.responseOk(res)).toBe(res);
  });
});

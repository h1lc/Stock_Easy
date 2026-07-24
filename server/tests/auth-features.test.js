const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Mock Prisma pilotable test par test.
// Le prefixe "mock" est requis par Jest pour les variables hors scope.
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  $disconnect: jest.fn(),
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
}));

// L'envoi d'email ne doit jamais partir depuis les tests.
const mockSendResetEmail = jest.fn().mockResolvedValue(undefined);
jest.mock('../src/services/email', () => ({
  sendResetPasswordEmail: (...args) => mockSendResetEmail(...args),
}));

process.env.JWT_SECRET = 'test-secret-key-for-tests';
process.env.NODE_ENV = 'test';
process.env.CLIENT_URL = 'http://localhost:8081';

const app = require('../src/app');

const baseUser = {
  id: 1,
  email: 'gerant@dupont-fils.fr',
  name: 'Jean Dupont',
  role: 'GERANT',
  active: true,
  password: null,
  googleId: null,
  refreshToken: null,
  resetToken: null,
  resetTokenExpires: null,
};

const signToken = (payload = {}) =>
  jwt.sign({ id: 1, email: baseUser.email, role: 'GERANT', name: baseUser.name, ...payload },
    process.env.JWT_SECRET, { expiresIn: '15m', issuer: 'stockeasy-api' });

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.user.update.mockResolvedValue(baseUser);
  mockPrisma.user.create.mockImplementation(({ data }) => Promise.resolve({ ...baseUser, ...data, id: 42 }));
});

// ─────────────────────────────────────────────── POST /api/auth/register
describe('POST /api/auth/register', () => {
  it('cree un compte et renvoie un access token + un cookie de refresh', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null); // email libre

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Nouvel Utilisateur', email: 'nouveau@dupont-fils.fr', password: 'Password123' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toMatchObject({ email: 'nouveau@dupont-fils.fr' });
    expect(res.body.user).not.toHaveProperty('password');

    const cookies = res.headers['set-cookie'].join(';');
    expect(cookies).toMatch(/refreshToken=/);
    expect(cookies).toMatch(/HttpOnly/i);
  });

  it('impose le role COMMERCIAL et ne fait jamais confiance au role envoye', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Pirate', email: 'pirate@dupont-fils.fr', password: 'Password123', role: 'GERANT' });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('COMMERCIAL');
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'COMMERCIAL' }) })
    );
  });

  it('hache le mot de passe avant de le stocker', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'hash@dupont-fils.fr', password: 'Password123' });

    const stored = mockPrisma.user.create.mock.calls[0][0].data.password;
    expect(stored).not.toBe('Password123');
    expect(await bcrypt.compare('Password123', stored)).toBe(true);
  });

  it('neutralise le HTML injecte dans le nom (OWASP A03)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await request(app)
      .post('/api/auth/register')
      .send({
        name: '<script>alert(1)</script>Jean',
        email: 'xss@dupont-fils.fr',
        password: 'Password123',
      });

    const stored = mockPrisma.user.create.mock.calls[0][0].data.name;
    expect(stored).not.toMatch(/<script>/);
    expect(stored).toContain('Jean');
  });

  it('refuse un email deja utilise', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(baseUser);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Doublon', email: 'gerant@dupont-fils.fr', password: 'Password123' });

    expect(res.status).toBe(409);
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it('refuse un mot de passe trop faible', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'faible@dupont-fils.fr', password: 'motdepasse' });

    expect(res.status).toBe(400);
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────── POST /api/auth/refresh
describe('POST /api/auth/refresh', () => {
  it('renvoie un nouveau access token et fait tourner le refresh token', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ ...baseUser, refreshToken: 'ancien-jeton' });

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', ['refreshToken=ancien-jeton']);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');

    // rotation : le jeton stocke doit avoir change
    const nouveau = mockPrisma.user.update.mock.calls[0][0].data.refreshToken;
    expect(nouveau).toEqual(expect.any(String));
    expect(nouveau).not.toBe('ancien-jeton');
  });

  it('refuse quand le cookie de refresh est absent', async () => {
    const res = await request(app).post('/api/auth/refresh');

    expect(res.status).toBe(401);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('refuse un refresh token inconnu (rejeu ou vol)', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', ['refreshToken=jeton-revoque']);

    expect(res.status).toBe(401);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────── POST /api/auth/logout
describe('POST /api/auth/logout', () => {
  it('revoque le refresh token en base et purge le cookie', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${signToken()}`);

    expect(res.status).toBe(200);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { refreshToken: null } })
    );
    expect(res.headers['set-cookie'].join(';')).toMatch(/refreshToken=;/);
  });
});

// ─────────────────────────────────────────── POST /api/auth/forgot-password
describe('POST /api/auth/forgot-password', () => {
  it('envoie un lien de reinitialisation avec un token expirant', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser, password: 'hash' });

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'gerant@dupont-fils.fr' });

    expect(res.status).toBe(200);
    await new Promise(r => setImmediate(r)); // le traitement est asynchrone

    const data = mockPrisma.user.update.mock.calls[0][0].data;
    expect(data.resetToken).toEqual(expect.any(String));
    expect(data.resetTokenExpires.getTime()).toBeGreaterThan(Date.now());
    expect(mockSendResetEmail).toHaveBeenCalled();
  });

  it('repond a l\'identique pour un email inconnu (anti-enumeration)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'inconnu@dupont-fils.fr' });

    expect(res.status).toBe(200);
    await new Promise(r => setImmediate(r));

    // Aucun email envoye, mais la reponse ne le revele pas
    expect(mockSendResetEmail).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('n\'envoie pas de lien a un compte Google (pas de mot de passe)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser, googleId: 'g-123' });

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'gerant@dupont-fils.fr' });

    expect(res.status).toBe(200);
    await new Promise(r => setImmediate(r));
    expect(mockSendResetEmail).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────── POST /api/auth/reset-password
describe('POST /api/auth/reset-password', () => {
  it('reinitialise le mot de passe et revoque les sessions en cours', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ ...baseUser, resetToken: 'jeton-valide' });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'jeton-valide', password: 'NouveauPass123' });

    expect(res.status).toBe(200);

    const data = mockPrisma.user.update.mock.calls[0][0].data;
    expect(await bcrypt.compare('NouveauPass123', data.password)).toBe(true);
    expect(data.resetToken).toBeNull();       // usage unique
    expect(data.resetTokenExpires).toBeNull();
    expect(data.refreshToken).toBeNull();     // deconnecte les sessions actives
  });

  it('refuse un token invalide ou expire', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'jeton-expire', password: 'NouveauPass123' });

    expect(res.status).toBe(400);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────── GET /api/auth/me
describe('GET /api/auth/me', () => {
  it('renvoie le profil sans jamais exposer les secrets du compte', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 1, email: baseUser.email, name: baseUser.name, role: 'GERANT', active: true,
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${signToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: baseUser.email, role: 'GERANT' });
    expect(res.body).not.toHaveProperty('password');
    expect(res.body).not.toHaveProperty('refreshToken');
    expect(res.body).not.toHaveProperty('resetToken');
  });

  it('renvoie 404 si le compte a ete supprime depuis l\'emission du token', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${signToken()}`);

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────── Comptes Google : pas de mot de passe
describe('POST /api/auth/login sur un compte Google', () => {
  // Un compte cree via Google n'a pas de mot de passe (password = null).
  // La comparaison se fait alors contre un hash factice (protection timing),
  // ce qui produit un echec generique. On ne revele donc pas que le compte
  // existe ni qu'il est rattache a Google : c'est le comportement souhaite
  // vis-a-vis de l'enumeration de comptes (OWASP A01).
  it('renvoie un echec generique, sans reveler l\'existence du compte', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser, googleId: 'g-123', password: null });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'gerant@dupont-fils.fr', password: 'Password123' });

    expect(res.status).toBe(401);
    expect(res.body.error).not.toMatch(/Google/);
  });

  it('autorise le mot de passe sur un compte mixte (Google + mot de passe)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      ...baseUser, googleId: 'g-123', password: await bcrypt.hash('Password123', 10),
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'gerant@dupont-fils.fr', password: 'Password123' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });
});

// ─────────────────────────────────────────────── Robustesse : panne de la BDD
describe('Indisponibilite de la base de donnees', () => {
  it('register renvoie 500 sans divulguer de detail technique', async () => {
    mockPrisma.user.findUnique.mockRejectedValue(new Error('connexion refusee par le SGBD'));

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'panne@dupont-fils.fr', password: 'Password123' });

    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toMatch(/SGBD/);
  });

  it('refresh renvoie 500 et purge le cookie', async () => {
    mockPrisma.user.findFirst.mockRejectedValue(new Error('connexion refusee par le SGBD'));

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', ['refreshToken=un-jeton']);

    expect(res.status).toBe(500);
    expect(res.headers['set-cookie'].join(';')).toMatch(/refreshToken=;/);
  });
});

// ─────────────────────────────────────────────── Google OAuth non configure
describe('GET /api/auth/google (sans identifiants Google)', () => {
  it('redirige vers le login avec un message explicite au lieu de planter', async () => {
    const res = await request(app).get('/api/auth/google');

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('http://localhost:8081/login?error=google_not_configured');
  });

  it('traite de meme le callback', async () => {
    const res = await request(app).get('/api/auth/google/callback');

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('error=google_not_configured');
  });
});

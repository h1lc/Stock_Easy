const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret-key-for-tests';
process.env.NODE_ENV = 'test';

const mockProduct = { id: 1, reference: 'PAP-001', name: 'Ramette A4', price: 5.99, quantity: 50, minThreshold: 20, active: true };
const mockMovement = {
  id: 1, type: 'ENTREE', quantity: 10, reason: 'Test', createdAt: new Date(),
  product: { name: 'Ramette A4', reference: 'PAP-001' },
  user: { name: 'Jean Dupont' },
};

const mockFindProduct = jest.fn().mockResolvedValue(mockProduct);
const mockCreateMovement = jest.fn().mockResolvedValue(mockMovement);

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    stockMovement: {
      findMany: jest.fn().mockResolvedValue([mockMovement]),
      count: jest.fn().mockResolvedValue(1),
      create: mockCreateMovement,
    },
    product: {
      findUnique: mockFindProduct,
      update: jest.fn().mockResolvedValue({ ...mockProduct, quantity: 60 }),
    },
    $transaction: jest.fn().mockImplementation(ops => Promise.all(ops)),
    $disconnect: jest.fn(),
  })),
}));

const app = require('../src/app');

const gerantToken = jwt.sign({ id: 1, email: 'g@test.com', role: 'GERANT', name: 'Test' }, 'test-secret-key-for-tests');
const magasinierToken = jwt.sign({ id: 2, email: 'm@test.com', role: 'MAGASINIER', name: 'Test' }, 'test-secret-key-for-tests');
const commercialToken = jwt.sign({ id: 3, email: 'c@test.com', role: 'COMMERCIAL', name: 'Test' }, 'test-secret-key-for-tests');

describe('GET /api/stock/movements', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/stock/movements');
    expect(res.status).toBe(401);
  });

  it('returns movements list for GERANT', async () => {
    const res = await request(app).get('/api/stock/movements').set('Authorization', `Bearer ${gerantToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
  });

  it('returns movements for MAGASINIER', async () => {
    const res = await request(app).get('/api/stock/movements').set('Authorization', `Bearer ${magasinierToken}`);
    expect(res.status).toBe(200);
  });

  it('returns movements for COMMERCIAL (lecture seule)', async () => {
    const res = await request(app).get('/api/stock/movements').set('Authorization', `Bearer ${commercialToken}`);
    expect(res.status).toBe(200);
  });
});

describe('POST /api/stock/movements', () => {
  it('returns 403 for COMMERCIAL', async () => {
    const res = await request(app)
      .post('/api/stock/movements')
      .set('Authorization', `Bearer ${commercialToken}`)
      .send({ productId: 1, type: 'ENTREE', quantity: 5 });
    expect(res.status).toBe(403);
  });

  it('validates required fields', async () => {
    const res = await request(app)
      .post('/api/stock/movements')
      .set('Authorization', `Bearer ${magasinierToken}`)
      .send({ productId: 'abc', type: 'INVALIDE', quantity: 0 });
    expect(res.status).toBe(400);
  });

  it('creates ENTREE movement for MAGASINIER', async () => {
    const res = await request(app)
      .post('/api/stock/movements')
      .set('Authorization', `Bearer ${magasinierToken}`)
      .send({ productId: 1, type: 'ENTREE', quantity: 10, reason: 'Réception' });
    expect(res.status).toBe(201);
  });

  it('returns 404 for unknown product', async () => {
    mockFindProduct.mockResolvedValueOnce(null);
    const res = await request(app)
      .post('/api/stock/movements')
      .set('Authorization', `Bearer ${magasinierToken}`)
      .send({ productId: 999, type: 'ENTREE', quantity: 5 });
    expect(res.status).toBe(404);
  });

  it('returns 400 for SORTIE with insufficient stock', async () => {
    mockFindProduct.mockResolvedValueOnce({ ...mockProduct, quantity: 2 });
    const res = await request(app)
      .post('/api/stock/movements')
      .set('Authorization', `Bearer ${magasinierToken}`)
      .send({ productId: 1, type: 'SORTIE', quantity: 10 });
    expect(res.status).toBe(400);
  });
});

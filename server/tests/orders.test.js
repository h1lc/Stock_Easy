const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret-key-for-tests';
process.env.NODE_ENV = 'test';

const mockSupplier = { id: 1, name: 'Bureau Plus', email: 'contact@bp.fr' };
const mockOrder = {
  id: 1, reference: 'BC-001', status: 'BROUILLON', totalPrice: 59.9,
  createdAt: new Date(), updatedAt: new Date(),
  supplier: mockSupplier,
  createdBy: { name: 'Jean Dupont' },
  lines: [{ id: 1, quantity: 10, unitPrice: 5.99, product: { name: 'Ramette A4', reference: 'PAP-001' } }],
};

const mockFindOrder = jest.fn().mockResolvedValue(mockOrder);
const mockFindSupplier = jest.fn().mockResolvedValue(mockSupplier);

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    purchaseOrder: {
      findMany: jest.fn().mockResolvedValue([mockOrder]),
      count: jest.fn().mockResolvedValue(1),
      findUnique: mockFindOrder,
      create: jest.fn().mockResolvedValue(mockOrder),
      update: jest.fn().mockResolvedValue({ ...mockOrder, status: 'ENVOYE' }),
    },
    supplier: {
      findUnique: mockFindSupplier,
    },
    product: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    $disconnect: jest.fn(),
  })),
}));

const app = require('../src/app');

const gerantToken = jwt.sign({ id: 1, email: 'g@test.com', role: 'GERANT', name: 'Jean' }, 'test-secret-key-for-tests');
const magasinierToken = jwt.sign({ id: 2, email: 'm@test.com', role: 'MAGASINIER', name: 'Pierre' }, 'test-secret-key-for-tests');
const commercialToken = jwt.sign({ id: 3, email: 'c@test.com', role: 'COMMERCIAL', name: 'Sophie' }, 'test-secret-key-for-tests');

describe('GET /api/orders', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/orders');
    expect(res.status).toBe(401);
  });

  it('returns 403 for COMMERCIAL', async () => {
    const res = await request(app).get('/api/orders').set('Authorization', `Bearer ${commercialToken}`);
    expect(res.status).toBe(403);
  });

  it('returns orders list for GERANT', async () => {
    const res = await request(app).get('/api/orders').set('Authorization', `Bearer ${gerantToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
  });

  it('returns orders for MAGASINIER', async () => {
    const res = await request(app).get('/api/orders').set('Authorization', `Bearer ${magasinierToken}`);
    expect(res.status).toBe(200);
  });
});

describe('GET /api/orders/:id', () => {
  it('returns order by id', async () => {
    const res = await request(app).get('/api/orders/1').set('Authorization', `Bearer ${gerantToken}`);
    expect(res.status).toBe(200);
    expect(res.body.reference).toBe('BC-001');
  });

  it('returns 404 for unknown order', async () => {
    mockFindOrder.mockResolvedValueOnce(null);
    const res = await request(app).get('/api/orders/999').set('Authorization', `Bearer ${gerantToken}`);
    expect(res.status).toBe(404);
  });
});

describe('POST /api/orders', () => {
  it('returns 403 for COMMERCIAL', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${commercialToken}`)
      .send({ supplierId: 1, lines: [{ productId: 1, quantity: 5, unitPrice: 5.99 }] });
    expect(res.status).toBe(403);
  });

  it('validates required fields', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${gerantToken}`)
      .send({ supplierId: 'abc', lines: [] });
    expect(res.status).toBe(400);
  });

  it('creates order for GERANT', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${gerantToken}`)
      .send({ supplierId: 1, lines: [{ productId: 1, quantity: 10, unitPrice: 5.99 }] });
    expect(res.status).toBe(201);
  });

  it('returns 404 for unknown supplier', async () => {
    mockFindSupplier.mockResolvedValueOnce(null);
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${gerantToken}`)
      .send({ supplierId: 999, lines: [{ productId: 1, quantity: 5, unitPrice: 5.99 }] });
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/orders/:id/status', () => {
  it('updates order status', async () => {
    const res = await request(app)
      .patch('/api/orders/1/status')
      .set('Authorization', `Bearer ${gerantToken}`)
      .send({ status: 'ENVOYE' });
    expect(res.status).toBe(200);
  });

  it('rejects invalid status', async () => {
    const res = await request(app)
      .patch('/api/orders/1/status')
      .set('Authorization', `Bearer ${gerantToken}`)
      .send({ status: 'INVALIDE' });
    expect(res.status).toBe(400);
  });

  it('returns 403 for MAGASINIER', async () => {
    const res = await request(app)
      .patch('/api/orders/1/status')
      .set('Authorization', `Bearer ${magasinierToken}`)
      .send({ status: 'ENVOYE' });
    expect(res.status).toBe(403);
  });
});

describe('POST /api/orders/auto', () => {
  it('returns message when no low stock products', async () => {
    const res = await request(app)
      .post('/api/orders/auto')
      .set('Authorization', `Bearer ${gerantToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
  });

  it('returns 403 for MAGASINIER', async () => {
    const res = await request(app)
      .post('/api/orders/auto')
      .set('Authorization', `Bearer ${magasinierToken}`);
    expect(res.status).toBe(403);
  });
});

const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret-key-for-tests';
process.env.NODE_ENV = 'test';

const mockProducts = [
  { id: 1, reference: 'PAP-001', name: 'Ramette A4', price: 5.99, quantity: 150, minThreshold: 20, active: true, category: null, supplier: null },
  { id: 2, reference: 'PAP-002', name: 'Stylo bleu', price: 3.49, quantity: 3, minThreshold: 15, active: true, category: null, supplier: null },
];

const newProduct = { id: 3, reference: 'NEW-001', name: 'Nouveau produit', price: 15.99, quantity: 0, minThreshold: 5, category: null, supplier: null };

// findUnique returns null by default (no duplicate) — specific tests override with mockResolvedValueOnce
const mockFindUnique = jest.fn().mockResolvedValue(null);
const mockCreate = jest.fn().mockResolvedValue(newProduct);
const mockFindMany = jest.fn().mockResolvedValue(mockProducts);
// Reference de champ Prisma, utilisee pour comparer quantity a minThreshold
const mockFields = { minThreshold: Symbol('Product.minThreshold') };

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    product: {
      findMany: mockFindMany,
      count: jest.fn().mockResolvedValue(2),
      fields: mockFields,
      findUnique: mockFindUnique,
      create: mockCreate,
      update: jest.fn().mockResolvedValue(mockProducts[0]),
    },
    $disconnect: jest.fn(),
  })),
}));

const app = require('../src/app');

const gerantToken = jwt.sign({ id: 1, email: 'gerant@test.com', role: 'GERANT', name: 'Test' }, 'test-secret-key-for-tests');
const commercialToken = jwt.sign({ id: 3, email: 'commercial@test.com', role: 'COMMERCIAL', name: 'Test' }, 'test-secret-key-for-tests');

describe('GET /api/products', () => {
  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(401);
  });

  it('should return products list for authenticated user', async () => {
    const res = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${gerantToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
  });

  it('should allow COMMERCIAL to read products', async () => {
    const res = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${commercialToken}`);
    expect(res.status).toBe(200);
  });
});

describe('POST /api/products', () => {
  it('should reject COMMERCIAL creating a product', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${commercialToken}`)
      .send({ reference: 'TEST-001', name: 'Test', price: 10 });
    expect(res.status).toBe(403);
  });

  it('should reject invalid product data', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${gerantToken}`)
      .send({ reference: '', name: '', price: -1 });
    expect(res.status).toBe(400);
  });

  it('should create product for GERANT with valid data', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${gerantToken}`)
      .send({ reference: 'NEW-001', name: 'Nouveau produit', price: 15.99 });
    expect(res.status).toBe(201);
  });

  it('should return 409 for duplicate reference', async () => {
    mockFindUnique.mockResolvedValueOnce(mockProducts[0]);
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${gerantToken}`)
      .send({ reference: 'PAP-001', name: 'Doublon', price: 5.99 });
    expect(res.status).toBe(409);
  });
});

describe('GET /api/products/:id', () => {
  it('returns product by id', async () => {
    mockFindUnique.mockResolvedValueOnce({ ...mockProducts[0], movements: [] });
    const res = await request(app)
      .get('/api/products/1')
      .set('Authorization', `Bearer ${gerantToken}`);
    expect(res.status).toBe(200);
    expect(res.body.reference).toBe('PAP-001');
  });

  it('returns 404 for unknown product', async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const res = await request(app)
      .get('/api/products/999')
      .set('Authorization', `Bearer ${gerantToken}`);
    expect(res.status).toBe(404);
  });

  it('returns 400 for non-integer id', async () => {
    const res = await request(app)
      .get('/api/products/abc')
      .set('Authorization', `Bearer ${gerantToken}`);
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/products/:id', () => {
  it('updates product for GERANT', async () => {
    const res = await request(app)
      .put('/api/products/1')
      .set('Authorization', `Bearer ${gerantToken}`)
      .send({ name: 'Ramette modifiée', price: 6.99, reference: 'PAP-001' });
    expect(res.status).toBe(200);
  });

  it('returns 403 for COMMERCIAL', async () => {
    const res = await request(app)
      .put('/api/products/1')
      .set('Authorization', `Bearer ${commercialToken}`)
      .send({ name: 'Test', price: 5, reference: 'PAP-001' });
    expect(res.status).toBe(403);
  });

  it('validates price on update', async () => {
    const res = await request(app)
      .put('/api/products/1')
      .set('Authorization', `Bearer ${gerantToken}`)
      .send({ name: '', price: -1, reference: 'PAP-001' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/products/:id', () => {
  it('archives product for GERANT', async () => {
    const res = await request(app)
      .delete('/api/products/1')
      .set('Authorization', `Bearer ${gerantToken}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('archivé');
  });

  it('returns 403 for COMMERCIAL', async () => {
    const res = await request(app)
      .delete('/api/products/1')
      .set('Authorization', `Bearer ${commercialToken}`);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/products?lowStock=true', () => {
  beforeEach(() => mockFindMany.mockClear());

  it('filtre en base en comparant quantity a minThreshold, sans filtrage memoire', async () => {
    const res = await request(app)
      .get('/api/products?lowStock=true')
      .set('Authorization', `Bearer ${gerantToken}`);

    expect(res.status).toBe(200);

    // Le filtre doit etre delegue a la base (reference de champ Prisma) : c'est
    // ce qui garde le total et la pagination coherents avec les donnees.
    const where = mockFindMany.mock.calls[0][0].where;
    expect(where.quantity).toEqual({ lte: mockFields.minThreshold });
    expect(where.active).toBe(true);

    // Aucun filtrage supplementaire en memoire : tout ce que renvoie la base
    // est transmis tel quel, sinon data et total divergeraient.
    expect(res.body.data).toHaveLength(mockProducts.length);
    expect(res.body.total).toBe(2);
  });

  it('n\'applique aucun filtre de stock quand lowStock est absent', async () => {
    await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${gerantToken}`);

    expect(mockFindMany.mock.calls[0][0].where.quantity).toBeUndefined();
  });
});

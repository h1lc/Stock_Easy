const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret-key-for-tests';
process.env.NODE_ENV = 'test';

const mockProducts = [
  { id: 1, reference: 'PAP-001', name: 'Ramette A4', price: 5.99, quantity: 150, minThreshold: 20, active: true, category: null, supplier: null },
  { id: 2, reference: 'PAP-002', name: 'Stylo bleu', price: 3.49, quantity: 3, minThreshold: 15, active: true, category: null, supplier: null },
];

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    product: {
      findMany: jest.fn().mockResolvedValue(mockProducts),
      count: jest.fn().mockResolvedValue(2),
      findUnique: jest.fn().mockResolvedValue(mockProducts[0]),
      create: jest.fn().mockResolvedValue({ ...mockProducts[0], id: 3 }),
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
    const { PrismaClient } = require('@prisma/client');
    PrismaClient.mock.results[0].value.product.findUnique.mockResolvedValueOnce(null);

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${gerantToken}`)
      .send({ reference: 'NEW-001', name: 'Nouveau produit', price: 15.99 });
    expect(res.status).toBe(201);
  });
});

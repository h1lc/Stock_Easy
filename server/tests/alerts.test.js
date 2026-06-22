const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret-key-for-tests';
process.env.NODE_ENV = 'test';

const mockProducts = [
  { id: 1, reference: 'PAP-001', name: 'Ramette A4', price: 5.99, quantity: 3, minThreshold: 20, active: true, category: null, supplier: null },
  { id: 2, reference: 'MOB-001', name: 'Bureau', price: 349.99, quantity: 0, minThreshold: 2, active: true, category: null, supplier: null },
  { id: 3, reference: 'PAP-002', name: 'Stylo', price: 3.49, quantity: 50, minThreshold: 10, active: true, category: null, supplier: null },
];

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    product: {
      findMany: jest.fn().mockResolvedValue(mockProducts),
    },
    $disconnect: jest.fn(),
  })),
}));

const app = require('../src/app');

const gerantToken = jwt.sign({ id: 1, email: 'g@test.com', role: 'GERANT', name: 'Test' }, 'test-secret-key-for-tests');
const commercialToken = jwt.sign({ id: 3, email: 'c@test.com', role: 'COMMERCIAL', name: 'Test' }, 'test-secret-key-for-tests');

describe('GET /api/alerts', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/alerts');
    expect(res.status).toBe(401);
  });

  it('returns alerts for GERANT', async () => {
    const res = await request(app).get('/api/alerts').set('Authorization', `Bearer ${gerantToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total');
  });

  it('returns alerts for COMMERCIAL', async () => {
    const res = await request(app).get('/api/alerts').set('Authorization', `Bearer ${commercialToken}`);
    expect(res.status).toBe(200);
  });

  it('only returns products below threshold', async () => {
    const res = await request(app).get('/api/alerts').set('Authorization', `Bearer ${gerantToken}`);
    // PAP-001 (3 <= 20) et MOB-001 (0 <= 2) → 2 alertes ; PAP-002 (50 > 10) → pas d'alerte
    expect(res.body.total).toBe(2);
  });

  it('marks out-of-stock products as RUPTURE', async () => {
    const res = await request(app).get('/api/alerts').set('Authorization', `Bearer ${gerantToken}`);
    const rupture = res.body.data.find(a => a.reference === 'MOB-001');
    expect(rupture.severity).toBe('RUPTURE');
  });

  it('marks low-stock products as ALERTE', async () => {
    const res = await request(app).get('/api/alerts').set('Authorization', `Bearer ${gerantToken}`);
    const alerte = res.body.data.find(a => a.reference === 'PAP-001');
    expect(alerte.severity).toBe('ALERTE');
  });
});

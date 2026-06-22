const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret-key-for-tests';
process.env.NODE_ENV = 'test';

const mockProducts = [
  { id: 1, reference: 'PAP-001', name: 'Ramette A4', price: 5.99, quantity: 50, minThreshold: 20, active: true },
  { id: 2, reference: 'MOB-001', name: 'Bureau', price: 349.99, quantity: 0, minThreshold: 2, active: true },
];

const mockMovements = [
  { id: 1, type: 'ENTREE', quantity: 10, createdAt: new Date(), product: { name: 'Ramette A4', reference: 'PAP-001' } },
  { id: 2, type: 'SORTIE', quantity: 5, createdAt: new Date(), product: { name: 'Bureau', reference: 'MOB-001' } },
];

const mockOrders = [
  { id: 1, reference: 'BC-001', status: 'ENVOYE', totalPrice: 100, createdAt: new Date(), supplier: { name: 'Bureau Plus' }, createdBy: { name: 'Jean' }, lines: [] },
];

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    product: {
      findMany: jest.fn().mockResolvedValue(mockProducts),
      count: jest.fn().mockResolvedValue(2),
    },
    stockMovement: {
      findMany: jest.fn().mockResolvedValue(mockMovements),
    },
    purchaseOrder: {
      findMany: jest.fn().mockResolvedValue(mockOrders),
    },
    $disconnect: jest.fn(),
  })),
}));

const app = require('../src/app');

const gerantToken = jwt.sign({ id: 1, email: 'g@test.com', role: 'GERANT', name: 'Test' }, 'test-secret-key-for-tests');
const magasinierToken = jwt.sign({ id: 2, email: 'm@test.com', role: 'MAGASINIER', name: 'Test' }, 'test-secret-key-for-tests');

describe('GET /api/dashboard', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(401);
  });

  it('returns 403 for MAGASINIER', async () => {
    const res = await request(app).get('/api/dashboard').set('Authorization', `Bearer ${magasinierToken}`);
    expect(res.status).toBe(403);
  });

  it('returns dashboard data for GERANT', async () => {
    const res = await request(app).get('/api/dashboard').set('Authorization', `Bearer ${gerantToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('kpis');
    expect(res.body).toHaveProperty('movementsByDay');
    expect(res.body).toHaveProperty('recentMovements');
    expect(res.body).toHaveProperty('topAlerts');
  });

  it('KPIs contain expected fields', async () => {
    const res = await request(app).get('/api/dashboard').set('Authorization', `Bearer ${gerantToken}`);
    const { kpis } = res.body;
    expect(kpis).toHaveProperty('totalProducts');
    expect(kpis).toHaveProperty('stockValue');
    expect(kpis).toHaveProperty('lowStockCount');
    expect(kpis).toHaveProperty('outOfStockCount');
    expect(kpis).toHaveProperty('pendingOrders');
  });

  it('detects out-of-stock products in KPIs', async () => {
    const res = await request(app).get('/api/dashboard').set('Authorization', `Bearer ${gerantToken}`);
    expect(res.body.kpis.outOfStockCount).toBe(1);
  });

  it('movementsByDay has 7 entries', async () => {
    const res = await request(app).get('/api/dashboard').set('Authorization', `Bearer ${gerantToken}`);
    expect(res.body.movementsByDay).toHaveLength(7);
  });
});

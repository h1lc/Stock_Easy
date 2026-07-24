const request = require('supertest');

// Mock Prisma before requiring app
jest.mock('@prisma/client', () => {
  const mockUser = {
    id: 1,
    email: 'gerant@dupont-fils.fr',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    name: 'Jean Dupont',
    role: 'GERANT',
    active: true,
  };
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      user: {
        findUnique: jest.fn().mockResolvedValue(mockUser),
        findFirst: jest.fn().mockResolvedValue(mockUser),
        // Le login stocke le refresh token en base apres authentification
        update: jest.fn().mockResolvedValue(mockUser),
      },
      $disconnect: jest.fn(),
    })),
  };
});

process.env.JWT_SECRET = 'test-secret-key-for-tests';
process.env.NODE_ENV = 'test';

const app = require('../src/app');

describe('POST /api/auth/login', () => {
  it('should reject invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'notanemail', password: 'password123' });
    expect(res.status).toBe(400);
  });

  it('should reject empty password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: '' });
    expect(res.status).toBe(400);
  });

  it('should return 401 for wrong credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'gerant@dupont-fils.fr', password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  it('should return a token for valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'gerant@dupont-fils.fr', password: 'password' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toMatchObject({ role: 'GERANT' });
  });
});

describe('GET /api/auth/me', () => {
  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('should return 403 with invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalidtoken');
    expect(res.status).toBe(403);
  });
});

describe('GET /api/health', () => {
  it('should return ok status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

const request = require('supertest');
const bcrypt = require('bcryptjs');
const { createApp } = require('../app');
const User = require('../models/User');

let app;

beforeAll(() => {
  app = createApp().app;
});

describe('Health', () => {
  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.db).toBe('connected');
  });
});

describe('Auth', () => {
  it('POST /api/auth/login rejects invalid credentials', async () => {
    await User.create({
      email: 'test@example.com',
      passwordHash: await bcrypt.hash('ValidPass1!', 10),
      role: 'admin',
      passwordMeetsPolicy: true,
      isActive: true,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'wrong' });

    expect(res.status).toBe(400);
  });

  it('POST /api/auth/login succeeds with valid credentials', async () => {
    await User.create({
      email: 'admin2@example.com',
      passwordHash: await bcrypt.hash('ValidPass1!', 10),
      role: 'admin',
      passwordMeetsPolicy: true,
      isActive: true,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin2@example.com', password: 'ValidPass1!' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.role).toBe('admin');
  });

  it('POST /api/auth/register respects ALLOW_PUBLIC_REGISTER=false', async () => {
    const prev = process.env.ALLOW_PUBLIC_REGISTER;
    process.env.ALLOW_PUBLIC_REGISTER = 'false';

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'new@example.com', password: 'ValidPass1!', name: 'Test' });

    expect(res.status).toBe(403);

    process.env.ALLOW_PUBLIC_REGISTER = prev ?? 'true';
  });
});

describe('Public catalog', () => {
  it('GET /api/products returns empty list', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBe(0);
  });

  it('GET /api/categories returns array', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('Protected admin', () => {
  it('GET /api/admin/orders without token returns 401', async () => {
    const res = await request(app).get('/api/admin/orders');
    expect(res.status).toBe(401);
  });
});

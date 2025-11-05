import request from 'supertest';
import app from '../app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Auth Routes', () => {
  beforeEach(async () => {
    // Clean database before each test
    await prisma.message.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    const validUser = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'SecurePass123',
    };

    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser)
        .expect(201);

      expect(res.body).toHaveProperty('user');
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.name).toBe(validUser.name);
      expect(res.body.user.email).toBe(validUser.email);
      expect(res.body.user).not.toHaveProperty('password');
      expect(typeof res.body.token).toBe('string');
    });

    it('should return 400/409 for duplicate email', async () => {
      // First registration
      await request(app).post('/api/auth/register').send(validUser);

      // Duplicate registration
      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect([400, 409]).toContain(res.status);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 for missing name', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Pass123',
        })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 for missing email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          password: 'Pass123',
        })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 for missing password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
        })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/login', () => {
    const testUser = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'SecurePass123',
    };

    beforeEach(async () => {
      // Create user before each login test
      await request(app).post('/api/auth/register').send(testUser);
    });

    it('should login successfully with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(res.body).toHaveProperty('user');
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body.user).not.toHaveProperty('password');
      expect(typeof res.body.token).toBe('string');
    });

    it('should return 401 for wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123',
        })
        .expect(401);

      expect(res.body).toHaveProperty('error');
      expect(res.body).not.toHaveProperty('token');
    });

    it('should return 401 for non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword123',
        })
        .expect(401);

      expect(res.body).toHaveProperty('error');
      expect(res.body).not.toHaveProperty('token');
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken: string;

    beforeEach(async () => {
      // Register user and get token
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Auth User',
          email: 'auth@example.com',
          password: 'SecurePass123',
        });

      authToken = res.body.token;
    });

    it('should return user data with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user).toHaveProperty('email');
      expect(res.body.user).toHaveProperty('name');
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(res.body).toHaveProperty('error');
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      expect(res.body).toHaveProperty('error');
    });
  });
});
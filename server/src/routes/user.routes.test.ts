import request from 'supertest';
import app from '../app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('User Routes', () => {
  let token: string;
  let userId: string;

  beforeAll(async () => {
    await prisma.message.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.user.deleteMany();

    // Register a test user
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Alice',
        email: 'alice@test.com',
        password: 'Password123',
      })
      .expect(201);

    token = res.body.token;
    userId = res.body.user.id;

    // Add extra users
    await prisma.user.createMany({
      data: [
        { name: 'Alice Wonderland', email: 'alice2@test.com', passwordHash: 'hash' },
        { name: 'Bob Builder', email: 'bob@test.com', passwordHash: 'hash' },
      ],
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // --------------------------------------------------
  // 1️⃣ GET /api/users/:id
  // --------------------------------------------------
  describe('GET /api/users/:id', () => {
    it('should return user when exists', async () => {
      const res = await request(app)
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const user = res.body.user;
      expect(user).toHaveProperty('id', userId);
      expect(user).toHaveProperty('email', 'alice@test.com');
      expect(user).not.toHaveProperty('passwordHash');
    });

    it('should return 404 when not exists', async () => {
      const res = await request(app)
        .get('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body).toHaveProperty('error');
    });
  });

  // --------------------------------------------------
  // 2️⃣ PUT /api/users/me
  // --------------------------------------------------
  describe('PUT /api/users/me', () => {
    it('should update name successfully', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Alice Updated' })
        .expect(200);

      expect(res.body.user).toHaveProperty('name', 'Alice Updated');

      const updated = await prisma.user.findUnique({ where: { id: userId } });
      expect(updated?.name).toBe('Alice Updated');
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .send({ name: 'Unauthorized' })
        .expect(401);

      expect(res.body).toHaveProperty('error');
    });
  });

  // --------------------------------------------------
  // 3️⃣ GET /api/users/search?q=alice
  // --------------------------------------------------
  describe('GET /api/users/search', () => {
    it('should return matching users (case-insensitive)', async () => {
      const res = await request(app)
        .get('/api/users/search?q=ALICE')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const users = res.body.users;
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0);
      expect(
        users.some((u: any) => u.name.toLowerCase().includes('alice'))
      ).toBe(true);
    });

    it('should return empty array if no match', async () => {
      const res = await request(app)
        .get('/api/users/search?q=nomatch')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.users).toEqual([]);
    });
  });

  // --------------------------------------------------
  // 4️⃣ GET /api/users?excludeMe=true
  // --------------------------------------------------
  describe('GET /api/users?excludeMe=true', () => {
    it('should return all users except authenticated user', async () => {
      const res = await request(app)
        .get('/api/users?excludeMe=true')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const users = res.body.users;
      expect(Array.isArray(users)).toBe(true);

      const ids = users.map((u: any) => u.id);
      expect(ids).not.toContain(userId);
      expect(users.length).toBeGreaterThanOrEqual(2);
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .get('/api/users?excludeMe=true')
        .expect(401);

      expect(res.body).toHaveProperty('error');
    });
  });
});

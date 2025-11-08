import request from 'supertest';
import app from '../app';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../utils/hash';

const prisma = new PrismaClient();

describe('Conversation Routes', () => {
  let user1Token: string;
  let user2Token: string;
  let user1Id: string;
  let user2Id: string;
  let user3Id: string;

  // Setup: Create test users before all tests
  beforeAll(async () => {
    // Clean up existing test data
    await prisma.messageReaction.deleteMany();
    await prisma.message.deleteMany();
    await prisma.participant.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'conv.user1@test.com',
            'conv.user2@test.com',
            'conv.user3@test.com',
          ],
        },
      },
    });

    // Create user 1
    const user1 = await prisma.user.create({
      data: {
        name: 'Conversation User 1',
        email: 'conv.user1@test.com',
        passwordHash: await hashPassword('password123'),
      },
    });
    user1Id = user1.id;

    // Create user 2
    const user2 = await prisma.user.create({
      data: {
        name: 'Conversation User 2',
        email: 'conv.user2@test.com',
        passwordHash: await hashPassword('password123'),
      },
    });
    user2Id = user2.id;

    // Create user 3
    const user3 = await prisma.user.create({
      data: {
        name: 'Conversation User 3',
        email: 'conv.user3@test.com',
        passwordHash: await hashPassword('password123'),
      },
    });
    user3Id = user3.id;

    // Get tokens for user1 and user2
    const user1Login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'conv.user1@test.com', password: 'password123' });
    user1Token = user1Login.body.token;

    const user2Login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'conv.user2@test.com', password: 'password123' });
    user2Token = user2Login.body.token;
  });

  // Cleanup after all tests
  afterAll(async () => {
    await prisma.messageReaction.deleteMany();
    await prisma.message.deleteMany();
    await prisma.participant.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'conv.user1@test.com',
            'conv.user2@test.com',
            'conv.user3@test.com',
          ],
        },
      },
    });
    await prisma.$disconnect();
  });

  // --------------------------------------------------
  // 1️⃣ POST /api/conversations
  // --------------------------------------------------
  describe('POST /api/conversations', () => {
    it('should create a 1-on-1 conversation', async () => {
      const response = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          participantIds: [user2Id],
          isGroup: false,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.conversation).toBeDefined();
      expect(response.body.conversation.isGroup).toBe(false);
      expect(response.body.conversation.participants).toHaveLength(2);
      
      // Check that creator is admin
      const creator = response.body.conversation.participants.find(
        (p: any) => p.userId === user1Id
      );
      expect(creator).toBeDefined();
      expect(creator.role).toBe('admin');
      
      // Check that other participant is member
      const member = response.body.conversation.participants.find(
        (p: any) => p.userId === user2Id
      );
      expect(member).toBeDefined();
      expect(member.role).toBe('member');
    });

    it('should create a group conversation', async () => {
      const response = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          participantIds: [user2Id, user3Id],
          title: 'Test Group',
          isGroup: true,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.conversation).toBeDefined();
      expect(response.body.conversation.isGroup).toBe(true);
      expect(response.body.conversation.title).toBe('Test Group');
      expect(response.body.conversation.participants).toHaveLength(3);
      
      // Verify all participants
      const participantIds = response.body.conversation.participants.map(
        (p: any) => p.userId
      );
      expect(participantIds).toContain(user1Id);
      expect(participantIds).toContain(user2Id);
      expect(participantIds).toContain(user3Id);
    });

    it('should fail without participants', async () => {
      const response = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          participantIds: [],
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/cannot be empty/i);
    });

    it('should fail with invalid participantIds type', async () => {
      const response = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          participantIds: 'not-an-array',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/must be an array/i);
    });

    it('should fail without authentication', async () => {
      await request(app)
        .post('/api/conversations')
        .send({
          participantIds: [user2Id],
        })
        .expect(401);
    });
  });

  // --------------------------------------------------
  // 2️⃣ GET /api/conversations
  // --------------------------------------------------
  describe('GET /api/conversations', () => {
    let conversationId: string;

    beforeAll(async () => {
      // Create a conversation with a message
      const convResponse = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          participantIds: [user2Id],
        })
        .expect(201);
      conversationId = convResponse.body.conversation.id;

      // Send a message
      await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          content: 'Test message for conversation list',
        });
    });

    it('should return user\'s conversations', async () => {
      const response = await request(app)
        .get('/api/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.conversations).toBeDefined();
      expect(Array.isArray(response.body.conversations)).toBe(true);
      expect(response.body.conversations.length).toBeGreaterThan(0);
    });

    it('should include participants and last message', async () => {
      const response = await request(app)
        .get('/api/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      const conversation = response.body.conversations.find(
        (c: any) => c.id === conversationId
      );
      
      expect(conversation).toBeDefined();
      expect(conversation.participants).toBeDefined();
      expect(conversation.participants.length).toBeGreaterThan(0);
      
      // Check participant has user data
      expect(conversation.participants[0].user).toBeDefined();
      expect(conversation.participants[0].user.name).toBeDefined();
      expect(conversation.participants[0].user.email).toBeDefined();
      
      // Check last message
      expect(conversation.lastMessage).toBeDefined();
      expect(conversation.lastMessage.content).toBe('Test message for conversation list');
    });

    it('should return empty array for new user with no conversations', async () => {
      // Create a new user
      const newUser = await prisma.user.create({
        data: {
          name: 'New User',
          email: 'newuser.conv@test.com',
          passwordHash: await hashPassword('password123'),
        },
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'newuser.conv@test.com', password: 'password123' });

      const response = await request(app)
        .get('/api/conversations')
        .set('Authorization', `Bearer ${loginResponse.body.token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.conversations).toEqual([]);

      // Cleanup
      await prisma.user.delete({ where: { id: newUser.id } });
    });

    it('should fail without authentication', async () => {
      await request(app)
        .get('/api/conversations')
        .expect(401);
    });
  });

  // --------------------------------------------------
  // 3️⃣ GET /api/conversations/:id
  // --------------------------------------------------
  describe('GET /api/conversations/:id', () => {
    let conversationId: string;
    let privateConversationId: string;

    beforeAll(async () => {
      // Create a conversation that user1 is part of
      const conv1Response = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          participantIds: [user2Id],
        })
        .expect(201);
      conversationId = conv1Response.body.conversation.id;

      // Create a conversation that user1 is NOT part of
      const conv2Response = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          participantIds: [user3Id],
        })
        .expect(201);
      privateConversationId = conv2Response.body.conversation.id;
    });

    it('should return conversation if user is participant', async () => {
      const response = await request(app)
        .get(`/api/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.conversation).toBeDefined();
      expect(response.body.conversation.id).toBe(conversationId);
      expect(response.body.conversation.participants).toBeDefined();
    });

    it('should fail if user is not participant', async () => {
      const response = await request(app)
        .get(`/api/conversations/${privateConversationId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(500);

      expect(response.body.error).toBeDefined();
    });

    it('should return 404 for non-existent conversation', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/conversations/${fakeId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(500);

      expect(response.body.error).toBeDefined();
    });

    it('should fail without authentication', async () => {
      await request(app)
        .get(`/api/conversations/${conversationId}`)
        .expect(401);
    });
  });

  // --------------------------------------------------
  // 4️⃣ POST /api/conversations/:id/participants
  // --------------------------------------------------
  describe('POST /api/conversations/:id/participants', () => {
    let conversationId: string;

    beforeEach(async () => {
      // Create a fresh conversation for each test
      const convResponse = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          participantIds: [user2Id],
          isGroup: true,
        })
        .expect(201);
      conversationId = convResponse.body.conversation.id;
    });

    it('should allow admin to add participant', async () => {
      const response = await request(app)
        .post(`/api/conversations/${conversationId}/participants`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          userId: user3Id,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.conversation).toBeDefined();
      
      // Verify user3 is now a participant
      const user3Participant = response.body.conversation.participants.find(
        (p: any) => p.userId === user3Id
      );
      expect(user3Participant).toBeDefined();
      expect(user3Participant.role).toBe('member');
    });

    it('should fail if non-admin tries to add participant', async () => {
      const response = await request(app)
        .post(`/api/conversations/${conversationId}/participants`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          userId: user3Id,
        })
        .expect(500);

      expect(response.body.error).toBeDefined();
    });

    it('should fail without userId in request body', async () => {
      const response = await request(app)
        .post(`/api/conversations/${conversationId}/participants`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/userId is required/i);
    });

    it('should fail without authentication', async () => {
      await request(app)
        .post(`/api/conversations/${conversationId}/participants`)
        .send({
          userId: user3Id,
        })
        .expect(401);
    });
  });

  // --------------------------------------------------
  // 5️⃣ DELETE /api/conversations/:id/participants
  // --------------------------------------------------
  describe('DELETE /api/conversations/:id/participants', () => {
    let conversationId: string;

    beforeEach(async () => {
      // Create a conversation with all three users
      const convResponse = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          participantIds: [user2Id, user3Id],
          isGroup: true,
        })
        .expect(201);
      conversationId = convResponse.body.conversation.id;
    });

    it('should allow admin to remove participant', async () => {
      const response = await request(app)
        .delete(`/api/conversations/${conversationId}/participants`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          userId: user3Id,
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify user3 is removed
      const convResponse = await request(app)
        .get(`/api/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      const user3Participant = convResponse.body.conversation.participants.find(
        (p: any) => p.userId === user3Id
      );
      expect(user3Participant).toBeUndefined();
    });

    it('should allow participant to remove self', async () => {
      const response = await request(app)
        .delete(`/api/conversations/${conversationId}/participants`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          userId: user2Id,
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify user2 is removed
      const convResponse = await request(app)
        .get(`/api/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      const user2Participant = convResponse.body.conversation.participants.find(
        (p: any) => p.userId === user2Id
      );
      expect(user2Participant).toBeUndefined();
    });

    it('should fail if non-admin tries to remove another participant', async () => {
      const response = await request(app)
        .delete(`/api/conversations/${conversationId}/participants`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          userId: user3Id,
        })
        .expect(500);

      expect(response.body.error).toBeDefined();
    });

    it('should fail without userId in request body', async () => {
      const response = await request(app)
        .delete(`/api/conversations/${conversationId}/participants`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/userId is required/i);
    });

    it('should fail without authentication', async () => {
      await request(app)
        .delete(`/api/conversations/${conversationId}/participants`)
        .send({
          userId: user3Id,
        })
        .expect(401);
    });
  });

  // --------------------------------------------------
  // 6️⃣ Integration: Full Conversation Lifecycle
  // --------------------------------------------------
  describe('Integration: Full Conversation Lifecycle', () => {
    it('should complete full conversation lifecycle: create -> add participant -> send message -> remove participant', async () => {
      // 1. Create conversation
      const createResponse = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          participantIds: [user2Id],
          title: 'Lifecycle Test',
          isGroup: true,
        })
        .expect(201);

      const conversationId = createResponse.body.conversation.id;
      expect(createResponse.body.conversation.participants).toHaveLength(2);

      // 2. Add participant
      const addResponse = await request(app)
        .post(`/api/conversations/${conversationId}/participants`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          userId: user3Id,
        })
        .expect(200);

      expect(addResponse.body.conversation.participants).toHaveLength(3);

      // 3. Send message
      const messageResponse = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          content: 'Lifecycle test message',
        })
        .expect(201);

      expect(messageResponse.body.message).toBeDefined();

      // 4. Remove participant
      const removeResponse = await request(app)
        .delete(`/api/conversations/${conversationId}/participants`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          userId: user3Id,
        })
        .expect(200);

      expect(removeResponse.body.success).toBe(true);

      // 5. Verify final state
      const finalResponse = await request(app)
        .get(`/api/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(finalResponse.body.conversation.participants).toHaveLength(2);
      expect(finalResponse.body.conversation.lastMessage).toBeDefined();
    });

    it('should allow multiple users to create and manage conversations', async () => {
      // User1 creates a conversation with User2
      const conv1 = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          participantIds: [user2Id],
        })
        .expect(201);

      // User2 creates a conversation with User3
      const conv2 = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          participantIds: [user3Id],
        })
        .expect(201);

      // User1 should see their conversation
      const user1Convs = await request(app)
        .get('/api/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      const user1ConvIds = user1Convs.body.conversations.map((c: any) => c.id);
      expect(user1ConvIds).toContain(conv1.body.conversation.id);
      expect(user1ConvIds).not.toContain(conv2.body.conversation.id);

      // User2 should see both conversations
      const user2Convs = await request(app)
        .get('/api/conversations')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      const user2ConvIds = user2Convs.body.conversations.map((c: any) => c.id);
      expect(user2ConvIds).toContain(conv1.body.conversation.id);
      expect(user2ConvIds).toContain(conv2.body.conversation.id);
    });
  });
});
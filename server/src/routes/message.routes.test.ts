import request from 'supertest';
import app from '../app';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../utils/hash';

const prisma = new PrismaClient();

describe('Message Routes', () => {
  let aliceToken: string;
  let aliceId: string;
  let bobToken: string;
  let bobId: string;
  let carolToken: string;
  let carolId: string;
  let conversationId: string;

  // Setup: Create test users and conversation
  beforeAll(async () => {
    // Clean up existing test data
    await prisma.message.deleteMany({});
    await prisma.participant.deleteMany({});
    await prisma.conversation.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['alice.msg@test.com', 'bob.msg@test.com', 'carol.msg@test.com'],
        },
      },
    });

    // Create Alice
    const alice = await prisma.user.create({
      data: {
        name: 'Alice Message',
        email: 'alice.msg@test.com',
        passwordHash: await hashPassword('password123'),
      },
    });
    aliceId = alice.id;

    // Create Bob
    const bob = await prisma.user.create({
      data: {
        name: 'Bob Message',
        email: 'bob.msg@test.com',
        passwordHash: await hashPassword('password123'),
      },
    });
    bobId = bob.id;

    // Create Carol (not in the conversation)
    const carol = await prisma.user.create({
      data: {
        name: 'Carol Message',
        email: 'carol.msg@test.com',
        passwordHash: await hashPassword('password123'),
      },
    });
    carolId = carol.id;

    // Get tokens for all users
    const aliceLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice.msg@test.com', password: 'password123' });
    aliceToken = aliceLogin.body.token;

    const bobLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bob.msg@test.com', password: 'password123' });
    bobToken = bobLogin.body.token;

    const carolLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'carol.msg@test.com', password: 'password123' });
    carolToken = carolLogin.body.token;

    // Create a conversation between Alice and Bob
    const conversation = await prisma.conversation.create({
      data: {
        isGroup: false,
        participants: {
          create: [
            { userId: aliceId },
            { userId: bobId },
          ],
        },
      },
    });
    conversationId = conversation.id;
  });

  afterAll(async () => {
    // Clean up
    await prisma.message.deleteMany({});
    await prisma.participant.deleteMany({});
    await prisma.conversation.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['alice.msg@test.com', 'bob.msg@test.com', 'carol.msg@test.com'],
        },
      },
    });
    await prisma.$disconnect();
  });

  // --------------------------------------------------
  // 1️⃣ POST /api/conversations/:id/messages
  // --------------------------------------------------
  describe('POST /api/conversations/:id/messages', () => {
    it('should send a message successfully', async () => {
      const response = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          content: 'Hello Bob!',
        });

      if (response.status !== 201) {
        console.log('Error response:', response.status, response.body);
      }
      expect(response.status).toBe(201);

      expect(response.body.message).toBeDefined();
      expect(response.body.message.content).toBe('Hello Bob!');
      expect(response.body.message.senderId).toBe(aliceId);
      expect(response.body.message.conversationId).toBe(conversationId);
      expect(response.body.message.sender).toBeDefined();
      expect(response.body.message.sender.name).toBe('Alice Message');
      expect(response.body.message.status).toBe('sent');
    });

    it('should send a message with attachments', async () => {
      const response = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          content: 'Check this out!',
          attachments: [
            {
              type: 'image',
              url: 'https://example.com/image.jpg',
              name: 'photo.jpg',
              size: 102400,
            },
          ],
        })
        .expect(201);

      expect(response.body.message.content).toBe('Check this out!');
      expect(response.body.message.attachments).toBeDefined();
      expect(Array.isArray(response.body.message.attachments)).toBe(true);
      expect(response.body.message.attachments.length).toBe(1);
      expect(response.body.message.attachments[0].type).toBe('image');
    });

    it('should fail if user is not a participant', async () => {
      const response = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${carolToken}`)
        .send({
          content: 'I should not be able to send this',
        })
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    it('should fail with empty content', async () => {
      const response = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          content: '',
        })
        .expect(400);

      expect(response.body.error).toMatch(/content/i);
    });

    it('should fail with only whitespace content', async () => {
      const response = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          content: '   ',
        })
        .expect(400);

      expect(response.body.error).toMatch(/content/i);
    });

    it('should fail without authentication', async () => {
      await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .send({
          content: 'No auth',
        })
        .expect(401);
    });
  });

  // --------------------------------------------------
  // 2️⃣ GET /api/conversations/:id/messages
  // --------------------------------------------------
  describe('GET /api/conversations/:id/messages', () => {
    let messageIds: string[] = [];

    beforeAll(async () => {
      // Create multiple messages for testing
      for (let i = 1; i <= 10; i++) {
        const message = await prisma.message.create({
          data: {
            conversationId: conversationId,
            senderId: i % 2 === 0 ? aliceId : bobId,
            content: `Test message ${i}`,
            status: 'sent',
          },
        });
        messageIds.push(message.id.toString());
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    });

    it('should return messages for participant', async () => {
      const response = await request(app)
        .get(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(200);

      expect(response.body.messages).toBeDefined();
      expect(Array.isArray(response.body.messages)).toBe(true);
      expect(response.body.messages.length).toBeGreaterThan(0);
      expect(response.body.nextCursor).toBeDefined();
      expect(response.body.hasMore).toBeDefined();
    });

    it('should return messages with sender information', async () => {
      const response = await request(app)
        .get(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(200);

      const firstMessage = response.body.messages[0];
      expect(firstMessage.sender).toBeDefined();
      expect(firstMessage.sender.id).toBeDefined();
      expect(firstMessage.sender.name).toBeDefined();
      expect(firstMessage.sender.email).toBeDefined();
    });

    it('should fail if user is not a participant', async () => {
      const response = await request(app)
        .get(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${carolToken}`)
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    it('should return empty array for new conversation', async () => {
      // Create a new conversation with no messages
      const newConv = await prisma.conversation.create({
        data: {
          isGroup: false,
          participants: {
            create: [
              { userId: aliceId },
              { userId: carolId },
            ],
          },
        },
      });

      const response = await request(app)
        .get(`/api/conversations/${newConv.id}/messages`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(200);

      expect(response.body.messages).toEqual([]);
      expect(response.body.hasMore).toBe(false);
      expect(response.body.nextCursor).toBeNull();

      // Cleanup
      await prisma.participant.deleteMany({ where: { conversationId: newConv.id } });
      await prisma.conversation.delete({ where: { id: newConv.id } });
    });

    it('should fail without authentication', async () => {
      await request(app)
        .get(`/api/conversations/${conversationId}/messages`)
        .expect(401);
    });
  });

  // --------------------------------------------------
  // 3️⃣ Pagination Tests
  // --------------------------------------------------
  describe('Pagination', () => {
    it('should return correct limit of messages', async () => {
      const response = await request(app)
        .get(`/api/conversations/${conversationId}/messages?limit=5`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(200);

      expect(response.body.messages.length).toBeLessThanOrEqual(5);
    });

    it('should work with cursor-based pagination', async () => {
      // Get first page
      const firstPage = await request(app)
        .get(`/api/conversations/${conversationId}/messages?limit=3`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(200);

      expect(firstPage.body.messages.length).toBe(3);
      expect(firstPage.body.nextCursor).toBeDefined();
      expect(firstPage.body.hasMore).toBe(true);

      const cursor = firstPage.body.nextCursor;
      const firstPageLastId = firstPage.body.messages[2].id;

      // Get second page
      const secondPage = await request(app)
        .get(`/api/conversations/${conversationId}/messages?limit=3&cursor=${cursor}`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(200);

      expect(secondPage.body.messages.length).toBeGreaterThan(0);
      
      // Verify second page doesn't contain messages from first page
      const secondPageIds = secondPage.body.messages.map((m: any) => m.id);
      expect(secondPageIds).not.toContain(firstPageLastId);
    });

    it('should have accurate hasMore flag', async () => {
      // Get all messages with a large limit
      const allMessages = await request(app)
        .get(`/api/conversations/${conversationId}/messages?limit=100`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(200);

      expect(allMessages.body.hasMore).toBe(false);
      expect(allMessages.body.nextCursor).toBeNull();
    });

    it('should return messages in descending order (newest first)', async () => {
      const response = await request(app)
        .get(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(200);

      const messages = response.body.messages;
      
      if (messages.length > 1) {
        for (let i = 0; i < messages.length - 1; i++) {
          const current = new Date(messages[i].createdAt);
          const next = new Date(messages[i + 1].createdAt);
          expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
        }
      }
    });

    it('should reject invalid limit values', async () => {
      const response = await request(app)
        .get(`/api/conversations/${conversationId}/messages?limit=0`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(400);

      expect(response.body.error).toMatch(/limit/i);
    });
  });

  // --------------------------------------------------
  // 4️⃣ PUT /api/messages/:id
  // --------------------------------------------------
  describe('PUT /api/messages/:id', () => {
    let aliceMessageId: string;
    let bobMessageId: string;

    beforeAll(async () => {
      // Create messages for Alice and Bob
      const aliceMessage = await prisma.message.create({
        data: {
          conversationId: conversationId,
          senderId: aliceId,
          content: 'Alice original message',
          status: 'sent',
        },
      });
      aliceMessageId = aliceMessage.id.toString();

      const bobMessage = await prisma.message.create({
        data: {
          conversationId: conversationId,
          senderId: bobId,
          content: 'Bob original message',
          status: 'sent',
        },
      });
      bobMessageId = bobMessage.id.toString();
    });

    it('should allow user to edit own message', async () => {
      const response = await request(app)
        .put(`/api/messages/${aliceMessageId}`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          content: 'Alice updated message',
        })
        .expect(200);

      expect(response.body.message).toBeDefined();
      expect(response.body.message.content).toBe('Alice updated message');
      expect(response.body.message.id).toBe(aliceMessageId);
    });

    it('should set editedAt timestamp when editing', async () => {
      const response = await request(app)
        .put(`/api/messages/${aliceMessageId}`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          content: 'Alice updated again',
        })
        .expect(200);

      expect(response.body.message.editedAt).not.toBeNull();
      expect(new Date(response.body.message.editedAt)).toBeInstanceOf(Date);
    });

    it('should not allow user to edit another user\'s message', async () => {
      const response = await request(app)
        .put(`/api/messages/${bobMessageId}`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          content: 'Alice trying to edit Bob\'s message',
        })
        .expect(403);

      expect(response.body.error).toMatch(/not authorized/i);
    });

    it('should fail with empty content', async () => {
      const response = await request(app)
        .put(`/api/messages/${aliceMessageId}`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          content: '',
        })
        .expect(400);

      expect(response.body.error).toMatch(/content/i);
    });

    it('should fail for non-existent message', async () => {
      const response = await request(app)
        .put(`/api/messages/999999999`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          content: 'Update non-existent message',
        })
        .expect(404);

      expect(response.body.error).toMatch(/not found/i);
    });

    it('should fail without authentication', async () => {
      await request(app)
        .put(`/api/messages/${aliceMessageId}`)
        .send({
          content: 'No auth update',
        })
        .expect(401);
    });
  });

  // --------------------------------------------------
  // 5️⃣ DELETE /api/messages/:id
  // --------------------------------------------------
  describe('DELETE /api/messages/:id', () => {
    let aliceDeleteMessageId: string;
    let bobDeleteMessageId: string;

    beforeEach(async () => {
      // Create fresh messages for each delete test
      const aliceMessage = await prisma.message.create({
        data: {
          conversationId: conversationId,
          senderId: aliceId,
          content: 'Alice message to delete',
          status: 'sent',
        },
      });
      aliceDeleteMessageId = aliceMessage.id.toString();

      const bobMessage = await prisma.message.create({
        data: {
          conversationId: conversationId,
          senderId: bobId,
          content: 'Bob message to delete',
          status: 'sent',
        },
      });
      bobDeleteMessageId = bobMessage.id.toString();
    });

    it('should allow user to delete own message', async () => {
      await request(app)
        .delete(`/api/messages/${aliceDeleteMessageId}`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(200);
    });

    it('should soft delete message (content becomes "[deleted]")', async () => {
      await request(app)
        .delete(`/api/messages/${aliceDeleteMessageId}`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(200);

      // Verify the message still exists but content is "[deleted]"
      const deletedMessage = await prisma.message.findUnique({
        where: { id: BigInt(aliceDeleteMessageId) },
      });

      expect(deletedMessage).not.toBeNull();
      expect(deletedMessage?.content).toBe('[deleted]');
      expect(deletedMessage?.editedAt).not.toBeNull();
    });

    it('should not allow user to delete another user\'s message', async () => {
      const response = await request(app)
        .delete(`/api/messages/${bobDeleteMessageId}`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(403);

      expect(response.body.error).toMatch(/not authorized/i);
    });

    it('should fail for non-existent message', async () => {
      const response = await request(app)
        .delete(`/api/messages/999999999`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(404);

      expect(response.body.error).toMatch(/not found/i);
    });

    it('should fail without authentication', async () => {
      await request(app)
        .delete(`/api/messages/${aliceDeleteMessageId}`)
        .expect(401);
    });

    it('should set editedAt timestamp when deleting', async () => {
      const beforeDelete = await prisma.message.findUnique({
        where: { id: BigInt(aliceDeleteMessageId) },
      });

      await request(app)
        .delete(`/api/messages/${aliceDeleteMessageId}`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(200);

      const afterDelete = await prisma.message.findUnique({
        where: { id: BigInt(aliceDeleteMessageId) },
      });

      expect(afterDelete?.editedAt).not.toBeNull();
      expect(afterDelete?.editedAt).not.toEqual(beforeDelete?.editedAt);
    });
  });

  // --------------------------------------------------
  // 6️⃣ Integration: Full Message Lifecycle
  // --------------------------------------------------
  describe('Integration: Full Message Lifecycle', () => {
    it('should complete full message lifecycle: create -> edit -> delete', async () => {
      // 1. Create message
      const createResponse = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          content: 'Lifecycle test message',
        })
        .expect(201);

      const messageId = createResponse.body.message.id;
      expect(createResponse.body.message.editedAt).toBeNull();

      // 2. Edit message
      const editResponse = await request(app)
        .put(`/api/messages/${messageId}`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          content: 'Lifecycle test message - edited',
        })
        .expect(200);

      expect(editResponse.body.message.content).toBe('Lifecycle test message - edited');
      expect(editResponse.body.message.editedAt).not.toBeNull();

      // 3. Delete message
      await request(app)
        .delete(`/api/messages/${messageId}`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(200);

      // 4. Verify deletion
      const messages = await request(app)
        .get(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(200);

      const deletedMessage = messages.body.messages.find((m: any) => m.id === messageId);
      expect(deletedMessage?.content).toBe('[deleted]');
    });

    it('should allow both participants to send and read messages', async () => {
      // Alice sends a message
      await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          content: 'Message from Alice',
        })
        .expect(201);

      // Bob sends a message
      await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${bobToken}`)
        .send({
          content: 'Message from Bob',
        })
        .expect(201);

      // Both should be able to read all messages
      const aliceView = await request(app)
        .get(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(200);

      const bobView = await request(app)
        .get(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${bobToken}`)
        .expect(200);

      expect(aliceView.body.messages.length).toBe(bobView.body.messages.length);
    });
  });
});
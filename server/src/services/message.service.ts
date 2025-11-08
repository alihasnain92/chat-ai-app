import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to convert BigInt to string recursively
function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => serializeBigInt(item));
  }
  
  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        serialized[key] = serializeBigInt(obj[key]);
      }
    }
    return serialized;
  }
  
  return obj;
}

// No types needed - using serializeBigInt for all returns

export class MessageService {
  /**
   * Send a new message in a conversation
   */
  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    attachments: any[] = []
  ): Promise<any> {
    // Validate input
    if (!conversationId || !senderId || !content?.trim()) {
      throw new Error('conversationId, senderId, and content are required');
    }

    // Verify sender is a participant in the conversation
    const participant = await prisma.participant.findFirst({
      where: {
        conversationId,
        userId: senderId,
      },
    });

    if (!participant) {
      throw new Error('User is not a participant in this conversation');
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId,
        content: content.trim(),
        attachments: attachments.length > 0 ? attachments : undefined,
        status: 'sent',
        statusTimestamps: {
          sent: new Date().toISOString(),
        },
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Convert BigInt to string for JSON serialization
    return serializeBigInt(message);
  }

  /**
   * Get messages with cursor-based pagination
   */
  async getMessages(
    conversationId: string,
    userId: string,
    cursor?: string,
    limit: number = 50
  ): Promise<any> {
    // Validate input
    if (!conversationId || !userId) {
      throw new Error('conversationId and userId are required');
    }

    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }

    // Verify user is a participant in the conversation
    const participant = await prisma.participant.findFirst({
      where: {
        conversationId,
        userId,
      },
    });

    if (!participant) {
      throw new Error('User is not a participant in this conversation');
    }

    // Build query conditions
    const whereConditions: any = {
      conversationId,
    };

    // If cursor is provided, get messages before this message ID
    if (cursor) {
      const cursorMessageId = BigInt(cursor);
      const cursorMessage = await prisma.message.findUnique({
        where: { id: cursorMessageId },
        select: { createdAt: true },
      });

      if (cursorMessage) {
        whereConditions.createdAt = {
          lt: cursorMessage.createdAt,
        };
      }
    }

    // Fetch messages (limit + 1 to check if there are more)
    const messages = await prisma.message.findMany({
      where: whereConditions,
      take: limit + 1,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Check if there are more messages
    const hasMore = messages.length > limit;
    const resultMessages = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore && resultMessages.length > 0
      ? resultMessages[resultMessages.length - 1].id.toString()
      : null;

    // Convert BigInt IDs to strings
    const serializedMessages = serializeBigInt(resultMessages);

    return {
      messages: serializedMessages,
      nextCursor,
      hasMore,
    };
  }

  /**
   * Get a single message by ID
   */
  async getMessage(
    messageId: string,
    userId: string
  ): Promise<any> {
    // Validate input
    if (!messageId || !userId) {
      throw new Error('messageId and userId are required');
    }

    const messageIdBigInt = BigInt(messageId);

    // Get the message
    const message = await prisma.message.findUnique({
      where: { id: messageIdBigInt },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        conversation: {
          include: {
            participants: {
              select: {
                userId: true,
              },
            },
          },
        },
      },
    });

    if (!message) {
      return null;
    }

    // Verify user is a participant in the conversation
    const isParticipant = message.conversation.participants.some(
      (p) => p.userId === userId
    );

    if (!isParticipant) {
      throw new Error('User is not a participant in this conversation');
    }

    // Remove conversation data from response
    const { conversation, ...messageData } = message;

    return serializeBigInt(messageData);
  }

  /**
   * Update a message's content
   */
  async updateMessage(
    messageId: string,
    userId: string,
    content: string
  ): Promise<any> {
    // Validate input
    if (!messageId || !userId || !content?.trim()) {
      throw new Error('messageId, userId, and content are required');
    }

    const messageIdBigInt = BigInt(messageId);

    // Get the message and verify ownership
    const message = await prisma.message.findUnique({
      where: { id: messageIdBigInt },
      select: {
        id: true,
        senderId: true,
      },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.senderId !== userId) {
      throw new Error('User is not authorized to update this message');
    }

    // Update the message
    const updatedMessage = await prisma.message.update({
      where: { id: messageIdBigInt },
      data: {
        content: content.trim(),
        editedAt: new Date(),
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Convert BigInt to string for JSON serialization
    return serializeBigInt(updatedMessage);
  }

  /**
   * Delete a message (soft delete by marking as deleted)
   */
  async deleteMessage(
    messageId: string,
    userId: string
  ): Promise<boolean> {
    // Validate input
    if (!messageId || !userId) {
      throw new Error('messageId and userId are required');
    }

    const messageIdBigInt = BigInt(messageId);

    // Get the message and verify ownership
    const message = await prisma.message.findUnique({
      where: { id: messageIdBigInt },
      select: {
        id: true,
        senderId: true,
      },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.senderId !== userId) {
      throw new Error('User is not authorized to delete this message');
    }

    // Soft delete: update content to "[deleted]" and mark editedAt
    await prisma.message.update({
      where: { id: messageIdBigInt },
      data: {
        content: '[deleted]',
        editedAt: new Date(),
      },
    });

    return true;
  }
}

// Export singleton instance
export const messageService = new MessageService();
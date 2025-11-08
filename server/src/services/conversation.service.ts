import { PrismaClient, Conversation, Participant } from '@prisma/client';

const prisma = new PrismaClient();

// Type definitions
interface ConversationWithDetails extends Conversation {
  participants: Array<
    Participant & {
      user: {
        id: string;
        name: string;
        email: string;
        avatarUrl: string | null;
      };
    }
  >;
  lastMessage?: {
    id: bigint;
    content: string;
    createdAt: Date;
    senderId: string | null;
  } | null;
  unreadCount?: number;
}

export class ConversationService {
  /**
   * Create a new conversation with participants
   * @param createdBy - User ID of the creator
   * @param participantIds - Array of participant user IDs
   * @param title - Optional conversation title
   * @param isGroup - Whether this is a group conversation
   * @returns Created conversation with participants
   */
  async createConversation(
    createdBy: string,
    participantIds: string[],
    title?: string,
    isGroup: boolean = false
  ): Promise<ConversationWithDetails> {
    try {
      // Validate input
      if (!createdBy) {
        throw new Error('Creator ID is required');
      }

      if (!participantIds || participantIds.length === 0) {
        throw new Error('At least one participant is required');
      }

      // Ensure creator is in the participants list
      const allParticipantIds = Array.from(
        new Set([createdBy, ...participantIds])
      );

      // Verify all users exist
      const users = await prisma.user.findMany({
        where: {
          id: { in: allParticipantIds },
        },
      });

      if (users.length !== allParticipantIds.length) {
        throw new Error('One or more users not found');
      }

      // Create conversation with participants
      const conversation = await prisma.conversation.create({
        data: {
          title,
          isGroup,
          createdBy,
          participants: {
            create: allParticipantIds.map((userId) => ({
              userId,
              role: userId === createdBy ? 'admin' : 'member',
              joinedAt: new Date(),
            })),
          },
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });

      return conversation as ConversationWithDetails;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to create conversation: ${error.message}`);
      }
      throw new Error('Failed to create conversation: Unknown error');
    }
  }

  /**
   * Get a conversation by ID
   * @param conversationId - Conversation ID
   * @param userId - User ID requesting the conversation
   * @returns Conversation with details or null
   */
  async getConversation(
    conversationId: string,
    userId: string
  ): Promise<ConversationWithDetails | null> {
    try {
      // Validate input
      if (!conversationId || !userId) {
        throw new Error('Conversation ID and User ID are required');
      }

      // Check if user is a participant
      const participant = await prisma.participant.findUnique({
        where: {
          conversationId_userId: {
            conversationId,
            userId,
          },
        },
      });

      if (!participant) {
        throw new Error('User is not a participant of this conversation');
      }

      // Fetch conversation with details
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatarUrl: true,
                },
              },
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              content: true,
              createdAt: true,
              senderId: true,
            },
          },
        },
      });

      if (!conversation) {
        return null;
      }

      // Format response
      const result: ConversationWithDetails = {
        ...conversation,
        lastMessage: conversation.messages[0] || null,
      };

      // Remove the messages array as we only need lastMessage
      delete (result as any).messages;

      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get conversation: ${error.message}`);
      }
      throw new Error('Failed to get conversation: Unknown error');
    }
  }

  /**
   * Get all conversations for a user
   * @param userId - User ID
   * @returns Array of conversations with details
   */
  async getUserConversations(
    userId: string
  ): Promise<ConversationWithDetails[]> {
    try {
      // Validate input
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Get all conversations where user is a participant
      const participants = await prisma.participant.findMany({
        where: { userId },
        include: {
          conversation: {
            include: {
              participants: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      avatarUrl: true,
                    },
                  },
                },
              },
              messages: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: {
                  id: true,
                  content: true,
                  createdAt: true,
                  senderId: true,
                },
              },
            },
          },
        },
      });

      // Format conversations
      const conversations: ConversationWithDetails[] = participants.map(
        (p) => {
          const conversation = p.conversation;
          return {
            ...conversation,
            lastMessage: conversation.messages[0] || null,
            unreadCount: 0, // Set to 0 for now as requested
          };
        }
      );

      // Remove messages array and sort by last message time
      const formattedConversations = conversations
        .map((conv) => {
          delete (conv as any).messages;
          return conv;
        })
        .sort((a, b) => {
          const timeA = a.lastMessage?.createdAt || a.createdAt;
          const timeB = b.lastMessage?.createdAt || b.createdAt;
          return timeB.getTime() - timeA.getTime();
        });

      return formattedConversations;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get user conversations: ${error.message}`);
      }
      throw new Error('Failed to get user conversations: Unknown error');
    }
  }

  /**
   * Add a participant to a conversation
   * @param conversationId - Conversation ID
   * @param userId - User ID to add
   * @param addedBy - User ID of the admin adding the participant
   * @returns Updated conversation
   */
  async addParticipant(
    conversationId: string,
    userId: string,
    addedBy: string
  ): Promise<ConversationWithDetails> {
    try {
      // Validate input
      if (!conversationId || !userId || !addedBy) {
        throw new Error('Conversation ID, User ID, and Added By are required');
      }

      // Verify addedBy is an admin
      const adminParticipant = await prisma.participant.findUnique({
        where: {
          conversationId_userId: {
            conversationId,
            userId: addedBy,
          },
        },
      });

      if (!adminParticipant || adminParticipant.role !== 'admin') {
        throw new Error('Only admins can add participants');
      }

      // Check if user exists
      const userExists = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!userExists) {
        throw new Error('User not found');
      }

      // Check if user is already a participant
      const existingParticipant = await prisma.participant.findUnique({
        where: {
          conversationId_userId: {
            conversationId,
            userId,
          },
        },
      });

      if (existingParticipant) {
        throw new Error('User is already a participant');
      }

      // Add participant
      await prisma.participant.create({
        data: {
          conversationId,
          userId,
          role: 'member',
          joinedAt: new Date(),
        },
      });

      // Return updated conversation
      const updatedConversation = await this.getConversation(
        conversationId,
        addedBy
      );

      if (!updatedConversation) {
        throw new Error('Failed to retrieve updated conversation');
      }

      return updatedConversation;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to add participant: ${error.message}`);
      }
      throw new Error('Failed to add participant: Unknown error');
    }
  }

  /**
   * Remove a participant from a conversation
   * @param conversationId - Conversation ID
   * @param userId - User ID to remove
   * @param removedBy - User ID of the admin removing the participant
   * @returns Success boolean
   */
  async removeParticipant(
    conversationId: string,
    userId: string,
    removedBy: string
  ): Promise<boolean> {
    try {
      // Validate input
      if (!conversationId || !userId || !removedBy) {
        throw new Error(
          'Conversation ID, User ID, and Removed By are required'
        );
      }

      // Check if user is removing themselves
      const isSelfRemoval = userId === removedBy;

      // If not self-removal, verify removedBy is an admin
      if (!isSelfRemoval) {
        const adminParticipant = await prisma.participant.findUnique({
          where: {
            conversationId_userId: {
              conversationId,
              userId: removedBy,
            },
          },
        });

        if (!adminParticipant || adminParticipant.role !== 'admin') {
          throw new Error('Only admins can remove other participants');
        }
      }

      // Check if participant exists
      const participant = await prisma.participant.findUnique({
        where: {
          conversationId_userId: {
            conversationId,
            userId,
          },
        },
      });

      if (!participant) {
        throw new Error('Participant not found in this conversation');
      }

      // Remove participant
      await prisma.participant.delete({
        where: {
          conversationId_userId: {
            conversationId,
            userId,
          },
        },
      });

      return true;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to remove participant: ${error.message}`);
      }
      throw new Error('Failed to remove participant: Unknown error');
    }
  }
}

// Export singleton instance
export const conversationService = new ConversationService();
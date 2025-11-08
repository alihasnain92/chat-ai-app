import { Request, Response, NextFunction } from 'express';
import { conversationService } from '../services/conversation.service';

// Extend Express Request to include userId from auth middleware
interface AuthRequest extends Request {
  userId?: string;
}

/**
 * Create a new conversation
 * POST /conversations
 */
export const createConversation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { participantIds, title, isGroup } = req.body;
    const createdBy = req.userId;

    // Validate createdBy
    if (!createdBy) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID not found',
      });
      return;
    }

    // Validate participantIds
    if (!participantIds || !Array.isArray(participantIds)) {
      res.status(400).json({
        success: false,
        message: 'participantIds must be an array',
      });
      return;
    }

    if (participantIds.length === 0) {
      res.status(400).json({
        success: false,
        message: 'participantIds cannot be empty',
      });
      return;
    }

    // Create conversation
    const conversation = await conversationService.createConversation(
      createdBy,
      participantIds,
      title,
      isGroup
    );

    res.status(201).json({
      success: true,
      conversation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all conversations for the authenticated user
 * GET /conversations
 */
export const getConversations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;

    // Validate userId
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID not found',
      });
      return;
    }

    // Get user conversations
    const conversations = await conversationService.getUserConversations(
      userId
    );

    res.status(200).json({
      success: true,
      conversations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific conversation by ID
 * GET /conversations/:id
 */
export const getConversation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: conversationId } = req.params;
    const userId = req.userId;

    // Validate userId
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID not found',
      });
      return;
    }

    // Validate conversationId
    if (!conversationId) {
      res.status(400).json({
        success: false,
        message: 'Conversation ID is required',
      });
      return;
    }

    // Get conversation
    const conversation = await conversationService.getConversation(
      conversationId,
      userId
    );

    // Check if conversation exists
    if (!conversation) {
      res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      conversation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a participant to a conversation
 * POST /conversations/:id/participants
 */
export const addParticipant = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: conversationId } = req.params;
    const { userId } = req.body;
    const addedBy = req.userId;

    // Validate addedBy
    if (!addedBy) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID not found',
      });
      return;
    }

    // Validate conversationId
    if (!conversationId) {
      res.status(400).json({
        success: false,
        message: 'Conversation ID is required',
      });
      return;
    }

    // Validate userId
    if (!userId) {
      res.status(400).json({
        success: false,
        message: 'userId is required in request body',
      });
      return;
    }

    // Add participant
    const conversation = await conversationService.addParticipant(
      conversationId,
      userId,
      addedBy
    );

    res.status(200).json({
      success: true,
      conversation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove a participant from a conversation
 * DELETE /conversations/:id/participants
 */
export const removeParticipant = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: conversationId } = req.params;
    const { userId } = req.body;
    const removedBy = req.userId;

    // Validate removedBy
    if (!removedBy) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID not found',
      });
      return;
    }

    // Validate conversationId
    if (!conversationId) {
      res.status(400).json({
        success: false,
        message: 'Conversation ID is required',
      });
      return;
    }

    // Validate userId
    if (!userId) {
      res.status(400).json({
        success: false,
        message: 'userId is required in request body',
      });
      return;
    }

    // Remove participant
    await conversationService.removeParticipant(
      conversationId,
      userId,
      removedBy
    );

    res.status(200).json({
      success: true,
      message: 'Participant removed successfully',
    });
  } catch (error) {
    next(error);
  }
};
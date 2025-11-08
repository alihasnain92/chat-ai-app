  import { Request, Response, NextFunction } from 'express';
  import { messageService } from '../services/message.service';

  // Extend Express Request type to include userId
  interface AuthRequest extends Request {
    userId?: string;
  }

  /**
   * Send a new message in a conversation
   */
  export const sendMessage = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { conversationId } = req.params;
      const senderId = req.userId;
      const { content, attachments } = req.body;

      // Validate required fields
      if (!senderId) {
        res.status(401).json({ error: 'Unauthorized: User not authenticated' });
        return;
      }

      if (!conversationId) {
        res.status(400).json({ error: 'conversationId is required' });
        return;
      }

      if (!content || typeof content !== 'string' || !content.trim()) {
        res.status(400).json({ error: 'content is required and cannot be empty' });
        return;
      }

      // Validate attachments if provided
      if (attachments !== undefined && !Array.isArray(attachments)) {
        res.status(400).json({ error: 'attachments must be an array' });
        return;
      }

      // Call service to send message
      const message = await messageService.sendMessage(
        conversationId,
        senderId,
        content,
        attachments
      );

      res.status(201).json({ message });
    } catch (error: any) {
      if (error.message?.includes('not a participant')) {
        res.status(403).json({ error: error.message });
        return;
      }
      next(error);
    }
  };

  /**
   * Get messages from a conversation with pagination
   */
  export const getMessages = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { conversationId } = req.params;
      const userId = req.userId;
      const { cursor, limit } = req.query;

      // Validate required fields
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized: User not authenticated' });
        return;
      }

      if (!conversationId) {
        res.status(400).json({ error: 'conversationId is required' });
        return;
      }

      // Parse and validate limit
      let parsedLimit: number | undefined;
      if (limit) {
        parsedLimit = parseInt(limit as string, 10);
        if (isNaN(parsedLimit) || parsedLimit < 1) {
          res.status(400).json({ error: 'limit must be a positive number' });
          return;
        }
      }

      // Validate cursor if provided
      const parsedCursor = cursor ? String(cursor) : undefined;

      // Call service to get messages
      const result = await messageService.getMessages(
        conversationId,
        userId,
        parsedCursor,
        parsedLimit
      );

      res.status(200).json(result);
    } catch (error: any) {
      if (error.message?.includes('not a participant')) {
        res.status(403).json({ error: error.message });
        return;
      }
      next(error);
    }
  };

  /**
   * Update a message's content
   */
  export const updateMessage = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id: messageId } = req.params;
      const userId = req.userId;
      const { content } = req.body;

      // Validate required fields
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized: User not authenticated' });
        return;
      }

      if (!messageId) {
        res.status(400).json({ error: 'messageId is required' });
        return;
      }

      if (!content || typeof content !== 'string' || !content.trim()) {
        res.status(400).json({ error: 'content is required and cannot be empty' });
        return;
      }

      // Call service to update message
      const message = await messageService.updateMessage(
        messageId,
        userId,
        content
      );

      res.status(200).json({ message });
    } catch (error: any) {
      if (error.message?.includes('not found')) {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error.message?.includes('not authorized')) {
        res.status(403).json({ error: error.message });
        return;
      }
      next(error);
    }
  };

  /**
   * Delete a message
   */
  export const deleteMessage = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id: messageId } = req.params;
      const userId = req.userId;

      // Validate required fields
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized: User not authenticated' });
        return;
      }

      if (!messageId) {
        res.status(400).json({ error: 'messageId is required' });
        return;
      }

      // Call service to delete message
      await messageService.deleteMessage(messageId, userId);

      res.status(200).json({ success: true });
    } catch (error: any) {
      if (error.message?.includes('not found')) {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error.message?.includes('not authorized')) {
        res.status(403).json({ error: error.message });
        return;
      }
      next(error);
    }
  };
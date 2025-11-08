import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth';
import {
  sendMessage,
  getMessages,
  updateMessage,
  deleteMessage,
} from '../controllers/message.controller';

const router = Router();

// All routes are protected with authentication middleware

/**
 * @route   POST /conversations/:conversationId/messages
 * @desc    Send a new message in a conversation
 * @access  Private
 */
router.post(
  '/conversations/:conversationId/messages',
  authenticateToken,
  sendMessage
);

/**
 * @route   GET /conversations/:conversationId/messages
 * @desc    Get messages from a conversation with pagination
 * @query   cursor - Message ID to paginate from (optional)
 * @query   limit - Number of messages to return (optional, default: 50)
 * @access  Private
 */
router.get(
  '/conversations/:conversationId/messages',
  authenticateToken,
  getMessages
);

/**
 * @route   PUT /messages/:id
 * @desc    Update a message's content
 * @access  Private (only message sender can update)
 */
router.put('/messages/:id', authenticateToken, updateMessage);

/**
 * @route   DELETE /messages/:id
 * @desc    Delete a message (soft delete)
 * @access  Private (only message sender can delete)
 */
router.delete('/messages/:id', authenticateToken, deleteMessage);

export default router;
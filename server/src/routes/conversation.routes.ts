import { Router } from 'express';
import {
  createConversation,
  getConversations,
  getConversation,
  addParticipant,
  removeParticipant,
} from '../controllers/conversation.controller';
import { authenticateToken as authenticate } from '../middlewares/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * @route   GET /api/conversations
 * @desc    Get all conversations for authenticated user
 * @access  Private
 */
router.get('/', getConversations);

/**
 * @route   POST /api/conversations
 * @desc    Create a new conversation
 * @access  Private
 */
router.post('/', createConversation);

/**
 * @route   GET /api/conversations/:id
 * @desc    Get a specific conversation by ID
 * @access  Private
 */
router.get('/:id', getConversation);

/**
 * @route   POST /api/conversations/:id/participants
 * @desc    Add a participant to a conversation
 * @access  Private
 */
router.post('/:id/participants', addParticipant);

/**
 * @route   DELETE /api/conversations/:id/participants
 * @desc    Remove a participant from a conversation
 * @access  Private
 */
router.delete('/:id/participants', removeParticipant);

export default router;
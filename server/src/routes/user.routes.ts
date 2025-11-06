import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth';
import {
  getUser,
  updateProfile,
  searchUsers,
  getAllUsers,
} from '../controllers/user.controller';
import { uploadAvatar as uploadAvatarMiddleware, handleUploadError } from '../middlewares/upload';
import { uploadAvatar as uploadAvatarController } from '../controllers/avatar.controller';

const router = Router();

// Apply auth middleware to all user routes
router.use(authenticateToken);

/**
 * GET /api/users/search?q=query&limit=10
 * Search users by name or email
 */
router.get('/search', searchUsers);

/**
 * GET /api/users?excludeMe=true
 * Get all users with optional exclusion of current user
 */
router.get('/', getAllUsers);

/**
 * GET /api/users/me
 * Get current authenticated user's profile
 */
router.get('/me', async (req, res, next) => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Reuse getUser controller logic by setting params
    req.params = { id: userId };
    await getUser(req, res, next);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/users/me
 * Update current authenticated user's profile
 */
router.put('/me', updateProfile);

/**
 * POST /api/users/me/avatar
 * Upload avatar for current authenticated user
 */
router.post('/me/avatar', uploadAvatarMiddleware, handleUploadError, uploadAvatarController);

/**
 * GET /api/users/:id
 * Get specific user by ID
 */
router.get('/:id', getUser);

export default router;
import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';

const userService = new UserService();

/**
 * Get user by ID
 * GET /api/users/:id
 */
export const getUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    const user = await userService.getUserById(id);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
};

/**
 * Update authenticated user's profile
 * PUT /api/users/profile
 */
export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { name, avatarUrl } = req.body;

    // Validate that at least one field is provided
    if (name === undefined && avatarUrl === undefined) {
      res.status(400).json({ error: 'At least one field (name or avatarUrl) must be provided' });
      return;
    }

    // Build update data object
    const updateData: { name?: string; avatarUrl?: string } = {};
    if (name !== undefined) {
      updateData.name = name;
    }
    if (avatarUrl !== undefined) {
      updateData.avatarUrl = avatarUrl;
    }

    const user = await userService.updateProfile(userId, updateData);

    res.status(200).json({ user });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    next(error);
  }
};

/**
 * Search users by name or email
 * GET /api/users/search?q=query&limit=10
 */
export const searchUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = req.query.q as string;
    const limitParam = req.query.limit as string | undefined;

    if (!query || query.trim() === '') {
      res.status(400).json({ error: 'Search query (q) is required' });
      return;
    }

    // Parse limit with default value of 10
    const limit = limitParam ? parseInt(limitParam, 10) : 10;

    // Validate limit
    if (isNaN(limit) || limit < 1 || limit > 100) {
      res.status(400).json({ error: 'Limit must be a number between 1 and 100' });
      return;
    }

    const users = await userService.searchUsers(query, limit);

    res.status(200).json({ users });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all users, optionally excluding authenticated user
 * GET /api/users?excludeMe=true
 */
export const getAllUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const excludeMe = req.query.excludeMe === 'true';
    const userId = req.userId;

    // Determine if we should exclude the authenticated user
    const excludeUserId = excludeMe && userId ? userId : undefined;

    const users = await userService.getAllUsers(excludeUserId);

    res.status(200).json({ users });
  } catch (error) {
    next(error);
  }
};
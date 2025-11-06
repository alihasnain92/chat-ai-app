import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import fs from 'fs/promises';
import path from 'path';

const userService = new UserService();

/**
 * Upload avatar for authenticated user
 * POST /api/users/me/avatar
 * 
 * Expects multipart/form-data with field name "avatar"
 * File is processed by Multer middleware before this controller
 */
export const uploadAvatar = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get authenticated user ID
    const userId = req.userId;

    if (!userId) {
      // Clean up uploaded file if it exists
      if (req.file) {
        await fs.unlink(req.file.path).catch(err => 
          console.error('Failed to delete file after auth error:', err)
        );
      }
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Check if file was uploaded
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    // Get the uploaded file details
    const { filename } = req.file;

    // Construct avatar URL path (relative to server root)
    const avatarUrl = `/uploads/avatars/${filename}`;

    // Get existing user to check for old avatar
    const existingUser = await userService.getUserById(userId);

    // Update user's avatar URL in database
    const updatedUser = await userService.updateProfile(userId, { avatarUrl });

    // Delete old avatar file if it exists and is different from new one
    if (existingUser?.avatarUrl && existingUser.avatarUrl !== avatarUrl) {
      const oldFilename = path.basename(existingUser.avatarUrl);
      const oldFilePath = path.join(
        __dirname,
        '../../uploads/avatars',
        oldFilename
      );

      // Delete old file asynchronously (don't block response)
      fs.unlink(oldFilePath).catch(err => {
        console.error('Failed to delete old avatar file:', err);
        // Non-critical error, don't fail the request
      });
    }

    // Return success response
    res.status(200).json({
      avatarUrl,
      message: 'Avatar uploaded successfully',
      user: updatedUser,
    });
  } catch (error) {
    // Clean up uploaded file if database update fails
    if (req.file) {
      await fs.unlink(req.file.path).catch(err =>
        console.error('Failed to delete file after error:', err)
      );
    }

    // Pass error to error handler middleware
    next(error);
  }
};

/**
 * Delete avatar for authenticated user
 * DELETE /api/users/me/avatar
 * 
 * Removes avatar from filesystem and clears avatarUrl in database
 */
export const deleteAvatar = async (
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

    // Get existing user
    const existingUser = await userService.getUserById(userId);

    if (!existingUser?.avatarUrl) {
      res.status(404).json({ error: 'No avatar to delete' });
      return;
    }

    // Delete file from filesystem
    const filename = path.basename(existingUser.avatarUrl);
    const filePath = path.join(__dirname, '../../uploads/avatars', filename);

    try {
      await fs.unlink(filePath);
    } catch (err) {
      console.error('Failed to delete avatar file:', err);
      // Continue even if file doesn't exist
    }

    // Clear avatarUrl in database
    const updatedUser = await userService.updateProfile(userId, {
      avatarUrl: null as any,
    });

    res.status(200).json({
      message: 'Avatar deleted successfully',
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};
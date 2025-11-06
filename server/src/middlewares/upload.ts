import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import path from 'path';
import fs from 'fs';

// Define upload directory path
const UPLOAD_DIR = path.join(__dirname, '../../uploads/avatars');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log('📁 Created uploads directory:', UPLOAD_DIR);
}

// Allowed file types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

// Maximum file size (5MB in bytes)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Configure disk storage for uploaded files
 */
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    try {
      const userId = req.userId;

      if (!userId) {
        return cb(new Error('User authentication required'), '');
      }

      // Extract file extension from original filename
      const extension = path.extname(file.originalname).toLowerCase();

      // Generate filename: userId-timestamp-originalname
      const timestamp = Date.now();
      const sanitizedOriginalName = file.originalname
        .replace(extension, '')
        .replace(/[^a-zA-Z0-9-_]/g, '_')
        .substring(0, 50); // Limit length

      const filename = `${userId}-${timestamp}-${sanitizedOriginalName}${extension}`;

      cb(null, filename);
    } catch (error) {
      cb(error as Error, '');
    }
  },
});

/**
 * File filter to validate uploaded files
 */
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(
      new Error(
        `Invalid file type. Only ${ALLOWED_EXTENSIONS.join(', ')} files are allowed.`
      )
    );
  }

  // Check file extension
  const extension = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return cb(
      new Error(
        `Invalid file extension. Only ${ALLOWED_EXTENSIONS.join(', ')} files are allowed.`
      )
    );
  }

  // File is valid
  cb(null, true);
};

/**
 * Multer upload configuration
 */
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1, // Only allow single file upload
  },
});

/**
 * Middleware for uploading avatar image
 * Use in routes: router.post('/avatar', uploadAvatar, controller)
 */
export const uploadAvatar = upload.single('avatar');

/**
 * Error handler middleware for multer errors
 * Place this after routes that use uploadAvatar
 * 
 * @example
 * router.post('/avatar', uploadAvatar, handleUploadError, uploadAvatarController);
 */
export const handleUploadError = (
  err: any,
  req: Request,
  res: any,
  next: any
): void => {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: `Maximum file size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      });
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files',
        message: 'Only one file can be uploaded at a time',
      });
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: 'Invalid field name',
        message: 'File must be uploaded with field name "avatar"',
      });
    }

    // Other multer errors
    return res.status(400).json({
      error: 'Upload failed',
      message: err.message,
    });
  }

  // Custom validation errors (from fileFilter)
  if (err) {
    return res.status(400).json({
      error: 'Invalid file',
      message: err.message,
    });
  }

  // No error, continue
  next();
};

/**
 * Export constants for use in other modules
 */
export const uploadConfig = {
  UPLOAD_DIR,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_MB: MAX_FILE_SIZE / (1024 * 1024),
};
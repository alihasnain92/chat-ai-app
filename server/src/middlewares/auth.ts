import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../utils/jwt';

/**
 * Authentication middleware that verifies JWT tokens
 * 
 * This middleware:
 * 1. Extracts the JWT token from the Authorization header
 * 2. Validates the token format (Bearer <token>)
 * 3. Verifies the token signature and expiration
 * 4. Attaches the userId to the request object if valid
 * 5. Returns 401 Unauthorized if token is missing or invalid
 * 
 * Note: The req.userId property is available via the Express type extension
 * defined in /server/src/types/express.d.ts
 * 
 * @param req - Express request object (with userId property from type extension)
 * @param res - Express response object
 * @param next - Express next function to pass control to the next middleware
 * 
 * @example
 * // Protect a route with authentication
 * router.get('/profile', authenticateToken, (req, res) => {
 *   const userId = req.userId; // TypeScript knows userId exists
 *   // ... handle authenticated request
 * });
 */
export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Extract the Authorization header
    const authHeader = req.headers.authorization;

    // Check if Authorization header exists
    if (!authHeader) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    // Extract token from "Bearer <token>" format
    const token = extractTokenFromHeader(authHeader);

    // Check if token extraction was successful
    if (!token) {
      res.status(401).json({ error: 'Invalid token format. Use: Bearer <token>' });
      return;
    }

    // Verify the token
    const payload = verifyToken(token);

    // Check if token verification was successful
    if (!payload || !payload.userId) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    // Attach userId to the request object
    req.userId = payload.userId;

    // Pass control to the next middleware/route handler
    next();
  } catch (error) {
    // Handle any unexpected errors
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
    return;
  }
};

/**
 * Optional authentication middleware
 * 
 * Similar to authenticateToken but doesn't return 401 if token is missing/invalid.
 * Instead, it just doesn't attach userId to the request.
 * Useful for routes that work with or without authentication.
 * 
 * Note: The req.userId property is available via the Express type extension
 * defined in /server/src/types/express.d.ts
 * 
 * @param req - Express request object (with userId property from type extension)
 * @param res - Express response object
 * @param next - Express next function
 * 
 * @example
 * // Route that works with or without authentication
 * router.get('/posts', optionalAuth, (req, res) => {
 *   if (req.userId) {
 *     // User is authenticated
 *   } else {
 *     // User is not authenticated
 *   }
 * });
 */
export const optionalAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      // No token provided, continue without authentication
      next();
      return;
    }

    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      // Invalid token format, continue without authentication
      next();
      return;
    }

    const payload = verifyToken(token);

    if (payload && payload.userId) {
      // Valid token, attach userId
      req.userId = payload.userId;
    }

    // Continue regardless of token validity
    next();
  } catch (error) {
    // On error, just continue without authentication
    console.error('Optional authentication error:', error);
    next();
  }
};
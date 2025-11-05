import { Request, Response, NextFunction } from 'express';
import { authService, AuthError } from '../services/auth.service';
import { generateToken } from '../utils/jwt';

/**
 * Register a new user
 * 
 * @route POST /api/auth/register
 * @access Public
 * 
 * @param req - Express request object with body containing name, email, password
 * @param res - Express response object
 * @param next - Express next function for error handling
 * 
 * @returns 201 - { user, token }
 * @returns 400 - Validation error
 * @returns 409 - Email already exists
 * @returns 500 - Server error
 * 
 * @example
 * POST /api/auth/register
 * Body: { name: "John Doe", email: "john@example.com", password: "password123" }
 * Response: { user: {...}, token: "jwt-token" }
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract data from request body
    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      res.status(400).json({ 
        error: 'Name, email, and password are required' 
      });
      return;
    }

    // Call auth service to register user
    const user = await authService.register(name, email, password);

    // Generate JWT token
    const token = generateToken(user.id);

    // Return success response
    res.status(201).json({
      user,
      token,
    });
  } catch (error) {
    // Handle AuthError with specific status codes
    if (error instanceof AuthError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    // Pass unexpected errors to error handling middleware
    next(error);
  }
};

/**
 * Login an existing user
 * 
 * @route POST /api/auth/login
 * @access Public
 * 
 * @param req - Express request object with body containing email, password
 * @param res - Express response object
 * @param next - Express next function for error handling
 * 
 * @returns 200 - { user, token }
 * @returns 400 - Validation error
 * @returns 401 - Invalid credentials
 * @returns 500 - Server error
 * 
 * @example
 * POST /api/auth/login
 * Body: { email: "john@example.com", password: "password123" }
 * Response: { user: {...}, token: "jwt-token" }
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract data from request body
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      res.status(400).json({ 
        error: 'Email and password are required' 
      });
      return;
    }

    // Call auth service to authenticate user
    const user = await authService.login(email, password);

    // Generate JWT token
    const token = generateToken(user.id);

    // Return success response
    res.status(200).json({
      user,
      token,
    });
  } catch (error) {
    // Handle AuthError with specific status codes
    if (error instanceof AuthError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    // Pass unexpected errors to error handling middleware
    next(error);
  }
};

/**
 * Get current authenticated user's profile
 * 
 * @route GET /api/auth/me
 * @access Private (requires authentication)
 * 
 * @param req - Express request object with userId from auth middleware
 * @param res - Express response object
 * @param next - Express next function for error handling
 * 
 * @returns 200 - { user }
 * @returns 401 - Not authenticated
 * @returns 404 - User not found
 * @returns 500 - Server error
 * 
 * @example
 * GET /api/auth/me
 * Headers: { Authorization: "Bearer jwt-token" }
 * Response: { user: {...} }
 */
export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get userId from request (set by authenticateToken middleware)
    const userId = req.userId;

    // This should never happen if authenticateToken middleware is used
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Call auth service to get user by ID
    const user = await authService.getUserById(userId);

    // Handle user not found
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Return user profile
    res.status(200).json({ user });
  } catch (error) {
    // Handle AuthError with specific status codes
    if (error instanceof AuthError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    // Pass unexpected errors to error handling middleware
    next(error);
  }
};
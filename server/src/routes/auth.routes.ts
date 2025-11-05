import express, { Router } from 'express';
import { register, login, getMe } from '../controllers/auth.controller';
import { authenticateToken } from '../middlewares/auth';

/**
 * Authentication Routes
 * 
 * This module defines all authentication-related routes:
 * - User registration
 * - User login
 * - Get current user profile
 * 
 * Base path: /api/auth
 */

// Create Express router
const router: Router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 * @body    { name: string, email: string, password: string }
 * @returns { user: SafeUser, token: string }
 * 
 * @example
 * POST /api/auth/register
 * Content-Type: application/json
 * 
 * {
 *   "name": "John Doe",
 *   "email": "john@example.com",
 *   "password": "password123"
 * }
 * 
 * Response (201):
 * {
 *   "user": {
 *     "id": "user-id",
 *     "name": "John Doe",
 *     "email": "john@example.com",
 *     "created_at": "2024-01-01T00:00:00.000Z",
 *     "updated_at": "2024-01-01T00:00:00.000Z"
 *   },
 *   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * }
 */
router.post('/register', register);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get token
 * @access  Public
 * @body    { email: string, password: string }
 * @returns { user: SafeUser, token: string }
 * 
 * @example
 * POST /api/auth/login
 * Content-Type: application/json
 * 
 * {
 *   "email": "john@example.com",
 *   "password": "password123"
 * }
 * 
 * Response (200):
 * {
 *   "user": {
 *     "id": "user-id",
 *     "name": "John Doe",
 *     "email": "john@example.com",
 *     "created_at": "2024-01-01T00:00:00.000Z",
 *     "updated_at": "2024-01-01T00:00:00.000Z"
 *   },
 *   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * }
 */
router.post('/login', login);

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user's profile
 * @access  Private (requires authentication)
 * @headers { Authorization: "Bearer <token>" }
 * @returns { user: SafeUser }
 * 
 * @example
 * GET /api/auth/me
 * Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 * 
 * Response (200):
 * {
 *   "user": {
 *     "id": "user-id",
 *     "name": "John Doe",
 *     "email": "john@example.com",
 *     "created_at": "2024-01-01T00:00:00.000Z",
 *     "updated_at": "2024-01-01T00:00:00.000Z"
 *   }
 * }
 */
router.get('/me', authenticateToken, getMe);

// Export the router
export default router;
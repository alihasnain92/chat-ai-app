import { PrismaClient, User } from '@prisma/client';
import bcrypt from 'bcrypt';

/**
 * User type without sensitive password_hash field
 */
export type SafeUser = Omit<User, 'passwordHash'>;

/**
 * Custom error class for authentication-related errors
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * AuthService - Handles all authentication-related business logic
 * 
 * This service encapsulates user registration, login, and user retrieval
 * with proper validation, error handling, and security practices.
 */
export class AuthService {
  private prisma: PrismaClient;
  private readonly SALT_ROUNDS = 10;
  private readonly MIN_PASSWORD_LENGTH = 8;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Validates email format using regex
   * 
   * @param email - Email address to validate
   * @returns true if valid, false otherwise
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validates password meets minimum requirements
   * 
   * @param password - Password to validate
   * @returns true if valid, false otherwise
   */
  private isValidPassword(password: string): boolean {
    return password.length >= this.MIN_PASSWORD_LENGTH;
  }

  /**
   * Removes password_hash from user object
   * 
   * @param user - User object from database
   * @returns User object without password_hash
   */
  private sanitizeUser(user: User): SafeUser {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Register a new user
   * 
   * @param name - User's full name
   * @param email - User's email address
   * @param password - User's password (plain text)
   * @returns User object without password_hash
   * @throws AuthError if validation fails or email already exists
   * 
   * @example
   * const user = await authService.register('John Doe', 'john@example.com', 'password123');
   */
  async register(
    name: string,
    email: string,
    password: string
  ): Promise<SafeUser> {
    try {
      // Validate inputs
      if (!name || name.trim().length === 0) {
        throw new AuthError('Name is required', 400);
      }

      if (!email || !this.isValidEmail(email)) {
        throw new AuthError('Valid email is required', 400);
      }

      if (!password || !this.isValidPassword(password)) {
        throw new AuthError(
          `Password must be at least ${this.MIN_PASSWORD_LENGTH} characters long`,
          400
        );
      }

      // Check if email already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        throw new AuthError('Email already exists', 409);
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);

      // Create user
      const user = await this.prisma.user.create({
        data: {
          name: name.trim(),
          email: email.toLowerCase(),
          passwordHash,
        },
      });

      // Return user without password_hash
      return this.sanitizeUser(user);
    } catch (error) {
      // Re-throw AuthError as-is
      if (error instanceof AuthError) {
        throw error;
      }

      // Log unexpected errors
      console.error('Registration error:', error);
      throw new AuthError('Registration failed', 500);
    }
  }

  /**
   * Authenticate a user with email and password
   * 
   * @param email - User's email address
   * @param password - User's password (plain text)
   * @returns User object without password_hash
   * @throws AuthError if credentials are invalid
   * 
   * @example
   * const user = await authService.login('john@example.com', 'password123');
   */
  async login(email: string, password: string): Promise<SafeUser> {
    try {
      // Validate inputs
      if (!email || !password) {
        throw new AuthError('Email and password are required', 400);
      }

      // Find user by email
      const user = await this.prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      // If user not found
      if (!user) {
        throw new AuthError('Invalid credentials', 401);
      }

      // Compare password with hash
      const isPasswordValid = await bcrypt.compare(
        password,
        user.passwordHash
      );

      // If password is wrong
      if (!isPasswordValid) {
        throw new AuthError('Invalid credentials', 401);
      }

      // Return user without password_hash
      return this.sanitizeUser(user);
    } catch (error) {
      // Re-throw AuthError as-is
      if (error instanceof AuthError) {
        throw error;
      }

      // Log unexpected errors
      console.error('Login error:', error);
      throw new AuthError('Login failed', 500);
    }
  }

  /**
   * Get user by ID
   * 
   * @param id - User's unique identifier
   * @returns User object without password_hash, or null if not found
   * 
   * @example
   * const user = await authService.getUserById('user-id-123');
   * if (user) {
   *   console.log(user.name);
   * }
   */
  async getUserById(id: string): Promise<SafeUser | null> {
    try {
      // Validate ID
      if (!id || id.trim().length === 0) {
        return null;
      }

      // Find user by id
      const user = await this.prisma.user.findUnique({
        where: { id },
      });

      // Return null if not found
      if (!user) {
        return null;
      }

      // Return user without password_hash
      return this.sanitizeUser(user);
    } catch (error) {
      console.error('Get user by ID error:', error);
      return null;
    }
  }

  /**
   * Disconnect Prisma client
   * Call this when shutting down the application
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

// Export a singleton instance
export const authService = new AuthService();
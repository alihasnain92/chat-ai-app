import jwt from 'jsonwebtoken';

/**
 * JWT Payload interface
 */
export interface JwtPayload {
  userId: string;
}

/**
 * Custom error class for JWT operations
 */
export class JwtError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JwtError';
  }
}

/**
 * Get JWT secret from environment variables
 * @throws {JwtError} If JWT_SECRET is not defined
 */
const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new JwtError('JWT_SECRET is not defined in environment variables');
  }
  
  if (secret.length < 32) {
    throw new JwtError('JWT_SECRET must be at least 32 characters long for security');
  }
  
  return secret;
};

/**
 * Generates a JWT token for a user
 * @param userId - The unique identifier of the user
 * @returns A signed JWT token string valid for 7 days
 * @throws {JwtError} If userId is invalid or token generation fails
 * 
 * @example
 * const token = generateToken('user123');
 * // Returns: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 */
export const generateToken = (userId: string): string => {
  try {
    // Validate userId
    if (!userId || typeof userId !== 'string') {
      throw new JwtError('User ID must be a non-empty string');
    }

    if (userId.trim().length === 0) {
      throw new JwtError('User ID cannot be empty or contain only whitespace');
    }

    // Get JWT secret from environment
    const secret = getJwtSecret();

    // Create payload
    const payload: JwtPayload = {
      userId: userId.trim(),
    };

    // Sign the token with 7 days expiration
    const token = jwt.sign(payload, secret, {
      expiresIn: '7d', // Token expires in 7 days
      algorithm: 'HS256', // Use HMAC SHA256 algorithm
    });

    return token;
  } catch (error) {
    if (error instanceof JwtError) {
      throw error;
    }
    throw new JwtError(
      `Failed to generate token: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

/**
 * Verifies a JWT token and extracts the payload
 * @param token - The JWT token string to verify
 * @returns The decoded payload containing userId if valid, null if invalid or expired
 * 
 * @example
 * const payload = verifyToken(token);
 * if (payload) {
 *   console.log('User ID:', payload.userId);
 * } else {
 *   console.log('Invalid or expired token');
 * }
 */
export const verifyToken = (token: string): JwtPayload | null => {
  try {
    // Validate token input
    if (!token || typeof token !== 'string') {
      return null;
    }

    if (token.trim().length === 0) {
      return null;
    }

    // Get JWT secret from environment
    const secret = getJwtSecret();

    // Verify and decode the token
    const decoded = jwt.verify(token.trim(), secret, {
      algorithms: ['HS256'], // Only accept HS256 algorithm
    }) as JwtPayload;

    // Validate the decoded payload structure
    if (!decoded.userId || typeof decoded.userId !== 'string') {
      return null;
    }

    return {
      userId: decoded.userId,
    };
  } catch (error) {
    // Handle specific JWT errors
    if (error instanceof jwt.TokenExpiredError) {
      // Token has expired - return null (not an error, just invalid)
      return null;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      // Invalid token format or signature - return null
      return null;
    }

    if (error instanceof jwt.NotBeforeError) {
      // Token not yet valid - return null
      return null;
    }

    if (error instanceof JwtError) {
      // JWT_SECRET missing or invalid - this is a server error, so throw
      throw error;
    }

    // Unknown error - return null for safety
    return null;
  }
};

/**
 * Extracts token from Authorization header
 * @param authHeader - The Authorization header value (e.g., "Bearer token123")
 * @returns The extracted token or null if invalid format
 * 
 * @example
 * const token = extractTokenFromHeader('Bearer eyJhbGci...');
 * // Returns: "eyJhbGci..."
 */
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader || typeof authHeader !== 'string') {
    return null;
  }

  // Expected format: "Bearer <token>"
  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  const token = parts[1];

  if (!token || token.trim().length === 0) {
    return null;
  }

  return token.trim();
};
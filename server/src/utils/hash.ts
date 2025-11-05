import bcrypt from 'bcryptjs';

/**
 * Custom error class for password hashing operations
 */
export class PasswordHashError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PasswordHashError';
  }
}

/**
 * Validates password input
 * @param password - The password to validate
 * @throws {PasswordHashError} If validation fails
 */
const validatePassword = (password: unknown): void => {
  if (typeof password !== 'string') {
    throw new PasswordHashError('Password must be a string');
  }

  if (password.length < 8) {
    throw new PasswordHashError('Password must be at least 8 characters long');
  }

  if (password.trim().length === 0) {
    throw new PasswordHashError('Password cannot be empty or contain only whitespace');
  }
};

/**
 * Hashes a plain text password using bcryptjs
 * @param plainPassword - The plain text password to hash
 * @returns Promise that resolves to the hashed password
 * @throws {PasswordHashError} If password validation fails or hashing fails
 */
export const hashPassword = async (plainPassword: string): Promise<string> => {
  try {
    // Validate the password
    validatePassword(plainPassword);

    // Generate salt and hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

    return hashedPassword;
  } catch (error) {
    if (error instanceof PasswordHashError) {
      throw error;
    }
    throw new PasswordHashError(
      `Failed to hash password: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

/**
 * Compares a plain text password with a hashed password
 * @param plainPassword - The plain text password to compare
 * @param hashedPassword - The hashed password to compare against
 * @returns Promise that resolves to true if passwords match, false otherwise
 * @throws {PasswordHashError} If validation fails or comparison fails
 */
export const comparePassword = async (
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> => {
  try {
    // Validate the plain password
    validatePassword(plainPassword);

    // Validate hashed password
    if (typeof hashedPassword !== 'string') {
      throw new PasswordHashError('Hashed password must be a string');
    }

    if (hashedPassword.trim().length === 0) {
      throw new PasswordHashError('Hashed password cannot be empty');
    }

    // Compare the passwords
    const isMatch = await bcrypt.compare(plainPassword, hashedPassword);

    return isMatch;
  } catch (error) {
    if (error instanceof PasswordHashError) {
      throw error;
    }
    throw new PasswordHashError(
      `Failed to compare passwords: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};
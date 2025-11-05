import { hashPassword, comparePassword, PasswordHashError } from './hash';

describe('hashPassword', () => {
  it('should return a different string than the input', async () => {
    const plainPassword = 'mySecurePassword123';
    const hashedPassword = await hashPassword(plainPassword);

    expect(hashedPassword).not.toBe(plainPassword);
    expect(typeof hashedPassword).toBe('string');
    expect(hashedPassword.length).toBeGreaterThan(0);
  });

  it('should generate different hashes for the same password (due to salt)', async () => {
    const plainPassword = 'mySecurePassword123';
    const hash1 = await hashPassword(plainPassword);
    const hash2 = await hashPassword(plainPassword);

    expect(hash1).not.toBe(hash2);
  });

  it('should throw error for password shorter than 8 characters', async () => {
    const shortPassword = 'short1';

    await expect(hashPassword(shortPassword)).rejects.toThrow(PasswordHashError);
    await expect(hashPassword(shortPassword)).rejects.toThrow(
      'Password must be at least 8 characters long'
    );
  });

  it('should throw error for non-string password', async () => {
    await expect(hashPassword(12345678 as any)).rejects.toThrow(PasswordHashError);
    await expect(hashPassword(12345678 as any)).rejects.toThrow('Password must be a string');
  });

  it('should throw error for empty password', async () => {
    await expect(hashPassword('')).rejects.toThrow(PasswordHashError);
    await expect(hashPassword('')).rejects.toThrow(
      'Password must be at least 8 characters long'
    );
  });

  it('should throw error for whitespace-only password', async () => {
    await expect(hashPassword('        ')).rejects.toThrow(PasswordHashError);
    await expect(hashPassword('        ')).rejects.toThrow(
      'Password cannot be empty or contain only whitespace'
    );
  });

  it('should successfully hash a valid password', async () => {
    const validPassword = 'ValidPass123!';
    const hashedPassword = await hashPassword(validPassword);

    expect(hashedPassword).toBeDefined();
    expect(typeof hashedPassword).toBe('string');
    // bcryptjs uses $2a$ or $2b$ prefix depending on version
    expect(hashedPassword.startsWith('$2')).toBe(true);
    expect(hashedPassword.length).toBeGreaterThan(50); // bcrypt hashes are typically 60 chars
  });
});

describe('comparePassword', () => {
  it('should return true for correct password', async () => {
    const plainPassword = 'mySecurePassword123';
    const hashedPassword = await hashPassword(plainPassword);

    const result = await comparePassword(plainPassword, hashedPassword);

    expect(result).toBe(true);
  });

  it('should return false for wrong password', async () => {
    const plainPassword = 'mySecurePassword123';
    const wrongPassword = 'wrongPassword456';
    const hashedPassword = await hashPassword(plainPassword);

    const result = await comparePassword(wrongPassword, hashedPassword);

    expect(result).toBe(false);
  });

  it('should return false for slightly different password', async () => {
    const plainPassword = 'mySecurePassword123';
    const similarPassword = 'mySecurePassword124'; // Only last char different
    const hashedPassword = await hashPassword(plainPassword);

    const result = await comparePassword(similarPassword, hashedPassword);

    expect(result).toBe(false);
  });

  it('should throw error for short plain password', async () => {
    const shortPassword = 'short1';
    const hashedPassword = '$2a$10$someHashedPassword';

    await expect(comparePassword(shortPassword, hashedPassword)).rejects.toThrow(
      PasswordHashError
    );
    await expect(comparePassword(shortPassword, hashedPassword)).rejects.toThrow(
      'Password must be at least 8 characters long'
    );
  });

  it('should throw error for non-string plain password', async () => {
    const hashedPassword = '$2a$10$someHashedPassword';

    await expect(comparePassword(12345678 as any, hashedPassword)).rejects.toThrow(
      PasswordHashError
    );
    await expect(comparePassword(12345678 as any, hashedPassword)).rejects.toThrow(
      'Password must be a string'
    );
  });

  it('should throw error for non-string hashed password', async () => {
    const plainPassword = 'mySecurePassword123';

    await expect(comparePassword(plainPassword, 12345678 as any)).rejects.toThrow(
      PasswordHashError
    );
    await expect(comparePassword(plainPassword, 12345678 as any)).rejects.toThrow(
      'Hashed password must be a string'
    );
  });

  it('should throw error for empty hashed password', async () => {
    const plainPassword = 'mySecurePassword123';

    await expect(comparePassword(plainPassword, '')).rejects.toThrow(PasswordHashError);
    await expect(comparePassword(plainPassword, '')).rejects.toThrow(
      'Hashed password cannot be empty'
    );
  });

  it('should handle multiple comparisons correctly', async () => {
    const password1 = 'password123!';
    const password2 = 'differentPass456!';
    const hash1 = await hashPassword(password1);
    const hash2 = await hashPassword(password2);

    expect(await comparePassword(password1, hash1)).toBe(true);
    expect(await comparePassword(password2, hash2)).toBe(true);
    expect(await comparePassword(password1, hash2)).toBe(false);
    expect(await comparePassword(password2, hash1)).toBe(false);
  });
});

describe('PasswordHashError', () => {
  it('should be an instance of Error', () => {
    const error = new PasswordHashError('Test error');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(PasswordHashError);
    expect(error.name).toBe('PasswordHashError');
    expect(error.message).toBe('Test error');
  });
});
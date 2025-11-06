import { PrismaClient, User } from '@prisma/client';

// Type for user without passwordHash
type SafeUser = Omit<User, 'passwordHash'>;

// Type for profile update data
interface UpdateProfileData {
  name?: string;
  avatarUrl?: string;
}

export class UserService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Find user by id and return without password_hash
   * @param id - User ID
   * @returns User object without password_hash or null if not found
   */
  async getUserById(id: string): Promise<SafeUser | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return user;
    } catch (error) {
      console.error(`Error fetching user by id ${id}:`, error);
      throw new Error('Failed to fetch user');
    }
  }

  /**
   * Update user profile with provided fields
   * @param userId - User ID to update
   * @param data - Partial update data (name and/or avatarUrl)
   * @returns Updated user without password_hash
   * @throws Error if user not found
   */
  async updateProfile(
    userId: string,
    data: UpdateProfileData
  ): Promise<SafeUser> {
    try {
      // Check if user exists
      const existingUser = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser) {
        throw new Error(`User with id ${userId} not found`);
      }

      // Build update object with only provided fields
      const updateData: Partial<UpdateProfileData> = {};
      if (data.name !== undefined) {
        updateData.name = data.name;
      }
      if (data.avatarUrl !== undefined) {
        updateData.avatarUrl = data.avatarUrl;
      }

      // Update user
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return updatedUser;
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }
      console.error(`Error updating profile for user ${userId}:`, error);
      throw new Error('Failed to update user profile');
    }
  }

  /**
   * Search users by name or email (case-insensitive)
   * @param query - Search query string
   * @param limit - Maximum number of results (default: 10)
   * @returns Array of users without password_hash
   */
  async searchUsers(query: string, limit: number = 10): Promise<SafeUser[]> {
    try {
      const users = await this.prisma.user.findMany({
        where: {
          OR: [
            {
              name: {
                contains: query,
                mode: 'insensitive',
              },
            },
            {
              email: {
                contains: query,
                mode: 'insensitive',
              },
            },
          ],
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
        },
        take: limit,
        orderBy: {
          name: 'asc',
        },
      });

      return users;
    } catch (error) {
      console.error(`Error searching users with query "${query}":`, error);
      throw new Error('Failed to search users');
    }
  }

  /**
   * Get all users, optionally excluding one user
   * @param excludeUserId - Optional user ID to exclude from results
   * @returns Array of users without password_hash
   */
  async getAllUsers(excludeUserId?: string): Promise<SafeUser[]> {
    try {
      const users = await this.prisma.user.findMany({
        where: excludeUserId
          ? {
              id: {
                not: excludeUserId,
              },
            }
          : undefined,
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          name: 'asc',
        },
      });

      return users;
    } catch (error) {
      console.error('Error fetching all users:', error);
      throw new Error('Failed to fetch users');
    }
  }

  /**
   * Cleanup method to disconnect Prisma client
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
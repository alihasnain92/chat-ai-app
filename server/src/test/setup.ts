// ========================================
// // FILE: src/test/setup.ts
// ========================================
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/ai_chat_test';

beforeAll(async () => {
  // Push database schema to test database
  try {
    console.log('Setting up test database...');
    execSync('npx prisma db push --skip-generate', {
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL,
      },
      stdio: 'inherit',
    });
    console.log('Test database ready!');
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }

  await prisma.$connect();
});

afterAll(async () => {
  // Clean up test database
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});


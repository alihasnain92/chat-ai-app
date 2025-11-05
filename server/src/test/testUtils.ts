// ========================================
// FILE: src/test/testUtils.ts
// ========================================
import request from 'supertest';
import { Express } from 'express';

export interface TestUser {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
  };
  token: string;
}

/**
 * Creates a test user and returns user data with auth token
 */
export async function createTestUser(
  app: Express,
  user: TestUser
): Promise<AuthResponse> {
  const response = await request(app)
    .post('/api/auth/register')
    .send(user)
    .expect(201);

  return response.body;
}

/**
 * Logs in a test user and returns user data with auth token
 */
export async function loginTestUser(
  app: Express,
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);

  return response.body;
}

/**
 * Makes an authenticated GET request
 */
export async function authenticatedGet(
  app: Express,
  url: string,
  token: string
) {
  return request(app)
    .get(url)
    .set('Authorization', `Bearer ${token}`);
}

/**
 * Makes an authenticated POST request
 */
export async function authenticatedPost(
  app: Express,
  url: string,
  token: string,
  data: any
) {
  return request(app)
    .post(url)
    .set('Authorization', `Bearer ${token}`)
    .send(data);
}

/**
 * Makes an authenticated PUT request
 */
export async function authenticatedPut(
  app: Express,
  url: string,
  token: string,
  data: any
) {
  return request(app)
    .put(url)
    .set('Authorization', `Bearer ${token}`)
    .send(data);
}

/**
 * Makes an authenticated DELETE request
 */
export async function authenticatedDelete(
  app: Express,
  url: string,
  token: string
) {
  return request(app)
    .delete(url)
    .set('Authorization', `Bearer ${token}`);
}
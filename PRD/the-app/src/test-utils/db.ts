// Mock database utilities for testing
import { PrismaClient } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

export type MockContext = {
  prisma: DeepMockProxy<PrismaClient>;
};

export const createMockContext = (): MockContext => {
  return {
    prisma: mockDeep<PrismaClient>(),
  };
};

// Common mock data factories
export const mockUser = (overrides = {}) => ({
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  password: 'hashedpassword',
  firstName: 'Test',
  lastName: 'User',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const mockTown = (overrides = {}) => ({
  id: '1',
  name: 'Test Town',
  state: 'TS',
  slug: 'test-town',
  description: 'A test town',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const mockPerson = (overrides = {}) => ({
  id: '1',
  firstName: 'John',
  lastName: 'Doe',
  slug: 'john-doe',
  bio: 'Test bio',
  townId: '1',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const mockComment = (overrides = {}) => ({
  id: '1',
  content: 'Test comment',
  authorName: 'Anonymous',
  authorEmail: 'anon@example.com',
  personId: '1',
  status: 'pending',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});
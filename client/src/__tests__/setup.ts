/**
 * Frontend Test Setup
 * 
 * This file runs before all frontend tests and sets up the test environment.
 */

import { beforeAll, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Mock scrollTo
window.scrollTo = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Global test utilities
export const testUtils = {
  /**
   * Wait for a specified amount of time
   */
  wait: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),

  /**
   * Mock user data
   */
  mockUser: {
    id: 1,
    email: 'test@example.com',
    plan: 'free' as const,
    role: 'entrepreneur' as const,
  },

  /**
   * Mock analysis data
   */
  mockAnalysis: {
    id: '1',
    title: 'Test Analysis',
    innovationScore: 85,
    feasibilityRating: 4,
    createdAt: new Date('2024-01-01'),
    tags: ['test', 'mock'],
  },

  /**
   * Mock project data
   */
  mockProject: {
    id: '1',
    name: 'Test Project',
    description: 'A test project',
    analyses: [],
    tags: [],
    archived: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
};

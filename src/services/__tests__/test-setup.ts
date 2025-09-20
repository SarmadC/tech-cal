import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// Global test setup
beforeAll(() => {
  // Set up any global test configuration
  console.log('🧪 Starting CareerImpactService test suite');
});

afterAll(() => {
  // Clean up any global resources
  console.log('✅ CareerImpactService test suite completed');
});

beforeEach(() => {
  // Reset any global state before each test
});

afterEach(() => {
  // Clean up after each test
});

// Mock console methods to reduce noise in tests
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeAll(() => {
  console.log = (...args) => {
    if (args[0]?.includes?.('🧪') || args[0]?.includes?.('✅')) {
      originalConsoleLog(...args);
    }
  };
  
  console.warn = () => {}; // Suppress warnings in tests
  console.error = () => {}; // Suppress errors in tests (we test error handling explicitly)
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});


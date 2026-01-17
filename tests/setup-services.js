/**
 * Jest setup for service tests (Node environment)
 */

const fs = require('fs');
const path = require('path');

// Create temp directory for tests
const TEST_DIR = '/tmp/context-kiln-test';

beforeAll(() => {
  // Ensure test directory exists
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }
});

afterAll(() => {
  // Clean up test directory
  try {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  } catch (err) {
    console.warn('Failed to clean up test directory:', err.message);
  }
});

// Global test utilities
global.TEST_DIR = TEST_DIR;

// Helper to create temp files for testing
global.createTempFile = (filename, content) => {
  const filePath = path.join(TEST_DIR, filename);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content);
  return filePath;
};

// Helper to create temp directory
global.createTempDir = (dirname) => {
  const dirPath = path.join(TEST_DIR, dirname);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
};

// Increase timeout for async operations
jest.setTimeout(10000);

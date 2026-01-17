/**
 * Jest Configuration for Context Kiln
 *
 * Supports two test environments:
 * - Node: For main process services (DatabaseService, FileService, etc.)
 * - JSDOM: For React components and renderer process code
 */

module.exports = {
  // Use different configurations for different test types
  projects: [
    // Node environment for services (main process)
    {
      displayName: 'services',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/src/services/**/*.test.js',
        '<rootDir>/tests/services/**/*.test.js',
      ],
      moduleFileExtensions: ['js', 'json', 'node'],
      // Mock Electron and native modules
      moduleNameMapper: {
        '^electron$': '<rootDir>/tests/__mocks__/electron.js',
        '^better-sqlite3$': '<rootDir>/tests/__mocks__/better-sqlite3.js',
      },
      setupFilesAfterEnv: ['<rootDir>/tests/setup-services.js'],
      // Ignore node_modules except for ESM packages that need transformation
      transformIgnorePatterns: [
        'node_modules/(?!(node-llama-cpp)/)',
      ],
    },
    // JSDOM environment for React components (renderer process)
    {
      displayName: 'components',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/src/**/*.test.jsx',
        '<rootDir>/src/**/*.test.js',
        '<rootDir>/tests/components/**/*.test.jsx',
        '<rootDir>/tests/components/**/*.test.js',
      ],
      // Exclude service tests (they use Node environment)
      testPathIgnorePatterns: [
        '<rootDir>/src/services/',
        '<rootDir>/tests/services/',
      ],
      moduleFileExtensions: ['js', 'jsx', 'json'],
      moduleNameMapper: {
        // Handle CSS imports
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        // Mock Electron
        '^electron$': '<rootDir>/tests/__mocks__/electron.js',
      },
      setupFilesAfterEnv: [
        '@testing-library/jest-dom',
        '<rootDir>/tests/setup-components.js',
      ],
      transform: {
        '^.+\\.(js|jsx)$': 'babel-jest',
      },
    },
  ],

  // Global settings
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/main.js',
    '!src/preload.js',
    '!src/index.js',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
};

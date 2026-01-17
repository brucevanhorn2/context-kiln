/**
 * Jest setup for React component tests (JSDOM environment)
 */

// Mock window.electron for renderer process tests
global.window = global.window || {};
global.window.electron = {
  // Folder operations
  onFolderOpened: jest.fn(),
  onOpenSettings: jest.fn(),

  // AI Provider
  sendAIMessage: jest.fn(),
  onAIChunk: jest.fn(),
  offAIChunk: jest.fn(),
  getAIProviders: jest.fn().mockResolvedValue([]),
  getAIModels: jest.fn().mockResolvedValue([]),
  validateApiKey: jest.fn().mockResolvedValue({ valid: true }),

  // Sessions
  createSession: jest.fn().mockResolvedValue({ uuid: 'test-uuid' }),
  loadSession: jest.fn().mockResolvedValue({ messages: [] }),
  listSessions: jest.fn().mockResolvedValue([]),
  renameSession: jest.fn().mockResolvedValue(true),
  archiveSession: jest.fn().mockResolvedValue(true),

  // Files
  readFile: jest.fn().mockResolvedValue('test content'),
  saveFile: jest.fn().mockResolvedValue(true),
  getFileMetadata: jest.fn().mockResolvedValue({
    path: '/test/file.js',
    content: 'test content',
    language: 'javascript',
    metadata: { lines: 1, fileSize: 12 },
  }),

  // Database
  getUsageStats: jest.fn().mockResolvedValue([]),
  getSettings: jest.fn().mockResolvedValue({}),
  setSetting: jest.fn().mockResolvedValue(true),
  getOrCreateProject: jest.fn().mockResolvedValue({ id: 1 }),

  // Tool execution
  executeTool: jest.fn().mockResolvedValue({ success: true }),
  setToolProjectRoot: jest.fn().mockResolvedValue(true),

  // Logging
  log: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    getRecent: jest.fn().mockResolvedValue([]),
    getPath: jest.fn().mockResolvedValue('/tmp/test.log'),
  },
};

// Mock matchMedia (required by some Ant Design components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Suppress console errors during tests (optional - comment out for debugging)
// const originalError = console.error;
// beforeAll(() => {
//   console.error = (...args) => {
//     if (args[0]?.includes?.('Warning:')) return;
//     originalError.call(console, ...args);
//   };
// });
// afterAll(() => {
//   console.error = originalError;
// });

/**
 * Playwright configuration for E2E testing
 * 
 * This configuration is set up for Electron application testing.
 * Playwright can launch and interact with the Electron app directly.
 */

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  fullyParallel: false, // Run tests serially for Electron
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for Electron tests
  reporter: 'html',
  
  use: {
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'electron',
      testMatch: '**/*.spec.ts',
    },
  ],
});

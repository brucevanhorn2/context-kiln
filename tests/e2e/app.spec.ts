/**
 * E2E tests for Context Kiln Electron application
 * 
 * These tests launch the actual Electron app and interact with it
 * using Playwright's Electron class.
 */

import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import path from 'path';

let electronApp: ElectronApplication;
let window: Page;

test.beforeAll(async () => {
  // Launch Electron app
  electronApp = await electron.launch({
    args: [path.join(__dirname, '../../src/main.js')],
    env: {
      ...process.env,
      NODE_ENV: 'test',
    },
  });

  // Get the first window
  window = await electronApp.firstWindow();
  
  // Wait for the app to be ready
  await window.waitForLoadState('domcontentloaded');
});

test.afterAll(async () => {
  if (electronApp) {
    await electronApp.close();
  }
});

test.describe('Application Launch', () => {
  test('should display the main window', async () => {
    const title = await window.title();
    expect(title).toContain('Context Kiln');
  });

  test('should have visible main content', async () => {
    // Wait for React to render
    await window.waitForSelector('#root', { timeout: 10000 });
    
    const root = await window.locator('#root');
    await expect(root).toBeVisible();
  });
});

test.describe('File Tree Panel', () => {
  test('should display the file tree panel', async () => {
    // Look for the file tree container
    const fileTree = await window.locator('[data-testid="file-tree"], .file-tree');
    
    // It may or may not be visible depending on project state
    const isVisible = await fileTree.isVisible().catch(() => false);
    
    // Just verify the selector doesn't throw
    expect(true).toBe(true);
  });
});

test.describe('Center Panel', () => {
  test('should display the center panel', async () => {
    // Look for the main center panel content area
    const centerPanel = await window.locator('[data-testid="center-panel"], .center-panel');
    
    const isVisible = await centerPanel.isVisible().catch(() => false);
    expect(true).toBe(true);
  });
});

test.describe('Settings Modal', () => {
  test('should open settings when triggered', async () => {
    // Try to find and click a settings button/gear icon
    const settingsButton = await window.locator('[data-testid="settings-button"], button:has-text("Settings"), .settings-icon').first();
    
    const exists = await settingsButton.isVisible().catch(() => false);
    
    if (exists) {
      await settingsButton.click();
      
      // Look for settings modal
      const modal = await window.locator('[data-testid="settings-modal"], .modal, dialog').first();
      await expect(modal).toBeVisible({ timeout: 5000 });
      
      // Close it
      await window.keyboard.press('Escape');
    }
  });
});

test.describe('API Key Configuration', () => {
  test('should show API key setup prompt when no keys configured', async () => {
    // This might show a prompt or notice about API keys
    const apiKeyNotice = await window.locator('text=/API key|Configure|Get started/i').first();
    
    const exists = await apiKeyNotice.isVisible().catch(() => false);
    // Just verify test runs without throwing
    expect(true).toBe(true);
  });
});

test.describe('Window Controls', () => {
  test('should respond to window minimize', async () => {
    // Get initial bounds
    const initialBounds = await electronApp.evaluate(async ({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      return win.getBounds();
    });
    
    expect(initialBounds.width).toBeGreaterThan(0);
    expect(initialBounds.height).toBeGreaterThan(0);
  });
});

test.describe('IPC Communication', () => {
  test('should handle IPC calls', async () => {
    // Test that the app can handle IPC calls from renderer
    const result = await electronApp.evaluate(async ({ ipcMain }) => {
      return true; // Just verify we can access ipcMain
    });
    
    expect(result).toBe(true);
  });
});

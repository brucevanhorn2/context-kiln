const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const { scanDirectory } = require('./directoryScanner');

// Import services
const AIProviderService = require('./services/AIProviderService');
const DatabaseService = require('./services/DatabaseService');
const FileService = require('./services/FileService');
const SessionService = require('./services/SessionService');
const TokenCounterService = require('./services/TokenCounterService');

const isDev = process.env.NODE_ENV === 'development';

let mainWindow;

// Service instances (initialized after app ready)
let aiProviderService;
let databaseService;
let fileService;
let sessionService;
let tokenCounterService;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  createMenu();
};

const createMenu = () => {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Folder',
          accelerator: 'Ctrl+K Ctrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openDirectory'],
            });

            if (!result.canceled && result.filePaths.length > 0) {
              const folderPath = result.filePaths[0];
              const treeData = scanDirectory(folderPath);
              mainWindow.webContents.send('folder-opened', {
                path: folderPath,
                data: treeData,
              });
            }
          },
        },
        {
          type: 'separator',
        },
        {
          label: 'Exit',
          accelerator: 'Ctrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'Ctrl+Z',
        },
        {
          label: 'Redo',
          accelerator: 'Ctrl+Y',
        },
        {
          type: 'separator',
        },
        {
          label: 'Cut',
          accelerator: 'Ctrl+X',
        },
        {
          label: 'Copy',
          accelerator: 'Ctrl+C',
        },
        {
          label: 'Paste',
          accelerator: 'Ctrl+V',
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'Ctrl+R',
          click: () => {
            mainWindow.webContents.reload();
          },
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'F12',
          click: () => {
            mainWindow.webContents.toggleDevTools();
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};

/**
 * Initialize all services
 */
const initializeServices = () => {
  try {
    // Initialize DatabaseService
    databaseService = new DatabaseService();
    databaseService.initialize();
    console.log('DatabaseService initialized');

    // Initialize TokenCounterService
    tokenCounterService = new TokenCounterService();
    tokenCounterService.initialize();
    console.log('TokenCounterService initialized');

    // Initialize FileService (no project root yet)
    fileService = new FileService();
    console.log('FileService initialized');

    // Initialize SessionService
    sessionService = new SessionService(fileService, databaseService);
    console.log('SessionService initialized');

    // Initialize AIProviderService
    aiProviderService = new AIProviderService(null, databaseService);
    console.log('AIProviderService initialized');

    console.log('All services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize services:', error);
    dialog.showErrorBox(
      'Initialization Error',
      `Failed to initialize services: ${error.message}`
    );
  }
};

/**
 * Setup IPC handlers
 */
const setupIPC = () => {
  // ============================================================================
  // AI PROVIDER HANDLERS
  // ============================================================================

  /**
   * Send message to AI provider
   */
  ipcMain.handle('ai-provider:send-message', async (event, data) => {
    const { internalContext, model, provider } = data;

    try {
      // Send message with streaming callbacks
      const response = await aiProviderService.sendMessage(
        internalContext,
        model,
        provider,
        // onChunk callback
        (chunk) => {
          mainWindow.webContents.send('ai-provider:chunk', {
            type: 'chunk',
            content: chunk.content,
          });
        },
        // onComplete callback
        (finalResponse) => {
          mainWindow.webContents.send('ai-provider:chunk', {
            type: 'done',
            message: {
              content: finalResponse.content,
              usage: finalResponse.usage,
              cost: finalResponse.cost,
            },
          });
        },
        // onError callback
        (error) => {
          mainWindow.webContents.send('ai-provider:chunk', {
            type: 'error',
            error: error.message || 'Unknown error',
          });
        }
      );

      return { success: true };
    } catch (error) {
      console.error('AI provider error:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Get available AI providers
   */
  ipcMain.handle('ai-provider:get-providers', async () => {
    try {
      return aiProviderService.getAvailableProviders();
    } catch (error) {
      console.error('Failed to get providers:', error);
      throw error;
    }
  });

  /**
   * Get available models for provider
   */
  ipcMain.handle('ai-provider:get-models', async (event, provider) => {
    try {
      return aiProviderService.getAvailableModels(provider);
    } catch (error) {
      console.error('Failed to get models:', error);
      throw error;
    }
  });

  /**
   * Validate API key
   */
  ipcMain.handle('ai-provider:validate-key', async (event, provider, apiKey) => {
    try {
      return await aiProviderService.validateApiKey(provider, apiKey);
    } catch (error) {
      console.error('Failed to validate API key:', error);
      return false;
    }
  });

  // ============================================================================
  // SESSION HANDLERS
  // ============================================================================

  /**
   * Create new session
   */
  ipcMain.handle('session:create', async (event, projectPath, name, projectId) => {
    try {
      return await sessionService.createSession(projectPath, name, projectId);
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  });

  /**
   * Load session by UUID
   */
  ipcMain.handle('session:load', async (event, uuid, projectPath) => {
    try {
      return await sessionService.loadSession(uuid, projectPath);
    } catch (error) {
      console.error('Failed to load session:', error);
      throw error;
    }
  });

  /**
   * List sessions for project
   */
  ipcMain.handle('session:list', async (event, projectId) => {
    try {
      return sessionService.getSessions(projectId);
    } catch (error) {
      console.error('Failed to list sessions:', error);
      throw error;
    }
  });

  /**
   * Rename session
   */
  ipcMain.handle('session:rename', async (event, uuid, newName, projectPath) => {
    try {
      await sessionService.renameSession(uuid, newName, projectPath);
      return { success: true };
    } catch (error) {
      console.error('Failed to rename session:', error);
      throw error;
    }
  });

  /**
   * Archive session
   */
  ipcMain.handle('session:archive', async (event, uuid) => {
    try {
      sessionService.archiveSession(uuid);
      return { success: true };
    } catch (error) {
      console.error('Failed to archive session:', error);
      throw error;
    }
  });

  // ============================================================================
  // FILE HANDLERS
  // ============================================================================

  /**
   * Read file
   */
  ipcMain.handle('file:read', async (event, filePath) => {
    try {
      return await fileService.readFile(filePath);
    } catch (error) {
      console.error('Failed to read file:', error);
      throw error;
    }
  });

  /**
   * Save file
   */
  ipcMain.handle('file:save', async (event, filePath, content) => {
    try {
      await fileService.writeFile(filePath, content);
      return { success: true };
    } catch (error) {
      console.error('Failed to save file:', error);
      throw error;
    }
  });

  /**
   * Get file metadata
   */
  ipcMain.handle('file:get-metadata', async (event, filePath) => {
    try {
      return await fileService.getFileMetadata(filePath);
    } catch (error) {
      console.error('Failed to get file metadata:', error);
      throw error;
    }
  });

  // ============================================================================
  // DATABASE HANDLERS
  // ============================================================================

  /**
   * Get usage statistics
   */
  ipcMain.handle('database:get-usage', async (event, type, filters) => {
    try {
      switch (type) {
        case 'project':
          return databaseService.getProjectUsage(
            filters.projectId,
            filters.timeRange || 'all'
          );
        case 'session':
          return databaseService.getSessionUsage(filters.sessionId);
        case 'api-key':
          return databaseService.getApiKeyUsage(
            filters.apiKeyId,
            filters.timeRange || 'all'
          );
        case 'global':
          return databaseService.getGlobalUsage(filters.timeRange || 'all');
        default:
          throw new Error(`Unknown usage type: ${type}`);
      }
    } catch (error) {
      console.error('Failed to get usage stats:', error);
      throw error;
    }
  });

  /**
   * Get all settings
   */
  ipcMain.handle('database:get-settings', async () => {
    try {
      return databaseService.getAllSettings();
    } catch (error) {
      console.error('Failed to get settings:', error);
      throw error;
    }
  });

  /**
   * Set setting
   */
  ipcMain.handle('database:set-setting', async (event, key, value) => {
    try {
      databaseService.setSetting(key, value);
      return { success: true };
    } catch (error) {
      console.error('Failed to set setting:', error);
      throw error;
    }
  });

  /**
   * Get or create project
   */
  ipcMain.handle('database:get-or-create-project', async (event, folderPath) => {
    try {
      return databaseService.getOrCreateProject(folderPath);
    } catch (error) {
      console.error('Failed to get/create project:', error);
      throw error;
    }
  });

  console.log('IPC handlers registered');
};

app.on('ready', () => {
  initializeServices();
  setupIPC();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const { scanDirectory } = require('./directoryScanner');

// Import services
const AIProviderService = require('./services/AIProviderService');
const DatabaseService = require('./services/DatabaseService');
const FileService = require('./services/FileService');
const SessionService = require('./services/SessionService');
const TokenCounterService = require('./services/TokenCounterService');
const ToolExecutionService = require('./services/ToolExecutionService');
const CodeIndexService = require('./services/CodeIndexService');
const LocalModelService = require('./services/LocalModelService');
const logService = require('./services/LogService');

const isDev = process.env.NODE_ENV === 'development';

let mainWindow;

// Service instances (initialized after app ready)
let aiProviderService;
let databaseService;
let fileService;
let sessionService;
let tokenCounterService;
let toolExecutionService;
let codeIndexService;
let localModelService;

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

              // Build code index for the project (Phase B.75)
              try {
                console.log('[Main] Building code index for:', folderPath);

                // Get or create project in database
                const project = databaseService.getOrCreateProject(folderPath);

                // Initialize CodeIndexService
                codeIndexService = new CodeIndexService(databaseService);
                await codeIndexService.initialize(folderPath, project.id);

                // Pass CodeIndexService to ToolExecutionService
                toolExecutionService.setCodeIndexService(codeIndexService);

                // Build index with progress updates
                mainWindow.webContents.send('index-status', {
                  status: 'building',
                  message: 'Building code index...',
                });

                const stats = await codeIndexService.buildIndex((current, total) => {
                  mainWindow.webContents.send('index-progress', {
                    current,
                    total,
                    percentage: Math.round((current / total) * 100),
                  });
                });

                mainWindow.webContents.send('index-status', {
                  status: 'complete',
                  message: `Index built: ${stats.symbolsFound} symbols, ${stats.importsFound} imports`,
                  stats,
                });

                console.log('[Main] Code index built:', stats);
              } catch (error) {
                console.error('[Main] Error building code index:', error);
                mainWindow.webContents.send('index-status', {
                  status: 'error',
                  message: `Failed to build index: ${error.message}`,
                });
              }
            }
          },
        },
        {
          type: 'separator',
        },
        {
          label: 'Load Model...',
          accelerator: 'Ctrl+Shift+M',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              title: 'Load GGUF Model',
              properties: ['openFile'],
              filters: [
                { name: 'GGUF Models', extensions: ['gguf'] },
                { name: 'All Files', extensions: ['*'] },
              ],
            });

            if (!result.canceled && result.filePaths.length > 0) {
              const modelPath = result.filePaths[0];

              try {
                // Show loading notification
                mainWindow.webContents.send('model-status', {
                  status: 'loading',
                  message: 'Loading model... This may take a minute.',
                });

                // Get file stats for recommendations
                const stats = await require('fs').promises.stat(modelPath);
                const modelSizeMB = (stats.size / 1024 / 1024).toFixed(2);

                // Get recommendations
                const recommendations = localModelService.recommendModelSettings(parseFloat(modelSizeMB));

                if (!recommendations.canLoad) {
                  throw new Error(recommendations.warnings.join('\n'));
                }

                // Load model with recommended settings
                const modelInfo = await localModelService.loadModel(modelPath, recommendations.settings);

                // Notify renderer
                mainWindow.webContents.send('model-loaded', modelInfo);

                mainWindow.webContents.send('model-status', {
                  status: 'success',
                  message: `Model loaded: ${modelInfo.name}`,
                  modelInfo,
                });

                console.log('[Main] Model loaded successfully:', modelInfo);
              } catch (error) {
                console.error('[Main] Failed to load model:', error);
                mainWindow.webContents.send('model-status', {
                  status: 'error',
                  message: `Failed to load model: ${error.message}`,
                });
              }
            }
          },
        },
        {
          type: 'separator',
        },
        {
          label: 'Settings',
          accelerator: 'Ctrl+,',
          click: () => {
            mainWindow.webContents.send('open-settings');
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
    // Initialize LogService first
    const logFile = logService.initialize();
    logService.info('Main', `Log file: ${logFile}`);

    // Initialize DatabaseService
    databaseService = new DatabaseService();
    databaseService.initialize();
    logService.info('Main', 'DatabaseService initialized');

    // Initialize TokenCounterService
    tokenCounterService = new TokenCounterService();
    tokenCounterService.initialize();
    logService.info('Main', 'TokenCounterService initialized');

    // Initialize FileService (no project root yet)
    fileService = new FileService();
    logService.info('Main', 'FileService initialized');

    // Initialize SessionService
    sessionService = new SessionService(fileService, databaseService);
    logService.info('Main', 'SessionService initialized');

    // Initialize AIProviderService
    aiProviderService = new AIProviderService(null, databaseService);
    logService.info('Main', 'AIProviderService initialized');

    // Initialize ToolExecutionService (no project root yet)
    toolExecutionService = new ToolExecutionService(fileService, null);
    logService.info('Main', 'ToolExecutionService initialized');

    // Initialize LocalModelService (Phase E - embedded models)
    localModelService = new LocalModelService();
    logService.info('Main', 'LocalModelService initialized');

    // Register LocalModelAdapter with AIProviderService
    aiProviderService.setLocalModelService(localModelService);
    logService.info('Main', 'LocalModelAdapter registered');

    logService.info('Main', 'All services initialized successfully');
  } catch (error) {
    logService.error('Main', 'Failed to initialize services', error.message);
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
    const { internalContext, model, provider, projectRoot } = data;

    try {
      // Note: Tool execution is handled in the main process via toolExecutionService
      // The toolContext approval workflow happens in the renderer
      // For now, we pass null for toolContext - full integration needs more work

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
        },
        // Tool execution service
        toolExecutionService,
        // Tool context (null for now - approval workflow needs renderer integration)
        null,
        // Project root
        projectRoot || null
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

  /**
   * Execute a tool call
   * Note: For edit_file and create_file, this returns immediately with status 'pending'
   * The actual execution happens after user approval via tool:approve-execution
   */
  ipcMain.handle('tool:execute', async (event, toolCall, projectRoot) => {
    try {
      // Update project root if provided
      if (projectRoot && toolExecutionService) {
        toolExecutionService.setProjectRoot(projectRoot);
      }

      // Note: toolContext is passed from renderer, but for approval workflow
      // we need to communicate back via IPC events
      // For now, return immediately - full integration requires more work
      return {
        success: true,
        message: 'Tool execution initiated (approval workflow not yet connected)',
      };
    } catch (error) {
      console.error('Failed to execute tool:', error);
      throw error;
    }
  });

  /**
   * Set project root for tool execution service
   */
  ipcMain.handle('tool:set-project-root', async (event, projectRoot) => {
    try {
      if (toolExecutionService) {
        toolExecutionService.setProjectRoot(projectRoot);
      }
      return { success: true };
    } catch (error) {
      logService.error('Main', 'Failed to set project root', error.message);
      throw error;
    }
  });

  // ============================================================================
  // LOGGING HANDLERS
  // ============================================================================

  /**
   * Log from renderer process
   */
  ipcMain.handle('log:write', async (event, level, source, message, data) => {
    switch (level) {
      case 'debug':
        logService.debug(source, message, data);
        break;
      case 'info':
        logService.info(source, message, data);
        break;
      case 'warn':
        logService.warn(source, message, data);
        break;
      case 'error':
        logService.error(source, message, data);
        break;
      default:
        logService.info(source, message, data);
    }
  });

  /**
   * Get recent logs
   */
  ipcMain.handle('log:get-recent', async (event, lines) => {
    return logService.getRecentLogs(lines);
  });

  /**
   * Get log file path
   */
  ipcMain.handle('log:get-path', async () => {
    return logService.getLogFilePath();
  });

  logService.info('Main', 'IPC handlers registered');
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

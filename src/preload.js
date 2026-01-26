const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // ============================================================================
  // FOLDER OPERATIONS (Existing)
  // ============================================================================
  onFolderOpened: (callback) => {
    ipcRenderer.on('folder-opened', (event, data) => {
      callback(data);
    });
  },

  onOpenSettings: (callback) => {
    ipcRenderer.on('open-settings', callback);
  },

  // ============================================================================
  // AI PROVIDER
  // ============================================================================
  sendAIMessage: (data) => ipcRenderer.invoke('ai-provider:send-message', data),

  onAIChunk: (callback) => {
    // Store the callback directly so it can be removed later
    ipcRenderer.on('ai-provider:chunk', callback);
  },

  offAIChunk: (callback) => {
    ipcRenderer.removeListener('ai-provider:chunk', callback);
  },

  getAIProviders: () => ipcRenderer.invoke('ai-provider:get-providers'),

  getAIModels: (provider) => ipcRenderer.invoke('ai-provider:get-models', provider),

  validateApiKey: (provider, apiKey) =>
    ipcRenderer.invoke('ai-provider:validate-key', provider, apiKey),

  // ============================================================================
  // SESSIONS
  // ============================================================================
  createSession: (projectPath, name, projectId) =>
    ipcRenderer.invoke('session:create', projectPath, name, projectId),

  loadSession: (uuid, projectPath) =>
    ipcRenderer.invoke('session:load', uuid, projectPath),

  listSessions: (projectId) =>
    ipcRenderer.invoke('session:list', projectId),

  renameSession: (uuid, newName, projectPath) =>
    ipcRenderer.invoke('session:rename', uuid, newName, projectPath),

  archiveSession: (uuid) =>
    ipcRenderer.invoke('session:archive', uuid),

  // ============================================================================
  // FILES
  // ============================================================================
  readFile: (filePath) =>
    ipcRenderer.invoke('file:read', filePath),

  saveFile: (filePath, content) =>
    ipcRenderer.invoke('file:save', filePath, content),

  getFileMetadata: (filePath) =>
    ipcRenderer.invoke('file:get-metadata', filePath),

  createFile: (filePath, content = '') =>
    ipcRenderer.invoke('file:create-file', filePath, content),

  createDirectory: (dirPath) =>
    ipcRenderer.invoke('file:create-directory', dirPath),

  // ============================================================================
  // DATABASE
  // ============================================================================
  getUsageStats: (type, filters) =>
    ipcRenderer.invoke('database:get-usage', type, filters),

  getSettings: () =>
    ipcRenderer.invoke('database:get-settings'),

  setSetting: (key, value) =>
    ipcRenderer.invoke('database:set-setting', key, value),

  getOrCreateProject: (folderPath) =>
    ipcRenderer.invoke('database:get-or-create-project', folderPath),

  // ============================================================================
  // TOOL EXECUTION
  // ============================================================================
  executeTool: (toolCall, projectRoot) =>
    ipcRenderer.invoke('tool:execute', toolCall, projectRoot),

  setToolProjectRoot: (projectRoot) =>
    ipcRenderer.invoke('tool:set-project-root', projectRoot),

  // Tool approval workflow
  onToolApprovalRequest: (callback) => {
    ipcRenderer.on('tool:approval-request', (event, data) => {
      callback(data);
    });
  },

  sendToolApprovalResponse: (id, approved, modifiedToolCall) =>
    ipcRenderer.invoke('tool:approval-response', { id, approved, modifiedToolCall }),

  // ============================================================================
  // LOGGING
  // ============================================================================
  log: {
    debug: (source, message, data) =>
      ipcRenderer.invoke('log:write', 'debug', source, message, data),
    info: (source, message, data) =>
      ipcRenderer.invoke('log:write', 'info', source, message, data),
    warn: (source, message, data) =>
      ipcRenderer.invoke('log:write', 'warn', source, message, data),
    error: (source, message, data) =>
      ipcRenderer.invoke('log:write', 'error', source, message, data),
    getRecent: (lines = 100) =>
      ipcRenderer.invoke('log:get-recent', lines),
    getPath: () =>
      ipcRenderer.invoke('log:get-path'),
  },
});

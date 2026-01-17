/**
 * Mock Electron module for Jest testing
 */

const mockApp = {
  getPath: jest.fn((name) => {
    const paths = {
      userData: '/tmp/context-kiln-test',
      home: '/home/test',
      temp: '/tmp',
    };
    return paths[name] || `/tmp/${name}`;
  }),
  on: jest.fn(),
  quit: jest.fn(),
  getName: jest.fn(() => 'context-kiln'),
  getVersion: jest.fn(() => '1.0.0'),
};

const mockBrowserWindow = jest.fn().mockImplementation(() => ({
  loadURL: jest.fn(),
  on: jest.fn(),
  webContents: {
    send: jest.fn(),
    openDevTools: jest.fn(),
    on: jest.fn(),
  },
}));

const mockIpcMain = {
  handle: jest.fn(),
  on: jest.fn(),
  removeHandler: jest.fn(),
};

const mockIpcRenderer = {
  invoke: jest.fn(),
  on: jest.fn(),
  send: jest.fn(),
  removeListener: jest.fn(),
};

const mockDialog = {
  showOpenDialog: jest.fn(),
  showSaveDialog: jest.fn(),
  showMessageBox: jest.fn(),
  showErrorBox: jest.fn(),
};

const mockMenu = {
  buildFromTemplate: jest.fn(),
  setApplicationMenu: jest.fn(),
};

const mockContextBridge = {
  exposeInMainWorld: jest.fn(),
};

module.exports = {
  app: mockApp,
  BrowserWindow: mockBrowserWindow,
  ipcMain: mockIpcMain,
  ipcRenderer: mockIpcRenderer,
  dialog: mockDialog,
  Menu: mockMenu,
  contextBridge: mockContextBridge,
};

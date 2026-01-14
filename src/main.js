const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const { scanDirectory } = require('./directoryScanner');

const isDev = process.env.NODE_ENV === 'development';

let mainWindow;

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

app.on('ready', createWindow);

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

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  onFolderOpened: (callback) => {
    ipcRenderer.on('folder-opened', (event, data) => {
      callback(data);
    });
  },
});

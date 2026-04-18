// Arcade OS - Preload Script
// Safely exposes Electron APIs to the renderer via contextBridge

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('arcadeOS', {
  // Window controls
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    onMaximized: (cb) => ipcRenderer.on('window:maximized', (_, val) => cb(val)),
  },

  // Persistent data
  data: {
    load: () => ipcRenderer.invoke('data:load'),
    save: (data) => ipcRenderer.invoke('data:save', data),
  },

  // File system
  fs: {
    selectExecutable: () => ipcRenderer.invoke('fs:selectExecutable'),
    selectImage: () => ipcRenderer.invoke('fs:selectImage'),
    readDir: (path) => ipcRenderer.invoke('fs:readDir', path),
    homeDir: () => ipcRenderer.invoke('fs:homeDir'),
    drives: () => ipcRenderer.invoke('fs:drives'),
  },

  // Launcher
  launch: {
    open: (filePath) => ipcRenderer.invoke('launch:open', filePath),
  },

  // System info
  system: {
    info: () => ipcRenderer.invoke('system:info'),
  },
})

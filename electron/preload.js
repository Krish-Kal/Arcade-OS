// Arcade OS - Preload Script
// Safely exposes Electron APIs to the renderer via contextBridge

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('arcadeOS', {
  // Window controls
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    toggleFullscreen: () => ipcRenderer.invoke('window:toggleFullscreen'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    isFullscreen: () => ipcRenderer.invoke('window:isFullscreen'),
    onMaximized: (cb) => ipcRenderer.on('window:maximized', (_, val) => cb(val)),
    onFullscreen: (cb) => ipcRenderer.on('window:fullscreen', (_, val) => cb(val)),
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
    renamePath: (targetPath, nextName) => ipcRenderer.invoke('fs:renamePath', targetPath, nextName),
    deletePath: (targetPath) => ipcRenderer.invoke('fs:deletePath', targetPath),
    createFolder: (parentPath, name) => ipcRenderer.invoke('fs:createFolder', parentPath, name),
    createFile: (parentPath, name, contents) => ipcRenderer.invoke('fs:createFile', parentPath, name, contents),
    movePath: (sourcePath, destinationDir) => ipcRenderer.invoke('fs:movePath', sourcePath, destinationDir),
    copyPath: (sourcePath, destinationDir) => ipcRenderer.invoke('fs:copyPath', sourcePath, destinationDir),
    homeDir: () => ipcRenderer.invoke('fs:homeDir'),
    drives: () => ipcRenderer.invoke('fs:drives'),
    selectIconFile: () => ipcRenderer.invoke('fs:selectIconFile'),
saveFolderIcon: (folderPath, iconPath) => ipcRenderer.invoke('fs:saveFolderIcon', folderPath, iconPath),
    getAllFolderIcons: () => ipcRenderer.invoke('fs:getAllFolderIcons'),
    removeFolderIcon: (folderPath) => ipcRenderer.invoke('fs:removeFolderIcon', folderPath),
    readIconAsBase64: (path) => ipcRenderer.invoke('fs:readIconAsBase64', path),
    getFileIcon: (path) => ipcRenderer.invoke('fs:getFileIcon', path),
    readFileBuffer: (path) => ipcRenderer.invoke('fs:readFileBuffer', path),
  },

  // Launcher
  launch: {
    open: (filePath) => ipcRenderer.invoke('launch:open', filePath),
    revealPath: (filePath) => ipcRenderer.invoke('file:revealPath', filePath),
  },

  // System info
  system: {
    info: () => ipcRenderer.invoke('system:info'),
  },

  ai: {
    openInChrome: (url) => ipcRenderer.invoke('ai:openInChrome', url),
    openInEdge: (url) => ipcRenderer.invoke('ai:openInEdge', url),
    listenOnce: () => ipcRenderer.invoke('ai:listenOnce'),
    openApp: (name) => ipcRenderer.invoke('ai:openApp', name),
    createFolder: (name, location) => ipcRenderer.invoke('ai:createFolder', name, location),
    createTextFile: (name, location) => ipcRenderer.invoke('ai:createTextFile', name, location),
    openFolder: (location) => ipcRenderer.invoke('ai:openFolder', location),
    openFile: (name) => ipcRenderer.invoke('ai:openFile', name),
    setStartup: (enabled) => ipcRenderer.invoke('ai:setStartup', enabled),
    getStartup: () => ipcRenderer.invoke('ai:getStartup'),
    onQuickCommand: (cb) => ipcRenderer.on('ai:quick-command', () => cb()),
  },
  
})

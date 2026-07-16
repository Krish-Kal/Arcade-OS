const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('splashAPI', {
  notifyAnimationReady: () => {
    ipcRenderer.send('splash:animation-ready')
  }
})
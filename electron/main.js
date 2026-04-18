// Arcade OS - Electron Main Process
// Manages the BrowserWindow, IPC handlers, and system-level operations

const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const si = require('systeminformation')
const isDev = process.env.NODE_ENV !== 'production'
const dataPath = path.join(app.getPath('userData'), 'arcade-os-data.json')

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../public/icons/icon.png'),
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Window controls
  ipcMain.handle('window:minimize', () => win.minimize())
  ipcMain.handle('window:maximize', () => {
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })
  ipcMain.handle('window:close', () => win.close())
  ipcMain.handle('window:isMaximized', () => win.isMaximized())

  win.on('maximize', () => win.webContents.send('window:maximized', true))
  win.on('unmaximize', () => win.webContents.send('window:maximized', false))
}

// Persistent data store
function loadData() {
  try {
    if (fs.existsSync(dataPath)) {
      return JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
    }
  } catch (e) {}
  return { games: [], apps: [], settings: {}, launchCounts: {}, pinned: [] }
}

function saveData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2))
}

ipcMain.handle('data:load', () => loadData())
ipcMain.handle('data:save', (_, data) => { saveData(data); return true })

// File system operations
ipcMain.handle('fs:selectExecutable', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Executables', extensions: ['exe', 'app', 'sh', 'bat', 'cmd', 'lnk'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('fs:selectImage', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico'] }]
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('fs:readDir', async (_, dirPath) => {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })

    const result = []

    for (const e of entries) {
      try {
        const fullPath = path.join(dirPath, e.name)
        const stat = fs.statSync(fullPath)

        result.push({
          name: e.name,
          isDirectory: stat.isDirectory(),
          path: fullPath,
          size: stat.isFile() ? stat.size : 0,
          ext: path.extname(e.name).toLowerCase()
        })
      } catch (err) {
        console.warn('Skipped file:', e.name, err.message)
        // 🔥 skip only broken file, NOT whole directory
      }
    }

    return result

  } catch (err) {
    console.error('readDir FAILED:', dirPath, err.message)
    return []
  }
})

ipcMain.handle('fs:homeDir', () => os.homedir())
ipcMain.handle('fs:drives', () => {
  if (process.platform === 'win32') {
    const drives = []
    for (let i = 65; i <= 90; i++) {
      const letter = String.fromCharCode(i) + ':\\'
      try { fs.accessSync(letter); drives.push(letter) } catch {}
    }
    return drives
  }
  return ['/']
})

// Launch executables
ipcMain.handle('launch:open', async (_, filePath) => {
  try { await shell.openPath(filePath); return { success: true } }
  catch (err) { return { success: false, error: err.message } }
})

// System info
// ================= SYSTEM MONITOR (PRO LEVEL) =================

let cachedSystem = {
  cpu: 0,
  memory: { total: 0, used: 0, free: 0 },
  cpus: os.cpus().length,
  platform: process.platform,
  arch: process.arch,
  hostname: os.hostname(),
  load: 0,
  timestamp: Date.now()
}

let systemInterval = null

async function refreshSystem() {
  try {
    const cpu = await si.currentLoad()
    const mem = await si.mem()
    const load = await si.fullLoad()

    cachedSystem = {
      cpu: Math.round(cpu.currentLoad || 0),
      load: Math.round(load || 0),

      memory: {
        total: mem.total || 0,
        used: mem.used || 0,
        free: mem.free || 0
      },

      cpus: os.cpus().length,
      platform: process.platform,
      arch: process.arch,
      hostname: os.hostname(),

      timestamp: Date.now()
    }
  } catch (err) {
    console.error('System monitor error:', err.message)
  }
}

function startSystemMonitor() {
  if (systemInterval) return

  refreshSystem()
  systemInterval = setInterval(refreshSystem, 1000) // 🔥 1s real-time
}

startSystemMonitor()

ipcMain.handle('system:info', () => cachedSystem)

app.whenReady().then(createWindow)
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })

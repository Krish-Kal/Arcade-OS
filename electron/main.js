
const Store = require('electron-store').default

const folderIconStore = new Store({
  name: 'folder-icons',
  schema: {
    icons: {
      type: 'object',
      additionalProperties: { type: 'string', minLength: 1 },
      default: {},
    },
  },
  defaults: { icons: {} },
})

const {
  app, BrowserWindow, ipcMain, shell, dialog,
  Tray, Menu, nativeImage
} = require('electron')
const { execFile } = require('child_process')
const path = require('path')
const fs   = require('fs')
const os   = require('os')
const si   = require('systeminformation')

const isDev    = process.env.NODE_ENV !== 'production'
const dataPath = path.join(app.getPath('userData'), 'arcade-os-data.json')

let mainWindow = null
let tray       = null
let isQuitting = false

function iconPath() {
  return path.join(__dirname, '../public/icons/icon.png')
}

/* ── Tray ────────────────────────────────────────────────────── */
function createTray() {
  if (tray) return

  const icon = nativeImage.createFromPath(iconPath())
  tray = new Tray(
    icon.isEmpty() ? nativeImage.createEmpty() : icon.resize({ width: 16, height: 16 })
  )
  tray.setToolTip('Arcade OS - ambient command layer')
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: 'Open Arcade OS',
      click: () => { mainWindow?.show(); mainWindow?.focus() },
    },
    {
      label: 'Quick Command',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
        mainWindow?.webContents.send('ai:quick-command')
      },
    },
    { type: 'separator' },
    { label: 'Quit', click: () => { isQuitting = true; app.quit() } },
  ]))
  tray.on('click', () => { mainWindow?.show(); mainWindow?.focus() })
}

/* ── Window ──────────────────────────────────────────────────── */
function createWindow() {

  // ─────────────────────────────────────────────────────────────
  // DETECT OS for platform-specific transparency method
  // Windows 11  → backgroundMaterial: 'acrylic'  (DWM Acrylic)
  // Windows 10  → backgroundMaterial: 'acrylic' still works partially;
  //               add win.setBackgroundColor('') for extra clarity
  // macOS       → vibrancy: 'fullscreen-ui' or 'sidebar'
  // Linux       → transparent: true only (compositor-dependent)
  // ─────────────────────────────────────────────────────────────
  const isMac     = process.platform === 'darwin'
  const isWindows = process.platform === 'win32'

  const win = new BrowserWindow({
    width:  1400,
    height: 900,
    minWidth:  1000,
    minHeight: 700,
    show:  false,
    frame: false,
    titleBarStyle: 'hidden',
    fullscreenable: true,
    autoHideMenuBar: true,

    // ─────────────────────────────────────────────────────────
    // KEY FIX 1: Remove opaque backgroundColor
    //
    // BEFORE: backgroundColor: '#0a0a0f'
    //   → Electron pre-paints the entire BrowserWindow surface in
    //     this solid color BEFORE React renders. Even if CSS has
    //     background: transparent, this layer blocks the desktop.
    //     Think of it as a permanent opaque mat behind everything.
    //
    // AFTER: backgroundColor removed entirely (defaults to #00000000)
    //   → Window surface starts fully transparent. CSS glass layers
    //     now actually composite against the real desktop wallpaper.
    // ─────────────────────────────────────────────────────────

    // ─────────────────────────────────────────────────────────
    // KEY FIX 2: transparent: true
    //
    // Tells the OS compositor this window has an alpha channel.
    // Without this, even rgba(0,0,0,0) in CSS renders as black
    // because the window itself has no alpha — it's a solid rectangle.
    //
    // With transparent: true:
    //   - Window chrome is alpha-composited against desktop
    //   - backdrop-filter: blur() now blurs the ACTUAL desktop content
    //   - CSS rgba() layers become genuinely translucent
    // ─────────────────────────────────────────────────────────
    transparent: true,

    // ─────────────────────────────────────────────────────────
    // KEY FIX 3: Windows 11 Acrylic (native OS material)
    //
    // backgroundMaterial: 'acrylic' triggers DWM Acrylic on Win11.
    // This is the SAME system used by Windows 11 taskbar, Start menu,
    // and Settings. It applies:
    //   - Real-time desktop blur (OS-level, not CSS)
    //   - Noise texture overlay (subtle grain)
    //   - Tint composite on top
    //
    // On Windows 10: degrades to 'none' gracefully (transparent still works)
    // On macOS/Linux: property is ignored (vibrancy handles macOS below)
    // ─────────────────────────────────────────────────────────
    ...(isWindows && { backgroundMaterial: 'acrylic' }),

    // ─────────────────────────────────────────────────────────
    // KEY FIX 4: macOS Vibrancy
    //
    // vibrancy: 'fullscreen-ui' → same material as Spotlight, Control Center
    // Applies native NSVisualEffectView over the entire window.
    // Combined with transparent: true → full Liquid Glass effect.
    //
    // Options (pick based on desired darkness):
    //   'fullscreen-ui'    → slightly lighter, good for big surfaces
    //   'under-window'     → pure window blur, very clean
    //   'sidebar'          → darker tinted blur (closer to our aesthetic)
    //   'hud'              → darkest, most gaming-appropriate
    //
    // We use 'fullscreen-ui' as base; CSS tinting darkens to our theme.
    // ─────────────────────────────────────────────────────────
    ...(isMac && { vibrancy: 'fullscreen-ui', visualEffectState: 'active' }),

    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: iconPath(),
  })

  mainWindow = win

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  win.once('ready-to-show', () => {
    win.show()
    win.maximize()

    // ─────────────────────────────────────────────────────────
    // KEY FIX 5: Clear residual background color post-show
    //
    // On some Windows configurations, Electron applies a default
    // background tint even with transparent: true. Calling
    // setBackgroundColor('') or setBackgroundColor('#00000000')
    // after show() clears this final layer.
    // ─────────────────────────────────────────────────────────
    win.setBackgroundColor('#00000000')
  })

  win.on('close', (event) => {
    if (isQuitting) return
    event.preventDefault()
    win.hide()
  })

  /* ── IPC: File system ────────────────────────────────────── */
  ipcMain.handle('fs:readIconAsBase64', async (_, filePath) => {
    try {
      const data = fs.readFileSync(filePath)
      const ext  = path.extname(filePath).replace('.', '').toLowerCase()
      const mime =
        ext === 'ico'               ? 'image/x-icon'  :
        ext === 'png'               ? 'image/png'      :
        ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
        'application/octet-stream'
      return `data:${mime};base64,${data.toString('base64')}`
    } catch (err) {
      console.error(err)
      return null
    }
  })

  /* ── IPC: Window controls ────────────────────────────────── */
  ipcMain.handle('window:minimize',        () => win.minimize())
  ipcMain.handle('window:maximize',        () => {
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })
  ipcMain.handle('window:toggleFullscreen', () => win.setFullScreen(!win.isFullScreen()))
  ipcMain.handle('window:close',           () => win.close())
  ipcMain.handle('window:isMaximized',     () => win.isMaximized())
  ipcMain.handle('window:isFullscreen',    () => win.isFullScreen())

  win.on('maximize',           () => win.webContents.send('window:maximized', true))
  win.on('unmaximize',         () => win.webContents.send('window:maximized', false))
  win.on('enter-full-screen',  () => win.webContents.send('window:fullscreen', true))
  win.on('leave-full-screen',  () => win.webContents.send('window:fullscreen', false))
}

/* ── Persistent data ─────────────────────────────────────────── */
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

/* ── Path helpers ────────────────────────────────────────────── */
function safeName(value) {
  return String(value || '').replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim().slice(0, 80)
}

function knownFolder(location) {
  const home = os.homedir()
  const key  = String(location || 'documents').toLowerCase()
  if (key === 'desktop')                     return path.join(home, 'Desktop')
  if (key === 'downloads' || key === 'download') return path.join(home, 'Downloads')
  return path.join(home, 'Documents')
}

/* ── Browser candidates ──────────────────────────────────────── */
function chromeCandidates() {
  const candidates = []
  if (process.platform === 'win32') {
    candidates.push(
      path.join(process.env.ProgramFiles        || 'C:\\Program Files',       'Google\\Chrome\\Application\\chrome.exe'),
      path.join(process.env['ProgramFiles(x86)']|| 'C:\\Program Files (x86)', 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(process.env.LOCALAPPDATA        || '',                         'Google\\Chrome\\Application\\chrome.exe')
    )
  } else if (process.platform === 'darwin') {
    candidates.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
  } else {
    candidates.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium'
    )
  }
  return candidates.filter(Boolean)
}

function edgeCandidates() {
  const candidates = []
  if (process.platform === 'win32') {
    candidates.push(
      path.join(process.env.ProgramFiles        || 'C:\\Program Files',       'Microsoft\\Edge\\Application\\msedge.exe'),
      path.join(process.env['ProgramFiles(x86)']|| 'C:\\Program Files (x86)', 'Microsoft\\Edge\\Application\\msedge.exe'),
      path.join(process.env.LOCALAPPDATA        || '',                         'Microsoft\\Edge\\Application\\msedge.exe')
    )
  } else if (process.platform === 'darwin') {
    candidates.push('/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge')
  } else {
    candidates.push('/usr/bin/microsoft-edge', '/usr/bin/microsoft-edge-stable')
  }
  return candidates.filter(Boolean)
}

function execDetached(filePath, args = []) {
  return new Promise((resolve) => {
    const child = execFile(filePath, args, { detached: true, windowsHide: true }, (error) => {
      if (error) resolve({ success: false, error: error.message })
    })
    child.on('spawn', () => {
      child.unref()
      resolve({ success: true })
    })
  })
}

/* ── Windows Speech ──────────────────────────────────────────── */
function listenWithWindowsSpeech() {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      resolve({ success: false, error: 'Voice recognition fallback is only available on Windows.' })
      return
    }

    const script = [
      'Add-Type -AssemblyName System.Speech',
      '$recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine',
      '$recognizer.SetInputToDefaultAudioDevice()',
      '$grammar = New-Object System.Speech.Recognition.DictationGrammar',
      '$recognizer.LoadGrammar($grammar)',
      '$result = $recognizer.Recognize([TimeSpan]::FromSeconds(7))',
      'if ($result -and $result.Text) { Write-Output $result.Text }',
      '$recognizer.Dispose()',
    ].join('; ')

    execFile(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { windowsHide: true, timeout: 10000 },
      (error, stdout) => {
        if (error) { resolve({ success: false, error: error.message }); return }
        const transcript = String(stdout || '').trim()
        resolve(
          transcript
            ? { success: true, transcript }
            : { success: false, error: 'No speech detected.' }
        )
      }
    )
  })
}

/* ── Open URLs ───────────────────────────────────────────────── */
async function openInChrome(url) {
  let target
  try { target = new URL(url) } catch { return { success: false, error: 'Invalid URL' } }
  if (!['http:', 'https:'].includes(target.protocol)) return { success: false, error: 'Unsupported URL protocol' }

  const chromePath = chromeCandidates().find(c => fs.existsSync(c))
  if (chromePath) return execDetached(chromePath, ['--new-tab', target.toString()])

  await shell.openExternal(target.toString())
  return { success: true, fallback: true }
}

async function openInEdge(url) {
  let target
  try { target = new URL(url) } catch { return { success: false, error: 'Invalid URL' } }
  if (!['http:', 'https:'].includes(target.protocol)) return { success: false, error: 'Unsupported URL protocol' }

  const edgePath = edgeCandidates().find(c => fs.existsSync(c))
  if (edgePath) return execDetached(edgePath, ['--new-tab', target.toString()])

  if (process.platform === 'win32') {
    await shell.openExternal(`microsoft-edge:${target.toString()}`)
    return { success: true, fallback: true }
  }

  await shell.openExternal(target.toString())
  return { success: true, fallback: true }
}

/* ── App candidates ──────────────────────────────────────────── */
function appCandidates(name) {
  const key           = String(name || '').toLowerCase()
  const local         = process.env.LOCALAPPDATA         || ''
  const programFiles  = process.env.ProgramFiles         || 'C:\\Program Files'
  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'

  const aliases = {
    'vs code': [
      path.join(local,         'Programs\\Microsoft VS Code\\Code.exe'),
      path.join(programFiles,  'Microsoft VS Code\\Code.exe'),
    ],
    vscode: [
      path.join(local,         'Programs\\Microsoft VS Code\\Code.exe'),
      path.join(programFiles,  'Microsoft VS Code\\Code.exe'),
    ],
    edge: [
      path.join(programFiles,    'Microsoft\\Edge\\Application\\msedge.exe'),
      path.join(programFilesX86, 'Microsoft\\Edge\\Application\\msedge.exe'),
    ],
    'microsoft edge': [
      path.join(programFiles,    'Microsoft\\Edge\\Application\\msedge.exe'),
      path.join(programFilesX86, 'Microsoft\\Edge\\Application\\msedge.exe'),
    ],
    discord: [path.join(local, 'Discord\\Update.exe')],
    spotify: [path.join(process.env.APPDATA || '', 'Spotify\\Spotify.exe')],
    steam:   [
      path.join(programFilesX86, 'Steam\\steam.exe'),
      path.join(programFiles,    'Steam\\steam.exe'),
    ],
  }

  return aliases[key] || []
}

/* ── IPC: AI actions ─────────────────────────────────────────── */
ipcMain.handle('ai:openInChrome', async (_, url) => {
  try { return await openInChrome(url) }
  catch (err) { return { success: false, error: err.message } }
})

ipcMain.handle('ai:openInEdge', async (_, url) => {
  try { return await openInEdge(url) }
  catch (err) { return { success: false, error: err.message } }
})

ipcMain.handle('ai:listenOnce', async () => {
  try { return await listenWithWindowsSpeech() }
  catch (err) { return { success: false, error: err.message } }
})

ipcMain.handle('ai:openApp', async (_, rawName) => {
  try {
    const name = safeName(rawName).toLowerCase()
    if (!name) return { success: false, error: 'Missing app name' }

    if (name === 'spotify') { await shell.openExternal('spotify:');         return { success: true } }
    if (name === 'discord') { await shell.openExternal('discord:');         return { success: true } }
    if (name === 'edge' || name === 'microsoft edge') {
      await shell.openExternal('microsoft-edge:')
      return { success: true }
    }

    const target = appCandidates(name).find(c => fs.existsSync(c))
    if (!target) return { success: false, error: `${rawName} was not found` }

    if (name === 'discord' && target.endsWith('Update.exe')) {
      return execDetached(target, ['--processStart', 'Discord.exe'])
    }
    return execDetached(target)
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('ai:createFolder', async (_, rawName, location) => {
  try {
    const name = safeName(rawName)
    if (!name) return { success: false, error: 'Invalid folder name' }
    const base   = knownFolder(location)
    const target = path.resolve(base, name)
    if (!target.startsWith(path.resolve(base))) return { success: false, error: 'Invalid folder path' }
    fs.mkdirSync(target, { recursive: true })
    return { success: true, path: target }
  } catch (err) { return { success: false, error: err.message } }
})

ipcMain.handle('ai:createTextFile', async (_, rawName, location) => {
  try {
    let name = safeName(rawName)
    if (!name) return { success: false, error: 'Invalid file name' }
    if (!name.toLowerCase().endsWith('.txt')) name += '.txt'
    const base   = knownFolder(location)
    const target = path.resolve(base, name)
    if (!target.startsWith(path.resolve(base))) return { success: false, error: 'Invalid file path' }
    if (!fs.existsSync(target)) fs.writeFileSync(target, '', 'utf8')
    await shell.openPath(target)
    return { success: true, path: target }
  } catch (err) { return { success: false, error: err.message } }
})

ipcMain.handle('ai:openFolder', async (_, location) => {
  try {
    const target = knownFolder(location)
    await shell.openPath(target)
    return { success: true, path: target }
  } catch (err) { return { success: false, error: err.message } }
})

ipcMain.handle('ai:openFile', async (_, rawName) => {
  try {
    const name  = safeName(rawName).toLowerCase()
    if (!name) return { success: false, error: 'Invalid file name' }
    const roots = [knownFolder('desktop'), knownFolder('documents'), knownFolder('downloads')]
    for (const root of roots) {
      if (!fs.existsSync(root)) continue
      const found = fs.readdirSync(root).find(f => f.toLowerCase().includes(name))
      if (found) {
        const target = path.join(root, found)
        await shell.openPath(target)
        return { success: true, path: target }
      }
    }
    return { success: false, error: `${rawName} was not found` }
  } catch (err) { return { success: false, error: err.message } }
})

ipcMain.handle('ai:setStartup', (_, enabled) => {
  app.setLoginItemSettings({ openAtLogin: Boolean(enabled), openAsHidden: true })
  return app.getLoginItemSettings()
})
ipcMain.handle('ai:getStartup', () => app.getLoginItemSettings())

/* ── IPC: File system ────────────────────────────────────────── */
ipcMain.handle('fs:selectExecutable', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Executables', extensions: ['exe', 'app', 'sh', 'bat', 'cmd', 'lnk'] },
      { name: 'All Files',   extensions: ['*'] },
    ],
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('fs:selectImage', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico'] }],
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('fs:readDir', async (_, dirPath) => {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    const result  = []
    for (const e of entries) {
      try {
        const fullPath = path.join(dirPath, e.name)
        const stat     = fs.statSync(fullPath)
        result.push({
          name:        e.name,
          isDirectory: stat.isDirectory(),
          path:        fullPath,
          size:        stat.isFile() ? stat.size : 0,
          ext:         path.extname(e.name).toLowerCase(),
        })
      } catch (err) {
        console.warn('Skipped file:', e.name, err.message)
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

/* ── IPC: Launch ─────────────────────────────────────────────── */
ipcMain.handle('launch:open', async (_, filePath) => {
  try { await shell.openPath(filePath); return { success: true } }
  catch (err) { return { success: false, error: err.message } }
})

/* ══════════════════════════════════════════════════════════════
   SYSTEM MONITOR
══════════════════════════════════════════════════════════════ */
let cachedSystem = {
  cpu:      0,
  memory:   { total: 0, used: 0, free: 0 },
  cpus:     os.cpus().length,
  platform: process.platform,
  arch:     process.arch,
  hostname: os.hostname(),
  load:     0,
  timestamp: Date.now(),
}

let systemInterval = null

async function refreshSystem() {
  try {
    const [cpu, mem, load] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fullLoad(),
    ])
    cachedSystem = {
      cpu:    Math.round(cpu.currentLoad || 0),
      load:   Math.round(load || 0),
      memory: {
        total: mem.total || 0,
        used:  mem.used  || 0,
        free:  mem.free  || 0,
      },
      cpus:     os.cpus().length,
      platform: process.platform,
      arch:     process.arch,
      hostname: os.hostname(),
      timestamp: Date.now(),
    }
  } catch (err) {
    console.error('System monitor error:', err.message)
  }
}

function startSystemMonitor() {
  if (systemInterval) return
  refreshSystem()
  systemInterval = setInterval(refreshSystem, 1000)
}

startSystemMonitor()
ipcMain.handle('system:info', () => cachedSystem)

/* ══════════════════════════════════════════════════════════════
   APP READY
══════════════════════════════════════════════════════════════ */
app.whenReady().then(() => {
  createWindow()
  createTray()

  /* ── Folder icon IPC ─────────────────────────────────────── */
  ipcMain.handle('fs:selectIconFile', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'ico', 'webp'] }],
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('fs:saveFolderIcon', async (_, folderPath, iconFilePath) => {
    const data = fs.readFileSync(iconFilePath)
    const ext  = path.extname(iconFilePath).replace('.', '').toLowerCase()
    const mime =
      ext === 'png'               ? 'image/png'      :
      ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
      ext === 'ico'               ? 'image/x-icon'   :
      'application/octet-stream'

    const base64 = `data:${mime};base64,${data.toString('base64')}`
    const icons  = folderIconStore.get('icons', {})
    icons[folderPath] = base64
    folderIconStore.set('icons', icons)
    return true
  })

  ipcMain.handle('fs:getAllFolderIcons', () => folderIconStore.get('icons', {}))

  ipcMain.handle('fs:removeFolderIcon', (_, folderPath) => {
    const icons = folderIconStore.get('icons', {})
    delete icons[folderPath]
    folderIconStore.set('icons', icons)
    return true
  })
})

app.on('before-quit',    () => { isQuitting = true })
app.on('window-all-closed', () => { /* keep alive in tray */ })
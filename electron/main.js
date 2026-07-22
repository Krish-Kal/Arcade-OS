
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
  app, BrowserWindow, ipcMain, shell, dialog, screen
} = require('electron')
const { execFile } = require('child_process')
const path = require('path')
const fs   = require('fs')
const os   = require('os')
const si   = require('systeminformation')

const isDev = !app.isPackaged
const dataPath = path.join(app.getPath('userData'), 'arcade-os-data.json')

let mainWindow = null

function iconPath() {
  return path.join(__dirname, '../public/icons/icon.png')
}

let splashWindow = null
let mainWindowReady = false
let splashAnimationReady = false

function resolveSplashHtmlPath() {
  if (isDev) {
    return 'http://localhost:5173/splash.html'
  }
  return path.join(__dirname, '../dist/splash.html')
}

function createSplashWindow() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize

  splashWindow = new BrowserWindow({
    width: 420,
    height: 420,
    x: Math.round(primaryDisplay.bounds.x + (width - 420) / 2),
    y: Math.round(primaryDisplay.bounds.y + (height - 420) / 2),
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'splash-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  })

  splashWindow.loadURL(resolveSplashHtmlPath())

  splashWindow.once('ready-to-show', () => {
    splashWindow.show()
  })

  splashWindow.on('closed', () => {
    splashWindow = null
  })
}

function maybeFinishStartup(win) {
  if (!mainWindowReady || !splashAnimationReady) return

  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close()
  }

  win.show()
  win.maximize()
  win.setBackgroundColor('#00000000')
  win.focus()
}
/* ── Window ──────────────────────────────────────────────────── */

// Windows 11's DWM `backgroundMaterial` API (Acrylic/Mica) does not exist
// on Windows 10 — it's not a degraded version of the same feature, it's
// simply absent. `os.release()` reports the kernel version as
// "10.0.<build>" for both Windows 10 and 11; Windows 11 starts at build
// 22000, so that's the only reliable way to distinguish them from Node.
function getWindowsBuildNumber() {
  if (process.platform !== 'win32') return 0
  try {
    const parts = os.release().split('.').map(Number)
    return parts[2] || 0
  } catch {
    return 0
  }
}

function supportsWin11BackgroundMaterial() {
  return process.platform === 'win32' && getWindowsBuildNumber() >= 22000
}

// Defensive BrowserWindow creation. `transparent: true` combined with a
// native material property is generally safe across Electron versions
// (unsupported keys are ignored, not thrown), but a small number of
// Linux compositor configurations reject alpha-channel windows outright.
// If window creation itself throws, fall back to a fully opaque window
// using Arcade OS's own base color rather than letting the app crash or
// render invisibly.
function createArcadeWindow(baseOptions, platformOptions) {
  try {
    return new BrowserWindow({ ...baseOptions, ...platformOptions })
  } catch (err) {
    console.warn(
      'Native transparency/backdrop options were rejected by this platform, falling back to an opaque window:',
      err.message
    )
    return new BrowserWindow({
      ...baseOptions,
      transparent: false,
      backgroundColor: '#0c0f1f' // matches --bg-base, so the fallback still reads as Arcade OS
    })
  }
}

function createWindow() {

// ─────────────────────────────────────────────────────────────
  // PLATFORM-AWARE COMPOSITING PIPELINE
  //
  // OS/native backdrop or transparent compositor
  //   ↓
  // Electron BrowserWindow alpha surface (transparent: true)
  //   ↓
  // native background material, where genuinely supported:
  //   Windows 11 (build ≥ 22000) → backgroundMaterial: 'acrylic' (real DWM
  //     desktop blur, applied by the OS compositor, not by this app)
  //   macOS                       → vibrancy (real NSVisualEffectView blur,
  //     also OS compositor-driven)
  //   Windows 10 / Linux          → no native blur API exists here; the
  //     window is simply alpha-transparent, and translucency comes
  //     entirely from the CSS glass layers below
  //   ↓
  // Arcade OS CSS: html/body/#root transparent, low-opacity shell tint
  //   ↓
  // CSS glass panels/cards (backdrop-filter blurs OTHER RENDERED CONTENT
  //   inside this window — sidebar behind a card, for example — never the
  //   real OS desktop; that distinction matters and was wrong before)
  //   ↓
  // UI content
  // ─────────────────────────────────────────────────────────────
  const isMac     = process.platform === 'darwin'
  const isWindows = process.platform === 'win32'
  const isLinux   = process.platform === 'linux'
  const win11BackgroundMaterial = supportsWin11BackgroundMaterial()

  const platformOptions = {}

  if (isWindows && win11BackgroundMaterial) {
    // Real native Acrylic — Windows 11 (DWM build ≥ 22000) only.
    platformOptions.backgroundMaterial = 'acrylic'
  } else if (isWindows) {
    // Windows 10: no equivalent native material API in Electron/DWM.
    // `transparent: true` below plus CSS glass is the entire story here.
  } else if (isMac) {
    // 'under-window' gives a clean native blur of whatever is behind the
    // window without macOS's lighter 'fullscreen-ui' wash, which sits
    // closer to Arcade OS's dark tinted aesthetic once the CSS tint
    // layers on top of it.
    platformOptions.vibrancy = 'under-window'
    platformOptions.visualEffectState = 'active'
  }
  // Linux: intentionally no native material option is set. Electron has
  // no cross-desktop-environment blur API; `transparent: true` is honored
  // only if the running compositor (Mutter, KWin, Picom, etc.) supports
  // ARGB visuals. There's no reliable way to query that from the main
  // process, so we just request transparency and let the Arcade OS CSS
  // glass tint carry the visual regardless of whether the compositor
  // paints true blur behind it.

  const win = createArcadeWindow(
    {
      width:  1400,
      height: 900,
      minWidth:  1000,
      minHeight: 700,
      show:  false,
      frame: false,
      titleBarStyle: 'hidden',
      fullscreenable: true,
      autoHideMenuBar: true,

      // No `backgroundColor` here on purpose: Electron would otherwise
      // pre-paint the whole window surface in that solid color before
      // React ever mounts, which blocks the desktop no matter what the
      // CSS says. Omitting it defaults to a fully transparent surface.
      transparent: true,

      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
      icon: path.join(__dirname, '../public/icons/favicon.ico'),
    },
    platformOptions
  )

  mainWindow = win

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

win.once('ready-to-show', () => {
    mainWindowReady = true
    maybeFinishStartup(win)
})

win.on('close', () => {
  mainWindow = null
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
  ipcMain.handle('fs:getFileIcon', async (_, filePath) => {
    try {
      if (!filePath || !fs.existsSync(filePath)) return null
      const icon = await app.getFileIcon(filePath, { size: 'normal' })
      return icon?.isEmpty?.() ? null : icon.toDataURL()
    } catch (err) {
      console.error('getFileIcon failed:', err.message)
      return null
    }
  })

  ipcMain.handle('fs:readFileBuffer', async (_, filePath) => {
    try {
      if (!filePath || !fs.existsSync(filePath)) return null
      return fs.readFileSync(filePath)
    } catch (err) {
      console.error('readFileBuffer failed:', err.message)
      return null
    }
  })

  ipcMain.handle('window:minimize',        () => win.minimize())
  ipcMain.handle('window:maximize',        () => {
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })
  ipcMain.handle('window:toggleFullscreen', () => win.setFullScreen(!win.isFullScreen()))
ipcMain.handle('window:close', () => {
  app.quit()
})
  ipcMain.handle('window:isMaximized',     () => win.isMaximized())
  ipcMain.handle('window:isFullscreen',    () => win.isFullScreen())
ipcMain.on('splash:animation-ready', () => {
  splashAnimationReady = true
  maybeFinishStartup(win)
})
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
  return { games: [], apps: [], settings: {}, launchCounts: {} }
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

function normalizeFsPath(targetPath) {
  return path.resolve(String(targetPath || ''))
}

function getEntryPayload(fullPath) {
  const stat = fs.statSync(fullPath)
  return {
    name: path.basename(fullPath),
    isDirectory: stat.isDirectory(),
    path: fullPath,
    size: stat.isFile() ? stat.size : 0,
    ext: path.extname(fullPath).toLowerCase(),
    created: stat.birthtimeMs || stat.ctimeMs || Date.now(),
    modified: stat.mtimeMs || Date.now(),
  }
}

function pathWithin(parentPath, candidatePath) {
  const parent = normalizeFsPath(parentPath)
  const candidate = normalizeFsPath(candidatePath)
  return candidate === parent || candidate.startsWith(`${parent}${path.sep}`)
}

function splitNameParts(name) {
  const ext = path.extname(name)
  return {
    ext,
    base: ext ? name.slice(0, -ext.length) : name,
  }
}

function makeUniquePath(targetPath, { copyStyle = false } = {}) {
  if (!fs.existsSync(targetPath)) return targetPath

  const dir = path.dirname(targetPath)
  const { name } = path.parse(targetPath)
  const ext = path.extname(targetPath)
  let index = 1

  while (true) {
    const candidateName = copyStyle
      ? index === 1
        ? `${name} copy${ext}`
        : `${name} copy ${index}${ext}`
      : index === 1
        ? `${name} (${index})${ext}`
        : `${name} (${index})${ext}`
    const candidatePath = path.join(dir, candidateName)
    if (!fs.existsSync(candidatePath)) return candidatePath
    index += 1
  }
}

function copyPathRecursive(sourcePath, targetPath) {
  const stat = fs.statSync(sourcePath)
  if (stat.isDirectory()) {
    fs.mkdirSync(targetPath, { recursive: true })
    for (const child of fs.readdirSync(sourcePath)) {
      copyPathRecursive(path.join(sourcePath, child), path.join(targetPath, child))
    }
    return
  }
  fs.copyFileSync(sourcePath, targetPath)
}

function movePathRecursive(sourcePath, targetPath) {
  try {
    fs.renameSync(sourcePath, targetPath)
  } catch (err) {
    if (err.code !== 'EXDEV') throw err
    copyPathRecursive(sourcePath, targetPath)
    fs.rmSync(sourcePath, { recursive: true, force: true })
  }
}

function remapFolderIconPaths(oldPath, newPath) {
  const icons = folderIconStore.get('icons', {})
  const next = {}

  for (const [iconPath, iconValue] of Object.entries(icons)) {
    if (pathWithin(oldPath, iconPath)) {
      const suffix = iconPath.slice(normalizeFsPath(oldPath).length)
      next[`${normalizeFsPath(newPath)}${suffix}`] = iconValue
    } else {
      next[iconPath] = iconValue
    }
  }

  folderIconStore.set('icons', next)
}

function removeFolderIconPaths(targetPath) {
  const icons = folderIconStore.get('icons', {})
  const next = {}

  for (const [iconPath, iconValue] of Object.entries(icons)) {
    if (!pathWithin(targetPath, iconPath)) next[iconPath] = iconValue
  }

  folderIconStore.set('icons', next)
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
          created:     stat.birthtimeMs || stat.ctimeMs || Date.now(),
          modified:    stat.mtimeMs || Date.now(),
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

ipcMain.handle('fs:renamePath', async (_, targetPath, nextName) => {
  try {
    const sourcePath = normalizeFsPath(targetPath)
    if (!fs.existsSync(sourcePath)) return { success: false, error: 'Path not found' }

    const sourceStat = fs.statSync(sourcePath)
    const currentName = path.basename(sourcePath)
    const safeNextName = safeName(nextName)
    if (!safeNextName) return { success: false, error: 'Invalid name' }

    let finalName = safeNextName
    if (!sourceStat.isDirectory()) {
      const currentParts = splitNameParts(currentName)
      const requestedParts = splitNameParts(safeNextName)
      finalName = requestedParts.ext ? safeNextName : `${safeNextName}${currentParts.ext}`
    }

    if (finalName === currentName) {
      return { success: true, path: sourcePath, isDirectory: sourceStat.isDirectory(), entry: getEntryPayload(sourcePath) }
    }

    const destinationPath = path.join(path.dirname(sourcePath), finalName)
    if (fs.existsSync(destinationPath)) return { success: false, error: 'An item with that name already exists' }

    fs.renameSync(sourcePath, destinationPath)
    if (sourceStat.isDirectory()) remapFolderIconPaths(sourcePath, destinationPath)

    return {
      success: true,
      oldPath: sourcePath,
      path: destinationPath,
      isDirectory: sourceStat.isDirectory(),
      entry: getEntryPayload(destinationPath),
    }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('fs:deletePath', async (_, targetPath) => {
  try {
    const normalizedPath = normalizeFsPath(targetPath)
    if (!fs.existsSync(normalizedPath)) return { success: true, path: normalizedPath }

    const stat = fs.statSync(normalizedPath)
    fs.rmSync(normalizedPath, { recursive: true, force: true })
    if (stat.isDirectory()) removeFolderIconPaths(normalizedPath)

    return { success: true, path: normalizedPath, isDirectory: stat.isDirectory() }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('fs:createFolder', async (_, parentPath, rawName) => {
  try {
    const parent = normalizeFsPath(parentPath)
    if (!fs.existsSync(parent)) return { success: false, error: 'Parent folder not found' }
    const folderName = safeName(rawName || 'New Folder')
    if (!folderName) return { success: false, error: 'Invalid folder name' }

    const targetPath = makeUniquePath(path.join(parent, folderName))
    fs.mkdirSync(targetPath, { recursive: true })

    return { success: true, path: targetPath, isDirectory: true, entry: getEntryPayload(targetPath) }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('fs:createFile', async (_, parentPath, rawName, contents = '') => {
  try {
    const parent = normalizeFsPath(parentPath)
    if (!fs.existsSync(parent)) return { success: false, error: 'Parent folder not found' }
    const fileName = safeName(rawName || 'New File.txt')
    if (!fileName) return { success: false, error: 'Invalid file name' }

    const targetPath = makeUniquePath(path.join(parent, fileName))
    fs.writeFileSync(targetPath, String(contents), 'utf8')

    return { success: true, path: targetPath, isDirectory: false, entry: getEntryPayload(targetPath) }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('fs:movePath', async (_, sourcePath, destinationDir) => {
  try {
    const source = normalizeFsPath(sourcePath)
    const targetDir = normalizeFsPath(destinationDir)
    if (!fs.existsSync(source)) return { success: false, error: 'Source path not found' }
    if (!fs.existsSync(targetDir)) return { success: false, error: 'Destination folder not found' }
    if (!fs.statSync(targetDir).isDirectory()) return { success: false, error: 'Destination must be a folder' }
    if (pathWithin(source, targetDir)) return { success: false, error: 'Cannot move a folder into itself' }

    const stat = fs.statSync(source)
    const targetPath = makeUniquePath(path.join(targetDir, path.basename(source)))
    movePathRecursive(source, targetPath)
    if (stat.isDirectory()) remapFolderIconPaths(source, targetPath)

    return {
      success: true,
      oldPath: source,
      path: targetPath,
      isDirectory: stat.isDirectory(),
      entry: getEntryPayload(targetPath),
    }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('fs:copyPath', async (_, sourcePath, destinationDir) => {
  try {
    const source = normalizeFsPath(sourcePath)
    const targetDir = normalizeFsPath(destinationDir)
    if (!fs.existsSync(source)) return { success: false, error: 'Source path not found' }
    if (!fs.existsSync(targetDir)) return { success: false, error: 'Destination folder not found' }
    if (!fs.statSync(targetDir).isDirectory()) return { success: false, error: 'Destination must be a folder' }

    const targetPath = makeUniquePath(path.join(targetDir, path.basename(source)), { copyStyle: true })
    copyPathRecursive(source, targetPath)

    return {
      success: true,
      oldPath: source,
      path: targetPath,
      isDirectory: fs.statSync(source).isDirectory(),
      entry: getEntryPayload(targetPath),
    }
  } catch (err) {
    return { success: false, error: err.message }
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

/* ── IPC: File location ──────────────────────────────────────── */
ipcMain.handle('file:revealPath', async (_, filePath) => {
  try {
    if (!filePath || typeof filePath !== 'string') {
      return { success: false, error: 'Invalid file path' }
    }

    const normalizedPath = path.resolve(filePath)
    
    if (!fs.existsSync(normalizedPath)) {
      return { success: false, error: 'File or folder not found' }
    }

    shell.showItemInFolder(normalizedPath)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
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
  createSplashWindow()
  createWindow()

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

app.on('window-all-closed', () => {
  app.quit()
})

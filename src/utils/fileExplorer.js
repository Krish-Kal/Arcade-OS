// utils/fileExplorer.js - Advanced Filesystem Engine (Arcade OS)

const isElectron = typeof window !== 'undefined' && window.arcadeOS

// 🔥 Cache for performance
const dirCache = new Map()

// 🔥 System folders to ignore (VERY IMPORTANT)
const HIDDEN_NAMES = [
  'System Volume Information',
  '$RECYCLE.BIN',
  'pagefile.sys',
  'hiberfil.sys',
  'swapfile.sys',
  'DumpStack.log.tmp'
]

// 🔥 Extensions
const EXEC_EXTS = ['exe', 'app', 'sh', 'bat', 'cmd', 'lnk', 'msi']
const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico']
const VIDEO_EXTS = ['mp4', 'mkv', 'avi', 'mov', 'webm']
const DOC_EXTS = ['txt', 'md', 'pdf', 'doc', 'docx']

// 🔥 Read directory with caching + metadata + filtering
export async function readDirectory(path, { force = false } = {}) {
  if (!isElectron) return []

  if (!force && dirCache.has(path)) {
    return dirCache.get(path)
  }

  try {
    const entries = await window.arcadeOS.fs.readDir(path)

    const enriched = entries
      // 🔥 FILTER JUNK FILES
      .filter(entry => {
        if (!entry?.name) return false

        // hide system files
        if (HIDDEN_NAMES.includes(entry.name)) return false

        // hide hidden dot files (.git, .cache etc)
        if (entry.name.startsWith('.')) return false

        return true
      })
      .map(entry => {
        const safeExt = (entry.ext || '').replace('.', '').toLowerCase()

        return {
          ...entry,
          ext: safeExt,
          type: getFileType({ ...entry, ext: safeExt }),
          isExecutable: isExecutable({ ...entry, ext: safeExt }),
          isGame: isGamePath(entry.path),
          isMedia: isMedia({ ...entry, ext: safeExt }),
        }
      })

    enriched.sort(sortEntries)

    // 🔥 cache only valid results
    dirCache.set(path, enriched)

    return enriched
  } catch (err) {
    console.error('[FS ERROR]', err)
    return []
  }
}

// 🔥 Smart sorting
function sortEntries(a, b) {
  if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1

  // Executables higher priority
  if (a.isExecutable !== b.isExecutable) return a.isExecutable ? -1 : 1

  return a.name.localeCompare(b.name)
}

// 🔥 File type detection
export function getFileType(entry) {
  if (entry.isDirectory) return 'folder'

  const ext = (entry.ext || '').replace('.', '').toLowerCase()

  if (EXEC_EXTS.includes(ext)) return 'executable'
  if (IMAGE_EXTS.includes(ext)) return 'image'
  if (VIDEO_EXTS.includes(ext)) return 'video'
  if (DOC_EXTS.includes(ext)) return 'document'

  return 'other'
}

// 🔥 Home dir
export async function getHomeDir() {
  if (!isElectron) return '/home/user'
  return window.arcadeOS.fs.homeDir()
}

// 🔥 Drives
export async function getDrives() {
  if (!isElectron) return ['C:\\']
  return window.arcadeOS.fs.drives()
}

// 🔥 Safe parent navigation
export function getParentPath(path) {
  const normalized = path.replace(/\\/g, '/')
  const parts = normalized.split('/').filter(Boolean)

  if (parts.length <= 1) return path

  parts.pop()
  return (path.startsWith('/') ? '/' : '') + parts.join('/')
}

// 🔥 File type helpers
export function isExecutable(entry) {
  const ext = (entry.ext || '').replace('.', '').toLowerCase()
  return EXEC_EXTS.includes(ext)
}

export function isMedia(entry) {
  const ext = (entry.ext || '').replace('.', '').toLowerCase()
  return IMAGE_EXTS.includes(ext) || VIDEO_EXTS.includes(ext)
}

// 🔥 Game detection (SMART)
export function isGamePath(path) {
  const lower = path.toLowerCase()

  return [
    'game', 'games',
    'steam', 'steamapps',
    'epic', 'epicgames',
    'gog', 'uplay',
    'origin', 'battlenet',
    'riot', 'valorant'
  ].some(k => lower.includes(k))
}

// 🔥 File size formatter
export function formatFileSize(bytes) {
  if (!bytes) return ''

  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`

  return `${(bytes / 1073741824).toFixed(2)} GB`
}

// 🔥 Search inside directory (client-side)
export function searchEntries(entries, query) {
  if (!query) return entries

  const q = query.toLowerCase()

  return entries.filter(e =>
    e.name.toLowerCase().includes(q) ||
    e.path.toLowerCase().includes(q)
  )
}

// 🔥 Clear cache (important when refreshing)
export function clearCache(path = null) {
  if (path) dirCache.delete(path)
  else dirCache.clear()
}

// 🔥 Open file (FULLY SAFE VERSION)
export async function openFile(path) {
  if (!isElectron) {
    console.log('[Demo] Open:', path)
    return { success: true }
  }

  try {
    // 🔥 Primary (your IPC)
    const res = await window.arcadeOS.launch.open(path)

    if (res && res.success) return res

    // 🔥 Fallback (VERY IMPORTANT for Windows)
    if (window.arcadeOS.shell?.openPath) {
      await window.arcadeOS.shell.openPath(path)
      return { success: true }
    }

    return { success: false, error: res?.error || 'Open failed' }
  } catch (err) {
    console.error('[OPEN ERROR]', err)

    // 🔥 Backup fallback
    try {
      if (window.arcadeOS.shell?.openPath) {
        await window.arcadeOS.shell.openPath(path)
        return { success: true }
      }
    } catch (e) {
      console.error('[FALLBACK ERROR]', e)
    }

    return { success: false, error: err.message }
  }
}
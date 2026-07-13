import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const isElectron = typeof window !== 'undefined' && window.arcadeOS

const SIDEBAR_DEFAULT_WIDTH = 170
const DEFAULT_SIDEBAR_COLLAPSED = { favorites: false, recent: false, drives: false }
const HIDDEN_FOLDERS = [
  '$recycle.bin', 'system volume information', 'thumbs.db',
  'desktop.ini', 'ntuser.dat', 'iconcache.db',
]

const DEMO_ROOT = '/home/user'
const DEMO_ENTRIES = [
  { name: 'Desktop', path: '/home/user/Desktop', isDirectory: true, size: 0, ext: '' },
  { name: 'Documents', path: '/home/user/Documents', isDirectory: true, size: 0, ext: '' },
  { name: 'Downloads', path: '/home/user/Downloads', isDirectory: true, size: 0, ext: '' },
]

const safePath = (input) => String(input || '').replace(/\\/g, '/')
const safeName = (input) => String(input || '')
const uniquePaths = (paths) => Array.from(new Set(paths.filter(Boolean)))

function isPathWithin(parentPath, candidatePath) {
  const parent = safePath(parentPath)
  const candidate = safePath(candidatePath)
  return candidate === parent || candidate.startsWith(`${parent}/`)
}

function getParentPath(targetPath) {
  const normalized = safePath(targetPath)
  const parts = normalized.split('/').filter(Boolean)
  if (parts.length <= 1) return normalized
  parts.pop()
  return (normalized.startsWith('/') ? '/' : '') + parts.join('/')
}

function cleanEntries(list) {
  return (Array.isArray(list) ? list : []).filter((entry) => {
    if (!entry || typeof entry !== 'object') return false
    const name = safeName(entry.name)
    const lower = name.toLowerCase()
    if (entry.hidden === true || entry.isHidden === true || entry.attributes?.hidden === true) return false
    if (name.startsWith('.')) return false
    if (HIDDEN_FOLDERS.some((item) => lower.includes(item))) return false
    return true
  })
}

function replacePrefix(pathValue, oldPath, nextPath) {
  const normalizedValue = safePath(pathValue)
  const normalizedOld = safePath(oldPath)
  const normalizedNext = safePath(nextPath)
  if (normalizedValue === normalizedOld) return normalizedNext
  if (normalizedValue.startsWith(`${normalizedOld}/`)) {
    return `${normalizedNext}${normalizedValue.slice(normalizedOld.length)}`
  }
  return normalizedValue
}

async function readDirectory(pathValue) {
  if (!pathValue) return []
  if (!isElectron) return cleanEntries(DEMO_ENTRIES)
  const entries = await window.arcadeOS.fs.readDir(pathValue)
  return cleanEntries(entries)
}

function buildDemoSystemPaths() {
  return {
    home: DEMO_ROOT,
    desktop: `${DEMO_ROOT}/Desktop`,
    downloads: `${DEMO_ROOT}/Downloads`,
    documents: `${DEMO_ROOT}/Documents`,
    pictures: `${DEMO_ROOT}/Pictures`,
    music: `${DEMO_ROOT}/Music`,
    videos: `${DEMO_ROOT}/Videos`,
  }
}

async function refreshDirectoryPath(targetPath, set) {
  const normalizedPath = safePath(targetPath)
  const entries = await readDirectory(normalizedPath)
  set((state) => ({
    directoryMap: {
      ...state.directoryMap,
      [normalizedPath]: entries,
    },
  }))
  return entries
}

export const useFileExplorerStore = create(
  persist(
    (set, get) => ({
      initialized: false,
      initializing: false,
      loading: false,
      error: '',
      currentPath: '',
      history: [],
      historyIndex: -1,
      directoryMap: {},
      drives: [],
      systemPaths: {},
      recentDirs: [],
      clipboard: null,
      viewMode: 'table',
      sidebarCollapsed: DEFAULT_SIDEBAR_COLLAPSED,
      sidebarWidth: SIDEBAR_DEFAULT_WIDTH,

      setClipboard: (clipboard) => set({ clipboard }),
      setViewMode: (viewMode) => set({ viewMode }),
      setSidebarCollapsed: (updater) => set((state) => ({
        sidebarCollapsed: typeof updater === 'function' ? updater(state.sidebarCollapsed) : updater,
      })),
      setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),

      initExplorer: async () => {
        const state = get()
        if (state.initializing) return
        if (state.initialized && state.currentPath && state.directoryMap[safePath(state.currentPath)]) return

        set({ initializing: true, error: '' })

        try {
          if (!isElectron) {
            const systemPaths = buildDemoSystemPaths()
            const currentPath = state.currentPath || systemPaths.home
            const entries = await readDirectory(currentPath)
            set({
              initialized: true,
              initializing: false,
              currentPath,
              history: state.history.length ? state.history : [currentPath],
              historyIndex: state.history.length ? Math.min(state.historyIndex, state.history.length - 1) : 0,
              systemPaths,
              drives: ['C:\\', 'D:\\'],
              directoryMap: { [safePath(currentPath)]: entries },
            })
            return
          }

          const [home, drives] = await Promise.all([
            window.arcadeOS.fs.homeDir(),
            window.arcadeOS.fs.drives(),
          ])
          const sep = home.includes('\\') ? '\\' : '/'
          const systemPaths = {
            home,
            desktop: `${home}${sep}Desktop`,
            downloads: `${home}${sep}Downloads`,
            documents: `${home}${sep}Documents`,
            pictures: `${home}${sep}Pictures`,
            music: `${home}${sep}Music`,
            videos: `${home}${sep}Videos`,
          }

          const targetPath = state.currentPath || home
          set({
            drives,
            systemPaths,
            initialized: true,
            initializing: false,
          })

          await get().navigateTo(targetPath, { replaceHistory: !(state.history?.length > 0), force: true })
        } catch (error) {
          set({
            initializing: false,
            initialized: true,
            error: error?.message || 'Failed to initialize explorer',
          })
        }
      },

      navigateTo: async (targetPath, options = {}) => {
        const { replaceHistory = false, force = false, skipRecent = false } = options
        const normalizedPath = safePath(targetPath)
        if (!normalizedPath) return []

        set({ loading: true, error: '' })

        try {
          const cached = get().directoryMap[normalizedPath]
          const entries = force || !cached ? await readDirectory(normalizedPath) : cached

          set((state) => {
            let history = state.history
            let historyIndex = state.historyIndex

            if (!replaceHistory) {
              const trimmed = history.slice(0, historyIndex + 1)
              if (trimmed[trimmed.length - 1] !== normalizedPath) {
                history = [...trimmed, normalizedPath]
                historyIndex = history.length - 1
              }
            } else if (!history.length) {
              history = [normalizedPath]
              historyIndex = 0
            } else {
              const existingIndex = history.findIndex((item) => safePath(item) === normalizedPath)
              if (existingIndex === -1) {
                history = [...history, normalizedPath]
                historyIndex = history.length - 1
              } else {
                historyIndex = existingIndex
              }
            }

            return {
              loading: false,
              error: '',
              currentPath: normalizedPath,
              history,
              historyIndex,
              recentDirs: skipRecent
                ? state.recentDirs
                : [normalizedPath, ...state.recentDirs.filter((item) => safePath(item) !== normalizedPath)].slice(0, 8),
              directoryMap: {
                ...state.directoryMap,
                [normalizedPath]: entries,
              },
            }
          })

          return entries
        } catch (error) {
          set({
            loading: false,
            error: `Cannot access: ${normalizedPath}`,
          })
          return []
        }
      },

      refreshCurrentDirectory: async () => {
        const currentPath = get().currentPath
        if (!currentPath) return []
        return get().navigateTo(currentPath, { replaceHistory: true, force: true, skipRecent: true })
      },

      goBack: async () => {
        const { history, historyIndex } = get()
        if (historyIndex <= 0) return
        const nextIndex = historyIndex - 1
        set({ historyIndex: nextIndex })
        await get().navigateTo(history[nextIndex], { replaceHistory: true, force: true, skipRecent: true })
      },

      goForward: async () => {
        const { history, historyIndex } = get()
        if (historyIndex >= history.length - 1) return
        const nextIndex = historyIndex + 1
        set({ historyIndex: nextIndex })
        await get().navigateTo(history[nextIndex], { replaceHistory: true, force: true, skipRecent: true })
      },

      goUp: async () => {
        const currentPath = get().currentPath
        const parentPath = getParentPath(currentPath)
        if (!parentPath || parentPath === currentPath) return
        await get().navigateTo(parentPath)
      },

      createFolder: async (parentPath, folderName = 'New Folder') => {
        if (!isElectron) return null
        const result = await window.arcadeOS.fs.createFolder(parentPath, folderName)
        if (!result?.success) throw new Error(result?.error || 'Failed to create folder')
        await refreshDirectoryPath(parentPath, set)
        return result.entry || result
      },

      createFile: async (parentPath, fileName = 'New File.txt', contents = '') => {
        if (!isElectron) return null
        const result = await window.arcadeOS.fs.createFile(parentPath, fileName, contents)
        if (!result?.success) throw new Error(result?.error || 'Failed to create file')
        await refreshDirectoryPath(parentPath, set)
        return result.entry || result
      },

      renameEntry: async (targetPath, nextName) => {
        if (!isElectron) return null
        const result = await window.arcadeOS.fs.renamePath(targetPath, nextName)
        if (!result?.success) throw new Error(result?.error || 'Failed to rename item')

        const oldPath = safePath(result.oldPath || targetPath)
        const newPath = safePath(result.path)
        const parentPath = getParentPath(newPath)

        set((state) => {
          const nextDirectoryMap = Object.fromEntries(
            Object.entries(state.directoryMap).filter(([key]) => !isPathWithin(oldPath, key))
          )

          return {
            currentPath: result.isDirectory ? replacePrefix(state.currentPath, oldPath, newPath) : state.currentPath,
            history: state.history.map((item) => result.isDirectory ? replacePrefix(item, oldPath, newPath) : safePath(item)),
            recentDirs: state.recentDirs.map((item) => result.isDirectory ? replacePrefix(item, oldPath, newPath) : safePath(item)),
            clipboard: state.clipboard
              ? {
                  ...state.clipboard,
                  paths: state.clipboard.paths.map((item) => result.isDirectory ? replacePrefix(item, oldPath, newPath) : safePath(item) === oldPath ? newPath : safePath(item)),
                }
              : null,
            directoryMap: nextDirectoryMap,
          }
        })

        await refreshDirectoryPath(parentPath, set)
        const currentPath = get().currentPath
        if (currentPath && currentPath !== parentPath && isPathWithin(newPath, currentPath)) {
          await refreshDirectoryPath(currentPath, set)
        }

        return result
      },

      deleteEntries: async (targetPaths) => {
        if (!isElectron) return []
        const paths = uniquePaths(targetPaths.map(safePath))
        const deleted = []

        for (const targetPath of paths) {
          const result = await window.arcadeOS.fs.deletePath(targetPath)
          if (!result?.success) throw new Error(result?.error || `Failed to delete ${targetPath}`)
          deleted.push(result)
        }

        set((state) => {
          const validHistory = state.history.filter((historyPath) => !paths.some((targetPath) => isPathWithin(targetPath, historyPath)))
          const currentPath = paths.some((targetPath) => isPathWithin(targetPath, state.currentPath))
            ? getParentPath(state.currentPath) || state.systemPaths.home || state.currentPath
            : state.currentPath

          return {
            currentPath,
            history: validHistory.length ? validHistory : [currentPath],
            historyIndex: Math.max(0, Math.min(state.historyIndex, (validHistory.length ? validHistory : [currentPath]).length - 1)),
            recentDirs: state.recentDirs.filter((recentPath) => !paths.some((targetPath) => isPathWithin(targetPath, recentPath))),
            clipboard: state.clipboard
              ? {
                  ...state.clipboard,
                  paths: state.clipboard.paths.filter((clipboardPath) => !paths.some((targetPath) => isPathWithin(targetPath, clipboardPath))),
                }
              : null,
            directoryMap: Object.fromEntries(
              Object.entries(state.directoryMap).filter(([key]) => !paths.some((targetPath) => isPathWithin(targetPath, key)))
            ),
          }
        })

        const currentPath = get().currentPath
        if (currentPath) await refreshDirectoryPath(currentPath, set)

        return deleted
      },

      duplicateEntry: async (targetPath) => {
        if (!isElectron) return null
        const sourcePath = safePath(targetPath)
        const parentPath = getParentPath(sourcePath)
        const result = await window.arcadeOS.fs.copyPath(sourcePath, parentPath)
        if (!result?.success) throw new Error(result?.error || 'Failed to duplicate item')
        await refreshDirectoryPath(parentPath, set)
        return result
      },

      pasteInto: async (destinationPath) => {
        if (!isElectron) return []
        const clipboard = get().clipboard
        if (!clipboard?.paths?.length) return []

        const results = []
        for (const sourcePath of clipboard.paths) {
          const op = clipboard.type === 'cut' ? window.arcadeOS.fs.movePath : window.arcadeOS.fs.copyPath
          const result = await op(sourcePath, destinationPath)
          if (!result?.success) throw new Error(result?.error || 'Failed to paste item')
          results.push(result)
        }

        const sourceParents = uniquePaths(clipboard.paths.map((item) => getParentPath(item)))
        for (const pathValue of uniquePaths([...sourceParents, destinationPath])) {
          await refreshDirectoryPath(pathValue, set)
        }

        if (clipboard.type === 'cut') set({ clipboard: null })
        return results
      },

      moveEntry: async (sourcePath, destinationPath) => {
        if (!isElectron) return null
        const result = await window.arcadeOS.fs.movePath(sourcePath, destinationPath)
        if (!result?.success) throw new Error(result?.error || 'Failed to move item')

        const oldPath = safePath(result.oldPath || sourcePath)
        const newPath = safePath(result.path)

        set((state) => ({
          currentPath: result.isDirectory ? replacePrefix(state.currentPath, oldPath, newPath) : state.currentPath,
          history: state.history.map((item) => result.isDirectory ? replacePrefix(item, oldPath, newPath) : safePath(item)),
          recentDirs: state.recentDirs.map((item) => result.isDirectory ? replacePrefix(item, oldPath, newPath) : safePath(item)),
          clipboard: state.clipboard
            ? {
                ...state.clipboard,
                paths: state.clipboard.paths.map((item) => result.isDirectory ? replacePrefix(item, oldPath, newPath) : safePath(item) === oldPath ? newPath : safePath(item)),
              }
            : null,
          directoryMap: Object.fromEntries(
            Object.entries(state.directoryMap).filter(([key]) => !isPathWithin(oldPath, key))
          ),
        }))

        const refreshTargets = uniquePaths([
          getParentPath(oldPath),
          safePath(destinationPath),
          get().currentPath,
        ])
        for (const pathValue of refreshTargets) {
          if (pathValue) await refreshDirectoryPath(pathValue, set)
        }

        return result
      },
    }),
    {
      name: 'arcade-os-file-explorer',
      partialize: (state) => ({
        currentPath: state.currentPath,
        history: state.history,
        historyIndex: state.historyIndex,
        recentDirs: state.recentDirs,
        clipboard: state.clipboard,
        viewMode: state.viewMode,
        sidebarCollapsed: state.sidebarCollapsed,
        sidebarWidth: state.sidebarWidth,
      }),
    }
  )
)

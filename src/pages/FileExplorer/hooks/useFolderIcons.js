import { useState, useCallback, useEffect, useRef } from 'react'

const isElectron = typeof window !== 'undefined' && window.arcadeOS


export function useFolderIcons() {
  const [customIconMap, setCustomIconMap] = useState({})
  const [transitioningPaths, setTransitioningPaths] = useState(new Set())
  const loadedRef = useRef(false)

  // Load all persisted icons on mount
  useEffect(() => {
  if (!isElectron || loadedRef.current) return
  loadedRef.current = true

  const load = async () => {
    try {
      const all = await window.arcadeOS.fs.getAllFolderIcons()

      if (all && typeof all === 'object') {
        const converted = {}

        for (const [folderPath, iconPath] of Object.entries(all)) {
          const base64 = await window.arcadeOS.fs.readIconAsBase64(iconPath)
          if (base64) {
            converted[folderPath] = base64
          }
        }

        setCustomIconMap(converted)   // ✅ safe for <img>
      }
    } catch (err) {
      console.warn('[useFolderIcons] Failed to load icons:', err)
    }
  }

  load()
}, [])

  /**
   * Assign a custom icon to a folder path.
   * Opens OS file picker, persists to electron-store, updates React state.
   */
  const assignIcon = useCallback(async (folderPath) => {
    if (!isElectron || !folderPath) return

    try {
      const iconPath = await window.arcadeOS.fs.selectIconFile()
      if (!iconPath) return // user cancelled

      await window.arcadeOS.fs.saveFolderIcon(folderPath, iconPath)

      // Trigger transition animation
      setTransitioningPaths(prev => new Set([...prev, folderPath]))
      setTimeout(() => {
        setTransitioningPaths(prev => {
          const next = new Set(prev)
          next.delete(folderPath)
          return next
        })
      }, 300)

      // Use file:// URI for local image
      const normalized = iconPath.replace(/\\/g, '/')
const src = await window.arcadeOS.fs.readIconAsBase64(iconPath)

if (!src) return

setCustomIconMap(prev => ({
  ...prev,
  [folderPath]: src
}))
    } catch (err) {
      console.error('[useFolderIcons] assignIcon failed:', err)
    }
  }, [])

  /**
   * Remove custom icon from a folder, restoring default.
   */
  const removeIcon = useCallback(async (folderPath) => {
    if (!isElectron || !folderPath) return

    try {
      await window.arcadeOS.fs.removeFolderIcon(folderPath)

      setTransitioningPaths(prev => new Set([...prev, folderPath]))
      setTimeout(() => {
        setTransitioningPaths(prev => {
          const next = new Set(prev)
          next.delete(folderPath)
          return next
        })
      }, 300)

      setCustomIconMap(prev => {
        const next = { ...prev }
        delete next[folderPath]
        return next
      })
    } catch (err) {
      console.error('[useFolderIcons] removeIcon failed:', err)
    }
  }, [])

  /**
   * Get custom icon src for a given path (memoized via map lookup).
   */
  const getIcon = useCallback((folderPath) => {
    return customIconMap[folderPath] || null
  }, [customIconMap])

  /**
   * Whether a path is currently mid-transition (for animation class).
   */
  const isTransitioning = useCallback((folderPath) => {
    return transitioningPaths.has(folderPath)
  }, [transitioningPaths])

  return {
    customIconMap,
    assignIcon,
    removeIcon,
    getIcon,
    isTransitioning,
  }
}

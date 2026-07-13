import { useState, useCallback, useEffect, useRef } from 'react'

const isElectron = typeof window !== 'undefined' && window.arcadeOS

export function useFolderIcons() {
  const [customIconMap, setCustomIconMap] = useState({})
  const [transitioningPaths, setTransitioningPaths] = useState(new Set())
  const loadedRef = useRef(false)
  const transitionTimersRef = useRef(new Map())

  const loadPersistedIcons = useCallback(async () => {
    if (!isElectron) return

    try {
      const all = await window.arcadeOS.fs.getAllFolderIcons()
      if (!all || typeof all !== 'object') return

      const converted = {}
      for (const [folderPath, storedValue] of Object.entries(all)) {
        if (typeof storedValue !== 'string' || !storedValue) continue

        if (storedValue.startsWith('data:')) {
          converted[folderPath] = storedValue
          continue
        }

        const base64 = await window.arcadeOS.fs.readIconAsBase64(storedValue)
        if (base64) converted[folderPath] = base64
      }

      setCustomIconMap(converted)
    } catch (err) {
      console.warn('[useFolderIcons] Failed to load icons:', err)
    }
  }, [])

  useEffect(() => {
    if (!isElectron || loadedRef.current) return
    loadedRef.current = true
    loadPersistedIcons()
  }, [loadPersistedIcons])

  useEffect(() => () => {
    transitionTimersRef.current.forEach((timer) => clearTimeout(timer))
    transitionTimersRef.current.clear()
  }, [])

  const markTransitioning = useCallback((folderPath) => {
    setTransitioningPaths((prev) => new Set([...prev, folderPath]))
    const existingTimer = transitionTimersRef.current.get(folderPath)
    if (existingTimer) clearTimeout(existingTimer)
    const timer = setTimeout(() => {
      transitionTimersRef.current.delete(folderPath)
      setTransitioningPaths((prev) => {
        const next = new Set(prev)
        next.delete(folderPath)
        return next
      })
    }, 300)
    transitionTimersRef.current.set(folderPath, timer)
  }, [])

  const assignIcon = useCallback(async (folderPath) => {
    if (!isElectron || !folderPath) return

    try {
      const iconPath = await window.arcadeOS.fs.selectIconFile()
      if (!iconPath) return

      await window.arcadeOS.fs.saveFolderIcon(folderPath, iconPath)

      markTransitioning(folderPath)

      const src = await window.arcadeOS.fs.readIconAsBase64(iconPath)
      if (!src) return

      setCustomIconMap((prev) => ({
        ...prev,
        [folderPath]: src,
      }))
    } catch (err) {
      console.error('[useFolderIcons] assignIcon failed:', err)
    }
  }, [markTransitioning])

  const removeIcon = useCallback(async (folderPath) => {
    if (!isElectron || !folderPath) return

    try {
      await window.arcadeOS.fs.removeFolderIcon(folderPath)

      markTransitioning(folderPath)

      setCustomIconMap((prev) => {
        const next = { ...prev }
        delete next[folderPath]
        return next
      })
    } catch (err) {
      console.error('[useFolderIcons] removeIcon failed:', err)
    }
  }, [markTransitioning])

  const getIcon = useCallback((folderPath) => customIconMap[folderPath] || null, [customIconMap])
  const isTransitioning = useCallback((folderPath) => transitioningPaths.has(folderPath), [transitioningPaths])

  return {
    customIconMap,
    assignIcon,
    removeIcon,
    reloadIcons: loadPersistedIcons,
    getIcon,
    isTransitioning,
  }
}

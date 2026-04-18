// FileExplorer Page - PREMIUM ENHANCED (Grid + Table + Micro-interactions)
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Folder, File, ChevronRight, ChevronLeft, Home, HardDrive, RefreshCw, LayoutGrid, List, AppWindow, FileText, Sheet, Image, Video, Archive } from 'lucide-react'
import { useStore } from '../store/useStore'

const isElectron = typeof window !== 'undefined' && window.arcadeOS

const EXEC_EXTS = ['.exe', '.app', '.sh', '.bat', '.cmd', '.lnk', '.msi']
const GAME_KEYWORDS = ['game', 'steam', 'epic', 'gog', 'uplay', 'origin', 'battlenet']
const HIDDEN_FOLDERS = [
  '$recycle.bin',
  'system volume information',
  'thumbs.db',
  'desktop.ini',
  'ntuser.dat',
  'iconcache.db'
]
const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.gif']
const VIDEO_EXTS = ['.mp4', '.webm', '.mov']

const safePath = (input) => String(input || '').replace(/\\/g, '/')
const safeName = (input) => String(input || '')
const safeExt = (input) => String(input || '').toLowerCase()
const safeEntries = (list) => Array.isArray(list) ? list : []

const cleanEntries = (list) =>
  safeEntries(list).filter(e => {
    if (!e || typeof e !== 'object') return false
    const name = safeName(e.name)
    const nameLower = name.toLowerCase()
    
    // Hide OS hidden/system attributes
    if (e.hidden === true || e.isHidden === true || e.attributes?.hidden === true) {
      return false
    }
    
    // Hide dot-files (Unix/Linux hidden convention)
    if (name.startsWith('.')) {
      return false
    }
    
    // Hide known system files and folders
    if (HIDDEN_FOLDERS.some(h => nameLower.includes(h))) {
      return false
    }
    
    return true
  })

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function getFolderStyle(entry, hovered, recentPaths = []) {
  const safeEntry = entry || {}
  const isDir = Boolean(safeEntry.isDirectory)
  const path = safePath(safeEntry.path).toLowerCase()
  const name = safeName(safeEntry.name).toLowerCase()
  const children = safeEntry.children
  const isGameFolder = isDir && GAME_KEYWORDS.some(k => path.includes(k) || name.includes(k))
  const isEmpty = isDir && (
    children === undefined ||
    (Array.isArray(children) && children.length === 0)
  )
  const isRecent = isDir && recentPaths.some(p => String(p || '').toLowerCase() === path)

  const color = isEmpty
    ? '#7c8ea0'
    : isGameFolder
      ? '#c084fc'
      : '#a78bfa'
  const primaryGlow = isGameFolder
    ? `drop-shadow(0 0 ${hovered ? 12 : 8}px rgba(124,58,237,0.72))`
    : `drop-shadow(0 0 ${hovered ? 8 : 4}px rgba(124,58,237,0.35))`
  const recentGlow = isRecent ? 'drop-shadow(0 0 10px rgba(124,58,237,0.18))' : ''
  const scale = hovered ? 1.05 : 1
  const animation = isGameFolder ? 'folderPulse 4s ease-in-out infinite' : undefined

  return {
    color,
    glow: [primaryGlow, recentGlow].filter(Boolean).join(' '),
    scale,
    animation,
  }
}

function getEntryPreview(entry) {
  const ext = String(entry?.ext || '').toLowerCase()
  return {
    isImage: IMAGE_EXTS.includes(ext),
    isVideo: VIDEO_EXTS.includes(ext),
    isExecutable: EXEC_EXTS.includes(ext),
    src: resolvePreviewSrc(entry?.path),
    typeLabel: entry?.isDirectory ? 'Folder' : ext || 'Unknown',
  }
}

function resolvePreviewSrc(path) {
  if (!path) return ''
  const normalized = String(path).replace(/\\/g, '/')
  if (/^[A-Za-z]:\//.test(normalized) || normalized.startsWith('/')) {
    return `file://${normalized}`
  }
  return normalized
}

function getFileIcon(ext) {
  if (!ext) return File
  const lower = String(ext).toLowerCase()
  
  if (['.exe', '.msi', '.app', '.bat', '.cmd', '.sh', '.lnk'].includes(lower)) {
    return AppWindow
  }
  if (['.txt', '.doc', '.docx'].includes(lower)) {
    return FileText
  }
  if (['.xls', '.xlsx'].includes(lower)) {
    return Sheet
  }
  if (lower === '.pdf') {
    return FileText
  }
  if (['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(lower)) {
    return Image
  }
  if (['.mp4', '.mov', '.webm'].includes(lower)) {
    return Video
  }
  if (['.zip', '.rar', '.7z'].includes(lower)) {
    return Archive
  }
  
  return File
}

// ─── Grid Card ───────────────────────────────────────────────────────────────
function GridCard({ entry, isSelected, onClick, onDoubleClick, addAsGame, addAsApp, isExecFn, isGamePathFn, recentPaths = [], onContextMenu, renamingPath, renameValue, onRenameChange, onRenameConfirm, onRenameCancel, iconCache, loadIcon }) {
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)
  const safeEntry = entry || {}
  const entryPath = safePath(safeEntry.path)
  const entryName = safeName(safeEntry.name)
  const entryExt = safeExt(safeEntry.ext)
  const entrySize = Number(safeEntry.size || 0)
  const entryIsDirectory = Boolean(safeEntry.isDirectory)
  const exec = isExecFn(safeEntry)
  const likelyGame = exec && isGamePathFn(safeEntry)
  const folderStyle = getFolderStyle(safeEntry, hovered, recentPaths)

  useEffect(() => {
    if (entryPath && !entryIsDirectory) {
      loadIcon?.(safeEntry)
    }
  }, [entryPath, entryIsDirectory, loadIcon])

  const cardStyle = {
    position: 'relative',
    borderRadius: 16,
    padding: '18px 14px 14px',
    background: isSelected
  ? 'linear-gradient(145deg, rgba(139,92,246,0.22), rgba(11,18,32,0.75))'
  : 'linear-gradient(145deg, rgba(17,24,39,0.65), rgba(11,18,32,0.65))',
    border: isSelected
      ? '1px solid rgba(167,139,250,0.7)'
      : hovered
        ? '1px solid rgba(167,139,250,0.55)'
        : '1px solid rgba(124,58,237,0.22)',
    backdropFilter: 'blur(12px)',
    cursor: 'pointer',
    transition: 'all 0.22s ease',
    transform: pressed
      ? 'translateY(-1px) scale(0.97)'
      : hovered
        ? 'translateY(-4px) scale(1.03)'
        : 'translateY(0) scale(1)',
    boxShadow: isSelected
      ? '0 8px 28px rgba(124,58,237,0.45)'
      : hovered
        ? '0 10px 30px rgba(124,58,237,0.35)'
        : '0 2px 8px rgba(0,0,0,0.3)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    animation: 'cardFadeIn 0.25s ease forwards',
    userSelect: 'none',
  }

  const isRenaming = entryPath === renamingPath

  return (
    <div
      style={cardStyle}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={e => { e.preventDefault(); onContextMenu?.(entry, e) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false) }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
    >
      {/* Game badge */}
      {likelyGame && (
        <span style={{
          position: 'absolute',
          top: 8,
          right: 8,
          fontSize: 8,
          fontWeight: 700,
          padding: '2px 6px',
          borderRadius: 999,
          background: 'linear-gradient(90deg,#7c3aed,#a78bfa)',
          color: '#fff',
          boxShadow: '0 0 8px rgba(124,58,237,0.6)',
          letterSpacing: '0.5px',
        }}>GAME</span>
      )}

      {/* Icon */}
      <div style={{
        filter: entryIsDirectory
          ? `${folderStyle.glow}${hovered ? ' brightness(1.05)' : ''}`
          : hovered
            ? 'drop-shadow(0 0 8px rgba(124,58,237,0.8))'
            : 'drop-shadow(0 0 3px rgba(124,58,237,0.2))',
        transform: entryIsDirectory ? `scale(${folderStyle.scale})` : undefined,
        animation: entryIsDirectory ? folderStyle.animation : undefined,
        transition: 'all 0.2s ease',
        marginTop: 4,
      }}>
        {entryIsDirectory ? (
          <Folder size={36} color={folderStyle.color} style={{ transition: 'color 0.2s' }} />
        ) : (() => {
          const icon = iconCache?.[entryPath]
          if (icon) {
            return <img src={icon} alt={entryName} style={{ width: 32, height: 32, objectFit: 'contain' }} />
          }
          const IconComponent = getFileIcon(entryExt)
          return <IconComponent size={32} color={hovered ? '#94a3b8' : '#64748b'} style={{ transition: 'color 0.2s' }} />
        })()}
      </div>

      {/* Name */}
      {isRenaming ? (
        <input
          autoFocus
          value={renameValue}
          onChange={e => onRenameChange(e.target.value)}
          onBlur={onRenameConfirm}
          onKeyDown={e => {
            if (e.key === 'Enter') onRenameConfirm()
            if (e.key === 'Escape') onRenameCancel()
          }}
          style={{
            width: '100%',
            padding: '7px 10px',
            borderRadius: 10,
            border: '1px solid rgba(124,58,237,0.4)',
            background: 'rgba(15,12,30,0.95)',
            color: '#e2d9f3',
            fontSize: 12,
            outline: 'none',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          }}
        />
      ) : (
        <span style={{
          fontSize: 12,
          color: entryIsDirectory ? '#e2d9f3' : '#cbd5e1',
          textAlign: 'center',
          width: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          fontWeight: entryIsDirectory ? 500 : 400,
          lineHeight: 1.3,
        }}>
          {entryName}
        </span>
      )}

      {/* Size */}
      {!entryIsDirectory && entrySize > 0 && (
        <span style={{ fontSize: 10, color: '#64748b' }}>{formatSize(entrySize)}</span>
      )}

      {/* Action buttons */}
      {exec && (
        <div style={{ display: 'flex', gap: 5, marginTop: 2, width: '100%', justifyContent: 'center' }}>
          <QuickAddBtn label="+ Game" onClick={e => { e.stopPropagation(); addAsGame(entry) }} small />
          <QuickAddBtn label="+ App" onClick={e => { e.stopPropagation(); addAsApp(entry) }} small />
        </div>
      )}
    </div>
  )
}

// ─── Grid View ───────────────────────────────────────────────────────────────
function GridView({ entries, selected, onEntryClick, onOpen, addAsGame, addAsApp, isExecFn, isGamePathFn, recentPaths = [], onContextMenu, renamingPath, renameValue, onRenameChange, onRenameConfirm, onRenameCancel, iconCache, loadIcon }) {
  const safeEntries = Array.isArray(entries) ? entries : []
  if (!safeEntries.length) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
        No files to display
      </div>
    )
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))',
      gap: 14,
      padding: 16,
      overflowY: 'auto',
      flex: 1,
      alignContent: 'start',
    }}>
      <style>{`
        @keyframes cardFadeIn {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)  scale(1);    }
        }
      `}</style>
      {safeEntries.map((entry, i) => (
        <div key={i} style={{ animationDelay: `${i * 18}ms` }}>
          <GridCard
            entry={entry}
            isSelected={selected === safePath(entry?.path)}
            onClick={() => onEntryClick(entry)}
            onDoubleClick={() => onOpen(entry)}
            addAsGame={addAsGame}
            addAsApp={addAsApp}
            isExecFn={isExecFn}
            isGamePathFn={isGamePathFn}
            recentPaths={recentPaths}
            onContextMenu={onContextMenu}
            renamingPath={renamingPath}
            renameValue={renameValue}
            onRenameChange={onRenameChange}
            onRenameConfirm={onRenameConfirm}
            onRenameCancel={onRenameCancel}
            iconCache={iconCache}
            loadIcon={loadIcon}
          />
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FileExplorer() {
  const { addGame, addApp } = useStore()
  const [currentPath, setCurrentPath] = useState('')
  const [entries, setEntries] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [drives, setDrives] = useState([])
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState('table')
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, entry: null })
  const [renamingPath, setRenamingPath] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [iconCache, setIconCache] = useState({})
  const contextMenuRef = useRef(null)

  useEffect(() => {
    if (!isElectron) {
      const initialPath = '/home/user'
      setEntries(cleanEntries(DEMO_ENTRIES))
      setCurrentPath(initialPath)
      setHistory([initialPath])
      return
    }
    const init = async () => {
      const [home, drvs] = await Promise.all([
        window.arcadeOS.fs.homeDir(),
        window.arcadeOS.fs.drives(),
      ])
      setDrives(drvs)
      navigateTo(home, true)
    }
    init()
  }, [])

  const navigateTo = useCallback(async (path, replace = false) => {
    if (!path) return
    setLoading(true)
    setError('')
    setSelected(null)
    try {
      const raw = isElectron ? await window.arcadeOS.fs.readDir(path) : DEMO_ENTRIES
      const list = cleanEntries(raw)
      list.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
        const nameA = safeName(a.name).toLowerCase()
        const nameB = safeName(b.name).toLowerCase()
        return nameA.localeCompare(nameB)
      })
      setEntries(list)
      setCurrentPath(path)
      if (!replace) {
        setHistory(h => {
          if (h[h.length - 1] === path) return h
          return [...h, path]
        })
      }
    } catch {
      setError(`Cannot access: ${path}`)
    } finally {
      setLoading(false)
    }
  }, [])

  const goBack = useCallback(() => {
    setHistory(prev => {
      if (prev.length <= 1) return prev
      const newHistory = prev.slice(0, -1)
      const prevPath = newHistory[newHistory.length - 1]
      navigateTo(prevPath, true)
      return newHistory
    })
  }, [navigateTo])

  const goUp = () => {
    const parts = currentPath.replace(/\\/g, '/').split('/').filter(Boolean)
    if (parts.length <= 1) return
    parts.pop()
    const parent = (currentPath.startsWith('/') ? '/' : '') + parts.join('/')
    navigateTo(parent)
  }

  const openFile = async (entry) => {
    if (!entry || typeof entry !== 'object') return
    if (entry.isDirectory) return
    const path = safePath(entry.path)
    if (!isElectron) return console.log('[Demo] Open:', path)
    await window.arcadeOS.launch.open(path)
  }

  const handleEntry = (entry) => {
    if (!entry || typeof entry !== 'object') return
    const path = safePath(entry.path)
    if (entry.isDirectory) navigateTo(path)
    else setSelected(path === selected ? null : path)
  }

  const closeContextMenu = () => setContextMenu({ visible: false, x: 0, y: 0, entry: null })
  const handleContextMenu = (entry, event) => {
    if (!entry || typeof entry !== 'object') return
    event.preventDefault()
    
    const menuWidth = 190
    const menuHeight = 220
    
    let x = event.clientX
    let y = event.clientY
    
    const vw = window.innerWidth
    const vh = window.innerHeight
    
    if (x + menuWidth > vw) {
      x = vw - menuWidth - 8
    }
    
    if (y + menuHeight > vh) {
      y = vh - menuHeight - 8
    }
    
    setSelected(safePath(entry.path))
    setContextMenu({
      visible: true,
      x,
      y,
      entry
    })
  }

  const startRename = (entry) => {
    if (!entry || typeof entry !== 'object') return
    const name = safeName(entry.name)
    const ext = entry.isDirectory ? '' : safeExt(entry.ext)
    const rawName = ext && name.toLowerCase().endsWith(ext.toLowerCase()) ? name.slice(0, name.length - ext.length) : name
    setRenamingPath(safePath(entry.path))
    setRenameValue(rawName)
    closeContextMenu()
  }

  const confirmRename = () => {
    if (!renamingPath) return
    setEntries(prev => prev.map(item => {
      if (safePath(item?.path) !== renamingPath) return item
      const ext = item?.isDirectory ? '' : safeExt(item?.ext)
      const value = String(renameValue || '').trim()
      const currentName = safeName(item?.name)
      const updatedName = !value ? currentName : (ext && !value.toLowerCase().endsWith(ext.toLowerCase()) ? `${value}${ext}` : value)
      return { ...item, name: updatedName }
    }))
    setRenamingPath(null)
    setRenameValue('')
  }

  const cancelRename = () => {
    setRenamingPath(null)
    setRenameValue('')
    closeContextMenu()
  }

  const addAsGame = (entry) => {
    const name = safeName(entry?.name).replace(/\.[^.]+$/, '')
    return addGame({ name, path: safePath(entry?.path), genre: 'Other' })
  }
  const addAsApp = (entry) => {
    const name = safeName(entry?.name).replace(/\.[^.]+$/, '')
    return addApp({ name, path: safePath(entry?.path), category: 'Other' })
  }

  const loadIcon = useCallback(async (entry) => {
    const safeEntry = entry || {}
    const entryPath = safePath(safeEntry.path)
    if (!isElectron || safeEntry.isDirectory || !entryPath) return null
    if (iconCache?.[entryPath]) return iconCache[entryPath]

    try {
      const icon = await window.arcadeOS.fs.getFileIcon(entryPath)
      if (icon) {
        setIconCache(prev => prev?.[entryPath] ? prev : ({ ...prev, [entryPath]: icon }))
        return icon
      }
    } catch {
      return null
    }
    return null
  }, [iconCache])

  const isExec = (entry) => EXEC_EXTS.includes(safeExt(entry?.ext))
  const isGamePath = (entry) => {
    const path = safePath(entry?.path).toLowerCase()
    return GAME_KEYWORDS.some(k => path.includes(k))
  }
  const breadcrumbs = safePath(currentPath).split('/').filter(Boolean)
  const recentPaths = history.slice(-3)
  const safeEntryList = Array.isArray(entries) ? entries.filter(e => e && typeof e === 'object') : []
  const selectedEntry = safeEntryList.find(entry => safePath(entry?.path) === selected)

  const moveSelection = (delta) => {
    if (!safeEntryList.length) return
    const currentIndex = safeEntryList.findIndex(entry => safePath(entry?.path) === selected)
    if (currentIndex === -1) {
      setSelected(safePath(safeEntryList[0]?.path))
      return
    }
    const nextIndex = currentIndex + delta
    if (nextIndex < 0 || nextIndex >= safeEntryList.length) return
    setSelected(safePath(safeEntryList[nextIndex]?.path))
  }

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (contextMenu.visible) {
          closeContextMenu()
          return
        }
        if (renamingPath) {
          cancelRename()
          return
        }
        setSelected(null)
        return
      }

      if (event.key === 'F2') {
        if (selectedEntry) {
          event.preventDefault()
          startRename(selectedEntry)
        }
        return
      }

      if (event.key === 'Enter') {
        if (renamingPath) return
        if (selectedEntry) {
          event.preventDefault()
          if (selectedEntry.isDirectory) navigateTo(selectedEntry.path)
          else openFile(selectedEntry)
        }
        return
      }

      if (viewMode === 'table') {
        if (event.key === 'ArrowUp') {
          event.preventDefault()
          moveSelection(-1)
        }
        if (event.key === 'ArrowDown') {
          event.preventDefault()
          moveSelection(1)
        }
      }

      if (viewMode === 'grid') {
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          moveSelection(-1)
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault()
          moveSelection(1)
        }
      }
    }

    const handleMouseDown = (event) => {
      if (contextMenu.visible && contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
        closeContextMenu()
      }
    }

    const handleScroll = () => {
      if (contextMenu.visible) closeContextMenu()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [contextMenu.visible, selectedEntry, viewMode, renamingPath, entries, navigateTo, openFile])

  const preview = selectedEntry && !selectedEntry.isDirectory ? getEntryPreview(selectedEntry) : null

  return (
    <div style={{
      position: 'relative',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'visible',
      background: `
radial-gradient(circle at 20% 0%, rgba(109,40,217,0.25), transparent 55%),
radial-gradient(circle at 80% 100%, rgba(59,130,246,0.15), transparent 60%),
linear-gradient(180deg, #0b1220, #111827)
`,
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      letterSpacing: '0.2px',
    }}>
      <style>{`
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.4); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(124,58,237,0.65); }
        @keyframes folderPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
      `}</style>

      {/* ── Toolbar ── */}
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid rgba(124,58,237,0.22)',
        background: 'rgba(11,18,32,0.72)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
      }}>
        <NavIconBtn onClick={goBack} enabled={history.length > 1 && !loading} title="Back">
          <ChevronLeft size={14} />
        </NavIconBtn>

        <NavIconBtn onClick={goUp} enabled title="Up">
          <ChevronRight size={14} style={{ transform: 'rotate(-90deg)' }} />
        </NavIconBtn>

        <NavIconBtn onClick={() => navigateTo(currentPath)} enabled title="Refresh">
          <RefreshCw size={13} />
        </NavIconBtn>

        {/* Breadcrumbs */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          overflow: 'hidden',
          padding: '5px 10px',
          borderRadius: 7,
          background: 'rgba(124,58,237,0.07)',
          border: '1px solid rgba(124,58,237,0.18)',
          minWidth: 0,
        }}>
          <Home size={11} color="#a78bfa" style={{ flexShrink: 0 }} />
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              <span style={{ color: '#6d4fa0', fontSize: 11, flexShrink: 0 }}>/</span>
              <button
                onClick={() => {
                  const p = (currentPath.startsWith('/') ? '/' : '') + breadcrumbs.slice(0, i + 1).join('/')
                  navigateTo(p)
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: i === breadcrumbs.length - 1 ? '#e2d9f3' : '#c4b5fd',
                  fontSize: 12,
                  fontWeight: i === breadcrumbs.length - 1 ? 500 : 400,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 120,
                  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                  padding: '0 2px',
                }}
              >{crumb}</button>
            </React.Fragment>
          ))}
        </div>

        {/* View toggle */}
        <div style={{
          display: 'flex',
          gap: 4,
          padding: '3px',
          borderRadius: 8,
          background: 'rgba(124,58,237,0.08)',
          border: '1px solid rgba(124,58,237,0.2)',
        }}>
          <ViewToggleBtn
            active={viewMode === 'table'}
            onClick={() => setViewMode('table')}
            title="List view"
          ><List size={13} /></ViewToggleBtn>
          <ViewToggleBtn
            active={viewMode === 'grid'}
            onClick={() => setViewMode('grid')}
            title="Grid view"
          ><LayoutGrid size={13} /></ViewToggleBtn>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Sidebar ── */}
        <div style={{
          width: 155,
          borderRight: '1px solid rgba(124,58,237,0.13)',
          padding: '10px 8px',
          overflowY: 'auto',
          flexShrink: 0,
          background: 'rgba(11,18,32,0.35)',
        }}>
          <div style={{ fontSize: 9, color: '#6d4fa0', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', padding: '4px 6px 8px' }}>
            Drives
          </div>
          {(isElectron ? drives : ['C:\\', 'D:\\']).map(d => (
            <SidebarDriveBtn
              key={d}
              label={d}
              active={currentPath.startsWith(d)}
              onClick={() => navigateTo(d)}
            />
          ))}
        </div>

        {/* ── Main Content ── */}
        {loading && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa', fontSize: 13, gap: 8 }}>
            <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
            Loading…
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {!loading && error && (
          <div style={{ flex: 1, padding: 24, color: '#f87171', fontSize: 13 }}>{error}</div>
        )}

        {!loading && !error && viewMode === 'table' && (
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '45%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '30%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={th}>Name</th>
                  <th style={th}>Size</th>
                  <th style={th}>Type</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {safeEntryList.map((entry, i) => {
                  const safeEntry = entry || {}
                  const entryPath = safePath(safeEntry.path)
                  const entryName = safeName(safeEntry.name)
                  const entryExt = safeExt(safeEntry.ext)
                  const entrySize = Number(safeEntry.size || 0)
                  const isDirectory = Boolean(safeEntry.isDirectory)
                  const exec = isExec(safeEntry)
                  const likelyGame = exec && isGamePath(safeEntry)
                  const isSelected = selected === entryPath
                  const folderStyle = isDirectory ? getFolderStyle(safeEntry, false, history.slice(-3)) : { glow: '', scale: 1 }
                  return (
                    <tr key={i}
                      onClick={() => handleEntry(safeEntry)}
                      onDoubleClick={() => openFile(safeEntry)}
                      onContextMenu={e => handleContextMenu(safeEntry, e)}
                      style={{
                        background: isSelected ? 'rgba(139,92,246,0.18)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) e.currentTarget.style.background = 'rgba(59,130,246,0.06)'
                        if (isDirectory) e.currentTarget.style.setProperty('--folder-scale', '1.05')
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) e.currentTarget.style.background = 'transparent'
                        if (isDirectory) e.currentTarget.style.setProperty('--folder-scale', '1')
                      }}
                    >
                      <td style={td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, overflow: 'hidden' }}>
                          <span style={{
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            filter: isDirectory ? folderStyle.glow : undefined,
                            transform: isDirectory ? 'scale(var(--folder-scale, 1))' : undefined,
                            animation: isDirectory && folderStyle.animation ? folderStyle.animation : undefined,
                            transition: 'all 0.2s ease',
                          }}>
                            {isDirectory ? (
                              <Folder size={15} color={folderStyle.color} />
                            ) : (() => {
                              const IconComponent = getFileIcon(entryExt)
                              return <IconComponent size={14} color="#7c8ea0" />
                            })()}
                          </span>
                          {entryPath === renamingPath ? (
                            <input
                              autoFocus
                              value={renameValue}
                              onChange={e => setRenameValue(e.target.value)}
                              onBlur={confirmRename}
                              onKeyDown={e => {
                                if (e.key === 'Enter') confirmRename()
                                if (e.key === 'Escape') cancelRename()
                              }}
                              style={{
                                flex: 1,
                                minWidth: 0,
                                padding: '7px 10px',
                                borderRadius: 10,
                                border: '1px solid rgba(124,58,237,0.4)',
                                background: 'rgba(15,12,30,0.95)',
                                color: '#e2d9f3',
                                fontSize: 13,
                                outline: 'none',
                                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                              }}
                            />
                          ) : (
                            <span style={{
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              color: isDirectory ? '#e2d9f3' : '#cbd5e1',
                              fontSize: 13,
                            }}>{entryName}</span>
                          )}
                          {likelyGame && (
                            <span style={{
                              flexShrink: 0,
                              fontSize: 8,
                              fontWeight: 700,
                              color: '#fff',
                              background: 'linear-gradient(90deg,#7c3aed,#a78bfa)',
                              borderRadius: 999,
                              padding: '1px 5px',
                              letterSpacing: '0.5px',
                              boxShadow: '0 0 6px rgba(124,58,237,0.5)',
                            }}>GAME</span>
                          )}
                        </div>
                      </td>
                      <td style={{ ...td, color: '#94a3b8', fontSize: 12 }}>
                        {isDirectory ? '—' : formatSize(entrySize)}
                      </td>
                      <td style={{ ...td, color: '#94a3b8', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {isDirectory ? 'Folder' : entryExt}
                      </td>
                      <td style={td}>
                        {exec && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <QuickAddBtn label="+ Game" onClick={e => { e.stopPropagation(); addAsGame(safeEntry) }} />
                            <QuickAddBtn label="+ App" onClick={e => { e.stopPropagation(); addAsApp(safeEntry) }} />
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && viewMode === 'grid' && (
          <GridView
            entries={safeEntryList}
            selected={selected}
            onEntryClick={handleEntry}
            onOpen={openFile}
            addAsGame={addAsGame}
            addAsApp={addAsApp}
            isExecFn={isExec}
            isGamePathFn={isGamePath}
            recentPaths={recentPaths}
            onContextMenu={handleContextMenu}
            renamingPath={renamingPath}
            renameValue={renameValue}
            onRenameChange={setRenameValue}
            onRenameConfirm={confirmRename}
            onRenameCancel={cancelRename}
            iconCache={iconCache}
            loadIcon={loadIcon}
          />
        )}
      </div>

      {preview && (
        <div style={{
          position: 'absolute',
          right: 18,
          bottom: 18,
          width: 240,
          maxWidth: 'calc(100% - 32px)',
          padding: '12px 14px',
          borderRadius: 16,
          border: '1px solid rgba(124,58,237,0.22)',
          background: 'rgba(11,18,32,0.88)',
          backdropFilter: 'blur(18px)',
          boxShadow: '0 20px 48px rgba(0,0,0,0.45)',
          color: '#e2d9f3',
          zIndex: 12,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: '#c4b5fd' }}>
            Preview
          </div>
          {preview.isImage && (
            <img src={preview.src} alt={selectedEntry?.name || 'Preview'} style={{ width: '100%', borderRadius: 12, objectFit: 'cover' }} />
          )}
          {preview.isVideo && (
            <video src={preview.src} muted controls style={{ width: '100%', borderRadius: 12, background: '#090b13' }} />
          )}
          {!preview.isImage && !preview.isVideo && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{selectedEntry?.name}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{preview.typeLabel}</div>
              {preview.isExecutable && (
                <div style={{ fontSize: 11, color: '#c4b5fd' }}>Executable file</div>
              )}
            </div>
          )}
        </div>
      )}

      {contextMenu.visible && contextMenu.entry && (
        <div
          ref={contextMenuRef}
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            minWidth: 180,
            background: 'rgba(11,18,32,0.92)',
            border: '1px solid rgba(124,58,237,0.22)',
            borderRadius: 14,
            backdropFilter: 'blur(18px)',
            boxShadow: '0 28px 60px rgba(0,0,0,0.45)',
            zIndex: 9999,
            overflow: 'hidden',
          }}
        >
          <button
            onClick={() => {
              const entry = contextMenu.entry
              closeContextMenu()
              if (!entry || typeof entry !== 'object') return
              const path = safePath(entry.path)
              if (entry.isDirectory) navigateTo(path)
              else openFile(entry)
            }}
            style={menuButtonStyle}
          >Open</button>
          {contextMenu.entry && !contextMenu.entry.isDirectory && isExec(contextMenu.entry) && (
            <>
              <button
                onClick={() => { closeContextMenu(); addAsGame(contextMenu.entry) }}
                style={menuButtonStyle}
              >Add as Game</button>
              <button
                onClick={() => { closeContextMenu(); addAsApp(contextMenu.entry) }}
                style={menuButtonStyle}
              >Add as App</button>
            </>
          )}
          <button
            onClick={() => { startRename(contextMenu.entry) }}
            style={menuButtonStyle}
          >Rename</button>
          <button
            onClick={() => {
              const path = contextMenu.entry?.path
              closeContextMenu()
              if (!path || !navigator?.clipboard?.writeText) return
              navigator.clipboard.writeText(path).catch(() => {})
            }}
            style={menuButtonStyle}
          >Copy Path</button>
        </div>
      )}
    </div>
  )
}

// ─── Shared Sub-components ────────────────────────────────────────────────────

function NavIconBtn({ onClick, enabled, children, title }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 30, height: 30,
        borderRadius: 7,
        border: '1px solid rgba(124,58,237,0.3)',
        background: hov && enabled ? 'rgba(124,58,237,0.25)' : 'rgba(124,58,237,0.12)',
        color: enabled ? '#c4b5fd' : '#4a3f6b',
        cursor: enabled ? 'pointer' : 'not-allowed',
        pointerEvents: enabled ? 'auto' : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        boxShadow: hov && enabled ? '0 0 12px rgba(124,58,237,0.45)' : 'none',
        transition: 'all 0.15s ease',
      }}
    >{children}</button>
  )
}

function ViewToggleBtn({ active, onClick, children, title }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 28, height: 26,
        borderRadius: 6,
        border: 'none',
        background: active
          ? 'rgba(124,58,237,0.35)'
          : hov ? 'rgba(124,58,237,0.15)' : 'transparent',
        color: active ? '#e9d5ff' : '#a78bfa',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: active ? '0 0 12px rgba(124,58,237,0.5)' : 'none',
        transition: 'all 0.15s ease',
      }}
    >{children}</button>
  )
}

function SidebarDriveBtn({ label, active, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: '100%', padding: '7px 8px',
        marginBottom: 4, borderRadius: 7,
        border: active ? '1px solid rgba(124,58,237,0.4)' : '1px solid transparent',
        cursor: 'pointer',
        background: active
          ? 'rgba(124,58,237,0.22)'
          : hov ? 'rgba(124,58,237,0.1)' : 'transparent',
        color: active ? '#e2d9f3' : '#9ca3af',
        display: 'flex', alignItems: 'center', gap: 7,
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        fontSize: 12,
        transition: 'all 0.15s ease',
        boxShadow: active ? '0 0 10px rgba(124,58,237,0.2)' : 'none',
      }}
    >
      <HardDrive size={13} color={active ? '#a78bfa' : '#64748b'} />
      {label}
    </button>
  )
}

const QuickAddBtn = ({ label, onClick, small }) => {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: small ? '3px 6px' : '4px 8px',
        borderRadius: 6,
        background: hov ? 'rgba(124,58,237,0.35)' : 'rgba(124,58,237,0.18)',
        border: '1px solid rgba(124,58,237,0.45)',
        color: '#c4b5fd',
        cursor: 'pointer',
        fontSize: small ? 9 : 10,
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        letterSpacing: '0.3px',
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap',
        transform: hov ? 'scale(1.05)' : 'scale(1)',
        boxShadow: hov ? '0 0 8px rgba(124,58,237,0.4)' : 'none',
      }}
    >{label}</button>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const th = {
  textAlign: 'left',
  padding: '10px 10px',
  fontSize: 10,
  color: '#7c5cbf',
  fontWeight: 700,
  letterSpacing: '0.7px',
  textTransform: 'uppercase',
  borderBottom: '1px solid rgba(124,58,237,0.18)',
  position: 'sticky',
  top: 0,
  background: 'rgba(10,12,28,0.97)',
  backdropFilter: 'blur(8px)',
  zIndex: 1,
}

const td = {
  padding: '9px 10px',
  borderBottom: '1px solid rgba(255,255,255,0.035)',
  verticalAlign: 'middle',
}

const menuButtonStyle = {
  width: '100%',
  padding: '10px 14px',
  border: 'none',
  background: 'transparent',
  color: '#e2d9f3',
  textAlign: 'left',
  cursor: 'pointer',
  fontSize: 13,
  lineHeight: 1.4,
  outline: 'none',
  transition: 'background 0.18s ease',
}

// ─── Demo Data ────────────────────────────────────────────────────────────────

const DEMO_ENTRIES = [
  { name: 'Games', isDirectory: true, path: '/home/user/Games', size: 0, ext: '' },
  { name: 'Documents', isDirectory: true, path: '/home/user/Documents', size: 0, ext: '' },
  { name: 'Music', isDirectory: true, path: '/home/user/Music', size: 0, ext: '' },
  { name: 'cyberpunk2077.exe', isDirectory: false, path: '/home/user/Games/cyberpunk2077.exe', size: 180000000, ext: '.exe' },
  { name: 'launcher.exe', isDirectory: false, path: '/home/user/steam/launcher.exe', size: 4200000, ext: '.exe' },
  { name: 'readme.txt', isDirectory: false, path: '/home/user/readme.txt', size: 2048, ext: '.txt' },
]
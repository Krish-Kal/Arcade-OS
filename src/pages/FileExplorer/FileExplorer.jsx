import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Folder, File, ChevronRight, ChevronLeft, Home, HardDrive, RefreshCw,
  LayoutGrid, List, AppWindow, FileText, Sheet, Image, Video, Archive,
  Search, X, Star, Download, Music, Monitor, Cpu, Clock, Heart,
  Gamepad2, ChevronDown, FolderOpen, Copy, Trash2, FolderPlus,
  ClipboardPaste, SortAsc, SortDesc, Info
} from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useFolderIcons } from './hooks/useFolderIcons'

// ─── Constants ────────────────────────────────────────────────────────────────
const isElectron = typeof window !== 'undefined' && window.arcadeOS

const EXEC_EXTS = ['.exe', '.app', '.sh', '.bat', '.cmd', '.lnk', '.msi']
const GAME_KEYWORDS = ['game', 'steam', 'epic', 'gog', 'uplay', 'origin', 'battlenet']
const HIDDEN_FOLDERS = [
  '$recycle.bin', 'system volume information', 'thumbs.db',
  'desktop.ini', 'ntuser.dat', 'iconcache.db',
]
const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.gif']
const VIDEO_EXTS = ['.mp4', '.webm', '.mov']

const SIDEBAR_MIN_WIDTH = 120
const SIDEBAR_MAX_WIDTH = 320
const SIDEBAR_DEFAULT_WIDTH = 170

// ─── Sidebar sections ────────────────────────────────────────────────────────
const SIDEBAR_FAVORITES = [
  { label: 'Home', icon: Home, key: 'home', pathKey: 'home' },
  { label: 'Desktop', icon: Monitor, key: 'desktop', pathKey: 'desktop' },
  { label: 'Downloads', icon: Download, key: 'downloads', pathKey: 'downloads' },
  { label: 'Documents', icon: FileText, key: 'documents', pathKey: 'documents' },
  { label: 'Pictures', icon: Image, key: 'pictures', pathKey: 'pictures' },
  { label: 'Music', icon: Music, key: 'music', pathKey: 'music' },
  { label: 'Videos', icon: Video, key: 'videos', pathKey: 'videos' },
]

// ─── Utilities ────────────────────────────────────────────────────────────────
const safePath = (input) => String(input || '').replace(/\\/g, '/')
const safeName = (input) => String(input || '')
const safeExt = (input) => String(input || '').toLowerCase()
const safeEntries = (list) => Array.isArray(list) ? list : []

const cleanEntries = (list) =>
  safeEntries(list).filter(e => {
    if (!e || typeof e !== 'object') return false
    const name = safeName(e.name)
    const nameLower = name.toLowerCase()
    if (e.hidden === true || e.isHidden === true || e.attributes?.hidden === true) return false
    if (name.startsWith('.')) return false
    if (HIDDEN_FOLDERS.some(h => nameLower.includes(h))) return false
    return true
  })

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function formatDate(ts) {
  if (!ts) return '—'
  try {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return '—' }
}

function getThumbnail(entry, iconCache = {}) {
  if (!entry) return null
  const path = safePath(entry.path)
  const ext = safeExt(entry.ext)
  if (iconCache[path]) return iconCache[path]
  if (IMAGE_EXTS.includes(ext)) return `file://${path}`
  if (ext === '.pdf') return '/icons/pdf-thumbnail.png'
  return null
}

function getFolderStyle(entry, hovered, active, recentPaths = []) {
  const safeEntry = entry || {}
  const isDir = Boolean(safeEntry.isDirectory)
  const path = safePath(safeEntry.path).toLowerCase()
  const name = safeName(safeEntry.name).toLowerCase()
  const children = safeEntry.children
  const isGameFolder = isDir && GAME_KEYWORDS.some(k => path.includes(k) || name.includes(k))
  const isEmpty = isDir && (children === undefined || (Array.isArray(children) && children.length === 0))
  const baseColor = isEmpty ? '#7c8ea0' : isGameFolder ? '#c084fc' : '#a78bfa'
  const color = active
    ? (isEmpty ? '#9bafc4' : isGameFolder ? '#d8b4fe' : '#c4b5fd')
    : hovered
      ? (isEmpty ? '#8fa3b8' : isGameFolder ? '#cb96fd' : '#b4a0fb')
      : baseColor
  const glowIntensity = active ? 10 : hovered ? 8 : 4
  const glowOpacity = active ? 0.45 : hovered ? 0.35 : 0.2
  const primaryGlow = isGameFolder
    ? `drop-shadow(0 0 ${glowIntensity}px rgba(124,58,237,${glowOpacity}))`
    : `drop-shadow(0 0 ${glowIntensity * 0.6}px rgba(124,58,237,${glowOpacity * 0.5}))`
  const scale = active ? 1.06 : hovered ? 1.03 : 1
  const animation = isGameFolder ? 'folderPulse 6s ease-in-out infinite' : undefined
  return { color, glow: primaryGlow, scale, animation }
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
  if (/^[A-Za-z]:\//.test(normalized) || normalized.startsWith('/')) return `file://${normalized}`
  return normalized
}

function getFileIcon(ext) {
  if (!ext) return File
  const lower = String(ext).toLowerCase()
  if (['.exe', '.msi', '.app', '.bat', '.cmd', '.sh', '.lnk'].includes(lower)) return AppWindow
  if (['.txt', '.doc', '.docx'].includes(lower)) return FileText
  if (['.xls', '.xlsx'].includes(lower)) return Sheet
  if (lower === '.pdf') return FileText
  if (['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(lower)) return Image
  if (['.mp4', '.mov', '.webm'].includes(lower)) return Video
  if (['.zip', '.rar', '.7z'].includes(lower)) return Archive
  return File
}

// ─── Context menu position calculator ────────────────────────────────────────
function calcContextMenuPos(clientX, clientY, menuWidth, menuHeight) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const offset = 2
  let x = clientX + offset
  let y = clientY + offset
  if (x + menuWidth > vw - 4) x = clientX - menuWidth - offset
  if (x < 4) x = 4
  if (y + menuHeight > vh - 4) y = clientY - menuHeight - offset
  if (y < 4) y = 4
  return { x, y }
}

// ─── Highlight match helper ───────────────────────────────────────────────────
function HighlightMatch({ text, query }) {
  if (!query) return <span>{text}</span>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <span>{text}</span>
  return (
    <span>
      {text.slice(0, idx)}
      <span style={{ background: 'rgba(167,139,250,0.35)', borderRadius: 3, padding: '0 1px', color: '#e9d5ff' }}>
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </span>
  )
}

// ─── GridCard ─────────────────────────────────────────────────────────────────
const GridCard = React.memo(function GridCard({
  entry, isSelected, onClick, onDoubleClick,
  addAsGame, addAsApp, isExecFn, isGamePathFn, recentPaths = [],
  onContextMenu, renamingPath, renameValue, onRenameChange,
  onRenameConfirm, onRenameCancel, iconCache, loadIcon,
  customIconSrc, isIconTransitioning, searchQuery,
}) {
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)
  const safeEntry = entry || {}
  const entryPath = safePath(safeEntry.path)
  const entryName = safeName(safeEntry.name)
  const entryExt = safeExt(safeEntry.ext)
  const thumbnail = getThumbnail(safeEntry, iconCache)
  const entrySize = Number(safeEntry.size || 0)
  const entryIsDirectory = Boolean(safeEntry.isDirectory)
  const exec = isExecFn(safeEntry)
  const likelyGame = exec && isGamePathFn(safeEntry)
  const folderStyle = getFolderStyle(safeEntry, hovered, pressed, recentPaths)

  useEffect(() => {
    if (entryPath && !entryIsDirectory) loadIcon?.(safeEntry)
  }, [entryPath, entryIsDirectory])

  const cardStyle = {
    position: 'relative', borderRadius: 16, padding: '18px 14px 14px',
    background: isSelected
      ? 'linear-gradient(145deg, rgba(139,92,246,0.24), rgba(11,18,32,0.80))'
      : hovered
        ? 'linear-gradient(145deg, rgba(25,32,52,0.80), rgba(14,20,38,0.80))'
        : 'linear-gradient(145deg, rgba(17,24,39,0.70), rgba(11,18,32,0.70))',
    border: isSelected
      ? '1px solid rgba(167,139,250,0.72)'
      : hovered
        ? '1px solid rgba(167,139,250,0.55)'
        : '1px solid rgba(124,58,237,0.22)',
    backdropFilter: 'blur(12px)',
    cursor: 'pointer',
    transition: 'background 0.15s ease, border 0.15s ease, transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s ease',
    transform: pressed ? 'translateY(-1px) scale(0.97)' : hovered ? 'translateY(-4px) scale(1.03)' : 'translateY(0) scale(1)',
    boxShadow: isSelected
      ? '0 6px 20px rgba(124,58,237,0.3), inset 0 1px 0 rgba(255,255,255,0.05)'
      : hovered
        ? '0 8px 24px rgba(124,58,237,0.25), inset 0 1px 0 rgba(255,255,255,0.04)'
        : '0 2px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    animation: 'cardFadeIn 0.15s ease-out forwards',
    userSelect: 'none',
  }
  const isRenaming = entryPath === renamingPath
  const iconTransitionStyle = {
    transition: 'opacity 0.15s ease, transform 0.15s ease',
    opacity: isIconTransitioning ? 0.5 : 1,
    transform: isIconTransitioning ? 'scale(0.88)' : 'scale(1)',
    willChange: isIconTransitioning ? 'opacity, transform' : 'auto',
  }

  return (
    <div
      className="file-item"
      style={cardStyle}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={e => { e.preventDefault(); e.stopPropagation(); onContextMenu?.(entry, e) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false) }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
    >
      {likelyGame && (
        <span style={{
          position: 'absolute', top: 8, right: 8, fontSize: 8, fontWeight: 700,
          padding: '2px 6px', borderRadius: 999,
          background: 'linear-gradient(90deg,#7c3aed,#a78bfa)', color: '#fff',
          boxShadow: '0 0 8px rgba(124,58,237,0.6)', letterSpacing: '0.5px',
        }}>GAME</span>
      )}
      <div style={{
        filter: entryIsDirectory && !customIconSrc ? folderStyle.glow : undefined,
        transform: entryIsDirectory && !customIconSrc ? `scale(${folderStyle.scale})` : undefined,
        animation: entryIsDirectory && !customIconSrc ? folderStyle.animation : undefined,
        transition: 'filter 0.15s ease, transform 0.15s ease',
        willChange: entryIsDirectory && !customIconSrc ? 'filter, transform' : 'auto',
        contain: entryIsDirectory && !customIconSrc ? 'layout style paint' : undefined,
        marginTop: 4, ...iconTransitionStyle,
      }}>
        {entryIsDirectory ? (
          customIconSrc ? (
            <img src={customIconSrc} style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 8 }} />
          ) : (
            <Folder size={36} color={folderStyle.color} />
          )
        ) : thumbnail ? (
          <img src={thumbnail} style={{ width: 42, height: 42, objectFit: 'cover', borderRadius: 10, boxShadow: '0 0 12px rgba(124,58,237,0.35)' }} />
        ) : (() => {
          const IconComponent = getFileIcon(entryExt)
          return <IconComponent size={32} color="#64748b" />
        })()}
      </div>
      {isRenaming ? (
        <input
          autoFocus value={renameValue}
          onChange={e => onRenameChange(e.target.value)}
          onBlur={onRenameConfirm}
          onKeyDown={e => { if (e.key === 'Enter') onRenameConfirm(); if (e.key === 'Escape') onRenameCancel() }}
          style={{
            width: '100%', padding: '7px 10px', borderRadius: 10,
            border: '1px solid rgba(124,58,237,0.4)', background: 'rgba(15,12,30,0.95)',
            color: '#e2d9f3', fontSize: 12, outline: 'none',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          }}
        />
      ) : (
        <span style={{
          fontSize: 12, color: entryIsDirectory ? '#e2d9f3' : '#cbd5e1',
          textAlign: 'center', width: '100%', overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          fontWeight: entryIsDirectory ? 500 : 400, lineHeight: 1.3,
        }}>
          <HighlightMatch text={entryName} query={searchQuery} />
        </span>
      )}
      {!entryIsDirectory && entrySize > 0 && (
        <span style={{ fontSize: 10, color: '#64748b' }}>{formatSize(entrySize)}</span>
      )}
      {exec && (
        <div style={{ display: 'flex', gap: 5, marginTop: 2, width: '100%', justifyContent: 'center' }}>
          <QuickAddBtn label="+ Game" onClick={e => { e.stopPropagation(); addAsGame(entry) }} small />
          <QuickAddBtn label="+ App" onClick={e => { e.stopPropagation(); addAsApp(entry) }} small />
        </div>
      )}
    </div>
  )
})

// ─── GridView ─────────────────────────────────────────────────────────────────
function GridView({
  entries, selectedPaths, onEntryClick, onOpen, addAsGame, addAsApp,
  isExecFn, isGamePathFn, recentPaths = [], onContextMenu,
  renamingPath, renameValue, onRenameChange, onRenameConfirm, onRenameCancel,
  iconCache, loadIcon, getCustomIcon, isTransitioning, searchQuery,
}) {
  const list = Array.isArray(entries) ? entries : []
  if (!list.length) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', flexDirection: 'column', gap: 8 }}>
        <FolderOpen size={32} color="#4a3f6b" />
        <span style={{ fontSize: 13 }}>No files to display</span>
      </div>
    )
  }
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))',
      gap: 14, padding: 16, overflowY: 'auto', flex: 1, alignContent: 'start',
      willChange: 'scroll-position', contain: 'layout style paint',
    }}>
      <style>{`
        @keyframes cardFadeIn {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      {list.map((entry) => {
        const entryPath = safePath(entry?.path)
        const customIconSrc = entry?.isDirectory ? getCustomIcon(entryPath) : null
        return (
          <div key={entryPath || 'unknown'} draggable onDragStart={e => { e.dataTransfer.setData('text/plain', entryPath); e.dataTransfer.effectAllowed = 'move' }}>
            <GridCard
              entry={entry}
              isSelected={selectedPaths.has(entryPath)}
              onClick={(e) => onEntryClick(entry, e)}
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
              customIconSrc={customIconSrc}
              isIconTransitioning={isTransitioning(entryPath)}
              searchQuery={searchQuery}
            />
          </div>
        )
      })}
    </div>
  )
}

// ─── Sidebar Section ──────────────────────────────────────────────────────────
const SidebarSection = React.memo(function SidebarSection({ title, children, collapsed, onToggle }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', padding: '5px 6px 5px', border: 'none', background: 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
          color: '#6d4fa0', fontSize: 9, fontWeight: 700, letterSpacing: '1px',
          textTransform: 'uppercase', fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        }}
      >
        <ChevronDown size={9} style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', flexShrink: 0 }} />
        {title}
      </button>
      {!collapsed && <div>{children}</div>}
    </div>
  )
})

const SidebarItem = React.memo(function SidebarItem({ label, icon: Icon, active, onClick, badge }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        width: '100%', padding: '6px 8px', marginBottom: 2, borderRadius: 7,
        border: active ? '1px solid rgba(124,58,237,0.4)' : '1px solid transparent',
        cursor: 'pointer',
        background: active ? 'rgba(124,58,237,0.22)' : hov ? 'rgba(124,58,237,0.1)' : 'transparent',
        color: active ? '#e2d9f3' : hov ? '#c4b5fd' : '#9ca3af',
        display: 'flex', alignItems: 'center', gap: 7,
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        fontSize: 12.5, fontWeight: active ? 500 : 400,
        transition: 'background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, color 0.15s ease',
        boxShadow: active ? '0 0 10px rgba(124,58,237,0.2)' : 'none',
        textAlign: 'left',
      }}
    >
      <Icon size={13} color={active ? '#a78bfa' : hov ? '#8b6fd4' : '#64748b'} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      {badge && <span style={{ fontSize: 9, color: '#6d4fa0', background: 'rgba(124,58,237,0.15)', borderRadius: 999, padding: '1px 5px' }}>{badge}</span>}
    </button>
  )
})

const SidebarDriveBtn = React.memo(function SidebarDriveBtn({ label, active, onClick, usedBytes, totalBytes }) {
  const [hov, setHov] = useState(false)
  const pct = totalBytes && usedBytes ? Math.min(100, (usedBytes / totalBytes) * 100) : null
  return (
    <div style={{ marginBottom: 4 }}>
      <button
        onClick={onClick}
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{
          width: '100%', padding: '7px 8px', borderRadius: 7,
          border: active ? '1px solid rgba(124,58,237,0.4)' : '1px solid transparent',
          cursor: 'pointer',
          background: active ? 'rgba(124,58,237,0.22)' : hov ? 'rgba(124,58,237,0.1)' : 'transparent',
          color: active ? '#e2d9f3' : '#9ca3af',
          display: 'flex', alignItems: 'center', gap: 7,
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif', fontSize: 12,
          transition: 'all 0.15s ease',
          boxShadow: active ? '0 0 10px rgba(124,58,237,0.2)' : 'none',
        }}
      >
        <HardDrive size={13} color={active ? '#a78bfa' : '#64748b'} />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>{label}</span>
      </button>
      {pct !== null && (
        <div style={{ margin: '2px 8px 0', height: 2, borderRadius: 1, background: 'rgba(124,58,237,0.12)' }}>
          <div style={{ height: '100%', width: `${pct}%`, borderRadius: 1, background: pct > 80 ? '#ef4444' : 'rgba(124,58,237,0.5)', transition: 'width 0.3s ease' }} />
        </div>
      )}
    </div>
  )
})

// ─── Sort Header ──────────────────────────────────────────────────────────────
const SortableHeader = React.memo(function SortableHeader({ label, field, sortBy, sortDir, onSort, style }) {
  const active = sortBy === field
  return (
    <th
      onClick={() => onSort(field)}
      style={{
        ...th, cursor: 'pointer', userSelect: 'none',
        color: active ? '#c4b5fd' : '#9b7dce',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {label}
        {active && (sortDir === 'asc'
          ? <SortAsc size={10} color="#c4b5fd" />
          : <SortDesc size={10} color="#c4b5fd" />
        )}
      </div>
    </th>
  )
})

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FileExplorer() {
  const { addGame, addApp } = useStore()
  const [currentPath, setCurrentPath] = useState('')
  const [entries, setEntries] = useState([])
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [drives, setDrives] = useState([])
  // Multi-selection: Set of paths
  const [selectedPaths, setSelectedPaths] = useState(new Set())
  const [lastSelectedIndex, setLastSelectedIndex] = useState(-1)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState('table')
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, entry: null, contextType: 'file' })
  const [renamingPath, setRenamingPath] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [iconCache, setIconCache] = useState({})
  const contextMenuRef = useRef(null)
  const containerRef = useRef(null)

  // Search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const searchTimerRef = useRef(null)
  const searchInputRef = useRef(null)

  // Sorting
  const [sortBy, setSortBy] = useState('name')
  const [sortDir, setSortDir] = useState('asc')

  // Clipboard
  const [clipboard, setClipboard] = useState(null) // { type: 'copy'|'cut', paths: Set }

  // Sidebar
  const [sidebarCollapsed, setSidebarCollapsed] = useState({ favorites: false, recent: false, drives: false })
  const [systemPaths, setSystemPaths] = useState({})
  const [recentDirs, setRecentDirs] = useState([])

  // Drag state
  const [dragOver, setDragOver] = useState(null)

  // ── Sidebar resize state ───────────────────────────────────────────────────
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH)
  const sidebarResizing = useRef(false)
  const sidebarResizeStartX = useRef(0)
  const sidebarResizeStartWidth = useRef(SIDEBAR_DEFAULT_WIDTH)
  const sidebarWidthRef = useRef(SIDEBAR_DEFAULT_WIDTH)
  const rafRef = useRef(null)

  // ── useFolderIcons ─────────────────────────────────────────────────────────
  const { assignIcon, removeIcon, getIcon, isTransitioning } = useFolderIcons()

  // ── Sidebar resize handlers ────────────────────────────────────────────────
  const handleSidebarResizeStart = useCallback((e) => {
    e.preventDefault()
    sidebarResizing.current = true
    sidebarResizeStartX.current = e.clientX
    sidebarResizeStartWidth.current = sidebarWidthRef.current

    const onPointerMove = (ev) => {
      if (!sidebarResizing.current) return
      const delta = ev.clientX - sidebarResizeStartX.current
      const newWidth = Math.min(
        SIDEBAR_MAX_WIDTH,
        Math.max(SIDEBAR_MIN_WIDTH, sidebarResizeStartWidth.current + delta)
      )
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        sidebarWidthRef.current = newWidth
        setSidebarWidth(newWidth)
      })
    }

    const onPointerUp = () => {
      sidebarResizing.current = false
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }, [])

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isElectron) {
      const initialPath = '/home/user'
      setEntries(cleanEntries(DEMO_ENTRIES))
      setCurrentPath(initialPath)
      setHistory([initialPath])
      setHistoryIndex(0)
      setSystemPaths({ home: '/home/user', desktop: '/home/user/Desktop', downloads: '/home/user/Downloads', documents: '/home/user/Documents', pictures: '/home/user/Pictures', music: '/home/user/Music', videos: '/home/user/Videos' })
      return
    }
    const init = async () => {
      try {
        const [home, drvs] = await Promise.all([
          window.arcadeOS.fs.homeDir(),
          window.arcadeOS.fs.drives(),
        ])
        setDrives(drvs)
        const sep = home.includes('\\') ? '\\' : '/'
        setSystemPaths({
          home,
          desktop: `${home}${sep}Desktop`,
          downloads: `${home}${sep}Downloads`,
          documents: `${home}${sep}Documents`,
          pictures: `${home}${sep}Pictures`,
          music: `${home}${sep}Music`,
          videos: `${home}${sep}Videos`,
        })
        navigateTo(home, true)
      } catch {}
    }
    init()
  }, [])

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // ── Navigate ───────────────────────────────────────────────────────────────
  const navigateTo = useCallback(async (path, replace = false) => {
    if (!path) return
    setLoading(true)
    setError('')
    setSelectedPaths(new Set())
    setLastSelectedIndex(-1)
    setSearchQuery('')
    setSearchResults(null)
    try {
      const raw = isElectron ? await window.arcadeOS.fs.readDir(path) : DEMO_ENTRIES
      const list = cleanEntries(raw)
      setEntries(list)
      setCurrentPath(path)
      if (!replace) {
        setHistory(h => {
          const trimmed = h.slice(0, historyIndex + 1)
          if (trimmed[trimmed.length - 1] === path) return trimmed
          const next = [...trimmed, path]
          setHistoryIndex(next.length - 1)
          return next
        })
      }
      // track recent dirs
      setRecentDirs(prev => {
        const filtered = prev.filter(p => p !== path)
        return [path, ...filtered].slice(0, 8)
      })
    } catch {
      setError(`Cannot access: ${path}`)
    } finally {
      setLoading(false)
    }
  }, [historyIndex])

  const goBack = useCallback(() => {
    if (historyIndex <= 0) return
    const newIdx = historyIndex - 1
    setHistoryIndex(newIdx)
    navigateTo(history[newIdx], true)
  }, [history, historyIndex, navigateTo])

  const goForward = useCallback(() => {
    if (historyIndex >= history.length - 1) return
    const newIdx = historyIndex + 1
    setHistoryIndex(newIdx)
    navigateTo(history[newIdx], true)
  }, [history, historyIndex, navigateTo])

  const goUp = useCallback(() => {
    const parts = currentPath.replace(/\\/g, '/').split('/').filter(Boolean)
    if (parts.length <= 1) return
    parts.pop()
    const parent = (currentPath.startsWith('/') ? '/' : '') + parts.join('/')
    navigateTo(parent)
  }, [currentPath, navigateTo])

  // ── Sort ───────────────────────────────────────────────────────────────────
  const handleSort = useCallback((field) => {
    setSortBy(prev => {
      if (prev === field) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); return field }
      setSortDir('asc'); return field
    })
  }, [])

  // ── Sorted + filtered entries ──────────────────────────────────────────────
  const displayEntries = useMemo(() => {
    const base = searchResults !== null ? searchResults : entries
    const list = Array.isArray(base) ? base.filter(e => e && typeof e === 'object') : []
    return [...list].sort((a, b) => {
      // Dirs first
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
      let cmp = 0
      if (sortBy === 'name') cmp = safeName(a.name).toLowerCase().localeCompare(safeName(b.name).toLowerCase())
      else if (sortBy === 'size') cmp = (a.size || 0) - (b.size || 0)
      else if (sortBy === 'type') cmp = safeExt(a.ext).localeCompare(safeExt(b.ext))
      else if (sortBy === 'modified') cmp = (a.modified || 0) - (b.modified || 0)
      else if (sortBy === 'created') cmp = (a.created || 0) - (b.created || 0)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [entries, searchResults, sortBy, sortDir])

  // ── Search ─────────────────────────────────────────────────────────────────
  const doSearch = useCallback(async (query, rootEntries, rootPath) => {
    if (!query.trim()) { setSearchResults(null); setSearchLoading(false); return }
    setSearchLoading(true)
    const q = query.toLowerCase()
    const results = []

    const recurse = async (entryList, depth = 0) => {
      if (depth > 4) return
      for (const e of entryList) {
        if (!e || typeof e !== 'object') continue
        const name = safeName(e.name).toLowerCase()
        const ext = safeExt(e.ext)
        if (name.includes(q) || ext.includes(q)) results.push(e)
        if (e.isDirectory && depth < 4) {
          try {
            const raw = isElectron ? await window.arcadeOS.fs.readDir(safePath(e.path)) : []
            const children = cleanEntries(raw)
            await recurse(children, depth + 1)
          } catch {}
        }
      }
    }

    await recurse(rootEntries)
    setSearchResults(results)
    setSearchLoading(false)
  }, [])

  useEffect(() => {
    clearTimeout(searchTimerRef.current)
    if (!searchQuery.trim()) { setSearchResults(null); setSearchLoading(false); return }
    setSearchLoading(true)
    searchTimerRef.current = setTimeout(() => {
      doSearch(searchQuery, entries, currentPath)
    }, 280)
    return () => clearTimeout(searchTimerRef.current)
  }, [searchQuery, entries, currentPath])

  // ── File open ──────────────────────────────────────────────────────────────
  const openFile = useCallback(async (entry) => {
    if (!entry || typeof entry !== 'object') return
    if (entry.isDirectory) return
    const path = safePath(entry.path)
    if (!isElectron) return console.log('[Demo] Open:', path)
    await window.arcadeOS.launch.open(path)
  }, [])

  // ── Multi-select handling ──────────────────────────────────────────────────
  const handleEntryClick = useCallback((entry, e) => {
    if (!entry || typeof entry !== 'object') return
    const path = safePath(entry.path)
    const idx = displayEntries.findIndex(en => safePath(en?.path) === path)
    const isCtrl = e?.ctrlKey || e?.metaKey
    const isShift = e?.shiftKey

    if (isCtrl) {
      setSelectedPaths(prev => {
        const next = new Set(prev)
        if (next.has(path)) next.delete(path)
        else next.add(path)
        return next
      })
      setLastSelectedIndex(idx)
    } else if (isShift && lastSelectedIndex >= 0) {
      const from = Math.min(lastSelectedIndex, idx)
      const to = Math.max(lastSelectedIndex, idx)
      const range = displayEntries.slice(from, to + 1).map(en => safePath(en?.path))
      setSelectedPaths(new Set(range))
    } else {
      setSelectedPaths(new Set([path]))
      setLastSelectedIndex(idx)
    }
  }, [displayEntries, lastSelectedIndex])

  const handleOpen = useCallback((entry) => {
    if (!entry || typeof entry !== 'object') return
    if (entry.isDirectory) navigateTo(safePath(entry.path))
    else openFile(entry)
  }, [navigateTo, openFile])

  // ── Context menu ───────────────────────────────────────────────────────────
  const closeContextMenu = useCallback(() => setContextMenu({ visible: false, x: 0, y: 0, entry: null, contextType: 'file' }), [])

  const handleContextMenu = useCallback((entry, event) => {
    if (!entry || typeof entry !== 'object') return
    event.preventDefault()
    const menuWidth = 192
    const menuHeight = entry?.isDirectory ? 310 : 270
    const { x, y } = calcContextMenuPos(event.clientX, event.clientY, menuWidth, menuHeight)
    const path = safePath(entry.path)
    if (!selectedPaths.has(path)) setSelectedPaths(new Set([path]))
    setContextMenu({ visible: true, x, y, entry, contextType: 'file' })
  }, [selectedPaths])

  const handleBackgroundContextMenu = useCallback((event) => {
    // Check if right-click is on a file/folder item (grid or list view)
    const fileItemElement = event.target.closest('.file-item')
    if (fileItemElement !== null) return

    // Additional check: ensure click wasn't on table interactive elements
    const tableCell = event.target.closest('td')
    if (tableCell !== null && event.target.closest('button') !== null) return

    // Only show background menu on true empty space
    event.preventDefault()
    const menuWidth = 192
    const menuHeight = 180
    const { x, y } = calcContextMenuPos(event.clientX, event.clientY, menuWidth, menuHeight)
    setContextMenu({ visible: true, x, y, entry: null, contextType: 'background' })
  }, [])

  // ── Rename ─────────────────────────────────────────────────────────────────
  const startRename = useCallback((entry) => {
    if (!entry || typeof entry !== 'object') return
    const name = safeName(entry.name)
    const ext = entry.isDirectory ? '' : safeExt(entry.ext)
    const rawName = ext && name.toLowerCase().endsWith(ext.toLowerCase()) ? name.slice(0, name.length - ext.length) : name
    setRenamingPath(safePath(entry.path))
    setRenameValue(rawName)
    closeContextMenu()
  }, [closeContextMenu])

  const confirmRename = useCallback(() => {
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
  }, [renamingPath, renameValue])

  const cancelRename = useCallback(() => {
    setRenamingPath(null)
    setRenameValue('')
    closeContextMenu()
  }, [closeContextMenu])

  // ── File operations (frontend-only) ───────────────────────────────────────
  const handleCopy = useCallback(() => {
    const paths = selectedPaths.size > 0 ? selectedPaths : (contextMenu.entry ? new Set([safePath(contextMenu.entry.path)]) : new Set())
    if (!paths.size) return
    setClipboard({ type: 'copy', paths })
    closeContextMenu()
  }, [selectedPaths, contextMenu.entry, closeContextMenu])

  const handleNewFolder = useCallback(() => {
    closeContextMenu()
    const newName = 'New Folder'
    const newPath = `${currentPath}/${newName}`
    const newEntry = { name: newName, isDirectory: true, path: newPath, size: 0, ext: '' }
    setEntries(prev => [newEntry, ...prev])
    setRenamingPath(newPath)
    setRenameValue(newName)
  }, [currentPath, closeContextMenu])

  const handleDelete = useCallback(() => {
    const paths = selectedPaths.size > 0 ? selectedPaths : (contextMenu.entry ? new Set([safePath(contextMenu.entry.path)]) : new Set())
    if (!paths.size) return
    closeContextMenu()
    setEntries(prev => prev.filter(e => !paths.has(safePath(e?.path))))
    setSelectedPaths(new Set())
  }, [selectedPaths, contextMenu.entry, closeContextMenu])

  const handleDuplicate = useCallback(() => {
    const entry = contextMenu.entry
    closeContextMenu()
    if (!entry) return
    const ext = safeExt(entry.ext)
    const baseName = safeName(entry.name)
    const nameWithoutExt = ext && baseName.toLowerCase().endsWith(ext) ? baseName.slice(0, baseName.length - ext.length) : baseName
    const dupName = `${nameWithoutExt} copy${ext}`
    const dupPath = `${safePath(entry.path).replace(/[^/\\]*$/, '')}${dupName}`
    const dup = { ...entry, name: dupName, path: dupPath }
    setEntries(prev => {
      const idx = prev.findIndex(e => safePath(e?.path) === safePath(entry.path))
      const next = [...prev]
      next.splice(idx + 1, 0, dup)
      return next
    })
  }, [contextMenu.entry, closeContextMenu])

  const handlePaste = useCallback(() => {
    if (!clipboard || clipboard.paths.size === 0) return
    closeContextMenu()
    setEntries(prev => {
      let updated = [...prev]
      const paths = Array.from(clipboard.paths)
      paths.forEach(srcPath => {
        const entry = prev.find(e => safePath(e?.path) === srcPath)
        if (!entry) return
        updated = updated.filter(e => safePath(e?.path) !== srcPath)
        const parentPath = currentPath
        const isSameFolder = safePath(entry.path).startsWith(parentPath)
        if (isSameFolder && clipboard.type === 'copy') {
          const ext = safeExt(entry.ext)
          const baseName = safeName(entry.name)
          const nameWithoutExt = ext && baseName.toLowerCase().endsWith(ext) ? baseName.slice(0, baseName.length - ext.length) : baseName
          const newName = `Copy of ${nameWithoutExt}${ext}`
          const newPath = `${parentPath}${parentPath.endsWith('/') ? '' : '/'}${newName}`
          updated.push({ ...entry, name: newName, path: newPath })
        } else {
          const newPath = `${parentPath}${parentPath.endsWith('/') ? '' : '/'}${safeName(entry.name)}`
          updated.push({ ...entry, path: newPath })
        }
      })
      return updated
    })
  }, [clipboard, currentPath, closeContextMenu])

  // ── Keyboard navigation ────────────────────────────────────────────────────
  const moveSelection = useCallback((delta) => {
    if (!displayEntries.length) return
    const currentPaths = [...selectedPaths]
    const lastPath = currentPaths[currentPaths.length - 1]
    const idx = lastPath ? displayEntries.findIndex(e => safePath(e?.path) === lastPath) : -1
    if (idx === -1) { setSelectedPaths(new Set([safePath(displayEntries[0]?.path)])); setLastSelectedIndex(0); return }
    const next = Math.max(0, Math.min(displayEntries.length - 1, idx + delta))
    setSelectedPaths(new Set([safePath(displayEntries[next]?.path)]))
    setLastSelectedIndex(next)
  }, [displayEntries, selectedPaths])

  const selectedEntry = useMemo(() => {
    if (selectedPaths.size !== 1) return null
    const [p] = selectedPaths
    return displayEntries.find(e => safePath(e?.path) === p) || null
  }, [displayEntries, selectedPaths])

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't capture when typing in input
      if (e.target.tagName === 'INPUT') return

      if (e.key === 'Escape') {
        if (contextMenu.visible) { closeContextMenu(); return }
        if (renamingPath) { cancelRename(); return }
        setSelectedPaths(new Set()); return
      }
      if (e.key === 'F2' && selectedEntry) { e.preventDefault(); startRename(selectedEntry); return }
      if (e.key === 'Enter' && !renamingPath && selectedEntry) {
        e.preventDefault()
        handleOpen(selectedEntry); return
      }
      if (e.key === 'Delete' && selectedPaths.size > 0) { e.preventDefault(); handleDelete(); return }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        setSelectedPaths(new Set(displayEntries.map(en => safePath(en?.path)))); return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') { e.preventDefault(); handleCopy(); return }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') { e.preventDefault(); handlePaste(); return }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); searchInputRef.current?.focus(); return }
      if (e.key === 'Backspace' && !renamingPath) { e.preventDefault(); goBack(); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); moveSelection(-1) }
      if (e.key === 'ArrowDown') { e.preventDefault(); moveSelection(1) }
      if (e.key === 'ArrowLeft') { e.preventDefault(); viewMode === 'grid' ? moveSelection(-1) : goBack() }
      if (e.key === 'ArrowRight') { e.preventDefault(); viewMode === 'grid' ? moveSelection(1) : (selectedEntry?.isDirectory && navigateTo(safePath(selectedEntry.path))) }
      if (e.key === 'Home') { e.preventDefault(); if (displayEntries.length) { setSelectedPaths(new Set([safePath(displayEntries[0]?.path)])); setLastSelectedIndex(0) } }
      if (e.key === 'End') { e.preventDefault(); if (displayEntries.length) { const last = displayEntries.length - 1; setSelectedPaths(new Set([safePath(displayEntries[last]?.path)])); setLastSelectedIndex(last) } }
      if (e.key === ' ' && selectedEntry && !selectedEntry.isDirectory) { e.preventDefault() } // Space preview (noop, preview panel handles it)
    }
    const handleMouseDown = (e) => {
      if (contextMenu.visible && contextMenuRef.current && !contextMenuRef.current.contains(e.target)) closeContextMenu()
    }
    const handleScroll = () => { if (contextMenu.visible) closeContextMenu() }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [contextMenu.visible, selectedEntry, viewMode, renamingPath, selectedPaths, displayEntries, closeContextMenu, cancelRename, navigateTo, openFile, startRename, moveSelection, handleDelete, handleCopy, handlePaste, goBack, handleOpen])

  // ── Misc callbacks ─────────────────────────────────────────────────────────
  const addAsGame = useCallback((entry) => addGame({ name: safeName(entry?.name).replace(/\.[^.]+$/, ''), path: safePath(entry?.path), genre: 'Other' }), [addGame])
  const addAsApp = useCallback((entry) => addApp({ name: safeName(entry?.name).replace(/\.[^.]+$/, ''), path: safePath(entry?.path), category: 'Other' }), [addApp])

  const loadIcon = useCallback(async (entry) => {
    const entryPath = safePath(entry?.path)
    if (!isElectron || entry?.isDirectory || !entryPath) return null
    if (iconCache?.[entryPath]) return iconCache[entryPath]
    try {
      const icon = await window.arcadeOS.fs.getFileIcon(entryPath)
      if (icon) { setIconCache(prev => prev?.[entryPath] ? prev : ({ ...prev, [entryPath]: icon })); return icon }
    } catch {}
    return null
  }, [iconCache])

  const isExec = useCallback((entry) => EXEC_EXTS.includes(safeExt(entry?.ext)), [])
  const isGamePath = useCallback((entry) => GAME_KEYWORDS.some(k => safePath(entry?.path).toLowerCase().includes(k)), [])

  const breadcrumbs = safePath(currentPath).split('/').filter(Boolean)
  const recentPaths = history.slice(-3)

  const preview = useMemo(
    () => (selectedEntry && !selectedEntry.isDirectory ? getEntryPreview(selectedEntry) : null),
    [selectedEntry],
  )

  // ── Sidebar navigation handler ─────────────────────────────────────────────
  const navigateToSystemPath = useCallback((key) => {
    const p = systemPaths[key]
    if (p) navigateTo(p)
  }, [systemPaths, navigateTo])

  // ── Drag & Drop ────────────────────────────────────────────────────────────
  const isCircularNesting = useCallback((srcPath, targetPath) => {
    const src = safePath(srcPath)
    const target = safePath(targetPath)
    // Can't drop into itself
    if (src === target) return true
    // Can't drop parent into child
    if (target.startsWith(src + '/') || target.startsWith(src + '\\')) return true
    return false
  }, [])

  const handleDragOver = useCallback((e, targetPath) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(targetPath)
  }, [])

  const handleDrop = useCallback((e, targetPath) => {
    e.preventDefault()
    setDragOver(null)
    const srcPath = e.dataTransfer.getData('text/plain')
    if (!srcPath || !targetPath) return
    // Prevent circular nesting
    if (isCircularNesting(srcPath, targetPath)) return
    // Frontend-only: move entry in state
    setEntries(prev => {
      const entry = prev.find(en => safePath(en?.path) === srcPath)
      if (!entry) return prev
      const newPath = `${safePath(targetPath)}${safePath(targetPath).endsWith('/') ? '' : '/'}${safeName(entry.name)}`
      return prev.filter(en => safePath(en?.path) !== srcPath).concat({ ...entry, path: newPath })
    })
  }, [isCircularNesting])

  // ── Breadcrumb with dropdown ───────────────────────────────────────────────
  const [breadcrumbDropdown, setBreadcrumbDropdown] = useState(-1)

  return (
    <div
      ref={containerRef}
      onContextMenu={handleBackgroundContextMenu}
      style={{
        position: 'relative', height: '100%', display: 'flex', flexDirection: 'column',
        overflow: 'visible',
        background: `
          radial-gradient(circle at 20% 0%, rgba(109,40,217,0.12), transparent 55%),
          radial-gradient(circle at 80% 100%, rgba(59,130,246,0.08), transparent 60%),
          linear-gradient(180deg, rgba(11,18,32,0.32), rgba(17,24,39,0.22))
        `,
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif', letterSpacing: '0.2px',
        willChange: 'initial', transform: 'translateZ(0)', backfaceVisibility: 'hidden',
      }}
      onClick={() => setBreadcrumbDropdown(-1)}
    >
      <style>{`
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.4); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(124,58,237,0.65); }
        @keyframes folderPulse {
          0%, 100% { filter: drop-shadow(0 0 4px rgba(124,58,237,0.2)); }
          50% { filter: drop-shadow(0 0 6px rgba(124,58,237,0.3)); }
        }
        @keyframes menuFadeIn {
          from { opacity: 0; transform: translateY(-4px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes searchPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(124,58,237,0); }
          50% { box-shadow: 0 0 0 3px rgba(124,58,237,0.15); }
        }
        .ctx-btn:hover { background: rgba(124,58,237,0.18) !important; }
        .ctx-btn-danger:hover { background: rgba(239,68,68,0.12) !important; color: #fca5a5 !important; }
        .ctx-divider { height: 1px; background: rgba(124,58,237,0.14); margin: 4px 8px; }
        .drag-over { box-shadow: 0 0 0 2px rgba(167,139,250,0.6) inset !important; background: rgba(124,58,237,0.1) !important; }
        .sidebar-resize-handle {
          width: 5px;
          cursor: col-resize;
          flex-shrink: 0;
          position: relative;
          z-index: 10;
          background: transparent;
          transition: background 0.15s ease;
        }
        .sidebar-resize-handle:hover,
        .sidebar-resize-handle:active {
          background: rgba(124,58,237,0.35);
        }
        .sidebar-resize-handle::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 1px;
          height: 32px;
          background: rgba(124,58,237,0.4);
          border-radius: 1px;
          opacity: 0;
          transition: opacity 0.15s ease;
        }
        .sidebar-resize-handle:hover::after {
          opacity: 1;
        }
      `}</style>

      {/* ── Toolbar ── */}
      <div style={{
        padding: '10px 16px', borderBottom: '1px solid rgba(124,58,237,0.22)',
        background: 'rgba(11,18,32,0.32)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        contain: 'layout style', willChange: 'initial',
      }}>
        <NavIconBtn onClick={goBack} enabled={historyIndex > 0 && !loading} title="Back">
          <ChevronLeft size={14} />
        </NavIconBtn>
        <NavIconBtn onClick={goForward} enabled={historyIndex < history.length - 1 && !loading} title="Forward">
          <ChevronRight size={14} />
        </NavIconBtn>
        <NavIconBtn onClick={goUp} enabled={!loading} title="Up">
          <ChevronRight size={14} style={{ transform: 'rotate(-90deg)' }} />
        </NavIconBtn>
        <NavIconBtn onClick={() => navigateTo(currentPath)} enabled={!loading} title="Refresh">
          <RefreshCw size={13} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
        </NavIconBtn>

        {/* Breadcrumbs */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 3, overflow: 'hidden',
          padding: '5px 10px', borderRadius: 7,
          background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.18)', minWidth: 0,
          position: 'relative',
        }}>
          <Home size={11} color="#a78bfa" style={{ flexShrink: 0 }} />
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              <span style={{ color: '#6d4fa0', fontSize: 11, flexShrink: 0 }}>/</span>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (i === breadcrumbs.length - 1) { setBreadcrumbDropdown(i === breadcrumbDropdown ? -1 : i); return }
                    const p = (currentPath.startsWith('/') ? '/' : '') + breadcrumbs.slice(0, i + 1).join('/')
                    navigateTo(p)
                  }}
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: i === breadcrumbs.length - 1 ? '#e2d9f3' : '#c4b5fd',
                    fontSize: 12, fontWeight: i === breadcrumbs.length - 1 ? 500 : 400,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    maxWidth: 120, fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                    padding: '0 2px', display: 'flex', alignItems: 'center', gap: 2,
                  }}
                >
                  {crumb}
                  {i === breadcrumbs.length - 1 && <ChevronDown size={9} color="#6d4fa0" />}
                </button>
                {/* Breadcrumb dropdown */}
                {breadcrumbDropdown === i && i === breadcrumbs.length - 1 && (
                  <div
                    onClick={e => e.stopPropagation()}
                    style={{
                      position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 999,
                      background: 'rgba(9,14,28,0.96)', border: '1px solid rgba(124,58,237,0.25)',
                      borderRadius: 10, padding: '4px 0', minWidth: 160,
                      backdropFilter: 'blur(12px)', boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
                      animation: 'menuFadeIn 0.15s ease',
                    }}
                  >
                    {displayEntries.filter(e => e.isDirectory).slice(0, 12).map(dir => (
                      <button key={safePath(dir.path)} onClick={() => { setBreadcrumbDropdown(-1); navigateTo(safePath(dir.path)) }}
                        style={{
                          width: '100%', padding: '7px 12px', border: 'none', background: 'transparent',
                          color: '#c4b5fd', fontSize: 12, cursor: 'pointer', textAlign: 'left',
                          display: 'flex', alignItems: 'center', gap: 6,
                          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                          transition: 'background 0.12s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,58,237,0.16)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <Folder size={11} color="#8b6fd4" />
                        {safeName(dir.name)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Search bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 10px', borderRadius: 7, minWidth: 160, maxWidth: 220,
          background: searchQuery ? 'rgba(124,58,237,0.12)' : 'rgba(124,58,237,0.06)',
          border: searchQuery ? '1px solid rgba(124,58,237,0.38)' : '1px solid rgba(124,58,237,0.18)',
          transition: 'all 0.2s ease',
          animation: searchQuery ? 'none' : undefined,
        }}>
          {searchLoading
            ? <RefreshCw size={11} color="#a78bfa" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
            : <Search size={11} color={searchQuery ? '#a78bfa' : '#64748b'} style={{ flexShrink: 0 }} />
          }
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search files…"
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              color: '#e2d9f3', fontSize: 12, width: '100%',
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
              '::placeholder': { color: '#64748b' },
            }}
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setSearchResults(null) }}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#64748b', flexShrink: 0 }}>
              <X size={11} />
            </button>
          )}
        </div>

        {/* View toggle */}
        <div style={{
          display: 'flex', gap: 4, padding: '3px', borderRadius: 8,
          background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)',
        }}>
          <ViewToggleBtn active={viewMode === 'table'} onClick={() => setViewMode('table')} title="List view">
            <List size={13} />
          </ViewToggleBtn>
          <ViewToggleBtn active={viewMode === 'grid'} onClick={() => setViewMode('grid')} title="Grid view">
            <LayoutGrid size={13} />
          </ViewToggleBtn>
        </div>
      </div>

      {/* Search status bar */}
      {searchQuery && (
        <div style={{
          padding: '5px 16px', background: 'rgba(124,58,237,0.08)',
          borderBottom: '1px solid rgba(124,58,237,0.14)',
          display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#9b7dce', flexShrink: 0,
        }}>
          <Search size={10} color="#a78bfa" />
          {searchLoading ? 'Searching…' : `${displayEntries.length} result${displayEntries.length !== 1 ? 's' : ''} for `}
          {!searchLoading && <span style={{ color: '#c4b5fd', fontWeight: 500 }}>"{searchQuery}"</span>}
          <span style={{ marginLeft: 'auto', cursor: 'pointer', color: '#6d4fa0' }} onClick={() => { setSearchQuery(''); setSearchResults(null) }}>
            Clear
          </span>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Enhanced Sidebar ── */}
        <div style={{
          width: sidebarWidth,
          minWidth: SIDEBAR_MIN_WIDTH,
          maxWidth: SIDEBAR_MAX_WIDTH,
          flexShrink: 0,
          padding: '8px 6px',
          overflowY: 'auto',
          overflowX: 'hidden',
          background: 'rgba(32, 20, 63, 0.18)',
          // No border-right here; the handle provides the visual divider
        }}>
          {/* Favorites */}
          <SidebarSection
            title="Favorites"
            collapsed={sidebarCollapsed.favorites}
            onToggle={() => setSidebarCollapsed(s => ({ ...s, favorites: !s.favorites }))}
          >
            {SIDEBAR_FAVORITES.map(item => (
              <SidebarItem
                key={item.key}
                label={item.label}
                icon={item.icon}
                active={currentPath === systemPaths[item.pathKey]}
                onClick={() => navigateToSystemPath(item.pathKey)}
              />
            ))}
            
          </SidebarSection>

          {/* Recent */}
          <SidebarSection
            title="Recent"
            collapsed={sidebarCollapsed.recent}
            onToggle={() => setSidebarCollapsed(s => ({ ...s, recent: !s.recent }))}
          >
            {recentDirs.slice(0, 5).map(p => {
              const parts = safePath(p).split('/').filter(Boolean)
              const label = parts[parts.length - 1] || p
              return (
                <SidebarItem key={p} label={label} icon={Clock} active={currentPath === p} onClick={() => navigateTo(p)} />
              )
            })}
            {recentDirs.length === 0 && (
              <div style={{ padding: '4px 8px', fontSize: 11, color: '#4a3f6b' }}>No recent folders</div>
            )}
          </SidebarSection>

          {/* Drives */}
          <SidebarSection
            title="Drives"
            collapsed={sidebarCollapsed.drives}
            onToggle={() => setSidebarCollapsed(s => ({ ...s, drives: !s.drives }))}
          >
            {(isElectron ? drives : ['C:\\', 'D:\\']).map(d => (
              <SidebarDriveBtn
                key={d} label={d} active={currentPath.startsWith(d)}
                onClick={() => navigateTo(d)}
              />
            ))}
          </SidebarSection>
        </div>

        {/* ── Sidebar Resize Handle ── */}
        <div
          className="sidebar-resize-handle"
          onPointerDown={handleSidebarResizeStart}
          title="Drag to resize sidebar"
          style={{
            borderLeft: '1px solid rgba(124,58,237,0.13)',
            borderRight: '1px solid rgba(124,58,237,0.13)',
          }}
        />

        {/* ── Main content ── */}
        {loading && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa', fontSize: 13, gap: 8 }}>
            <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
            Loading…
          </div>
        )}

        {!loading && error && (
          <div style={{ flex: 1, padding: 24, color: '#f87171', fontSize: 13 }}>{error}</div>
        )}

        {/* ── TABLE VIEW ── */}
        {!loading && !error && viewMode === 'table' && (
          <div style={{ flex: 1, overflowY: 'auto', contain: 'strict' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '43%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '20%' }} />
              </colgroup>
              <thead>
                <tr>
                  <SortableHeader label="Name" field="name" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="Size" field="size" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="Type" field="type" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="Modified" field="modified" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayEntries.map((entry, i) => {
                  const entryPath = safePath(entry?.path)
                  const entryName = safeName(entry?.name)
                  const entryExt = safeExt(entry?.ext)
                  const entrySize = Number(entry?.size || 0)
                  const isDirectory = Boolean(entry?.isDirectory)
                  const exec = isExec(entry)
                  const likelyGame = exec && isGamePath(entry)
                  const isSelected = selectedPaths.has(entryPath)
                  const folderStyle = isDirectory ? getFolderStyle(entry, false, false, history.slice(-3)) : { glow: '', scale: 1 }
                  const customIconSrc = isDirectory ? getIcon(entryPath) : null
                  const transitioning = isTransitioning(entryPath)

                  return (
                    <tr key={entryPath || i}
                      className="file-item"
                      draggable
                      onDragStart={e => { e.dataTransfer.setData('text/plain', entryPath); e.dataTransfer.effectAllowed = 'move' }}
                      onDragOver={isDirectory ? (e) => handleDragOver(e, entryPath) : undefined}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={isDirectory ? (e) => handleDrop(e, entryPath) : undefined}
                      onClick={(e) => handleEntryClick(entry, e)}
                      onDoubleClick={() => handleOpen(entry)}
                      onContextMenu={e => { e.preventDefault(); e.stopPropagation(); handleContextMenu(entry, e) }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(59,130,246,0.05)' }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                      style={{
                        background: isSelected ? 'rgba(139,92,246,0.18)' : dragOver === entryPath ? 'rgba(124,58,237,0.1)' : 'transparent',
                        cursor: 'pointer', transition: 'background 0.12s ease',
                        outline: dragOver === entryPath ? '1px solid rgba(167,139,250,0.5)' : 'none',
                      }}
                    >
                      <td style={td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, overflow: 'hidden' }}>
                          <span style={{
                            flexShrink: 0, display: 'flex', alignItems: 'center',
                            filter: isDirectory && !customIconSrc ? folderStyle.glow : undefined,
                            transition: 'filter 0.15s ease, opacity 0.15s ease, transform 0.15s ease',
                            opacity: transitioning ? 0.5 : 1,
                            transform: transitioning ? 'scale(0.85)' : 'scale(1)',
                            willChange: transitioning ? 'opacity, transform' : 'auto',
                            contain: isDirectory && !customIconSrc ? 'layout style paint' : undefined,
                          }}>
                            {isDirectory && customIconSrc ? (
                              <img src={customIconSrc} alt={entryName} style={{ width: 15, height: 15, objectFit: 'contain', borderRadius: 3 }} />
                            ) : isDirectory ? (
                              <Folder size={15} color={folderStyle.color} />
                            ) : (() => { const IconComponent = getFileIcon(entryExt); return <IconComponent size={14} color="#7c8ea0" /> })()}
                          </span>
                          {entryPath === renamingPath ? (
                            <input
                              autoFocus value={renameValue}
                              onChange={e => setRenameValue(e.target.value)}
                              onBlur={confirmRename}
                              onKeyDown={e => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') cancelRename() }}
                              style={{
                                flex: 1, minWidth: 0, padding: '7px 10px', borderRadius: 10,
                                border: '1px solid rgba(124,58,237,0.4)', background: 'rgba(15,12,30,0.95)',
                                color: '#e2d9f3', fontSize: 13, outline: 'none',
                                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                              }}
                            />
                          ) : (
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: isDirectory ? '#e2d9f3' : '#cbd5e1', fontSize: 13 }}>
                              <HighlightMatch text={entryName} query={searchQuery} />
                            </span>
                          )}
                          {likelyGame && (
                            <span style={{
                              flexShrink: 0, fontSize: 8, fontWeight: 700, color: '#fff',
                              background: 'linear-gradient(90deg,#7c3aed,#a78bfa)',
                              borderRadius: 999, padding: '1px 5px', letterSpacing: '0.5px',
                              boxShadow: '0 0 6px rgba(124,58,237,0.5)',
                            }}>GAME</span>
                          )}
                        </div>
                      </td>
                      <td style={{ ...td, color: '#94a3b8', fontSize: 12 }}>{isDirectory ? '—' : formatSize(entrySize)}</td>
                      <td style={{ ...td, color: '#94a3b8', fontSize: 12, whiteSpace: 'nowrap' }}>{isDirectory ? 'Folder' : entryExt}</td>
                      <td style={{ ...td, color: '#94a3b8', fontSize: 11 }}>{formatDate(entry?.modified)}</td>
                      <td style={td}>
                        {exec && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <QuickAddBtn label="+ Game" onClick={e => { e.stopPropagation(); addAsGame(entry) }} />
                            <QuickAddBtn label="+ App" onClick={e => { e.stopPropagation(); addAsApp(entry) }} />
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {displayEntries.length === 0 && !searchLoading && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px 0', color: '#4a3f6b', fontSize: 13 }}>
                      {searchQuery ? 'No results found' : 'Empty folder'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── GRID VIEW ── */}
        {!loading && !error && viewMode === 'grid' && (
          <GridView
            entries={displayEntries}
            selectedPaths={selectedPaths}
            onEntryClick={handleEntryClick}
            onOpen={handleOpen}
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
            getCustomIcon={getIcon}
            isTransitioning={isTransitioning}
            searchQuery={searchQuery}
          />
        )}
      </div>

      {/* Status bar */}
      <div style={{
        padding: '5px 16px', borderTop: '1px solid rgba(124,58,237,0.13)',
        background: 'rgba(11,18,32,0.22)', display: 'flex', alignItems: 'center',
        gap: 12, fontSize: 11, color: '#6d4fa0', flexShrink: 0,
      }}>
        <span>{displayEntries.length} item{displayEntries.length !== 1 ? 's' : ''}</span>
        {selectedPaths.size > 0 && (
          <span style={{ color: '#a78bfa' }}>{selectedPaths.size} selected</span>
        )}
        {clipboard && (
          <span style={{ color: '#6d4fa0' }}>
            {clipboard.type === 'copy' ? '📋' : '✂️'} {clipboard.paths.size} in clipboard
          </span>
        )}
        <span style={{ marginLeft: 'auto', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentPath}</span>
      </div>

      {/* ── Enhanced Preview Panel ── */}
      {selectedEntry && (
        <div style={{
          position: 'absolute', right: 18, bottom: 40, width: 240,
          maxWidth: 'calc(100% - 32px)', padding: '12px 14px', borderRadius: 16,
          border: '1px solid rgba(124,58,237,0.22)', background: 'rgba(11,18,32,0.92)',
          backdropFilter: 'blur(12px)', boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
          color: '#e2d9f3', zIndex: 12, willChange: 'transform', contain: 'layout style paint',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8, color: '#c4b5fd', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Info size={11} color="#a78bfa" />
            Info
          </div>
          {preview?.isImage && (
            <img src={preview.src} alt={selectedEntry?.name || 'Preview'}
              style={{ width: '100%', borderRadius: 12, objectFit: 'cover', marginBottom: 8 }} />
          )}
          {preview?.isVideo && (
            <video src={preview.src} muted controls
              style={{ width: '100%', borderRadius: 12, background: '#090b13', marginBottom: 8 }} />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedEntry?.name}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{selectedEntry?.isDirectory ? 'Folder' : (safeExt(selectedEntry?.ext) || 'File')}</div>
            {!selectedEntry?.isDirectory && selectedEntry?.size > 0 && (
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Size: {formatSize(selectedEntry.size)}</div>
            )}
            {selectedEntry?.isDirectory && selectedEntry?.children !== undefined && (
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{Array.isArray(selectedEntry.children) ? selectedEntry.children.length : '?'} items</div>
            )}
            {selectedEntry?.modified && (
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Modified: {formatDate(selectedEntry.modified)}</div>
            )}
            {selectedEntry?.created && (
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Created: {formatDate(selectedEntry.created)}</div>
            )}
            {preview?.isExecutable && <div style={{ fontSize: 11, color: '#c4b5fd' }}>Executable</div>}
            {preview?.isImage && selectedEntry?.width && selectedEntry?.height && (
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{selectedEntry.width}×{selectedEntry.height}px</div>
            )}
            {preview?.isVideo && selectedEntry?.duration && (
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Duration: {selectedEntry.duration}</div>
            )}
          </div>
        </div>
      )}

      {/* ── Enhanced Context Menu ── */}
      {contextMenu.visible && (
        <div
          ref={contextMenuRef}
          style={{
            position: 'fixed', top: contextMenu.y, left: contextMenu.x,
            minWidth: 192, background: 'rgba(9,14,28,0.96)',
            border: '1px solid rgba(124,58,237,0.25)', borderRadius: 14,
            backdropFilter: 'blur(12px)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(124,58,237,0.08)',
            zIndex: 9999, overflow: 'hidden',
            animation: 'menuFadeIn 0.12s ease', padding: '4px 0',
          }}
        >
          {contextMenu.contextType === 'background' ? (
            <>
              <ContextMenuItem onClick={handleNewFolder}><FolderPlus size={13} />New Folder</ContextMenuItem>
              {clipboard && (
                <ContextMenuItem onClick={handlePaste}><ClipboardPaste size={13} />Paste</ContextMenuItem>
              )}
              <div className="ctx-divider" />
              <ContextMenuItem onClick={() => { closeContextMenu(); navigateTo(currentPath) }}><RefreshCw size={13} />Refresh</ContextMenuItem>
            </>
          ) : (
            <>
              <ContextMenuItem
                onClick={() => { const entry = contextMenu.entry; closeContextMenu(); if (!entry) return; handleOpen(entry) }}
              ><FolderOpen size={13} />Open</ContextMenuItem>

              {contextMenu.entry && !contextMenu.entry.isDirectory && isExec(contextMenu.entry) && (
                <>
                  <ContextMenuItem onClick={() => { closeContextMenu(); addAsGame(contextMenu.entry) }}><Gamepad2 size={13} />Add as Game</ContextMenuItem>
                  <ContextMenuItem onClick={() => { closeContextMenu(); addAsApp(contextMenu.entry) }}><AppWindow size={13} />Add as App</ContextMenuItem>
                </>
              )}

              <div className="ctx-divider" />
              <ContextMenuItem onClick={() => startRename(contextMenu.entry)}><FileText size={13} />Rename</ContextMenuItem>
              <ContextMenuItem onClick={handleCopy}><Copy size={13} />Copy</ContextMenuItem>
              <ContextMenuItem onClick={handleDuplicate}><Copy size={13} />Duplicate</ContextMenuItem>
              <ContextMenuItem
                onClick={() => { const path = contextMenu.entry?.path; closeContextMenu(); if (!path || !navigator?.clipboard?.writeText) return; navigator.clipboard.writeText(path).catch(() => {}) }}
              ><Cpu size={13} />Copy Path</ContextMenuItem>

              <div className="ctx-divider" />
              <ContextMenuItem onClick={handleNewFolder}><FolderPlus size={13} />New Folder</ContextMenuItem>
              {clipboard && (
                <ContextMenuItem onClick={handlePaste}><ClipboardPaste size={13} />Paste</ContextMenuItem>
              )}

              {contextMenu.entry?.isDirectory && (
                <>
                  <div className="ctx-divider" />
                  <ContextMenuItem onClick={async () => { const entry = contextMenu.entry; closeContextMenu(); if (entry) await assignIcon(safePath(entry.path)) }}>
                    🎨 Change Icon
                  </ContextMenuItem>
                  <ContextMenuItem onClick={async () => { const entry = contextMenu.entry; closeContextMenu(); if (entry) await removeIcon(safePath(entry.path)) }}>
                    ♻️ Reset Icon
                  </ContextMenuItem>
                </>
              )}

              <div className="ctx-divider" />
              <ContextMenuItem danger onClick={handleDelete}><Trash2 size={13} />Move to Trash</ContextMenuItem>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const ContextMenuItem = React.memo(function ContextMenuItem({ onClick, children, danger }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        width: '100%', padding: '8px 14px', border: 'none',
        background: hov ? (danger ? 'rgba(239,68,68,0.1)' : 'rgba(124,58,237,0.16)') : 'transparent',
        color: hov && danger ? '#fca5a5' : '#e2d9f3',
        textAlign: 'left', cursor: 'pointer', fontSize: 13, lineHeight: 1.4, outline: 'none',
        display: 'flex', alignItems: 'center', gap: 8,
        transition: 'background 0.14s ease, color 0.14s ease',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >{children}</button>
  )
})

const NavIconBtn = React.memo(function NavIconBtn({ onClick, enabled, children, title }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick} title={title}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        width: 30, height: 30, borderRadius: 7,
        border: '1px solid rgba(124,58,237,0.3)',
        background: hov && enabled ? 'rgba(124,58,237,0.25)' : 'rgba(124,58,237,0.12)',
        color: enabled ? '#c4b5fd' : '#4a3f6b',
        cursor: enabled ? 'pointer' : 'not-allowed',
        pointerEvents: enabled ? 'auto' : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        boxShadow: hov && enabled ? '0 0 12px rgba(124,58,237,0.45)' : 'none',
        transition: 'background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, color 0.15s ease',
      }}
    >{children}</button>
  )
})

const ViewToggleBtn = React.memo(function ViewToggleBtn({ active, onClick, children, title }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick} title={title}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        width: 28, height: 26, borderRadius: 6, border: 'none',
        background: active ? 'rgba(124,58,237,0.35)' : hov ? 'rgba(124,58,237,0.15)' : 'transparent',
        color: active ? '#e9d5ff' : '#a78bfa',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: active ? '0 0 12px rgba(124,58,237,0.5)' : 'none',
        transition: 'background 0.15s ease, box-shadow 0.15s ease, color 0.15s ease',
      }}
    >{children}</button>
  )
})

const QuickAddBtn = React.memo(function QuickAddBtn({ label, onClick, small }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        padding: small ? '3px 6px' : '4px 8px', borderRadius: 6,
        background: hov ? 'rgba(124,58,237,0.35)' : 'rgba(124,58,237,0.18)',
        border: '1px solid rgba(124,58,237,0.45)', color: '#c4b5fd',
        cursor: 'pointer', fontSize: small ? 9 : 10,
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif', letterSpacing: '0.3px',
        transition: 'background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease, color 0.15s ease',
        whiteSpace: 'nowrap',
        transform: hov ? 'scale(1.05)' : 'scale(1)',
        boxShadow: hov ? '0 0 8px rgba(124,58,237,0.4)' : 'none',
      }}
    >{label}</button>
  )
})

// ─── Styles ───────────────────────────────────────────────────────────────────
const th = {
  textAlign: 'left', padding: '10px 10px', fontSize: 10, color: '#9b7dce',
  fontWeight: 700, letterSpacing: '0.7px', textTransform: 'uppercase',
  borderBottom: '1px solid rgba(124,58,237,0.22)',
  position: 'sticky', top: 0, background: 'rgba(7,9,22,0.45)',
  backdropFilter: 'blur(10px)', zIndex: 1,
}
const td = {
  padding: '9px 10px',
  borderBottom: '1px solid rgba(255,255,255,0.035)',
  verticalAlign: 'middle',
}

// ─── Demo Data ────────────────────────────────────────────────────────────────
const DEMO_ENTRIES = [
  { name: 'Games', isDirectory: true, path: '/home/user/Games', size: 0, ext: '', modified: Date.now() - 86400000 * 2 },
  { name: 'Documents', isDirectory: true, path: '/home/user/Documents', size: 0, ext: '', modified: Date.now() - 86400000 },
  { name: 'Music', isDirectory: true, path: '/home/user/Music', size: 0, ext: '', modified: Date.now() - 86400000 * 5 },
  { name: 'Desktop', isDirectory: true, path: '/home/user/Desktop', size: 0, ext: '', modified: Date.now() },
  { name: 'Downloads', isDirectory: true, path: '/home/user/Downloads', size: 0, ext: '', modified: Date.now() - 3600000 },
  { name: 'Pictures', isDirectory: true, path: '/home/user/Pictures', size: 0, ext: '', modified: Date.now() - 86400000 * 3 },
  { name: 'cyberpunk2077.exe', isDirectory: false, path: '/home/user/Games/cyberpunk2077.exe', size: 180000000, ext: '.exe', modified: Date.now() - 86400000 * 10 },
  { name: 'launcher.exe', isDirectory: false, path: '/home/user/steam/launcher.exe', size: 4200000, ext: '.exe', modified: Date.now() - 86400000 * 7 },
  { name: 'readme.txt', isDirectory: false, path: '/home/user/readme.txt', size: 2048, ext: '.txt', modified: Date.now() - 86400000 * 30 },
  { name: 'screenshot.png', isDirectory: false, path: '/home/user/Pictures/screenshot.png', size: 1024000, ext: '.png', modified: Date.now() - 3600000 * 2 },
  { name: 'playlist.mp4', isDirectory: false, path: '/home/user/Videos/playlist.mp4', size: 52000000, ext: '.mp4', modified: Date.now() - 86400000 * 4 },
]
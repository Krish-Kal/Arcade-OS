import React, { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect } from 'react'
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'
import {
  Folder, File, ChevronRight, ChevronLeft, Home, HardDrive, RefreshCw,
  LayoutGrid, List, AppWindow, FileText, Sheet, Image, Video, Archive,
  Search, X, Star, Download, Music, Monitor, Cpu, Clock, Heart,
  Gamepad2, ChevronDown, FolderOpen, Copy, Trash2, FolderPlus,
  ClipboardPaste, SortAsc, SortDesc, Info, FileCode, FileAudio, FileImage,
  FileVideo, FileArchive, FileSpreadsheet, FileType, Presentation,
  Palette, Check
} from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useFileExplorerStore } from '../../store/useFileExplorerStore'
import { useFolderIcons } from './hooks/useFolderIcons'

// ─── Constants ────────────────────────────────────────────────────────────────
const isElectron = typeof window !== 'undefined' && window.arcadeOS
const supportsPointerEvents = typeof window !== 'undefined' && 'PointerEvent' in window

const SORT_SUBMENU_WIDTH = 184
const SORT_SUBMENU_FALLBACK_HEIGHT = 252

const EXEC_EXTS = ['.exe', '.app', '.sh', '.bat', '.cmd', '.lnk', '.msi']
const GAME_KEYWORDS = ['game', 'steam', 'epic', 'gog', 'uplay', 'origin', 'battlenet']
const HIDDEN_FOLDERS = [
  '$recycle.bin', 'system volume information', 'thumbs.db',
  'desktop.ini', 'ntuser.dat', 'iconcache.db',
]
const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.gif']
const VIDEO_EXTS = ['.mp4', '.webm', '.mov', '.mkv', '.avi', '.m4v']
const IMAGE_PREVIEW_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg', '.avif']
const AUDIO_EXTS = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma']
const ARCHIVE_EXTS = ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2']
const CODE_EXTS = ['.js', '.jsx', '.ts', '.tsx', '.json', '.html', '.css', '.scss', '.sass', '.less', '.xml', '.yml', '.yaml', '.py', '.java', '.c', '.cpp', '.cs', '.go', '.rs', '.php', '.rb', '.sh']
const DESIGN_EXTS = ['.psd', '.fig', '.ai', '.sketch', '.xd', '.indd']
const DOC_EXTS = ['.txt', '.md', '.rtf', '.doc', '.docx', '.odt', '.pages']
const SHEET_EXTS = ['.xls', '.xlsx', '.csv', '.ods', '.numbers']
const SLIDE_EXTS = ['.ppt', '.pptx', '.odp', '.key']

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

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
const getEntryExt = (entry) => {
  const direct = safeExt(entry?.ext)
  if (direct) return direct.startsWith('.') ? direct : `.${direct}`
  const source = safeName(entry?.name) || safePath(entry?.path)
  const match = source.match(/\.([^.\\/]+)$/)
  return match ? `.${match[1].toLowerCase()}` : ''
}

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
  const ext = getEntryExt(entry)
  if (IMAGE_PREVIEW_EXTS.includes(ext)) return resolvePreviewSrc(path)
  if (iconCache[path]) return iconCache[path]
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
  const glowIntensity = active ? 10 : hovered ? 8 : 0
  const glowOpacity = active ? 0.45 : hovered ? 0.35 : 0
  const primaryGlow = active || hovered
    ? isGameFolder
      ? `drop-shadow(0 0 ${glowIntensity}px rgba(124,58,237,${glowOpacity}))`
      : `drop-shadow(0 0 ${glowIntensity * 0.6}px rgba(124,58,237,${glowOpacity * 0.5}))`
    : undefined
  const scale = active ? 1.06 : hovered ? 1.03 : 1
  const animation = isGameFolder ? 'folderPulse 6s ease-in-out infinite' : undefined
  return { color, glow: primaryGlow, scale, animation }
}

function getEntryPreview(entry) {
  const ext = getEntryExt(entry)
  return {
    isImage: IMAGE_PREVIEW_EXTS.includes(ext),
    isVideo: VIDEO_EXTS.includes(ext),
    isPdf: ext === '.pdf',
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
  if (DOC_EXTS.includes(lower)) return FileText
  if (SHEET_EXTS.includes(lower)) return Sheet
  if (lower === '.pdf') return FileText
  if (IMAGE_PREVIEW_EXTS.includes(lower)) return Image
  if (VIDEO_EXTS.includes(lower)) return Video
  if (ARCHIVE_EXTS.includes(lower)) return Archive
  return File
}

function getFileTypeMeta(ext) {
  const lower = safeExt(ext)
  if (lower === '.pdf') return { label: 'PDF', Icon: FileText, color: '#ef4444', accent: '#f97316' }
  if (DOC_EXTS.includes(lower)) return { label: lower === '.md' ? 'MD' : lower === '.txt' ? 'TXT' : 'DOC', Icon: FileType, color: '#2563eb', accent: '#60a5fa' }
  if (SHEET_EXTS.includes(lower)) return { label: lower === '.csv' ? 'CSV' : 'XLS', Icon: FileSpreadsheet, color: '#16a34a', accent: '#86efac' }
  if (SLIDE_EXTS.includes(lower)) return { label: 'PPT', Icon: Presentation, color: '#ea580c', accent: '#fdba74' }
  if (EXEC_EXTS.includes(lower)) return { label: lower === '.msi' ? 'MSI' : 'APP', Icon: AppWindow, color: '#64748b', accent: '#cbd5e1' }
  if (ARCHIVE_EXTS.includes(lower)) return { label: lower.replace('.', '').toUpperCase() || 'ZIP', Icon: FileArchive, color: '#b45309', accent: '#facc15' }
  if (AUDIO_EXTS.includes(lower)) return { label: 'AUD', Icon: FileAudio, color: '#0891b2', accent: '#67e8f9' }
  if (VIDEO_EXTS.includes(lower)) return { label: 'VID', Icon: FileVideo, color: '#7c3aed', accent: '#c4b5fd' }
  if (IMAGE_PREVIEW_EXTS.includes(lower)) return { label: lower.replace('.', '').toUpperCase() || 'IMG', Icon: FileImage, color: '#db2777', accent: '#f9a8d4' }
  if (CODE_EXTS.includes(lower)) return { label: lower.replace('.', '').toUpperCase().slice(0, 4) || 'CODE', Icon: FileCode, color: '#0f766e', accent: '#5eead4' }
  if (DESIGN_EXTS.includes(lower)) return { label: lower.replace('.', '').toUpperCase() || 'ART', Icon: Palette, color: '#c026d3', accent: '#f0abfc' }
  return { label: lower ? lower.replace('.', '').toUpperCase().slice(0, 4) : 'FILE', Icon: File, color: '#64748b', accent: '#cbd5e1' }
}

// ─── Context menu position calculator ────────────────────────────────────────
function calcContextMenuPos(clientX, clientY, menuWidth, menuHeight, boundsRect = null) {
  const viewport = window.visualViewport
  const viewportLeft = boundsRect?.left ?? viewport?.offsetLeft ?? 0
  const viewportTop = boundsRect?.top ?? viewport?.offsetTop ?? 0
  const viewportWidth = boundsRect?.width ?? viewport?.width ?? window.innerWidth
  const viewportHeight = boundsRect?.height ?? viewport?.height ?? window.innerHeight
  const margin = 6
  const pointerOffset = 1

  const minX = viewportLeft + margin
  const minY = viewportTop + margin
  const maxX = viewportLeft + viewportWidth - margin
  const maxY = viewportTop + viewportHeight - margin

  let x = clientX + pointerOffset
  let y = clientY + pointerOffset

  if (x + menuWidth > maxX) x = clientX - menuWidth - pointerOffset
  if (y + menuHeight > maxY) y = clientY - menuHeight - pointerOffset

  if (x + menuWidth > maxX) x = maxX - menuWidth
  if (y + menuHeight > maxY) y = maxY - menuHeight

  x = Math.max(minX, x)
  y = Math.max(minY, y)

  if (boundsRect) {
    return {
      x: x - boundsRect.left,
      y: y - boundsRect.top,
    }
  }

  return { x, y }
}

function calcSubmenuPos(parentRect, menuWidth, menuHeight, boundsRect = null) {
  const viewport = window.visualViewport
  const viewportLeft = viewport?.offsetLeft ?? 0
  const viewportTop = viewport?.offsetTop ?? 0
  const viewportWidth = viewport?.width ?? window.innerWidth
  const viewportHeight = viewport?.height ?? window.innerHeight
  const margin = 8
  const overlap = 2

  const minX = viewportLeft + margin
  const minY = viewportTop + margin
  const maxX = viewportLeft + viewportWidth - margin
  const maxY = viewportTop + viewportHeight - margin

  let x = parentRect.right - overlap
  let y = parentRect.top

  if (parentRect.right + menuWidth > maxX) x = parentRect.left - menuWidth + overlap
  if (y + menuHeight > maxY) y = maxY - menuHeight

  x = Math.max(minX, Math.min(x, maxX - menuWidth))
  y = Math.max(minY, y)

  if (boundsRect) {
    return {
      x: x - boundsRect.left,
      y: y - boundsRect.top,
    }
  }

  return { x, y }
}

function createContextMenuState() {
  return {
    visible: false,
    x: 0,
    y: 0,
    anchorX: 0,
    anchorY: 0,
    entry: null,
    contextType: 'file',
    positioned: false,
  }
}

const MARQUEE_THRESHOLD_PX = 4
const MARQUEE_EDGE_SCROLL_PX = 34
const MARQUEE_SCROLL_STEP_PX = 18

function rectsIntersect(a, b) {
  return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top
}

// ─── Highlight match helper ───────────────────────────────────────────────────
function HighlightMatch({ text, query }) {
  if (!query) return <span>{text}</span>
  // Prefix-only highlighting: only highlight if text starts with query
  const textLower = text.toLowerCase()
  const queryLower = query.toLowerCase()
  if (!textLower.startsWith(queryLower)) return <span>{text}</span>
  return (
    <span>
      <span style={{ background: 'rgba(167,139,250,0.35)', borderRadius: 3, padding: '0 1px', color: '#e9d5ff' }}>
        {text.slice(0, query.length)}
      </span>
      {text.slice(query.length)}
    </span>
  )
}

const FileTypeIcon = React.memo(function FileTypeIcon({ ext, size = 42, nativeSrc = null, alt = 'File' }) {
  const [nativeFailed, setNativeFailed] = useState(false)
  const meta = getFileTypeMeta(ext)
  const glyphSize = Math.max(12, Math.round(size * 0.38))
  const labelSize = Math.max(6, Math.round(size * 0.18))
  const corner = Math.max(4, Math.round(size * 0.16))
  const Icon = meta.Icon

  if (nativeSrc && !nativeFailed) {
    return (
      <img
        src={nativeSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={() => setNativeFailed(true)}
        style={{
          width: size, height: size, objectFit: 'contain',
        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.22))',
          transition: 'opacity 0.15s ease, transform 0.15s ease',
        }}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      style={{
        width: size, height: size, position: 'relative', display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center', borderRadius: corner,
        background: `linear-gradient(145deg, rgba(255,255,255,0.95), rgba(226,232,240,0.92))`,
        boxShadow: '0 8px 16px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.8)',
        overflow: 'hidden',
      }}
    >
      <span style={{
        position: 'absolute', top: 0, right: 0, width: size * 0.28, height: size * 0.28,
        background: 'linear-gradient(135deg, rgba(148,163,184,0.55), rgba(255,255,255,0.95))',
        clipPath: 'polygon(100% 0, 0 0, 100% 100%)',
      }} />
      <span style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: size * 0.34,
        background: `linear-gradient(90deg, ${meta.color}, ${meta.accent})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: labelSize, fontWeight: 800, letterSpacing: '0.4px',
        textShadow: '0 1px 2px rgba(0,0,0,0.35)',
      }}>
        {meta.label}
      </span>
      <Icon size={glyphSize} color={meta.color} strokeWidth={2.2} style={{ marginBottom: size * 0.16 }} />
    </span>
  )
})

const ImageThumbnail = React.memo(function ImageThumbnail({ src, alt, size = 42, radius = 10, fallbackExt = '', metadata = '' }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])

  if (!src || failed) {
    return <FileTypeIcon ext={fallbackExt} size={size} alt={alt} />
  }

  return (
    <div style={{
      position: 'relative', width: size, height: size, borderRadius: radius,
      overflow: 'hidden', background: 'rgba(15,23,42,0.90)',
      boxShadow: '0 16px 28px rgba(0,0,0,0.22), inset 0 0 0 1px rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        style={{
          width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center',
          display: 'block', imageRendering: 'auto',
          transform: 'scale(1)', transition: 'transform 0.25s ease, opacity 0.2s ease',
          willChange: 'auto',
        }}
      />
      {metadata ? (
        <span style={{
          position: 'absolute', left: 10, bottom: 10,
          padding: '4px 8px', borderRadius: 999,
          fontSize: 10, fontWeight: 600, color: '#f8fafc',
          background: 'rgba(15,23,42,0.72)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.10)',
          whiteSpace: 'nowrap',
        }}>{metadata}</span>
      ) : null}
    </div>
  )
})

const GridImageThumbnail = React.memo(function GridImageThumbnail({ src, alt, radius = 14, fallbackExt = '', metadata = '' }) {
  return (
    <div style={{
      width: '100%', minHeight: 80, height: 80,
      borderRadius: radius, overflow: 'hidden', position: 'relative',
      background: 'rgba(15,23,42,0.90)',
      boxShadow: '0 14px 26px rgba(0,0,0,0.20), inset 0 0 0 1px rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      {src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={(event) => { event.currentTarget.style.display = 'none' }}
          style={{
            width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center',
            display: 'block', imageRendering: 'auto',
            transition: 'transform 0.32s ease, opacity 0.2s ease',
            willChange: 'auto',
            filter: 'saturate(1.08) contrast(1.02)',
          }}
        />
      ) : null}
      {metadata ? (
        <span style={{
          position: 'absolute', left: 10, bottom: 10,
          padding: '4px 8px', borderRadius: 999,
          fontSize: 10, fontWeight: 600, color: '#f8fafc',
          background: 'rgba(15,23,42,0.72)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.10)',
          whiteSpace: 'nowrap',
        }}>{metadata}</span>
      ) : null}
      {!src && (
        <div style={{
          width: '100%', height: '100%', display: 'grid', placeItems: 'center',
          color: '#94a3b8', fontSize: 11, textTransform: 'uppercase',
          letterSpacing: '0.06em', fontWeight: 700,
        }}>
          {fallbackExt.replace('.', '') || 'IMG'}
        </div>
      )}
    </div>
  )
})

const FileVisual = React.memo(function FileVisual({ entry, iconCache = {}, size = 42, radius = 10 }) {
  const ext = getEntryExt(entry)
  const path = safePath(entry?.path)
  const isImage = IMAGE_PREVIEW_EXTS.includes(ext)
  if (isImage) {
    return <ImageThumbnail src={resolvePreviewSrc(path)} alt={safeName(entry?.name)} size={size} radius={radius} fallbackExt={ext} />
  }
  return <FileTypeIcon ext={ext} nativeSrc={iconCache?.[path]} alt={safeName(entry?.name)} size={size} />
})

function PdfPreview({ entry }) {
  const frameRef = useRef(null)
  const canvasRef = useRef(null)
  const renderTaskRef = useRef(null)
  const pdfTaskRef = useRef(null)
  const [status, setStatus] = useState('idle')
  const [frameSize, setFrameSize] = useState({ width: 212, height: 300 })

  useLayoutEffect(() => {
    const node = frameRef.current
    if (!node) return undefined

    const updateSize = () => {
      const rect = node.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        setFrameSize({ width: Math.floor(rect.width), height: Math.floor(rect.height) })
      }
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let cancelled = false
    const canvas = canvasRef.current
    const path = safePath(entry?.path)

    async function renderPdf() {
      if (!canvas || !path || !isElectron || !window.arcadeOS?.fs?.readFileBuffer) {
        setStatus('error')
        return
      }
      setStatus('loading')
      try {
        renderTaskRef.current?.cancel?.()
        pdfTaskRef.current?.destroy?.()
        const bytes = await window.arcadeOS.fs.readFileBuffer(path)
        if (cancelled || !bytes) return
        const data = bytes instanceof Uint8Array
          ? bytes
          : bytes instanceof ArrayBuffer
            ? new Uint8Array(bytes)
            : Array.isArray(bytes?.data)
              ? new Uint8Array(bytes.data)
              : new Uint8Array(bytes)
        const loadingTask = pdfjsLib.getDocument({ data, disableAutoFetch: true, disableStream: true })
        pdfTaskRef.current = loadingTask
        const pdf = await loadingTask.promise
        if (cancelled) return
        const page = await pdf.getPage(1)
        if (cancelled) return
        const baseViewport = page.getViewport({ scale: 1 })
        const maxWidth = Math.max(180, frameSize.width - 20)
        const maxHeight = Math.max(220, frameSize.height - 20)
        const fitScale = Math.min(maxWidth / baseViewport.width, maxHeight / baseViewport.height)
        const scale = Math.min(Math.max(fitScale, 0.42), 1.85)
        const viewport = page.getViewport({ scale })
        const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1.5), 2.75)
        const ctx = canvas.getContext('2d', { alpha: false })
        canvas.width = Math.floor(viewport.width * dpr)
        canvas.height = Math.floor(viewport.height * dpr)
        canvas.style.width = `${Math.floor(viewport.width)}px`
        canvas.style.height = `${Math.floor(viewport.height)}px`
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, viewport.width, viewport.height)
        const renderTask = page.render({ canvasContext: ctx, viewport })
        renderTaskRef.current = renderTask
        await renderTask.promise
        if (!cancelled) setStatus('ready')
      } catch (err) {
        if (!cancelled && err?.name !== 'RenderingCancelledException') setStatus('error')
      }
    }

    renderPdf()

    return () => {
      cancelled = true
      renderTaskRef.current?.cancel?.()
      pdfTaskRef.current?.destroy?.()
      renderTaskRef.current = null
      pdfTaskRef.current = null
      if (canvas) {
        canvas.width = 0
        canvas.height = 0
      }
    }
  }, [entry?.path, frameSize.width, frameSize.height])

  return (
    <div ref={frameRef} style={{
      width: '100%', height: 'clamp(250px, 34vh, 360px)', marginBottom: 8, borderRadius: 12,
      background: 'linear-gradient(145deg, rgba(15,23,42,0.92), rgba(2,6,23,0.92))',
      border: '1px solid rgba(148,163,184,0.18)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      padding: 10, boxSizing: 'border-box',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
    }}>
      {status === 'loading' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#c4b5fd', fontSize: 11 }}>
          <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
          Rendering PDF...
        </div>
      )}
      {status === 'error' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 11 }}>
          <FileTypeIcon ext=".pdf" size={52} />
          Preview unavailable
        </div>
      )}
      <canvas
        ref={canvasRef}
        aria-label="PDF first page preview"
        style={{
          display: status === 'ready' ? 'block' : 'none',
          maxWidth: '100%', maxHeight: '100%', borderRadius: 8,
          background: '#fff',
          boxShadow: '0 14px 28px rgba(0,0,0,0.42), 0 0 0 1px rgba(15,23,42,0.14)',
          transition: 'opacity 0.16s ease, transform 0.16s ease',
        }}
      />
    </div>
  )
}

function PreviewImage({ preview, entry }) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 })
  useEffect(() => setFailed(false), [preview?.src])
  useEffect(() => {
    setLoaded(false)
    setNaturalSize({ width: 0, height: 0 })
  }, [preview?.src])

  const aspect = naturalSize.width && naturalSize.height ? naturalSize.width / naturalSize.height : 1
  const previewHeight = aspect < 0.78
    ? 'clamp(260px, 38vh, 410px)'
    : aspect > 1.35
      ? 'clamp(180px, 26vh, 280px)'
      : 'clamp(220px, 32vh, 340px)'

  if (failed) {
    return (
      <div style={{
        width: '100%', height: 'clamp(220px, 32vh, 340px)', marginBottom: 8, borderRadius: 12,
        background: 'rgba(15,23,42,0.78)', border: '1px solid rgba(148,163,184,0.16)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <FileTypeIcon ext={getEntryExt(entry)} size={46} />
      </div>
    )
  }

  return (
    <div style={{
      width: '100%', height: previewHeight, marginBottom: 8, borderRadius: 12,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', position: 'relative',
      background: `
        linear-gradient(45deg, rgba(148,163,184,0.08) 25%, transparent 25%),
        linear-gradient(-45deg, rgba(148,163,184,0.08) 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, rgba(148,163,184,0.08) 75%),
        linear-gradient(-45deg, transparent 75%, rgba(148,163,184,0.08) 75%),
        rgba(2,6,23,0.45)
      `,
      backgroundSize: '18px 18px',
      backgroundPosition: '0 0, 0 9px, 9px -9px, -9px 0',
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
    }}>
      {!loaded && (
        <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', gap: 7, color: '#c4b5fd', fontSize: 11 }}>
          <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
          Loading image...
        </div>
      )}
      <img
        src={preview.src}
        alt={entry?.name || 'Preview'}
        loading="lazy"
        decoding="async"
        onLoad={(event) => {
          setNaturalSize({
            width: event.currentTarget.naturalWidth,
            height: event.currentTarget.naturalHeight,
          })
          setLoaded(true)
        }}
        onError={() => setFailed(true)}
        style={{
          width: '100%', height: '100%', borderRadius: 12,
          objectFit: 'contain', objectPosition: 'center',
          imageRendering: 'auto',
          opacity: loaded ? 1 : 0,
          transform: loaded ? 'scale(1)' : 'scale(0.985)',
          transition: 'opacity 0.16s ease, transform 0.16s ease',
        }}
      />
    </div>
  )
}

// ─── GridCard ─────────────────────────────────────────────────────────────────
const GridCard = React.memo(function GridCard({
  entry, isSelected, onEntryClick, onOpen,
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
  const entryExt = getEntryExt(safeEntry)
  const entrySize = Number(safeEntry.size || 0)
  const entryIsDirectory = Boolean(safeEntry.isDirectory)
  const exec = isExecFn(safeEntry)
  const likelyGame = exec && isGamePathFn(safeEntry)
  const folderStyle = getFolderStyle(safeEntry, hovered, pressed, recentPaths)

  useEffect(() => {
    if (entryPath && !entryIsDirectory) loadIcon?.(safeEntry)
  }, [entryPath, entryIsDirectory])

  const isImageEntry = !entryIsDirectory && IMAGE_PREVIEW_EXTS.includes(entryExt)
  const imageLabel = isImageEntry && entrySize > 0 ? formatSize(entrySize) : ''
  const cardStyle = {
    position: 'relative', borderRadius: 16,
    padding: isImageEntry ? '12px 14px 12px' : '18px 14px 14px',
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
    backdropFilter: 'blur(8px)',
    cursor: 'pointer',
    transition: 'background 0.15s ease, border 0.15s ease, transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s ease',
    transform: pressed ? 'translateY(-1px) scale(0.97)' : hovered ? 'translateY(-4px) scale(1.03)' : 'translateY(0) scale(1)',
    boxShadow: isSelected
      ? '0 6px 20px rgba(124,58,237,0.3), inset 0 1px 0 rgba(255,255,255,0.05)'
      : hovered
        ? '0 8px 24px rgba(124,58,237,0.25), inset 0 1px 0 rgba(255,255,255,0.04)'
        : '0 2px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
    display: 'flex', flexDirection: 'column', alignItems: isImageEntry ? 'stretch' : 'center', gap: isImageEntry ? 6 : 8,
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
      data-file-path={entryPath}
      style={cardStyle}
      onClick={(event) => onEntryClick(safeEntry, event)}
      onDoubleClick={() => onOpen(safeEntry)}
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
        ) : isImageEntry ? (
          <GridImageThumbnail
            src={resolvePreviewSrc(entryPath)}
            alt={entryName}
            radius={14}
            fallbackExt={entryExt}
            metadata={imageLabel}
          />
        ) : (
          <FileVisual entry={safeEntry} iconCache={iconCache} size={42} radius={10} />
        )}
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
          fontSize: isImageEntry ? 11 : 12, color: entryIsDirectory ? '#e2d9f3' : '#cbd5e1',
          textAlign: 'center', width: '100%', overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          fontWeight: entryIsDirectory ? 500 : 400, lineHeight: 1.3,
        }}>
          <HighlightMatch text={entryName} query={searchQuery} />
        </span>
      )}
      {!entryIsDirectory && entrySize > 0 && !isImageEntry && (
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
    <div data-explorer-scroll-surface="true" style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))',
      gap: 14, padding: 16, overflowY: 'auto', flex: 1, alignContent: 'start',
      contain: 'layout style paint',
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
              onEntryClick={onEntryClick}
              onOpen={onOpen}
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
  const addGame = useStore(state => state.addGame)
  const addApp = useStore(state => state.addApp)
  const initExplorer = useFileExplorerStore(state => state.initExplorer)
  const navigateTo = useFileExplorerStore(state => state.navigateTo)
  const refreshCurrentDirectory = useFileExplorerStore(state => state.refreshCurrentDirectory)
  const goBack = useFileExplorerStore(state => state.goBack)
  const goForward = useFileExplorerStore(state => state.goForward)
  const goUp = useFileExplorerStore(state => state.goUp)
  const createFolder = useFileExplorerStore(state => state.createFolder)
  const renameEntry = useFileExplorerStore(state => state.renameEntry)
  const deleteEntries = useFileExplorerStore(state => state.deleteEntries)
  const duplicateEntry = useFileExplorerStore(state => state.duplicateEntry)
  const pasteInto = useFileExplorerStore(state => state.pasteInto)
  const moveEntry = useFileExplorerStore(state => state.moveEntry)
  const setClipboard = useFileExplorerStore(state => state.setClipboard)
  const setViewMode = useFileExplorerStore(state => state.setViewMode)
  const setSidebarCollapsed = useFileExplorerStore(state => state.setSidebarCollapsed)
  const setSidebarWidth = useFileExplorerStore(state => state.setSidebarWidth)
  const currentPath = useFileExplorerStore(state => state.currentPath)
  const entries = useFileExplorerStore(state => state.directoryMap[safePath(state.currentPath)] || [])
  const history = useFileExplorerStore(state => state.history)
  const historyIndex = useFileExplorerStore(state => state.historyIndex)
  const loading = useFileExplorerStore(state => state.loading)
  const drives = useFileExplorerStore(state => state.drives)
  const error = useFileExplorerStore(state => state.error)
  const viewMode = useFileExplorerStore(state => state.viewMode)
  const clipboard = useFileExplorerStore(state => state.clipboard)
  const sidebarCollapsed = useFileExplorerStore(state => state.sidebarCollapsed)
  const systemPaths = useFileExplorerStore(state => state.systemPaths)
  const recentDirs = useFileExplorerStore(state => state.recentDirs)
  const sidebarWidth = useFileExplorerStore(state => state.sidebarWidth)
  // Multi-selection: Set of paths
  const [selectedPaths, setSelectedPaths] = useState(new Set())
  const [lastSelectedIndex, setLastSelectedIndex] = useState(-1)
  const [closingPreviewEntry, setClosingPreviewEntry] = useState(null)
  const [previewPanelClosing, setPreviewPanelClosing] = useState(false)
  const [contextMenu, setContextMenu] = useState(() => createContextMenuState())
  const [sortSubmenu, setSortSubmenu] = useState({ visible: false, x: 0, y: 0 })
  const [renamingPath, setRenamingPath] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [iconCache, setIconCache] = useState({})
  const iconRequestsRef = useRef(new Set())
  const previewCloseTimerRef = useRef(null)
  const sortSubmenuCloseTimerRef = useRef(null)
  const contextMenuRef = useRef(null)
  const sortMenuItemRef = useRef(null)
  const sortSubmenuRef = useRef(null)
  const containerRef = useRef(null)
  const contentAreaRef = useRef(null)
  const marqueeBoxRef = useRef(null)
  const marqueeStateRef = useRef(null)
  const marqueeRafRef = useRef(null)
  const suppressEmptyClickRef = useRef(false)
  const selectedPathsRef = useRef(selectedPaths)
  const displayEntriesRef = useRef([])
  const lastSelectedIndexRef = useRef(lastSelectedIndex)

  // Search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const searchTimerRef = useRef(null)
  const searchInputRef = useRef(null)

  // Sorting
  const [sortBy, setSortBy] = useState('name')
  const [sortDir, setSortDir] = useState('asc')

  // Drag state
  const [dragOver, setDragOver] = useState(null)

  // ── Sidebar resize state ───────────────────────────────────────────────────
  const sidebarResizing = useRef(false)
  const sidebarResizeStartX = useRef(0)
  const sidebarResizeStartWidth = useRef(SIDEBAR_DEFAULT_WIDTH)
  const sidebarWidthRef = useRef(SIDEBAR_DEFAULT_WIDTH)
  const rafRef = useRef(null)

  // ── useFolderIcons ─────────────────────────────────────────────────────────
  const { assignIcon, removeIcon, reloadIcons, getIcon, isTransitioning } = useFolderIcons()

  useEffect(() => {
    selectedPathsRef.current = selectedPaths
  }, [selectedPaths])

  useEffect(() => {
    lastSelectedIndexRef.current = lastSelectedIndex
  }, [lastSelectedIndex])

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
    initExplorer()
  }, [initExplorer])

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (marqueeRafRef.current) cancelAnimationFrame(marqueeRafRef.current)
      if (previewCloseTimerRef.current) clearTimeout(previewCloseTimerRef.current)
      if (sortSubmenuCloseTimerRef.current) clearTimeout(sortSubmenuCloseTimerRef.current)
      window.removeEventListener('pointermove', handleMarqueePointerMove)
      window.removeEventListener('pointerup', handleMarqueePointerUp)
      window.removeEventListener('mousemove', handleMarqueePointerMove)
      window.removeEventListener('mouseup', handleMarqueePointerUp)
      window.removeEventListener('blur', handleMarqueeWindowBlur)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
  }, [])

  // ── Navigate ───────────────────────────────────────────────────────────────
  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth
  }, [sidebarWidth])

  useLayoutEffect(() => {
    if (!contextMenu.visible || !contextMenuRef.current) return

    const rect = contextMenuRef.current.getBoundingClientRect()
    const boundsRect = containerRef.current?.getBoundingClientRect() || null
    const { x, y } = calcContextMenuPos(
      contextMenu.anchorX,
      contextMenu.anchorY,
      rect.width,
      rect.height,
      boundsRect,
    )

    setContextMenu((prev) => {
      if (!prev.visible) return prev
      if (prev.positioned && prev.x === x && prev.y === y) return prev
      return { ...prev, x, y, positioned: true }
    })
  }, [
    contextMenu.visible,
    contextMenu.anchorX,
    contextMenu.anchorY,
    contextMenu.contextType,
    contextMenu.entry,
  ])

  useEffect(() => {
    if (!contextMenu.visible) return

    const updateMenuPosition = () => {
      if (!contextMenuRef.current) return
      const rect = contextMenuRef.current.getBoundingClientRect()
      const boundsRect = containerRef.current?.getBoundingClientRect() || null
      const { x, y } = calcContextMenuPos(contextMenu.anchorX, contextMenu.anchorY, rect.width, rect.height, boundsRect)
      setContextMenu((prev) => (
        prev.visible ? { ...prev, x, y, positioned: true } : prev
      ))
    }

    const handleViewportChange = () => {
      window.requestAnimationFrame(updateMenuPosition)
    }

    window.addEventListener('resize', handleViewportChange)
    window.visualViewport?.addEventListener('resize', handleViewportChange)
    window.visualViewport?.addEventListener('scroll', handleViewportChange)

    return () => {
      window.removeEventListener('resize', handleViewportChange)
      window.visualViewport?.removeEventListener('resize', handleViewportChange)
      window.visualViewport?.removeEventListener('scroll', handleViewportChange)
    }
  }, [contextMenu.visible, contextMenu.anchorX, contextMenu.anchorY])

  useEffect(() => {
    setSelectedPaths(new Set())
    setLastSelectedIndex(-1)
    setSearchQuery('')
    setSearchResults(null)
  }, [currentPath])

  // ── Sort ───────────────────────────────────────────────────────────────────
  const handleSort = useCallback((field, options = {}) => {
    setSortBy(prev => {
      if (prev === field) {
        if (!options.preserveDirection) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        return field
      }
      if (!options.preserveDirection) setSortDir('asc')
      return field
    })
  }, [])

  const closeSortSubmenu = useCallback(() => {
    if (sortSubmenuCloseTimerRef.current) clearTimeout(sortSubmenuCloseTimerRef.current)
    setSortSubmenu(prev => prev.visible ? { ...prev, visible: false } : prev)
  }, [])

  const scheduleSortSubmenuClose = useCallback(() => {
    if (sortSubmenuCloseTimerRef.current) clearTimeout(sortSubmenuCloseTimerRef.current)
    sortSubmenuCloseTimerRef.current = setTimeout(() => {
      const parentHovered = Boolean(contextMenuRef.current?.matches(':hover'))
      const submenuHovered = Boolean(sortSubmenuRef.current?.matches(':hover'))
      if (!parentHovered && !submenuHovered) closeSortSubmenu()
    }, 120)
  }, [closeSortSubmenu])

  const cancelSortSubmenuClose = useCallback(() => {
    if (sortSubmenuCloseTimerRef.current) clearTimeout(sortSubmenuCloseTimerRef.current)
  }, [])

  const updateSortSubmenuPosition = useCallback(() => {
    if (!sortMenuItemRef.current) return
    const rect = sortMenuItemRef.current.getBoundingClientRect()
    const measuredHeight = sortSubmenuRef.current?.getBoundingClientRect().height || SORT_SUBMENU_FALLBACK_HEIGHT
    const boundsRect = containerRef.current?.getBoundingClientRect() || null
    const { x, y } = calcSubmenuPos(rect, SORT_SUBMENU_WIDTH, measuredHeight, boundsRect)
    setSortSubmenu(prev => (
      prev.visible && prev.x === x && prev.y === y ? prev : { visible: true, x, y }
    ))
  }, [])

  const openSortSubmenu = useCallback(() => {
    if (viewMode !== 'grid' || contextMenu.contextType !== 'background') return
    cancelSortSubmenuClose()
    updateSortSubmenuPosition()
  }, [cancelSortSubmenuClose, contextMenu.contextType, updateSortSubmenuPosition, viewMode])

  useLayoutEffect(() => {
    if (!sortSubmenu.visible) return
    updateSortSubmenuPosition()
  }, [contextMenu.x, contextMenu.y, sortSubmenu.visible, updateSortSubmenuPosition])

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

  useEffect(() => {
    displayEntriesRef.current = displayEntries
  }, [displayEntries])

  // ── Search ─────────────────────────────────────────────────────────────────
  // STRICT REFINEMENT: Current directory only, prefix-only matching, instant filter
  // - No recursive traversal (CRITICAL: never read child directories)
  // - No async operations (lightweight in-memory filter)
  // - Prefix-only matching: case-insensitive startsWith behavior
  // - Operates exclusively on visible current directory items
  // - Excludes hidden files already handled by cleanEntries
  const doSearch = useCallback((query, rootEntries, rootPath) => {
    if (!query.trim()) { setSearchResults(null); setSearchLoading(false); return }
    setSearchLoading(true)
    
    // Lightweight prefix-only filter
    const q = query.toLowerCase()
    const results = rootEntries.filter(e => {
      if (!e || typeof e !== 'object') return false
      const name = safeName(e.name).toLowerCase()
      // STRICT PREFIX MATCHING ONLY: startsWith behavior
      return name.startsWith(q)
    })

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
    const currentEntries = displayEntriesRef.current
    const lastIndex = lastSelectedIndexRef.current
    const path = safePath(entry.path)
    const idx = currentEntries.findIndex(en => safePath(en?.path) === path)
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
    } else if (isShift && lastIndex >= 0) {
      const from = Math.min(lastIndex, idx)
      const to = Math.max(lastIndex, idx)
      const range = currentEntries.slice(from, to + 1).map(en => safePath(en?.path))
      setSelectedPaths(new Set(range))
    } else {
      setSelectedPaths(new Set([path]))
      setLastSelectedIndex(idx)
    }
  }, [])

  const handleOpen = useCallback((entry) => {
    if (!entry || typeof entry !== 'object') return
    if (entry.isDirectory) navigateTo(safePath(entry.path))
    else openFile(entry)
  }, [navigateTo, openFile])

  // ── Context menu ───────────────────────────────────────────────────────────
  const closeContextMenu = useCallback(() => {
    if (sortSubmenuCloseTimerRef.current) clearTimeout(sortSubmenuCloseTimerRef.current)
    setContextMenu(createContextMenuState())
    setSortSubmenu({ visible: false, x: 0, y: 0 })
  }, [])

  const handleGridSortField = useCallback((field) => {
    handleSort(field, { preserveDirection: true })
    closeContextMenu()
  }, [closeContextMenu, handleSort])

  const handleGridSortDirection = useCallback((direction) => {
    setSortDir(direction)
    closeContextMenu()
  }, [closeContextMenu])

  const handleContextMenu = useCallback((entry, event) => {
    if (!entry || typeof entry !== 'object') return
    event.preventDefault()
    const menuWidth = 192
    const menuHeight = entry?.isDirectory ? 320 : 280
    const boundsRect = containerRef.current?.getBoundingClientRect() || null
    const { x, y } = calcContextMenuPos(event.clientX, event.clientY, menuWidth, menuHeight, boundsRect)
    const path = safePath(entry.path)
    if (!selectedPaths.has(path)) setSelectedPaths(new Set([path]))
    setSortSubmenu({ visible: false, x: 0, y: 0 })
    setContextMenu({
      visible: true,
      x,
      y,
      anchorX: event.clientX,
      anchorY: event.clientY,
      entry,
      contextType: 'file',
      positioned: false,
    })
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
    const menuHeight = 200
    const boundsRect = containerRef.current?.getBoundingClientRect() || null
    const { x, y } = calcContextMenuPos(event.clientX, event.clientY, menuWidth, menuHeight, boundsRect)
    setSortSubmenu({ visible: false, x: 0, y: 0 })
    setContextMenu({
      visible: true,
      x,
      y,
      anchorX: event.clientX,
      anchorY: event.clientY,
      entry: null,
      contextType: 'background',
      positioned: false,
    })
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

  const confirmRename = useCallback(async () => {
    if (!renamingPath) return
    const entry = entries.find(item => safePath(item?.path) === renamingPath)
    if (!entry) {
      setRenamingPath(null)
      setRenameValue('')
      return
    }

    const ext = entry?.isDirectory ? '' : safeExt(entry?.ext)
    const value = String(renameValue || '').trim()
    const currentName = safeName(entry?.name)
    const updatedName = !value ? currentName : (ext && !value.toLowerCase().endsWith(ext.toLowerCase()) ? `${value}${ext}` : value)

    try {
      const result = await renameEntry(renamingPath, updatedName)
      if (result?.isDirectory) await reloadIcons()
      setSelectedPaths(new Set(result?.path ? [safePath(result.path)] : []))
    } catch {}

    setRenamingPath(null)
    setRenameValue('')
  }, [entries, renamingPath, renameValue, renameEntry, reloadIcons])

  const cancelRename = useCallback(() => {
    setRenamingPath(null)
    setRenameValue('')
    closeContextMenu()
  }, [closeContextMenu])

  // ── File operations (frontend-only) ───────────────────────────────────────
  const handleCopy = useCallback(() => {
    const paths = selectedPaths.size > 0 ? selectedPaths : (contextMenu.entry ? new Set([safePath(contextMenu.entry.path)]) : new Set())
    if (!paths.size) return
    setClipboard({ type: 'copy', paths: Array.from(paths) })
    closeContextMenu()
  }, [selectedPaths, contextMenu.entry, closeContextMenu])

  const handleNewFolder = useCallback(async () => {
    closeContextMenu()
    try {
      const newEntry = await createFolder(currentPath, 'New Folder')
      const nextPath = safePath(newEntry?.path)
      setRenamingPath(nextPath)
      setRenameValue(safeName(newEntry?.name))
      setSelectedPaths(new Set(nextPath ? [nextPath] : []))
    } catch {}
  }, [createFolder, currentPath, closeContextMenu])

  const handleDelete = useCallback(async () => {
    const paths = selectedPaths.size > 0 ? selectedPaths : (contextMenu.entry ? new Set([safePath(contextMenu.entry.path)]) : new Set())
    if (!paths.size) return
    closeContextMenu()
    try {
      await deleteEntries(Array.from(paths))
      await reloadIcons()
    } catch {}
    setSelectedPaths(new Set())
  }, [selectedPaths, contextMenu.entry, closeContextMenu, deleteEntries, reloadIcons])

  const handleDuplicate = useCallback(async () => {
    const entry = contextMenu.entry
    closeContextMenu()
    if (!entry) return
    try {
      await duplicateEntry(safePath(entry.path))
      if (entry.isDirectory) await reloadIcons()
    } catch {}
  }, [contextMenu.entry, closeContextMenu, duplicateEntry, reloadIcons])

  const handlePaste = useCallback(async () => {
    if (!clipboard || clipboard.paths.length === 0) return
    closeContextMenu()
    try {
      const results = await pasteInto(currentPath)
      if (results.some(result => result?.isDirectory)) await reloadIcons()
    } catch {}
  }, [clipboard, currentPath, closeContextMenu, pasteInto, reloadIcons])

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

  const displayEntryIndexMap = useMemo(() => {
    const map = new Map()
    displayEntries.forEach((entry, idx) => map.set(safePath(entry?.path), idx))
    return map
  }, [displayEntries])

  const selectedEntry = useMemo(() => {
    if (selectedPaths.size !== 1) return null
    const [p] = selectedPaths
    return displayEntries.find(e => safePath(e?.path) === p) || null
  }, [displayEntries, selectedPaths])

  useEffect(() => {
    if (!selectedEntry) return
    if (previewCloseTimerRef.current) clearTimeout(previewCloseTimerRef.current)
    previewCloseTimerRef.current = null
    setClosingPreviewEntry(null)
    setPreviewPanelClosing(false)
  }, [selectedEntry])

  const collapsePreviewFromEmptySpace = useCallback(() => {
    if (!selectedEntry && selectedPaths.size === 0) return
    if (previewCloseTimerRef.current) clearTimeout(previewCloseTimerRef.current)
    if (selectedEntry) {
      setClosingPreviewEntry(selectedEntry)
      setPreviewPanelClosing(true)
      previewCloseTimerRef.current = setTimeout(() => {
        setClosingPreviewEntry(null)
        setPreviewPanelClosing(false)
        previewCloseTimerRef.current = null
      }, 150)
    }
    setSelectedPaths(new Set())
    setLastSelectedIndex(-1)
  }, [selectedEntry, selectedPaths.size])

  const resetMarqueeVisual = useCallback(() => {
    const box = marqueeBoxRef.current
    if (!box) return
    box.style.opacity = '0'
    box.style.transform = 'translate3d(0, 0, 0)'
    box.style.width = '0px'
    box.style.height = '0px'
  }, [])

  const finishMarqueeSelection = useCallback((options = {}) => {
    if (marqueeRafRef.current) {
      cancelAnimationFrame(marqueeRafRef.current)
      marqueeRafRef.current = null
    }
    const state = marqueeStateRef.current
    marqueeStateRef.current = null
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
    resetMarqueeVisual()
    window.removeEventListener('pointermove', handleMarqueePointerMove)
    window.removeEventListener('pointerup', handleMarqueePointerUp)
    window.removeEventListener('mousemove', handleMarqueePointerMove)
    window.removeEventListener('mouseup', handleMarqueePointerUp)
    window.removeEventListener('blur', handleMarqueeWindowBlur)
    if (state?.active && !options.cancelled) suppressEmptyClickRef.current = true
  }, [resetMarqueeVisual])

  function handleMarqueeWindowBlur() {
    finishMarqueeSelection({ cancelled: true })
  }

  function handleMarqueePointerUp() {
    finishMarqueeSelection()
  }

  function handleMarqueePointerMove(event) {
    const state = marqueeStateRef.current
    if (!state) return
    state.lastClientX = event.clientX
    state.lastClientY = event.clientY
    if (!marqueeRafRef.current) {
      marqueeRafRef.current = requestAnimationFrame(updateMarqueeSelection)
    }
  }

  const updateMarqueeSelection = useCallback(() => {
    marqueeRafRef.current = null
    const state = marqueeStateRef.current
    const scrollSurface = state?.scrollSurface
    const box = marqueeBoxRef.current
    if (!state || !scrollSurface || !box) return

    const surfaceRect = state.scrollSurfaceRect
    const contentAreaRect = state.contentAreaRect
    if (!surfaceRect || !contentAreaRect) return

    const dx = state.lastClientX - state.startClientX
    const dy = state.lastClientY - state.startClientY
    if (!state.active && Math.hypot(dx, dy) < MARQUEE_THRESHOLD_PX) return

    if (!state.active) {
      state.active = true
      state.bounds = Array.from(scrollSurface.querySelectorAll('.file-item[data-file-path]')).map((node) => {
        const rect = node.getBoundingClientRect()
        return {
          path: node.getAttribute('data-file-path'),
          left: rect.left - surfaceRect.left + scrollSurface.scrollLeft,
          top: rect.top - surfaceRect.top + scrollSurface.scrollTop,
          right: rect.right - surfaceRect.left + scrollSurface.scrollLeft,
          bottom: rect.bottom - surfaceRect.top + scrollSurface.scrollTop,
        }
      }).filter(item => item.path)
      closeContextMenu()
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'default'
    }

    if (state.lastClientY < surfaceRect.top + MARQUEE_EDGE_SCROLL_PX) {
      scrollSurface.scrollTop = Math.max(0, scrollSurface.scrollTop - MARQUEE_SCROLL_STEP_PX)
    } else if (state.lastClientY > surfaceRect.bottom - MARQUEE_EDGE_SCROLL_PX) {
      scrollSurface.scrollTop = Math.min(scrollSurface.scrollHeight, scrollSurface.scrollTop + MARQUEE_SCROLL_STEP_PX)
    }

    const clampedClientX = Math.max(surfaceRect.left, Math.min(state.lastClientX, surfaceRect.right))
    const clampedClientY = Math.max(surfaceRect.top, Math.min(state.lastClientY, surfaceRect.bottom))
    const currentX = clampedClientX - surfaceRect.left + scrollSurface.scrollLeft
    const currentY = clampedClientY - surfaceRect.top + scrollSurface.scrollTop
    const contentRect = {
      left: Math.min(state.startContentX, currentX),
      top: Math.min(state.startContentY, currentY),
      right: Math.max(state.startContentX, currentX),
      bottom: Math.max(state.startContentY, currentY),
    }

    const visualLeft = Math.min(state.startClientX, clampedClientX)
    const visualTop = Math.min(state.startClientY, clampedClientY)
    const visualRight = Math.max(state.startClientX, clampedClientX)
    const visualBottom = Math.max(state.startClientY, clampedClientY)

    box.style.opacity = '1'
    box.style.transform = `translate3d(${visualLeft - contentAreaRect.left}px, ${visualTop - contentAreaRect.top}px, 0)`
    box.style.width = `${Math.max(0, visualRight - visualLeft)}px`
    box.style.height = `${Math.max(0, visualBottom - visualTop)}px`

    const selected = []
    for (const item of state.bounds) {
      if (rectsIntersect(contentRect, item)) selected.push(item.path)
    }
    const next = state.additive ? new Set(state.baseSelection) : new Set()
    selected.forEach(path => next.add(path))
    const selectionKey = Array.from(next).sort().join('\n')
    if (selectionKey !== state.selectionKey) {
      state.selectionKey = selectionKey
      setSelectedPaths(next)
      const lastPath = selected[selected.length - 1]
      if (lastPath) setLastSelectedIndex(displayEntryIndexMap.get(lastPath) ?? -1)
    }

    if (state.active) marqueeRafRef.current = requestAnimationFrame(updateMarqueeSelection)
  }, [closeContextMenu, displayEntryIndexMap])

  const handleContentPointerDown = useCallback((event) => {
    if (marqueeStateRef.current) return
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey && event.target?.closest?.('.file-item')) return
    if (sidebarResizing.current || renamingPath) return
    const target = event.target
    if (!(target instanceof Element)) return
    if (target.closest(
      '.file-item, [data-preview-panel="true"], [data-context-menu="true"], [data-explorer-sidebar="true"], button, input, textarea, select, a, [role="button"], thead, th, .sidebar-resize-handle',
    )) return

    const scrollSurface = target.closest('[data-explorer-scroll-surface="true"]')
    if (!scrollSurface || !contentAreaRef.current?.contains(scrollSurface)) return
    const rect = scrollSurface.getBoundingClientRect()
    const hasVerticalScrollbar = scrollSurface.scrollHeight > scrollSurface.clientHeight
    const hasHorizontalScrollbar = scrollSurface.scrollWidth > scrollSurface.clientWidth
    const onVerticalScrollbar = hasVerticalScrollbar && event.clientX >= rect.right - 14
    const onHorizontalScrollbar = hasHorizontalScrollbar && event.clientY >= rect.bottom - 14
    if (onVerticalScrollbar || onHorizontalScrollbar) return

    event.preventDefault()
    suppressEmptyClickRef.current = false
    const contentAreaRect = contentAreaRef.current?.getBoundingClientRect()
    marqueeStateRef.current = {
      active: false,
      additive: event.ctrlKey || event.metaKey,
      baseSelection: new Set(selectedPathsRef.current),
      bounds: [],
      lastClientX: event.clientX,
      lastClientY: event.clientY,
      scrollSurface,
      selectionKey: null,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startContentX: event.clientX - rect.left + scrollSurface.scrollLeft,
      startContentY: event.clientY - rect.top + scrollSurface.scrollTop,
      scrollSurfaceRect: rect,
      contentAreaRect,
    }
    document.body.style.userSelect = 'none'
    if (supportsPointerEvents && typeof scrollSurface.setPointerCapture === 'function') {
      try { scrollSurface.setPointerCapture(event.pointerId) } catch (_) {}
    }
    window.addEventListener('pointermove', handleMarqueePointerMove, { passive: true })
    window.addEventListener('pointerup', handleMarqueePointerUp)
    if (!supportsPointerEvents) {
      window.addEventListener('mousemove', handleMarqueePointerMove, { passive: true })
      window.addEventListener('mouseup', handleMarqueePointerUp)
    }
    window.addEventListener('blur', handleMarqueeWindowBlur)
  }, [renamingPath])

  const handleContentEmptyClick = useCallback((event) => {
    if (suppressEmptyClickRef.current) {
      suppressEmptyClickRef.current = false
      return
    }
    if (event.defaultPrevented || event.button !== 0 || sidebarResizing.current) return
    const target = event.target
    if (!(target instanceof Element)) return
    if (target.closest(
      '.file-item, [data-preview-panel="true"], [data-context-menu="true"], [data-explorer-sidebar="true"], button, input, textarea, select, a, [role="button"], thead, th, .sidebar-resize-handle',
    )) return

    const scrollSurface = target.closest('[data-explorer-scroll-surface="true"]')
    if (scrollSurface) {
      const rect = scrollSurface.getBoundingClientRect()
      const hasVerticalScrollbar = scrollSurface.scrollHeight > scrollSurface.clientHeight
      const hasHorizontalScrollbar = scrollSurface.scrollWidth > scrollSurface.clientWidth
      const onVerticalScrollbar = hasVerticalScrollbar && event.clientX >= rect.right - 14
      const onHorizontalScrollbar = hasHorizontalScrollbar && event.clientY >= rect.bottom - 14
      if (onVerticalScrollbar || onHorizontalScrollbar) return
    }

    collapsePreviewFromEmptySpace()
  }, [collapsePreviewFromEmptySpace])

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
      if (!contextMenu.visible) return
      const inContextMenu = contextMenuRef.current?.contains(e.target)
      const inSortSubmenu = sortSubmenuRef.current?.contains(e.target)
      if (!inContextMenu && !inSortSubmenu) closeContextMenu()
    }
    const handlePointerDownCapture = (e) => {
      if (!contextMenu.visible) return
      const target = e.target
      if (!(target instanceof Node)) return
      const inContextMenu = contextMenuRef.current?.contains(target)
      const inSortSubmenu = sortSubmenuRef.current?.contains(target)
      if (!inContextMenu && !inSortSubmenu) closeContextMenu()
    }
    const handleScroll = () => { if (contextMenu.visible) closeContextMenu() }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('pointerdown', handlePointerDownCapture, true)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('pointerdown', handlePointerDownCapture, true)
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
    if (iconRequestsRef.current.has(entryPath)) return null
    iconRequestsRef.current.add(entryPath)
    try {
      const icon = await window.arcadeOS.fs.getFileIcon(entryPath)
      if (icon) { setIconCache(prev => prev?.[entryPath] ? prev : ({ ...prev, [entryPath]: icon })); return icon }
    } catch {
    } finally {
      iconRequestsRef.current.delete(entryPath)
    }
    return null
  }, [iconCache])

  useEffect(() => {
    if (!isElectron || !window.arcadeOS?.fs?.getFileIcon) return
    displayEntries.forEach(entry => {
      if (!entry?.isDirectory && !IMAGE_PREVIEW_EXTS.includes(getEntryExt(entry))) loadIcon(entry)
    })
  }, [displayEntries, loadIcon])

  const isExec = useCallback((entry) => EXEC_EXTS.includes(getEntryExt(entry)), [])
  const isGamePath = useCallback((entry) => GAME_KEYWORDS.some(k => safePath(entry?.path).toLowerCase().includes(k)), [])

  const breadcrumbs = safePath(currentPath).split('/').filter(Boolean)
  const recentPaths = history.slice(-3)

  const previewPanelEntry = selectedEntry || closingPreviewEntry
  const preview = useMemo(
    () => (previewPanelEntry && !previewPanelEntry.isDirectory ? getEntryPreview(previewPanelEntry) : null),
    [previewPanelEntry],
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

  const handleDrop = useCallback(async (e, targetPath) => {
    e.preventDefault()
    setDragOver(null)
    const srcPath = e.dataTransfer.getData('text/plain')
    if (!srcPath || !targetPath) return
    // Prevent circular nesting
    if (isCircularNesting(srcPath, targetPath)) return
    try {
      const result = await moveEntry(srcPath, targetPath)
      if (result?.isDirectory) await reloadIcons()
      setSelectedPaths(new Set(result?.path ? [safePath(result.path)] : []))
    } catch {}
  }, [isCircularNesting, moveEntry, reloadIcons])

  // ── Breadcrumb with dropdown ───────────────────────────────────────────────
  const [breadcrumbDropdown, setBreadcrumbDropdown] = useState(-1)

  return (
    <div
      ref={containerRef}
      onContextMenu={handleBackgroundContextMenu}
      style={{
        position: 'relative', height: '100%', display: 'flex', flexDirection: 'column',
        overflow: 'visible',
        background: 'transparent',
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
        background: 'transparent',
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
        <NavIconBtn onClick={refreshCurrentDirectory} enabled={!loading} title="Refresh">
          <RefreshCw size={13} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
        </NavIconBtn>

        {/* Breadcrumbs */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 3, overflow: 'hidden',
          padding: '5px 10px', borderRadius: 7,
          background: 'transparent', border: '1px solid rgba(124,58,237,0.18)', minWidth: 0,
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
          background: 'transparent',
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
          background: 'transparent', border: '1px solid rgba(124,58,237,0.2)',
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
          padding: '5px 16px', background: 'transparent',
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

      <div
        ref={contentAreaRef}
        onPointerDown={handleContentPointerDown}
        onMouseDown={handleContentPointerDown}
        onClick={handleContentEmptyClick}
        style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}
      >

        {/* ── Enhanced Sidebar ── */}
        <div data-explorer-sidebar="true" style={{
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
          <div data-explorer-scroll-surface="true" style={{ flex: 1, overflowY: 'auto', contain: 'strict' }}>
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
                  const entryExt = getEntryExt(entry)
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
                      data-file-path={entryPath}
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
                            ) : (
                              <FileVisual entry={entry} iconCache={iconCache} size={18} radius={4} />
                            )}
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
        <div
          ref={marqueeBoxRef}
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 0,
            height: 0,
            opacity: 0,
            pointerEvents: 'none',
            zIndex: 8,
            borderRadius: 7,
            border: '1px solid rgba(167,139,250,0.86)',
            background: 'linear-gradient(135deg, rgba(96,165,250,0.20), rgba(168,85,247,0.16))',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.08) inset, 0 0 16px rgba(124,58,237,0.28)',
            backdropFilter: 'blur(1.5px)',
            WebkitBackdropFilter: 'blur(1.5px)',
            willChange: 'transform, width, height, opacity',
          }}
        />
      </div>

      {/* Status bar */}
      <div style={{
        padding: '5px 16px', borderTop: '1px solid rgba(124,58,237,0.13)',
        background: 'transparent', display: 'flex', alignItems: 'center',
        gap: 12, fontSize: 11, color: '#6d4fa0', flexShrink: 0,
      }}>
        <span>{displayEntries.length} item{displayEntries.length !== 1 ? 's' : ''}</span>
        {selectedPaths.size > 0 && (
          <span style={{ color: '#a78bfa' }}>{selectedPaths.size} selected</span>
        )}
        {clipboard && (
          <span style={{ color: '#6d4fa0' }}>
            {clipboard.type === 'copy' ? '📋' : '✂️'} {clipboard.paths.length} in clipboard
          </span>
        )}
        <span style={{ marginLeft: 'auto', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentPath}</span>
      </div>

      <style>{`
        @keyframes previewPanelEnter {
          from { opacity: 0; transform: translateY(8px) scale(0.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes previewPanelExit {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(8px) scale(0.985); }
        }
      `}</style>

      {/* ── Enhanced Preview Panel ── */}
      {previewPanelEntry && (
        <div data-preview-panel="true" style={{
          position: 'absolute', right: 18, bottom: 40, width: 240,
          maxWidth: 'calc(100% - 32px)', padding: '12px 14px', borderRadius: 16,
          border: '1px solid rgba(124,58,237,0.22)', background: 'rgba(11,18,32,0.92)',
          backdropFilter: 'blur(12px)', boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
          color: '#e2d9f3', zIndex: 12, willChange: 'transform', contain: 'layout style paint',
          animation: previewPanelClosing ? 'previewPanelExit 0.15s ease forwards' : 'previewPanelEnter 0.16s ease-out forwards',
          pointerEvents: previewPanelClosing ? 'none' : 'auto',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8, color: '#c4b5fd', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Info size={11} color="#a78bfa" />
            Info
          </div>
          {preview?.isImage && (
            <PreviewImage preview={preview} entry={previewPanelEntry} />
          )}
          {preview?.isPdf && (
            <PdfPreview entry={previewPanelEntry} />
          )}
          {preview?.isVideo && (
            <video src={preview.src} muted controls
              style={{ width: '100%', borderRadius: 12, background: '#090b13', marginBottom: 8 }} />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{previewPanelEntry?.name}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{previewPanelEntry?.isDirectory ? 'Folder' : (safeExt(previewPanelEntry?.ext) || 'File')}</div>
            {!previewPanelEntry?.isDirectory && previewPanelEntry?.size > 0 && (
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Size: {formatSize(previewPanelEntry.size)}</div>
            )}
            {previewPanelEntry?.isDirectory && previewPanelEntry?.children !== undefined && (
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{Array.isArray(previewPanelEntry.children) ? previewPanelEntry.children.length : '?'} items</div>
            )}
            {previewPanelEntry?.modified && (
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Modified: {formatDate(previewPanelEntry.modified)}</div>
            )}
            {previewPanelEntry?.created && (
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Created: {formatDate(previewPanelEntry.created)}</div>
            )}
            {preview?.isExecutable && <div style={{ fontSize: 11, color: '#c4b5fd' }}>Executable</div>}
            {preview?.isImage && previewPanelEntry?.width && previewPanelEntry?.height && (
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{previewPanelEntry.width}×{previewPanelEntry.height}px</div>
            )}
            {preview?.isVideo && previewPanelEntry?.duration && (
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Duration: {previewPanelEntry.duration}</div>
            )}
          </div>
        </div>
      )}

      {/* ── Enhanced Context Menu ── */}
      {contextMenu.visible && (
        <div
          ref={contextMenuRef}
          data-context-menu="true"
          onMouseEnter={cancelSortSubmenuClose}
          onMouseLeave={scheduleSortSubmenuClose}
          style={{
            position: 'fixed', top: contextMenu.y, left: contextMenu.x,
            minWidth: 192, background: 'rgba(9,14,28,0.96)',
            border: '1px solid rgba(124,58,237,0.25)', borderRadius: 14,
            backdropFilter: 'blur(12px)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(124,58,237,0.08)',
            zIndex: 9999, overflow: 'hidden',
            animation: 'menuFadeIn 0.12s ease', padding: '4px 0',
            visibility: contextMenu.positioned ? 'visible' : 'hidden',
          }}
        >
          {contextMenu.contextType === 'background' ? (
            <>
              <ContextMenuItem onMouseEnter={closeSortSubmenu} onClick={handleNewFolder}><FolderPlus size={13} />New Folder</ContextMenuItem>
              {clipboard && (
                <ContextMenuItem onMouseEnter={closeSortSubmenu} onClick={handlePaste}><ClipboardPaste size={13} />Paste</ContextMenuItem>
              )}
              <div className="ctx-divider" />
              <ContextMenuItem onMouseEnter={closeSortSubmenu} onClick={() => { closeContextMenu(); refreshCurrentDirectory() }}><RefreshCw size={13} />Refresh</ContextMenuItem>
              {viewMode === 'grid' && (
                <ContextMenuItem
                  buttonRef={sortMenuItemRef}
                  active={sortSubmenu.visible}
                  onMouseEnter={openSortSubmenu}
                  onClick={(event) => { event.preventDefault(); event.stopPropagation(); openSortSubmenu() }}
                >
                  <SortAsc size={13} />
                  <span style={{ flex: 1 }}>Sort By</span>
                  <ChevronRight size={13} />
                </ContextMenuItem>
              )}
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

      {contextMenu.visible && sortSubmenu.visible && contextMenu.contextType === 'background' && viewMode === 'grid' && (
        <div
          ref={sortSubmenuRef}
          data-context-menu="true"
          onMouseEnter={cancelSortSubmenuClose}
          onMouseLeave={scheduleSortSubmenuClose}
          style={{
            position: 'fixed', top: sortSubmenu.y, left: sortSubmenu.x,
            width: SORT_SUBMENU_WIDTH, background: 'rgba(9,14,28,0.96)',
            border: '1px solid rgba(124,58,237,0.25)', borderRadius: 14,
            backdropFilter: 'blur(12px)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(124,58,237,0.08)',
            zIndex: 10000, overflow: 'hidden',
            animation: 'menuFadeIn 0.12s ease', padding: '4px 0',
          }}
        >
          {[
            ['name', 'Name'],
            ['modified', 'Date Modified'],
            ['type', 'Type'],
            ['size', 'Size'],
          ].map(([field, label]) => (
            <ContextMenuItem
              key={field}
              active={sortBy === field}
              onClick={() => handleGridSortField(field)}
            >
              <Check size={13} style={{ visibility: sortBy === field ? 'visible' : 'hidden' }} />
              {label}
            </ContextMenuItem>
          ))}
          <div className="ctx-divider" />
          {[
            ['asc', 'Ascending'],
            ['desc', 'Descending'],
          ].map(([direction, label]) => (
            <ContextMenuItem
              key={direction}
              active={sortDir === direction}
              onClick={() => handleGridSortDirection(direction)}
            >
              <Check size={13} style={{ visibility: sortDir === direction ? 'visible' : 'hidden' }} />
              {label}
            </ContextMenuItem>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const ContextMenuItem = React.memo(function ContextMenuItem({
  onClick,
  children,
  danger,
  active,
  buttonRef,
  onMouseEnter,
  onMouseLeave,
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      onMouseEnter={(event) => { setHov(true); onMouseEnter?.(event) }}
      onMouseLeave={(event) => { setHov(false); onMouseLeave?.(event) }}
      style={{
        width: '100%', padding: '8px 14px', border: 'none',
        background: (hov || active) ? (danger ? 'rgba(239,68,68,0.1)' : 'rgba(124,58,237,0.16)') : 'transparent',
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

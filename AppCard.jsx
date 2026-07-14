import React, { useCallback, useState, useRef, useEffect } from 'react'
import { Play, Trash2, MoreVertical, Heart, FolderOpen } from 'lucide-react'
import { useStore } from '../store/useStore'
import ModifyAppModal from './ModifyAppModel'

let lastSoundTime = 0

// ================= AUDIO CONTEXT (reusable) =================
let audioCtx
function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  return audioCtx
}

function playHoverSound() {
  try {
    const ctx = getAudioCtx()

    // 🔥 IMPORTANT: resume context (fixes silent audio in many browsers)
    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    const now = ctx.currentTime

    /* ===== MAIN CLICK (strong + audible) ===== */
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'square' // 🔥 sharper than triangle
    osc.frequency.setValueAtTime(1200, now)
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.12)

    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.01) // 🔥 MUCH louder
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.14)

    /* ===== SUB BASS LAYER (gives weight / premium feel) ===== */
    const sub = ctx.createOscillator()
    const subGain = ctx.createGain()

    sub.type = 'sine'
    sub.frequency.setValueAtTime(180, now)
    sub.frequency.exponentialRampToValueAtTime(90, now + 0.12)

    subGain.gain.setValueAtTime(0.0001, now)
    subGain.gain.exponentialRampToValueAtTime(0.18, now + 0.02)
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14)

    sub.connect(subGain)
    subGain.connect(ctx.destination)

    sub.start(now)
    sub.stop(now + 0.14)

  } catch (e) {}
}
const CATEGORY_COLORS = {
  'Dev Tools': '#6d28d9',
  Communication: '#8b5cf6',
  Streaming: '#4f46e5',
  Media: '#22c55e',
  Productivity: '#a78bfa',
  Browser: '#3b82f6',
  default: '#6366f1',
}

export default React.memo(function AppCard({
  app,
  view = 'grid',
  onModifyApp,
  openModifyApp
}) {
  const launchItem = useStore(state => state.launchItem)
  const removeApp = useStore(state => state.removeApp)
  const [hovered, setHovered] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [editData, setEditData] = useState({
    image: app.image || '',
    path: app.path || ''
  })
  const [fav, setFav] = useState(app.favorite || false)
  const menuRef = useRef(null)

  const handleLaunch = useCallback(() => launchItem(app, 'app'), [app, launchItem])

  const handleRevealPath = async () => {
    if (!app.path) {
      console.warn('App path is not set')
      return
    }
    try {
      const result = await window.arcadeOS.launch.revealPath(app.path)
      if (!result.success) {
        console.warn('Failed to reveal path:', result.error)
      }
    } catch (err) {
      console.error('Error revealing path:', err)
    }
    setMenuOpen(false)
  }

  const color = CATEGORY_COLORS[app.category] || CATEGORY_COLORS.default
  useEffect(() => {
  if (!menuOpen) return

  const close = (e) => {
    if (menuRef.current && !menuRef.current.contains(e.target)) {
      setMenuOpen(false)
    }
  }

  document.addEventListener('mousedown', close)
  return () => document.removeEventListener('mousedown', close)
}, [menuOpen])

  /* ================= LIST VIEW ================= */
  if (view === 'list') {
    return (
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 14px',
          borderRadius: 14,
          cursor: 'pointer',
          transition: 'all 0.25s ease',
          background: hovered
            ? 'rgba(255,255,255,0.05)'
            : 'transparent',
          border: '1px solid transparent',
          boxShadow: 'none',
        }}
      >
        <AppIcon app={app} color={color} size={42} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#e5e7eb',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {app.name}
          </div>

          <div style={{ fontSize: 11, color: '#9ca3af' }}>
            {app.category}
          </div>
        </div>

        <button
          onClick={handleLaunch}
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.08)',
            background: hovered ? color : 'rgba(255,255,255,0.04)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            boxShadow: hovered ? `0 0 18px ${color}40` : 'none'
          }}
        >
          <Play size={12} />
        </button>
      </div>
    )
  }

  /* ================= GRID VIEW (FIXED ALIGNMENT) ================= */
  return (
    <div
      onMouseEnter={() => { setHovered(true); playHoverSound() }}
      onMouseLeave={() => {
        setHovered(false)
      }}
      style={{
  position: 'relative',
  borderRadius: 18,
  overflow: 'visible',

  display: 'flex',
  flexDirection: 'column',

  width: '100%',
  height: 200,

  isolation: 'isolate',
  cursor: 'pointer',

  transform: menuOpen
    ? 'translateY(-2px)'
    : hovered
      ? 'translateY(-4px) scale(1.008)'
      : 'translateY(0px) scale(1)',

  transition:
    'transform 0.22s cubic-bezier(.16,1,.3,1), box-shadow 0.25s ease',

  background: `
    radial-gradient(circle at 20% 0%, rgba(109,40,217,0.22), transparent 55%),
    radial-gradient(circle at 80% 100%, rgba(59,130,246,0.12), transparent 60%),
    linear-gradient(180deg, #070A12, #0B1220)
  `,

  border: '1px solid rgba(255,255,255,0.07)',

  boxShadow: hovered
    ? `
      0 18px 42px rgba(0,0,0,0.62),
      0 0 24px rgba(139,92,246,0.12),
      inset 0 0 0 1px rgba(255,255,255,0.04)
    `
    : `
      0 10px 28px rgba(0,0,0,0.52),
      inset 0 0 0 1px rgba(255,255,255,0.03)
    `
}}
    >

      {/* CARD CONTENT WRAPPER */}
      <div
        style={{
          position: 'relative',
          zIndex: 1
        }}
      >
        {/* INNER CLIP LAYER */}
        <div
          style={{
            position: 'relative',
            borderRadius: 18,
            overflow: 'hidden',
            isolation: 'visible'
          }}
        >
          {/* Animated glow frame */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: hovered
                ? `radial-gradient(circle at 30% 20%, ${color}18, transparent 60%)`
                : 'transparent',
              transition: '0.4s ease',
              pointerEvents: 'none'
            }}
          />

{/* HEADER */}
<div
  style={{
    padding: '14px 14px 22px 8px',

    display: 'flex',
    alignItems: 'flex-start',

    gap: 10
  }}
>
  {/* LOGO AREA */}
  <div
    style={{
      flexShrink: 0,

      paddingRight: 10
    }}
  >
    <AppIcon
      app={app}
      color={color}
      size={50}
      hovered={hovered}
    />
  </div>

  {/* ACTIONS */}
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      marginTop: 8,
      gap: 8,

      marginLeft: 'auto',

      flexShrink: 0
    }}
  >
    <IconBtn
      icon={
        <Heart
          size={14}
          fill={fav ? '#ff4d4f' : 'none'}
        />
      }
      active={fav}
      onClick={() => setFav(!fav)}
    />


    <IconBtn
      icon={<MoreVertical size={14} />}
      onClick={() => setMenuOpen(!menuOpen)}
    />
  </div>
</div>

          {/* TEXT (FIXED spacing) */}
          <div style={{
            padding: '2px 14px 8px',
marginTop: 0
          }}>
            <div style={{
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: '0.2px',
              color: '#f3f4f6',
              marginBottom: 6
            }}>
              {app.name}
            </div>

            <div style={{
              fontSize: 11,
              color: 'rgba(156,163,175,0.85)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em'
            }}>
              {app.category}
            </div>
          </div>

          {/* BUTTON (pushed properly bottom aligned) */}
          <div style={{ padding: '0 14px 14px' }}>
            <button
            onClick={handleLaunch}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: 12,
                border: '1px solid rgba(139,92,246,0.25)',
                background: hovered
                  ? 'linear-gradient(135deg, rgba(109,40,217,0.55), rgba(59,130,246,0.25))'
                  : 'rgba(255,255,255,0.03)',
                transform: hovered ? 'scale(1.02)' : 'scale(1)',
                fontWeight: 600,
                fontSize: 12.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all 0.25s ease',
                boxShadow: hovered ? '0 12px 30px rgba(109,40,217,0.25)' : 'none',
                cursor: 'pointer',
                color: '#fff'
              }}
            >
              <Play size={12} /> Open
            </button>
          </div>
        </div>
        {/* END INNER CLIP LAYER */}
      </div>
      {/* END CONTENT WRAPPER */}

      {menuOpen && (
        <div
        ref={menuRef}
          className="app-menu"
          style={{
            position: 'absolute',
            top: 56,
            right: -6,
            zIndex: 9999999,
            pointerEvents: 'auto',
            background: 'rgba(10, 12, 20, 0.96)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRadius: 16,
            border: '1px solid rgba(139,92,246,0.22)',
            overflow: 'hidden',
            minWidth: 180,
            boxShadow: `
              0 24px 60px rgba(0,0,0,0.82),
              0 0 0 1px rgba(255,255,255,0.04),
              0 0 35px rgba(139,92,246,0.18)
            `,
            padding: 5,
            transform: `
              translateY(0px)
              scale(1)
            `,
            transformOrigin: 'top right',
            animation: 'menuPop 0.16s cubic-bezier(.2,.8,.2,1)',
            isolation: 'isolate'
          }}
        >
          <MenuItem
            icon={<MoreVertical size={12} />}
            label="Modify App"
            onClick={() => {
              const handler = onModifyApp || openModifyApp
              if (handler) handler(app)
              setMenuOpen(false)
            }}
          />
          <MenuItem
            icon={<FolderOpen size={12} />}
            label="Open File Location"
            onClick={handleRevealPath}
          />
          <MenuItem
            icon={<Trash2 size={12} />}
            label="Remove"
            danger
            onClick={() => removeApp(app.id)}
          />
        </div>
      )}
    </div>
  )
})

/* ================= ICON ================= */
function AppIcon({ app, color, size = 54, hovered }) {
  const initials = app?.name
    ? app.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'A'

  return (
    <div
  style={{
    width: size,
    height: size,

    minWidth: size,
    minHeight: size,

    flexShrink: 0,

    overflow: 'hidden',

    borderRadius: 16,

    background: `
      radial-gradient(circle at top left, ${color}35, transparent 70%),
      rgba(255,255,255,0.02)
    `,

    border: `1px solid ${color}30`,

    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,

    position: 'relative',
    zIndex: 1,

    transform: hovered
      ? 'scale(1.05) translateY(-2px)'
      : 'scale(1)',

    transition: 'all 0.28s cubic-bezier(.16,1,.3,1)',

    boxShadow: hovered
      ? `0 15px 40px ${color}30`
      : '0 6px 18px rgba(0,0,0,0.18)'
  }}
>
      {app.image ? (
        <img
  src={app.image}
  alt=""
  draggable={false}
  onError={(e) => {
    e.currentTarget.style.display = 'none'
  }}
  style={{
    width: size * 0.62,
    height: size * 0.62,

    objectFit: 'contain',
    objectPosition: 'center',

    display: 'block',

    flexShrink: 0,

    userSelect: 'none',

    transform: hovered
      ? 'scale(1.06)'
      : 'scale(1)',

    transition: 'transform 0.25s ease',

    filter: hovered
      ? 'drop-shadow(0 8px 18px rgba(0,0,0,0.32))'
      : 'drop-shadow(0 4px 10px rgba(0,0,0,0.18))'
  }}
/>
      ) : (
        <span style={{
          fontSize: 13,
          fontWeight: 800,
          color,
          letterSpacing: '1px'
        }}>
          {initials}
        </span>
      )}
    </div>
  )
}

/* ================= ICON BUTTON ================= */
function IconBtn({ icon, onClick, active }) {
  const [h, setH] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        width: 28,
        height: 28,
        borderRadius: 9,
        border: '1px solid rgba(255,255,255,0.08)',
        background:
          h || active
            ? 'rgba(139,92,246,0.18)'
            : 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: '#e5e7eb',
        transition: 'all 0.2s ease'
      }}
    >
      {icon}
    </button>
  )
}

/* ================= MENU ITEM ================= */
function MenuItem({ icon, label, onClick, danger }) {
  const [h, setH] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        width: '100%',
        display: 'flex',
        gap: 10,
        padding: '10px 12px',
        border: 'none',
        cursor: 'pointer',
        background: h
          ? 'rgba(139,92,246,0.18)'
          : 'transparent',
        color: danger ? '#ef4444' : '#d1d5db',
        fontSize: 12.5,
        alignItems: 'center'
      }}
    >
      {icon} {label}
    </button>
  )
}

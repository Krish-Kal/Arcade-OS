import React, { useState } from 'react'
import { Play, Pin, Trash2, MoreVertical, Heart } from 'lucide-react'
import { useStore } from '../store/useStore'

let lastSoundTime = 0
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

export default function AppCard({ app, view = 'grid' }) {
  const { launchItem, togglePin, removeApp } = useStore()

  const [hovered, setHovered] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editData, setEditData] = useState({
    image: app.image || '',
    path: app.path || ''
  })
  const [fav, setFav] = useState(app.favorite || false)

  const color = CATEGORY_COLORS[app.category] || CATEGORY_COLORS.default

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
          onClick={() => launchItem(app, 'app')}
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
      onMouseLeave={() => { setHovered(false); setMenuOpen(false) }}
      style={{
        position: 'relative',
        borderRadius: 24,
        overflow: 'hidden',
        cursor: 'pointer',
        minHeight: 240,

        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',

        transition: 'transform 0.35s cubic-bezier(.16,1,.3,1), box-shadow 0.3s ease',

        transform: hovered
          ? 'translateY(-8px) scale(1.015)'
          : 'translateY(0px) scale(1)',

        background: `
          radial-gradient(circle at 20% 0%, rgba(109,40,217,0.25), transparent 55%),
          radial-gradient(circle at 80% 100%, rgba(59,130,246,0.15), transparent 60%),
          linear-gradient(180deg, #0b1220, #111827)
        `,

        border: '1px solid rgba(255,255,255,0.08)',

        boxShadow: hovered
          ? `0 35px 90px rgba(0,0,0,0.65), 0 0 0 1px ${color}25, 0 0 40px ${color}10`
          : '0 10px 30px rgba(0,0,0,0.35)',
      }}
    >

      <div style={{
        position: 'absolute',
        inset: 0,
        background: hovered
          ? `radial-gradient(circle at 30% 20%, ${color}18, transparent 60%)`
          : 'transparent',
        transition: '0.4s ease',
        pointerEvents: 'none'
      }} />

      {/* HEADER (slightly more breathing space) */}
      <div style={{
        padding: 16,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
      }}>
        <AppIcon app={app} color={color} size={56} hovered={hovered} />

        <div style={{ display: 'flex', gap: 6 }}>
          <IconBtn icon={<Heart size={14} fill={fav ? '#ff4d4f' : 'none'} />} active={fav} onClick={() => setFav(!fav)} />
          <IconBtn icon={<Pin size={14} />} onClick={() => togglePin(app.id, 'app')} />
          <IconBtn icon={<MoreVertical size={14} />} onClick={() => setMenuOpen(!menuOpen)} />
        </div>

        {menuOpen && (
          <div style={{
            position: 'absolute',
            right: 14,
            top: 64,
            background: 'rgba(10, 15, 28, 0.92)',
            backdropFilter: 'blur(18px)',
            borderRadius: 14,
            border: '1px solid rgba(139,92,246,0.15)',
            overflow: 'hidden',
            zIndex: 50,
            minWidth: 150,
            boxShadow: '0 15px 40px rgba(0,0,0,0.6)'
          }}>
            <MenuItem icon={<Pin size={12} />} label="Pin App" onClick={() => togglePin(app.id, 'app')} />
            <MenuItem
              icon={<MoreVertical size={12} />}
              label="Modify App"
              onClick={() => {
                setEditOpen(true)
                setMenuOpen(false)
              }}
            />
            <MenuItem icon={<Trash2 size={12} />} label="Remove" danger onClick={() => removeApp(app.id)} />
          </div>
        )}
      </div>

      {/* TEXT (FIXED spacing) */}
      <div style={{
        padding: '6px 16px 10px',
        marginTop: 4
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
      <div style={{ padding: '0 16px 16px' }}>
        <button
          onClick={() => launchItem(app, 'app')}
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

      {editOpen && (
        <div
          onClick={() => setEditOpen(false)}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 320,
              borderRadius: 18,
              padding: 16,
              background: 'rgba(15, 20, 35, 0.95)',
              border: '1px solid rgba(139,92,246,0.25)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.7)'
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#fff' }}>
              Modify App
            </div>

            <input
              placeholder="App Icon URL"
              value={editData.image}
              onChange={(e) => setEditData({ ...editData, image: e.target.value })}
              style={{
                width: '100%',
                padding: 10,
                marginBottom: 10,
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                color: '#fff',
                fontSize: 12
              }}
            />

            <input
              placeholder="App Path (steam://, exe, url...)"
              value={editData.path}
              onChange={(e) => setEditData({ ...editData, path: e.target.value })}
              style={{
                width: '100%',
                padding: 10,
                marginBottom: 14,
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                color: '#fff',
                fontSize: 12
              }}
            />

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setEditOpen(false)}
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#ccc',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  app.image = editData.image
                  app.path = editData.path
                  setEditOpen(false)
                }}
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #6d28d9, #3b82f6)',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ================= ICON ================= */
function AppIcon({ app, color, size = 54, hovered }) {
  const initials = app?.name
    ? app.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'A'

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: 16,
      background: `
        radial-gradient(circle at top left, ${color}35, transparent 70%),
        rgba(255,255,255,0.02)
      `,
      border: `1px solid ${color}30`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transform: hovered ? 'scale(1.07) translateY(-2px)' : 'scale(1)',
      transition: '0.3s ease',
      boxShadow: hovered ? `0 15px 40px ${color}30` : 'none',
    }}>
      {app.image ? (
        <img
          src={app.image}
          alt=""
          style={{ width: size * 0.55, height: size * 0.55, objectFit: 'contain' }}
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
        width: 32,
        height: 32,
        borderRadius: 10,
        border: '1px solid rgba(139,92,246,0.15)',
        background: h || active
          ? 'rgba(139,92,246,0.18)'
          : 'rgba(255,255,255,0.03)',
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
        background: h ? 'rgba(255,255,255,0.06)' : 'transparent',
        color: danger ? '#ef4444' : '#d1d5db',
        fontSize: 12.5,
        alignItems: 'center'
      }}
    >
      {icon} {label}
    </button>
  )
}
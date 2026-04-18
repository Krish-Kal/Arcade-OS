import React, { useEffect, useRef, useState } from 'react'
import {
  Play,
  Pin,
  Trash2,
  MoreVertical,
  Gamepad2,
  Heart
} from 'lucide-react'
import { useStore } from '../store/useStore'

const GENRE_COLORS = {
  RPG: '#8b5cf6',
  'Action RPG': '#a855f7',
  Roguelike: '#22d3ee',
  'Space RPG': '#3b82f6',
  Metroidvania: '#34d399',
  Strategy: '#f59e0b',
  FPS: '#ef4444',
  default: '#6366f1'
}

// ================= RARITY SYSTEM =================
const RARITY = {
  common: { glow: '#6b7280', intensity: 0.15 },
  rare: { glow: '#3b82f6', intensity: 0.25 },
  epic: { glow: '#a855f7', intensity: 0.35 },
  legendary: { glow: '#fbbf24', intensity: 0.45 }
}

const getRarity = (game) => game.rarity || 'common'

// ================= AUDIO CONTEXT (reusable) =================
let audioCtx
function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  return audioCtx
}

// ================= SOUND (soft UI whoosh) =================
function playHoverSound() {
  try {
    const ctx = getAudioCtx()

    const duration = 0.09
    const bufferSize = ctx.sampleRate * duration
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)

    // smooth airy noise (not harsh)
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize
      data[i] =
        (Math.random() * 2 - 1) *
        (1 - t) *
        (1 - t) * // smoother decay curve
        0.08
    }

    const noise = ctx.createBufferSource()
    noise.buffer = buffer

    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 1200
    filter.Q.value = 0.8

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration)

    noise.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    noise.start()
    noise.stop(ctx.currentTime + duration)
  } catch (e) {}
}

// ================= HAPTIC =================
function vibrate() {
  try {
    if (
      navigator.vibrate &&
      document.hasFocus() &&
      navigator.userActivation?.hasBeenActive
    ) {
      navigator.vibrate(10)
    }
  } catch {}
}

const GENRES = [
  'Action RPG',
  'RPG',
  'FPS',
  'Strategy',
  'Roguelike',
  'Metroidvania',
  'Platformer',
  'Racing',
  'Sports',
  'Simulation',
  'Space RPG',
  'Adventure',
  'Horror',
  'Puzzle',
  'Other'
]

export default function GameCard({ game, view = 'grid', onEdit }) {
  const { launchItem, togglePin, removeGame } = useStore()

  const [hovered, setHovered] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [fav, setFav] = useState(game.favorite || false)
  const menuRef = useRef(null)
  const hoverPlayed = useRef(false)

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

  const handleLaunch = () => {
    vibrate()
    launchItem(game, 'game')
  }

  const color = GENRE_COLORS[game.genre] || GENRE_COLORS.default
  const rarity = RARITY[getRarity(game)]
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  /* ================= LIST VIEW ================= */
  if (view === 'list') {
    return (
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '12px 14px',
          borderRadius: 14,
          cursor: 'pointer',
          background: hovered
            ? 'linear-gradient(90deg, rgba(255,255,255,0.06), transparent)'
            : 'transparent',
          border: '1px solid rgba(255,255,255,0.06)',
          transition: 'all 0.25s ease'
        }}
      >
        <MiniIcon game={game} color={color} />

        <div style={{ flex: 1 }}>
          <div style={{ color: '#e5e7eb', fontSize: 13, fontWeight: 600 }}>
            {game.name}
          </div>
          <div style={{ color: '#9ca3af', fontSize: 11 }}>{game.genre}</div>
        </div>

        <PlayButton color={color} onClick={handleLaunch} />
      </div>
    )
  }

  /* ================= GRID / PREMIUM TILE ================= */
  return (
    <div
      onMouseEnter={() => {
        if (!hoverPlayed.current) {
          playHoverSound()
          hoverPlayed.current = true
        }
        setHovered(true)
      }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()

        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        const centerX = rect.width / 2
        const centerY = rect.height / 2

        const rotateX = ((y - centerY) / centerY) * -10
        const rotateY = ((x - centerX) / centerX) * 10

        setTilt({ x: rotateY, y: rotateX })
      }}
      onMouseLeave={() => {
        hoverPlayed.current = false
        setHovered(false)
        setTilt({ x: 0, y: 0 })
      }}
      style={{
        position: 'relative',
        borderRadius: 22,
        overflow: 'hidden',
        isolation: 'auto',
        transformStyle: 'preserve-3d',
        willChange: 'transform',
        cursor: 'pointer',

        transform: `
          perspective(1400px)
          rotateX(${tilt.y}deg)
          rotateY(${tilt.x}deg)
          translateZ(0)
          translateY(${hovered ? -5 : 0}px)
          scale(${hovered ? 1.012 : 1})
        `,

        backfaceVisibility: 'hidden',
        transition: 'transform 0.35s cubic-bezier(.2,.8,.2,1), box-shadow 0.3s ease',

        background: `
          radial-gradient(circle at top, rgba(139,92,246,0.18), transparent 55%),
          radial-gradient(circle at bottom right, rgba(59,130,246,0.12), transparent 60%),
          linear-gradient(180deg, #070A12, #0B1220)
        `,

        border: `1px solid rgba(255,255,255,0.08)`,

        boxShadow: hovered
          ? `
            0 30px 90px rgba(0,0,0,0.85),
            0 0 30px rgba(139,92,246,0.18),
            inset 0 0 0 1px rgba(255,255,255,0.06)
          `
          : `
            0 15px 40px rgba(0,0,0,0.6),
            inset 0 0 0 1px rgba(255,255,255,0.04)
          `
      }}
    >
      {/* Animated glow frame */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: hovered
            ? `radial-gradient(circle at 20% 0%, ${color}25, transparent 55%)`
            : 'transparent',
          transition: 'all 0.5s ease',
          pointerEvents: 'none'
        }}
      />

      {/* IMAGE SECTION */}
      <div
        style={{
          position: 'relative',
          height: 250,
          overflow: 'hidden',
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          transform: 'translateZ(0)',
          clipPath: 'inset(0 round 22px 22px 0 0)'
        }}
      >
        {game.image ? (
          <>
           <img
  src={game.image}
  alt={game.name}
  style={{
    width: '100%',
    height: '100%',
    objectFit: 'cover',

    /* 🔥 REFINED ZOOM */
    transform: hovered ? 'scale(1.05)' : 'scale(1)',

    transition: 'transform 0.9s cubic-bezier(.2,.8,.2,1)',

    /* 🔥 LESS DARK (better visibility) */
    filter: hovered
      ? 'brightness(1.12) contrast(1.2) saturate(1.25)'
      : 'brightness(0.82) contrast(1.08) saturate(1.05)'
  }}
/>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `
                  radial-gradient(circle at top, transparent 35%, rgba(0,0,0,0.65) 100%),
                  linear-gradient(to top, rgba(0,0,0,0.88), transparent 55%)
                `,
                pointerEvents: 'none'
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: hovered
                  ? 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.08), transparent 45%)'
                  : 'transparent',
                mixBlendMode: 'screen',
                opacity: 0.35,
                pointerEvents: 'none'
              }}
            />
          </>
        ) : (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(135deg, ${color}22, transparent)`
            }}
          >
            <Gamepad2 size={52} color={color} />
          </div>
        )}

        {/* Glass refraction layer */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: hovered
              ? `radial-gradient(circle at ${tilt.x + 50}% ${tilt.y + 50}%,
                  rgba(255,255,255,0.06),
                  transparent 50%)`
              : 'transparent',
            mixBlendMode: 'overlay',
            opacity: 0.35,
            pointerEvents: 'none'
          }}
        />

        {/* cinematic overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `
              linear-gradient(to top, rgba(0,0,0,0.92), transparent 70%),
              radial-gradient(circle at 30% 10%, ${color}18, transparent 60%)
            `
          }}
        />

{/* TOP BADGES (REFINED) */}
<div
  style={{
    position: 'absolute',
    top: 14,
    left: 14,
    display: 'flex',
    gap: 6,
    alignItems: 'center'
  }}
>
  {getRarity(game) !== 'common' && (
    <div
      style={{
        fontSize: 9,
        padding: '3px 8px',
        borderRadius: 999,
        color: rarity.glow,
        border: `1px solid ${rarity.glow}55`,
        background: 'rgba(10,12,18,0.35)',
        backdropFilter: 'blur(10px)',
        letterSpacing: '0.06em',
        boxShadow: `0 0 18px ${rarity.glow}22`
      }}
    >
      {getRarity(game)}
    </div>
  )}

  {game.pinned && (
    <div
      style={{
        fontSize: 9,
        padding: '3px 6px',
        borderRadius: 999,
        background: 'rgba(255, 215, 0, 0.12)',
        border: '1px solid rgba(255, 215, 0, 0.35)',
        color: '#fbbf24',
        fontWeight: 600,
        letterSpacing: '0.05em'
      }}
    >
      PIN
    </div>
  )}
</div>

        {/* ACTION ICONS */}
        <div
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            display: 'flex',
            gap: 8
          }}
        >
          <IconBtn
            active={fav}
            onClick={() => setFav(!fav)}
            icon={<Heart size={14} fill={fav ? '#ff4d4f' : 'none'} />}
          />
          <IconBtn
            onClick={() => setMenuOpen(!menuOpen)}
            icon={<MoreVertical size={14} />}
          />
        </div>

        {/* TITLE AREA */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            width: '100%',
            padding: '16px 16px 14px'
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#f3f4f6',
              letterSpacing: '0.2px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {game.name}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 8
            }}
          >
            <div
  style={{
    fontSize: 10,
    padding: '4px 10px',
    borderRadius: 999,
    background: `${color}18`,
    border: `1px solid ${color}40`,
    color: color,
    fontWeight: 600,
    letterSpacing: '0.05em',
    backdropFilter: 'blur(6px)'
  }}
>
  {game.genre}
</div>

            <PlayButton
              color={color}
              onClick={handleLaunch}
            />
          </div>
        </div>
      </div>

      {/* MENU */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="game-menu"
          style={{
            position: 'absolute',
            right: 14,
            top: 62,
            background: 'rgba(10, 12, 20, 0.96)',
            backdropFilter: 'blur(22px)',
            borderRadius: 14,
            border: '1px solid rgba(139,92,246,0.18)',
            overflow: 'hidden',
            minWidth: 170,
            boxShadow: '0 18px 50px rgba(0,0,0,0.75)',
            padding: 4
          }}
        >
          <MenuItem
            icon={<Pin size={12} />}
            label="Pin Game"
            onClick={() => togglePin(game.id, 'game')}
          />
          <MenuItem
            icon={<Gamepad2 size={12} />}
            label="Modify Game"
            styleVariant="primary"
            onClick={() => {
              setMenuOpen(false)
              onEdit?.(game)
            }}
          />
          <MenuItem
            icon={<Trash2 size={12} />}
            label="Remove"
            danger
            onClick={() => removeGame(game.id)}
          />
        </div>
      )}

    </div>
  )
}

/* ================= REUSABLES ================= */

function PlayButton({ onClick, color }) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.08)'
        e.currentTarget.style.boxShadow = `0 12px 28px ${color}55`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
        e.currentTarget.style.boxShadow = `0 8px 20px ${color}35`
      }}
      style={{
        width: 32,
        height: 32,
        borderRadius: 10,
        border: '1px solid rgba(255,255,255,0.12)',
        backdropFilter: 'blur(10px)',
        background: `linear-gradient(135deg, ${color}, #0b1220)`,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 8px 20px ${color}35`,
        cursor: 'pointer',
        transition: 'transform 0.45s cubic-bezier(.16,1,.3,1), box-shadow 0.3s ease'
      }}
    >
      <Play size={12} />
    </button>
  )
}

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
        border: '1px solid rgba(255,255,255,0.08)',
        background:
          h || active
            ? 'rgba(139,92,246,0.18)'
            : 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#d1d5db',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      }}
    >
      {icon}
    </button>
  )
}

function Badge({ text, color }) {
  return (
    <div
      style={{
        fontSize: 10,
        padding: '4px 10px',
        borderRadius: 999,
        background: `${color}18`,
        border: `1px solid ${color}40`,
        color,
        fontWeight: 600,
        letterSpacing: '0.05em',
        backdropFilter: 'blur(6px)'
      }}
    >
      {text}
    </div>
  )
}

function MenuItem({ icon, label, danger, onClick, styleVariant }) {
  const [hover, setHover] = useState(false)
  const isPrimary = styleVariant === 'primary'

  const hoverBg = 'rgba(139,92,246,0.18)'

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%',
        display: 'flex',
        gap: 10,
        padding: '10px 12px',
        border: 'none',
        cursor: 'pointer',
        userSelect: 'none',

        background: hover ? hoverBg : 'transparent',

        color: danger
          ? '#ef4444'
          : isPrimary
            ? '#ffffff'
            : '#e5e7eb',

        fontSize: 12.5,
        alignItems: 'center',
        transition: 'all 0.15s ease',
        borderRadius: 0
      }}
    >
      <div style={{ opacity: hover ? 1 : 0.85 }}>
        {icon}
      </div>

      <span style={{ fontWeight: isPrimary ? 600 : 500 }}>
        {label}
      </span>
    </button>
  )
}

function MiniIcon({ game, color }) {
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: `linear-gradient(135deg, ${color}25, transparent)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}
    >
      {game.image ? (
        <img
          src={game.image}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <Gamepad2 size={18} color={color} />
      )}
    </div>
  )
}

function Input({ label, value, onChange }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>
        {label}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: 10,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: '#fff',
          outline: 'none'
        }}
      />
    </div>
  )
}

function FeatureTile({ label, active, onClick }) {
  const [hover, setHover] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: 12,
        borderRadius: 14,
        background: hover ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.03)',
        border: active ? '1px solid rgba(139,92,246,0.5)' : '1px solid rgba(255,255,255,0.06)',
        cursor: 'pointer',
        transition: '0.2s ease',
        fontSize: 12,
        color: hover || active ? '#fff' : '#cbd5e1',
        textAlign: 'center'
      }}
    >
      {label}
    </div>
  )
}
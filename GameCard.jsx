import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Play,
  Gamepad2
} from 'lucide-react'
import { useStore } from '../store/useStore'

export const GENRE_COLORS = {
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
export const RARITY = {
  common: { glow: '#6b7280', intensity: 0.15 },
  rare: { glow: '#3b82f6', intensity: 0.25 },
  epic: { glow: '#a855f7', intensity: 0.35 },
  legendary: { glow: '#fbbf24', intensity: 0.45 }
}

const getRarity = (game) => game.rarity || 'common'

let lastSoundTime = 0

// ================= AUDIO CONTEXT (reusable) =================
let audioCtx
function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  return audioCtx
}

// ================= SOUND (strong click + sub bass) =================
function playHoverSound() {
  try {
    const ctx = getAudioCtx()

    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'square'
    osc.frequency.setValueAtTime(1200, now)
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.12)

    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.14)

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

export default React.memo(function GameCard({ game, view = 'grid', onEdit, onOpenDetails }) {
 const launchItem = useStore(state => state.launchItem)

  const [hovered, setHovered] = useState(false)
  const hoverPlayed = useRef(false)
  const cardRectRef = useRef(null)
  const tiltFrameRef = useRef(null)
  const nextTiltRef = useRef({ x: 0, y: 0 })

  useEffect(() => () => {
    if (tiltFrameRef.current) cancelAnimationFrame(tiltFrameRef.current)
  }, [])

  const commitTilt = useCallback(() => {
    tiltFrameRef.current = null
    setTilt(nextTiltRef.current)
  }, [])

  const handleLaunch = useCallback(() => {
    vibrate()
    launchItem(game, 'game')
  }, [game, launchItem])

  const handleOpenDetails = useCallback(() => {
    onOpenDetails?.(game)
  }, [game, onOpenDetails])

  const color = GENRE_COLORS[game.genre] || GENRE_COLORS.default
  const rarity = RARITY[getRarity(game)]
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  // ---- COVER IMAGE POSITIONING (cover-fill system) ----
  // Default focal point; refined once the image loads and we know its
  // natural aspect ratio. object-fit is ALWAYS 'cover' — we only ever
  // adjust object-position, never fall back to 'contain'.
  const [imagePosition, setImagePosition] = useState('50% 50%')

  const handleCoverLoad = useCallback((event) => {
    const { naturalWidth, naturalHeight } = event.target
    if (!naturalWidth || !naturalHeight) return

    const aspect = naturalWidth / naturalHeight

    if (aspect < 0.75) {
      // strongly portrait (e.g. Watch Dogs-style key art) — bias up so
      // faces/logos near the top aren't cropped out
      setImagePosition('50% 25%')
    } else if (aspect < 1.05) {
      // near-square artwork
      setImagePosition('50% 40%')
    } else {
      // landscape / wide artwork
      setImagePosition('50% 50%')
    }
  }, [])

  /* ================= LIST VIEW ================= */
  if (view === 'list') {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleOpenDetails}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleOpenDetails()
          }
        }}
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
      role="button"
      tabIndex={0}
      onClick={handleOpenDetails}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleOpenDetails()
        }
      }}
      onMouseEnter={(e) => {
        if (!hoverPlayed.current) {
          playHoverSound()
          hoverPlayed.current = true
        }
        cardRectRef.current = e.currentTarget.getBoundingClientRect()
        setHovered(true)
      }}
      onMouseMove={(e) => {
        const rect = cardRectRef.current || e.currentTarget.getBoundingClientRect()

        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        const centerX = rect.width / 2
        const centerY = rect.height / 2

        const rotateX = ((y - centerY) / centerY) * -10
        const rotateY = ((x - centerX) / centerX) * 10

        nextTiltRef.current = { x: rotateY, y: rotateX }
        if (!tiltFrameRef.current) {
          tiltFrameRef.current = requestAnimationFrame(commitTilt)
        }
      }}
      onMouseLeave={() => {
        hoverPlayed.current = false
        cardRectRef.current = null
        if (tiltFrameRef.current) {
          cancelAnimationFrame(tiltFrameRef.current)
          tiltFrameRef.current = null
        }
        setHovered(false)
        setTilt({ x: 0, y: 0 })
      }}
      style={{
        position: 'relative',
        borderRadius: 18,
        overflow: 'visible',
        isolation: 'isolate',
        transformStyle: 'flat',
zIndex: hovered ? 50 : 1,
        willChange: 'transform',
        cursor: 'pointer',

        transform: `
              perspective(1400px)
              rotateX(${tilt.y}deg)
              rotateY(${tilt.x}deg)
              translateZ(0)
              translateY(${hovered ? -3 : 0}px)
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
            0 20px 55px rgba(0,0,0,0.72),
            0 0 30px rgba(139,92,246,0.18),
            inset 0 0 0 1px rgba(255,255,255,0.06)
          `
          : `
            0 15px 40px rgba(0,0,0,0.6),
            inset 0 0 0 1px rgba(255,255,255,0.04)
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
      borderRadius: 12,
      overflow: 'hidden',
      isolation: 'isolate',

      background: 'rgba(14, 14, 19, 0.72)',

      boxShadow: hovered
        ? '0 12px 28px rgba(0,0,0,0.28)'
        : '0 3px 10px rgba(0,0,0,0.14)',

      transition: 'box-shadow 350ms ease'
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

      {/* IMAGE SECTION — edge-to-edge cover fill */}
 <div
  style={{
    position: 'relative',
    zIndex: 1,
    width: '100%',
    height: 218,

    overflow: 'hidden',

    borderRadius: '12px 12px 8px 8px',
    background: '#0b0b0f',

    transform: 'translateZ(0)',
    backfaceVisibility: 'hidden'
  }}
>
        {game.image ? (
          <img
            src={game.image}
            alt={game.name}
            draggable={false}
            onLoad={handleCoverLoad}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',

              objectFit: 'cover',
              objectPosition: game.coverPosition || imagePosition,

              display: 'block',
              backfaceVisibility: 'hidden',

              transform: hovered
                ? 'scale3d(1.015, 1.015, 1)'
                : 'scale3d(1, 1, 1)',

              transition:
                'transform 350ms cubic-bezier(0.22, 1, 0.36, 1)',

              willChange: hovered ? 'transform' : 'auto'
            }}
          />
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

        {/* Single consolidated readability overlay — keeps the top
            60-65% of the artwork clean and sharp, only darkening
            behind the title/badge/play-button area */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to top, rgba(4,6,12,0.90) 0%, rgba(4,6,12,0.35) 30%, transparent 62%)',
            pointerEvents: 'none'
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

</div>

{/* TITLE AREA */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            width: '100%',
            padding: '13px 13px 12px',
            zIndex: 20
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#f3f4f6',
              letterSpacing: '0.2px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              
            }}
          >
            {game.name}
          </div>

<div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              marginTop: 8
            }}
          >
            <PlayButton
              color={color}
              onClick={handleLaunch}
            />
          </div>
        </div>
      </div>
</div> {/* END INNER CLIP LAYER */}
</div> {/* END CONTENT WRAPPER */}
    </div>
  )
})

/* ================= REUSABLES ================= */

export function PlayButton({ onClick, color }) {
  return (
    <button
      aria-label="Play game"
      onClick={(e) => {
        // Card body has its own click handler that opens Game Details —
        // Play must only ever launch, never navigate.
        e.stopPropagation()
        onClick?.(e)
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.08)'
        e.currentTarget.style.boxShadow = `0 12px 28px ${color}55`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
        e.currentTarget.style.boxShadow = `0 8px 20px ${color}35`
      }}
      style={{
        width: 28,
height: 28,
        borderRadius: 9,
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

export function IconBtn({ icon, onClick, active, 'aria-label': ariaLabel }) {
  const [h, setH] = useState(false)

  return (
    <button
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.(e)
      }}
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

export function MenuItem({ icon, label, danger, onClick, styleVariant }) {
  const [hover, setHover] = useState(false)
  const isPrimary = styleVariant === 'primary'

  const hoverBg = 'rgba(139,92,246,0.18)'

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick?.(e)
      }}
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
          borderRadius: 9,
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
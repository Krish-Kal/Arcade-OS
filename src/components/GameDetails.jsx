import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  Play,
  MoreVertical,
  Heart,
  FolderOpen,
  Trash2,
  Gamepad2,
  ImageOff
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { GENRE_COLORS, RARITY, MenuItem } from './GameCard'

const getRarity = (game) => game.rarity || 'common'

function shortenPath(path, keepSegments = 3) {
  if (!path) return ''
  const parts = path.split(/[\\/]/).filter(Boolean)
  if (parts.length <= keepSegments) return path
  return '…/' + parts.slice(-keepSegments).join('/')
}

export default function GameDetails({ game, onBack, onEdit }) {
  const launchItem = useStore(state => state.launchItem)
  const removeGame = useStore(state => state.removeGame)
  const updateGame = useStore(state => state.updateGame)

  const [menuOpen, setMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [wallpaperPosition, setWallpaperPosition] = useState('50% 50%')
  const [wallpaperLoaded, setWallpaperLoaded] = useState(false)
  const [wallpaperFailed, setWallpaperFailed] = useState(false)
const menuRef = useRef(null)

  // Premium entrance: fade + 6px rise, matching the rest of Arcade OS's
  // easing. No animation libraries — just a mount-triggered CSS transition.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(frame)
  }, [])

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

  // The card cover (`game.image`) is NEVER a valid details wallpaper — it's
  // a different asset with a different aspect ratio and purpose. If the
  // wallpaper source changes (game edited) or is missing, reset load state
  // so a stale failure/opacity doesn't linger on the new source.
  const heroSrc = game.wallpaper || game.heroImage || null

  useEffect(() => {
    setWallpaperLoaded(false)
    setWallpaperFailed(false)
  }, [heroSrc])

  if (!game) return null

  const color = GENRE_COLORS[game.genre] || GENRE_COLORS.default
  const rarity = RARITY[getRarity(game)]
  const fav = game.favorite || false
  const showWallpaper = heroSrc && !wallpaperFailed

  const handleWallpaperLoad = useCallback((e) => {
    setWallpaperLoaded(true)
    if (game.wallpaperPosition || game.heroPosition) return
    const { naturalWidth, naturalHeight } = e.target
    if (!naturalWidth || !naturalHeight) return
    const aspect = naturalWidth / naturalHeight
    // Wallpapers are meant to be wide already — only nudge focal point for
    // unusually wide art, otherwise keep it centered (unlike the card's
    // portrait-biased positioning, which doesn't apply here).
    setWallpaperPosition(aspect > 2.4 ? '50% 40%' : '50% 50%')
  }, [game.wallpaperPosition, game.heroPosition])

const handleWallpaperError = useCallback(() => {
    console.warn('Wallpaper failed to load for', game.name)
    setWallpaperFailed(true)
  }, [game.name])
  const handleLaunch = useCallback(() => {
    launchItem(game, 'game')
  }, [game, launchItem])

  const handleToggleFavorite = useCallback(() => {
    updateGame(game.id, { favorite: !fav })
  }, [game.id, fav, updateGame])

  const handleRevealPath = async () => {
    if (!game.path) {
      console.warn('Game path is not set')
      return
    }
    try {
      const result = await window.arcadeOS.launch.revealPath(game.path)
      if (!result.success) {
        console.warn('Failed to reveal path:', result.error)
      }
    } catch (err) {
      console.error('Error revealing path:', err)
    }
    setMenuOpen(false)
  }

  const handleRemove = () => {
    setMenuOpen(false)
    removeGame(game.id)
    onBack?.()
  }

  return (
    <div
      style={{
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: `
          radial-gradient(circle at top left, ${color}14, transparent 45%),
          linear-gradient(180deg, #070A12, #0B1220)
        `,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0px)' : 'translateY(6px)',
        transition:
          'opacity 280ms cubic-bezier(0.22, 1, 0.36, 1), transform 280ms cubic-bezier(0.22, 1, 0.36, 1)'
      }}
    >
      {/* Scoped responsive rule for the content grid below — the only
          place a media query is needed, so it's kept local rather than
          pulling in a styling system. */}
<style>{`
        .gd-content-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 300px;
          gap: 48px;
        }
        @media (max-width: 960px) {
          .gd-content-grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>

      {/* ================= CINEMATIC HERO ================= */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 'clamp(430px, 54vh, 620px)',
          flexShrink: 0,
          overflow: 'hidden',
          background: '#0b0b0f'
        }}
      >
        {showWallpaper ? (
          <>
            {/* Lightweight fallback sits behind the image so there's no
                harsh flash while a large wallpaper loads — no shimmer,
                no spinner, just the same ambient background as the
                no-wallpaper state, cross-faded via opacity only. */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `
                  radial-gradient(circle at 30% 20%, ${color}1c, transparent 60%),
                  linear-gradient(180deg, #0c0f18, #070A12)
                `
              }}
            />
            <img
              src={heroSrc}
              alt={`${game.name} wallpaper`}
              draggable={false}
              onLoad={handleWallpaperLoad}
              onError={handleWallpaperError}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: game.wallpaperPosition || game.heroPosition || wallpaperPosition,
                display: 'block',
                backfaceVisibility: 'hidden',
                opacity: wallpaperLoaded ? 1 : 0,
                transition: 'opacity 300ms ease'
              }}
            />
          </>
        ) : (
          // ---- PREMIUM NO-WALLPAPER STATE ----
          // Intentional empty state, not a broken-image state: ambient
          // genre-tinted background plus a low-prominence glyph, with a
          // quiet path back into the existing Modify Game flow.
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 14,
              background: `
                radial-gradient(circle at 30% 25%, ${color}1e, transparent 60%),
                radial-gradient(circle at 80% 80%, ${color}10, transparent 55%),
                linear-gradient(180deg, #0c0f18, #070A12)
              `
            }}
          >
            <Gamepad2 size={56} color={color} strokeWidth={1.25} opacity={0.35} />
            <button
              onClick={() => onEdit?.(game)}
              style={{
                border: 'none',
                background: 'transparent',
                color: 'rgba(255,255,255,0.38)',
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: '0.03em',
                cursor: 'pointer',
                padding: '4px 8px',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.38)' }}
            >
              Add wallpaper
            </button>
          </div>
        )}

        {/* LAYER 1 — bottom cinematic fade, dissolves art into the page */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to top, #0B1220 0%, rgba(11,18,32,0.62) 28%, transparent 55%)',
            pointerEvents: 'none'
          }}
        />

        {/* LAYER 2 — left readability gradient, strongest lower-left */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(105deg, rgba(4,6,12,0.55) 0%, rgba(4,6,12,0.22) 30%, transparent 55%)',
            pointerEvents: 'none'
          }}
        />

        {/* LAYER 3 — subtle top fade for back-button readability */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 110,
            background: 'linear-gradient(to bottom, rgba(4,6,12,0.4), transparent)',
            pointerEvents: 'none'
          }}
        />

        {/* BACK BUTTON */}
        <button
          onClick={onBack}
          aria-label="Back to library"
          style={{
            position: 'absolute',
            top: 20,
            left: 20,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '9px 14px',
            borderRadius: 11,
            border: '1px solid rgba(255,255,255,0.10)',
            background: 'rgba(10,12,20,0.45)',
            backdropFilter: 'blur(10px)',
            color: 'rgba(255,255,255,0.85)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s ease, border-color 0.2s ease, transform 0.2s ease'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
            e.currentTarget.style.border = '1px solid rgba(255,255,255,0.16)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(10,12,20,0.45)'
            e.currentTarget.style.border = '1px solid rgba(255,255,255,0.10)'
          }}
        >
          <ArrowLeft size={14} />
          Library
        </button>

        {/* HERO IDENTITY + PRIMARY ACTIONS — constrained cinematic container */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 5,
            maxWidth: 1500,
            margin: '0 auto',
            width: '100%',
            padding: '0 40px 36px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 20
          }}
        >
          <div style={{ maxWidth: 850, minWidth: 0 }}>
            <div
              style={{
                fontSize: 'clamp(36px, 4.5vw, 68px)',
                fontWeight: 800,
                lineHeight: 1.02,
                letterSpacing: '-0.025em',
                color: '#f9fafb',
                textShadow: '0 4px 24px rgba(0,0,0,0.5)',
                wordBreak: 'break-word'
              }}
            >
              {game.name}
            </div>

            {/* Clean inline metadata — genre dot, rarity, favorite. Not
                filter-chip pills; this reads as game metadata. */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginTop: 14,
                fontSize: 12.5,
                color: 'rgba(255,255,255,0.6)',
                fontWeight: 500,
                flexWrap: 'wrap'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: color,
                    boxShadow: `0 0 8px ${color}80`
                  }}
                />
                {game.genre}
              </span>

              {getRarity(game) !== 'common' && (
                <>
                  <span style={{ opacity: 0.3 }}>•</span>
                  <span style={{ color: rarity.glow, fontWeight: 600 }}>
                    {getRarity(game)}
                  </span>
                </>
              )}

              {fav && (
                <>
                  <span style={{ opacity: 0.3 }}>•</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#ff8080' }}>
                    <Heart size={11} fill="#ff4d4f" />
                    Favorite
                  </span>
                </>
              )}
            </div>
          </div>

          {/* PRIMARY ACTION CLUSTER — Play, Favorite, More, one control group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={handleLaunch}
              aria-label="Launch game"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                height: 50,
                padding: '0 28px',
                borderRadius: 13,
                border: '1px solid rgba(255,255,255,0.18)',
                background: color,
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '0.02em',
                cursor: 'pointer',
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.25), 0 8px 20px ${color}38`,
                transition: 'transform 0.2s cubic-bezier(.16,1,.3,1)'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0px)' }}
              onMouseDown={e => { e.currentTarget.style.transform = 'translateY(-2px) scale(0.98)' }}
              onMouseUp={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
            >
              <Play size={16} />
              Play
            </button>

            <ActionIconBtn
              active={fav}
              onClick={handleToggleFavorite}
              icon={<Heart size={17} fill={fav ? '#ff4d4f' : 'none'} />}
              aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
            />

            <div ref={menuRef} style={{ position: 'relative' }}>
              <ActionIconBtn
                onClick={() => setMenuOpen(o => !o)}
                icon={<MoreVertical size={17} />}
                aria-label="Game options"
              />

              {menuOpen && (
                <div
                  onClick={e => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    bottom: 56,
                    right: 0,
                    zIndex: 50,
                    minWidth: 190,
                    borderRadius: 16,
                    padding: 5,
                    background: 'rgba(10, 12, 20, 0.96)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    border: '1px solid rgba(139,92,246,0.22)',
                    boxShadow:
                      '0 24px 60px rgba(0,0,0,0.82), 0 0 0 1px rgba(255,255,255,0.04), 0 0 35px rgba(139,92,246,0.18)',
                    overflow: 'hidden'
                  }}
                >
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
                    icon={<FolderOpen size={12} />}
                    label="Open File Location"
                    onClick={handleRevealPath}
                  />
                  <MenuItem
                    icon={<Trash2 size={12} />}
                    label="Remove"
                    danger
                    onClick={handleRemove}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================= OVERVIEW NAVIGATION STRIP ================= */}
      <div
        style={{
          maxWidth: 1400,
          width: '100%',
          margin: '0 auto',
          padding: '0 40px',
          borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            padding: '14px 0',
            fontSize: 11.5,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: '#f3f4f6',
            borderBottom: `2px solid ${color}`,
            marginBottom: -1
          }}
        >
          OVERVIEW
        </div>
      </div>

      {/* ================= CONTENT ================= */}
      <div
        style={{
          maxWidth: 1400,
          width: '100%',
          margin: '0 auto',
          padding: '36px 40px 48px'
        }}
      >
        <div className="gd-content-grid">
          <div style={{ minWidth: 0 }}>
            {game.description && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 3, height: 20, borderRadius: 2, background: color }} />
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#f9fafb' }}>
                    About this game
                  </div>
                </div>
                <p
                  style={{
                    fontSize: 14.5,
                    lineHeight: 1.75,
                    color: 'rgba(255,255,255,0.7)',
                    maxWidth: 760
                  }}
                >
                  {game.description}
                </p>
              </div>
            )}
          </div>

          <div
            style={{
              borderRadius: 17,
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.06)',
              padding: '18px 20px',
              height: 'fit-content'
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#e5e7eb',
                letterSpacing: '0.04em',
                marginBottom: 14
              }}
            >
              Game information
            </div>

            <InfoRow label="Genre" value={game.genre} />
            {getRarity(game) !== 'common' && (
              <InfoRow label="Rarity" value={getRarity(game)} valueColor={rarity.glow} />
            )}
            <InfoRow label="Favorite" value={fav ? 'Yes' : 'No'} />
            {game.path && (
              <InfoRow label="Location" value={shortenPath(game.path)} title={game.path} last />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// 48×48 action-cluster button, visually consistent with GameCard's IconBtn
// but sized for the hero's primary control group. Kept local to this file
// so GameCard's own 28px IconBtn (used on every card) is never resized.
function ActionIconBtn({ icon, onClick, active, 'aria-label': ariaLabel }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      aria-label={ariaLabel}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 48,
        height: 48,
        borderRadius: 13,
        border: '1px solid rgba(255,255,255,0.12)',
        background: hover || active ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#e5e7eb',
        cursor: 'pointer',
        transition: 'background 0.2s ease, border-color 0.2s ease'
      }}
    >
      {icon}
    </button>
  )
}

function InfoRow({ label, value, valueColor, title, last }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div
      title={title}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '11px 0',
        borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.05)'
      }}
    >
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 13,
          color: valueColor || 'rgba(255,255,255,0.88)',
          fontWeight: 600,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '60%',
          textAlign: 'right'
        }}
      >
        {value}
      </div>
    </div>
  )
}
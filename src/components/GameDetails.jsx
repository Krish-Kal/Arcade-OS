import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  Play,
  MoreVertical,
  Heart,
  FolderOpen,
  Trash2,
  Gamepad2,
  ImageOff,
  Sparkles,
  HardDrive,
  CalendarDays,
  Building2,
  MapPin,
  MonitorCheck,
  Image as ImageIcon
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
  const [copyPathLabel, setCopyPathLabel] = useState('Copy')
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
  const coverSrc = game.image || null

  const handleCopyLocation = useCallback(async () => {
    if (!game.path) return
    try {
      await navigator.clipboard.writeText(game.path)
      setCopyPathLabel('Copied')
      window.setTimeout(() => setCopyPathLabel('Copy'), 1500)
    } catch (err) {
      console.error('Failed to copy game path:', err)
    }
  }, [game.path])

const handleWallpaperLoad = useCallback((e) => {
    setWallpaperLoaded(true)
    if (game.wallpaperPosition || game.heroPosition) return
    const { naturalWidth, naturalHeight } = e.target
    if (!naturalWidth || !naturalHeight) return
    const aspect = naturalWidth / naturalHeight
    // object-fit: cover on a full-bleed hero crops whatever doesn't fit the
    // frame's own aspect ratio. Rather than boxing the image, we shift the
    // vertical anchor per source aspect ratio so the subject's top —
    // typically the most important part of tall or square art — is the
    // last thing to fall outside the visible crop.
    let anchorY
    if (aspect <= 0.85) {
      // Portrait / tall art — anchor well toward the top.
      anchorY = 15
    } else if (aspect <= 1.15) {
      // Square-ish art — moderate upward bias.
      anchorY = 25
    } else if (aspect <= 2.4) {
      // Standard wide wallpaper — mild upward bias is enough since the
      // frame is already close to the source's own proportions.
      anchorY = 40
    } else {
      // Ultra-wide art — vertical crop loss is minimal either way, so it
      // can sit centered without risk to the composition.
      anchorY = 50
    }
    setWallpaperPosition(`50% ${anchorY}%`)
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

  // Derived, purely presentational values — none of these touch game
  // logic or state, they only decide whether an optional premium section
  // has real data to show.
  const installedValue =
    typeof game.installed === 'boolean' ? (game.installed ? 'Installed' : 'Not installed') : null

  return (
    <div
      style={{
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: '#05070D',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0px)' : 'translateY(6px)',
        transition:
          'opacity 320ms cubic-bezier(0.22, 1, 0.36, 1), transform 320ms cubic-bezier(0.22, 1, 0.36, 1)'
      }}
    >
      {/* Scoped styles — the only place selectors/keyframes are needed, so
          they're kept local rather than pulling in a styling system. */}
      <style>{`
        .gd-content-grid {
          display: flex;
          justify-content: flex-end;
        }

        .gd-hero-row {
          display: flex;
          align-items: flex-end;
          gap: 40px;
        }
        @media (max-width: 760px) {
          .gd-hero-cover { display: none; }
        }

        @keyframes gd-rise {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes gd-kenburns {
          from { transform: scale(1); }
          to { transform: scale(1.03); }
        }

        .gd-section {
          animation: gd-rise 420ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .gd-about p::first-line {
          color: #F8FAFC;
        }



        .gd-cover-wrap {
          perspective: 900px;
        }
        .gd-cover-img {
          display: block;
          width: 168px;
          height: 224px;
          object-fit: cover;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.14);
          box-shadow:
            0 24px 48px -16px rgba(0,0,0,0.6),
            0 4px 16px rgba(0,0,0,0.4),
            inset 0 1px 0 rgba(255,255,255,0.08);
          transition: transform 320ms cubic-bezier(0.22,1,0.36,1), box-shadow 320ms ease, border-color 320ms ease;
          transform: rotateY(0deg) translateY(0);
        }
        .gd-cover-wrap:hover .gd-cover-img {
          transform: rotateY(3deg) translateY(-4px);
          border-color: rgba(255,255,255,0.24);
          box-shadow:
            0 32px 56px -16px rgba(0,0,0,0.65),
            0 6px 20px rgba(0,0,0,0.45),
            inset 0 1px 0 rgba(255,255,255,0.1);
        }

        .gd-stat-card {
          border-radius: 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          padding: 14px 16px;
          transition: background 200ms ease, border-color 200ms ease, transform 200ms cubic-bezier(0.16,1,0.3,1);
        }
        .gd-stat-card:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.14);
          transform: translateY(-2px);
        }

        .gd-tile {
          border-radius: 12px;
          background: rgba(255,255,255,0.035);
          border: 1px solid rgba(255,255,255,0.07);
          padding: 13px 14px;
          transition: background 200ms ease, border-color 200ms ease, transform 200ms cubic-bezier(0.16,1,0.3,1);
        }
        .gd-tile:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.13);
          transform: translateY(-1px);
        }

        .gd-group-label {
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.28);
          margin: 24px 0 10px;
        }
        .gd-group-label:first-child {
          margin-top: 0;
        }
/* ============ GAME INFORMATION PANEL ============ */

.gd-info-panel {
  position: relative;
  width: 360px;
  max-width: 100%;
  padding: 24px;
  border-radius: 16px;
  background:
    radial-gradient(120% 140% at 0% 0%, rgba(124, 58, 237, 0.10), transparent 55%),
    radial-gradient(120% 140% at 100% 100%, rgba(30, 64, 175, 0.12), transparent 55%),
    linear-gradient(165deg, rgba(30, 27, 60, 0.55), rgba(12, 12, 24, 0.55));
  border: 1px solid rgba(139, 92, 246, 0.18);
  box-shadow:
    0 20px 50px -20px rgba(76, 29, 149, 0.35),
    inset 0 1px 0 rgba(255,255,255,0.06),
    inset 0 0 40px rgba(99, 102, 241, 0.04);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
}

.gd-info-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 20px;
  margin-bottom: 6px;
  border-bottom: 1px solid rgba(139, 92, 246, 0.14);
}
.gd-info-icon-box-header {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;

  background: linear-gradient(160deg, #4C3A8A 0%, #2A2154 55%, #1B1638 100%);
  border: 1px solid rgba(167, 139, 250, 0.35);
  color: #C4B5FD;

  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.08),
    0 0 16px rgba(124, 58, 237, 0.25);
}
.gd-info-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;

  color: #C7B8F5;
  text-shadow: 0 0 14px rgba(124, 58, 237, 0.25);
}

.gd-info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 10px;
  margin: 0 -10px;
  border-radius: 10px;
  transition: background 150ms ease;
}
.gd-info-row:hover {
  background: rgba(124, 92, 246, 0.06);
}
.gd-info-row + .gd-info-row {
  border-top: 1px solid rgba(139, 92, 246, 0.10);
}
.gd-info-row-left { display: flex; align-items: center; gap: 12px; min-width: 0; }

.gd-info-icon-box {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.035);
  border: 1px solid rgba(255,255,255,0.07);
  color: rgba(255,255,255,0.5);
  transition: box-shadow 200ms ease, border-color 200ms ease;
}

/* Row 2 in the panel (Genre) — royal purple */
.gd-info-panel .gd-info-row:nth-child(2) .gd-info-icon-box {
  background: linear-gradient(160deg, #5B3E96 0%, #362761 60%, #201735 100%);
  border-color: rgba(167, 139, 250, 0.4);
  color: #D8CCFB;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.08),
    0 0 14px rgba(124, 58, 237, 0.22);
}

/* Row 3 in the panel (Favorite) — rich violet / plum */
.gd-info-panel .gd-info-row:nth-child(3) .gd-info-icon-box {
  background: linear-gradient(160deg, #6B3468 0%, #3D2145 60%, #221530 100%);
  border-color: rgba(196, 132, 214, 0.35);
  color: #E8C7EA;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.08),
    0 0 14px rgba(157, 60, 141, 0.22);
}

/* Row 4 in the panel (Location) — deep sapphire / midnight blue */
.gd-info-panel .gd-info-row:nth-child(4) .gd-info-icon-box {
  background: linear-gradient(160deg, #294A8C 0%, #1B2A54 60%, #131B33 100%);
  border-color: rgba(96, 145, 230, 0.35);
  color: #BBD3FA;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.08),
    0 0 14px rgba(37, 99, 235, 0.22);
}

.gd-info-label {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.4);
  white-space: nowrap;
}
.gd-info-value {
  font-size: 14px;
  font-weight: 500;
  color: rgba(255,255,255,0.92);
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}
.gd-info-value-mono {
  font-family: 'SF Mono', 'Roboto Mono', ui-monospace, monospace;
  font-size: 12.5px;
  color: rgba(255,255,255,0.75);
  max-width: 148px;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.gd-info-copy-btn {
  flex-shrink: 0;
  border: 1px solid rgba(255,255,255,0.1);
  background: transparent;
  color: rgba(255,255,255,0.5);
  border-radius: 7px;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: background 150ms ease, border-color 150ms ease, color 150ms ease;
}
.gd-info-copy-btn:hover {
  background: rgba(255,255,255,0.05);
  border-color: rgba(255,255,255,0.18);
  color: rgba(255,255,255,0.85);
}

@media (prefers-reduced-motion: reduce) {
  .gd-info-row, .gd-info-copy-btn { transition: none !important; }
}

        @media (prefers-reduced-motion: reduce) {
          .gd-section, .gd-navtab::after, .gd-wallpaper-zoom { animation: none !important; }
          .gd-cover-img, .gd-stat-card, .gd-tile { transition: none !important; }
        }
      `}</style>

      {/* ================= CINEMATIC HERO ================= */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 'clamp(480px, 60vh, 680px)',
          flexShrink: 0,
          overflow: 'hidden',
          background: '#05070D'
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
                  radial-gradient(circle at 30% 20%, ${color}14, transparent 60%),
                  linear-gradient(180deg, #0c0f18, #070A12)
                `
              }}
            />
            <div className="gd-wallpaper-zoom" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
              <img
                src={heroSrc}
                alt={`${game.name} wallpaper`}
                draggable={false}
                onLoad={handleWallpaperLoad}
                onError={handleWallpaperError}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: game.wallpaperPosition || game.heroPosition || wallpaperPosition,
                  display: 'block',
                  backfaceVisibility: 'hidden',
                  opacity: wallpaperLoaded ? 1 : 0,
                  transition: 'opacity 500ms ease'
                }}
              />
            </div>
            {/* Rich purple/blue cinematic wash — replaces a flat single-tint
                glow with a deeper, layered ambient finish that still lets
                the wallpaper read as full-bleed rather than boxed. */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `
                  radial-gradient(ellipse 900px 520px at 12% 100%, rgba(124,58,237,0.16), transparent 62%),
                  radial-gradient(ellipse 760px 460px at 100% 0%, rgba(37,99,235,0.12), transparent 60%)
                `,
                pointerEvents: 'none'
              }}
            />
            {/* Very subtle genre-tinted ambient light — an accent, not a glow */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `radial-gradient(ellipse 700px 420px at 8% 100%, ${color}14, transparent 60%)`,
                pointerEvents: 'none'
              }}
            />
            {/* Faint vignette so bright wallpapers don't fight the UI */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                boxShadow: 'inset 0 0 180px 50px rgba(0,0,0,0.4)',
                pointerEvents: 'none'
              }}
            />
          </>
        ) : (
          // ---- PREMIUM NO-WALLPAPER STATE ----
          // Intentional empty state, not a broken-image state: ambient
          // genre-tinted background, a large low-opacity illustration, and
          // a quiet path back into the existing Modify Game flow.
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 18,
              background: `
                radial-gradient(circle at 30% 25%, ${color}16, transparent 60%),
                linear-gradient(180deg, #0c0f18, #05070D)
              `
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 108,
                height: 108,
                borderRadius: 24,
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.02)'
              }}
            >
              <ImageIcon size={40} color={color} strokeWidth={1.1} opacity={0.4} />
            </div>
            <button
              onClick={() => onEdit?.(game)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.04)',
                color: 'rgba(255,255,255,0.75)',
                fontSize: 12.5,
                fontWeight: 600,
                letterSpacing: '0.02em',
                borderRadius: 10,
                cursor: 'pointer',
                padding: '9px 16px',
                transition: 'background 0.2s ease, border-color 0.2s ease, transform 0.2s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <ImageOff size={13} />
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
              'linear-gradient(to top, #05070D 0%, rgba(5,7,13,0.78) 20%, rgba(5,7,13,0.4) 40%, transparent 64%)',
            pointerEvents: 'none'
          }}
        />

        {/* LAYER 2 — left readability gradient, strongest lower-left */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(105deg, rgba(4,6,12,0.62) 0%, rgba(4,6,12,0.28) 30%, transparent 55%)',
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
            height: 120,
            background: 'linear-gradient(to bottom, rgba(4,6,12,0.45), transparent)',
            pointerEvents: 'none'
          }}
        />

        {/* BACK BUTTON */}
        <button
          onClick={onBack}
          aria-label="Back to library"
          style={{
            position: 'absolute',
            top: 24,
            left: 24,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '10px 16px',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.10)',
            background: 'rgba(10,12,20,0.45)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            color: 'rgba(255,255,255,0.85)',
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.01em',
            cursor: 'pointer',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
            transition: 'background 0.2s ease, border-color 0.2s ease, transform 0.2s ease'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.09)'
            e.currentTarget.style.border = '1px solid rgba(255,255,255,0.18)'
            e.currentTarget.style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(10,12,20,0.45)'
            e.currentTarget.style.border = '1px solid rgba(255,255,255,0.10)'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          <ArrowLeft size={14} />
          Library
        </button>

        {/* HERO COMPOSITION — cover art, title, metadata, actions */}
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
            padding: '0 48px 48px'
          }}
        >
          <div className="gd-hero-row">
            {coverSrc && (
              <div className="gd-hero-cover gd-cover-wrap">
                <img src={coverSrc} alt={`${game.name} cover art`} className="gd-cover-img" draggable={false} />
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 28 }}>
              <div style={{ maxWidth: 880, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 'clamp(40px, 4.8vw, 76px)',
                    fontWeight: 800,
                    lineHeight: 1.04,
                    letterSpacing: '-0.035em',
                    color: '#F8FAFC',
                    textShadow: '0 8px 40px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.4)',
                    wordBreak: 'break-word'
                  }}
                >
                  {game.name}
                </div>

                {/* Premium inline metadata — genre dot, edition/rarity chip,
                    favorite indicator, install state. Reads as launcher
                    metadata, not filter chips. */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    marginTop: 16,
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.68)',
                    fontWeight: 500,
                    flexWrap: 'wrap'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: color
                      }}
                    />
                    {game.genre}
                  </span>

                  {getRarity(game) !== 'common' && (
                    <>
                      <span style={{ opacity: 0.2 }}>·</span>
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          color: rarity.glow,
                          fontWeight: 700,
                          textTransform: 'capitalize',
                          letterSpacing: '0.01em'
                        }}
                      >
                        <Sparkles size={12} />
                        {getRarity(game)}
                      </span>
                    </>
                  )}

                  {fav && (
                    <>
                      <span style={{ opacity: 0.2 }}>·</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'rgba(255,255,255,0.68)' }}>
                        <Heart size={12} fill="#ff4d4f" color="#ff4d4f" />
                        Favorite
                      </span>
                    </>
                  )}

                  {installedValue && (
                    <>
                      <span style={{ opacity: 0.2 }}>·</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'rgba(255,255,255,0.55)' }}>
                        <MonitorCheck size={12} />
                        {installedValue}
                      </span>
                    </>
                  )}

                  {game.developer && (
                    <>
                      <span style={{ opacity: 0.2 }}>·</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'rgba(255,255,255,0.55)' }}>
                        <Building2 size={12} />
                        {game.developer}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* PRIMARY ACTION CLUSTER — Play, Favorite, More, one control group */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  onClick={handleLaunch}
                  aria-label="Launch game"
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    height: 52,
                    padding: '0 30px',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.22)',
                    background: color,
                    color: '#fff',
                    fontSize: 14.5,
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -12px 20px -10px rgba(0,0,0,0.25), 0 10px 26px -6px ${color}55, 0 2px 8px rgba(0,0,0,0.3)`,
                    transition: 'transform 220ms cubic-bezier(0.16,1,0.3,1), box-shadow 220ms ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)'
                  }}
                  onMouseDown={e => {
                    e.currentTarget.style.transform = 'translateY(-1px) scale(0.98)'
                  }}
                  onMouseUp={e => {
                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'
                  }}
                >
                  {/* subtle inner highlight — CSS only, no libraries */}
                  <span
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.22), transparent 55%)',
                      pointerEvents: 'none'
                    }}
                  />
                  <Play size={17} style={{ position: 'relative' }} fill="#fff" />
                  <span style={{ position: 'relative' }}>Play</span>
                </button>

                <ActionIconBtn
                  active={fav}
                  onClick={handleToggleFavorite}
                  icon={<Heart size={18} fill={fav ? '#ff4d4f' : 'none'} color={fav ? '#ff4d4f' : 'currentColor'} />}
                  glowColor="#ff4d4f"
                  aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
                />

                <div ref={menuRef} style={{ position: 'relative' }}>
                  <ActionIconBtn
                    onClick={() => setMenuOpen(o => !o)}
                    icon={<MoreVertical size={18} />}
                    glowColor={color}
                    aria-label="Game options"
                  />

                  {menuOpen && (
                    <div
                      onClick={e => e.stopPropagation()}
                      style={{
                        position: 'absolute',
                        bottom: 60,
                        right: 0,
                        zIndex: 50,
                        minWidth: 200,
                        borderRadius: 14,
                        padding: 6,
                        background: 'rgba(10, 12, 20, 0.96)',
                        backdropFilter: 'blur(24px)',
                        WebkitBackdropFilter: 'blur(24px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 24px 60px rgba(0,0,0,0.82), 0 0 0 1px rgba(255,255,255,0.04)',
                        overflow: 'hidden',
                        animation: 'gd-rise 180ms cubic-bezier(0.22,1,0.36,1) both'
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
        </div>
      </div>

      {/* ================= OVERVIEW NAVIGATION STRIP ================= */}
      <div
        style={{
          maxWidth: 1400,
          width: '100%',
          margin: '0 auto',
          padding: '0 48px',
          borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}
      >
        <div
          className="gd-navtab"
          style={{
            display: 'inline-flex',
            padding: '18px 0',
            fontSize: 11.5,
            fontWeight: 700,
            letterSpacing: '0.14em',
            color: '#F8FAFC',
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
          padding: '48px 48px 64px'
        }}
      >
<div className="gd-content-grid">

 <div
            className="gd-section gd-info-panel"
            style={{ '--gd-accent': color, height: 'fit-content' }}
          >
            <div className="gd-info-header">
              <div className="gd-info-icon-box-header">
                <Gamepad2 size={13} strokeWidth={1.8} />
              </div>
              <span className="gd-info-title">Game Information</span>
            </div>

            <InspectorRow icon={<Gamepad2 size={13} />} label="Genre" value={game.genre} accent={color} />
            <InspectorRow icon={<Heart size={13} />} label="Favorite" value={fav ? 'Yes' : 'No'} accent={color} />
            {game.path && (
              <InspectorRow
                icon={<MapPin size={13} />}
                label="Location"
                value={shortenPath(game.path)}
                title={game.path}
                actionLabel={copyPathLabel}
                onActionClick={handleCopyLocation}
                mono
                accent={color}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}



function InspectorRow({ icon, label, value, title, actionLabel, onActionClick, mono, accent, variant }) {
  return (
    <div className="gd-info-row" title={title} style={{ '--gd-accent': accent }}>
      <div className="gd-info-row-left">
        <span className="gd-info-icon-box">{icon}</span>
        <span className="gd-info-label">{label}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, justifyContent: 'flex-end' }}>
        {variant === 'badge' && (
          <span className="gd-info-badge">{value}</span>
        )}

        {variant === 'favorite' && (
          <span className="gd-info-fav">
            <Heart size={13} fill={value ? '#ff4d4f' : 'none'} color={value ? '#ff4d4f' : 'rgba(255,255,255,0.4)'} />
            {value ? 'Favorite' : 'Not favorited'}
          </span>
        )}

        {!variant && (
          <span className={mono ? 'gd-info-value-mono' : 'gd-info-value'}>
            {value}
          </span>
        )}

        {typeof onActionClick === 'function' && (
          <button className="gd-info-copy-btn" onClick={onActionClick}>
            {actionLabel || 'Action'}
          </button>
        )}
      </div>
    </div>
  )
}

// 48×48 action-cluster button, visually consistent with GameCard's IconBtn
// but sized for the hero's primary control group. Kept local to this file
// so GameCard's own 28px IconBtn (used on every card) is never resized.
function ActionIconBtn({ icon, onClick, active, glowColor = '#ffffff', 'aria-label': ariaLabel }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      aria-label={ariaLabel}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 50,
        height: 50,
        borderRadius: 12,
        border: `1px solid ${hover || active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.12)'}`,
        background: hover || active ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.045)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: active ? glowColor : '#e5e7eb',
        cursor: 'pointer',
        boxShadow: hover
          ? `inset 0 1px 0 rgba(255,255,255,0.12), 0 6px 18px -6px rgba(0,0,0,0.5)`
          : 'inset 0 1px 0 rgba(255,255,255,0.06)',
        transform: hover ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'background 200ms ease, border-color 200ms ease, box-shadow 200ms ease, transform 200ms cubic-bezier(0.16,1,0.3,1)'
      }}
    >
      {icon}
    </button>
  )
}

// Premium information tile — replaces the old settings-style row list with
// a bordered, hoverable card, grouped two-up in a grid by the caller.

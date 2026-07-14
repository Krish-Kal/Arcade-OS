// ═══════════════════════════════════════════════════════════════
// ARCADE OS — Home Dashboard v2.0
// TRUE TRANSLUCENT GLASS EDITION
//
// GLASS CHANGES FROM v1:
// ✦ CommandBar: removed opaque rgba(11,16,32,0.92) → glass-modal system
// ✦ HeroCard art area: removed solid T.card bg → tinted glass panel
// ✦ HeroCard info area: transparent glass, not opaque dark block
// ✦ Home root: removed T.bg solid → transparent (desktop shows through)
// ✦ GlassPanel: upgraded to proper glass-card utility
// ✦ Stats sidebar: glass-ultra panel (most transparent, right side)
// ✦ PillButton: true glass pill with blue tint on hover
// ✦ TimelineRow icons: glass-pill style, no opaque backgrounds
// ✦ All section labels: retain, no opacity changes needed
// ✦ Ambient glow overlay: kept, reduced opacity slightly
//
// Layout, logic, store, component structure: UNCHANGED
// ═══════════════════════════════════════════════════════════════

import React, { useCallback, useMemo, useState, useEffect } from 'react'
import {
  Play, Gamepad2, Grid3X3, TrendingUp, Clock,
  ChevronRight, Zap, Search, Settings, Power, Shield
} from 'lucide-react'
import { useStore } from '../store/useStore'
import StatsPanel from '../components/StatsPanel'
import GlobalSearchBar from '../components/GlobalSearchBar'

/* ─── DESIGN TOKENS ─────────────────────────────────────────── */
/*
  NOTE: T.bg, T.elevated, T.card are now used ONLY for tinting,
  not as solid backgrounds. All surfaces layer glass on top.
*/
const T = {
  // Core tints (kept for reference, used at low opacity)
  bg:          'rgba(7,10,18,0)',         // transparent — desktop shows through
  elevated:    'rgba(11,16,32,0)',        // transparent shell
  card:        'rgba(13,18,38,0)',        // transparent card shell

  // Accents
  purple:      '#8B5CF6',
  blue:        '#60A5FA',
  blueDeep:    '#5b8cff',

  // Text
  textPrimary: '#f0f2ff',
  textMuted:   '#9AA3B2',
  textDim:     '#6c7399',

  // Borders (used sparingly — glass borders from CSS vars)
  border:      'rgba(255,255,255,0.07)',
  borderHover: 'rgba(139,92,246,0.28)',

  // Shadows
  shadowLow:   '0 4px 24px rgba(0,0,0,0.38)',
  shadowHigh:  '0 20px 64px rgba(0,0,0,0.58)',
  shadowGlow:  '0 0 32px rgba(139,92,246,0.14)',
}

/* ─── GLOBAL STYLES (injected once) ─────────────────────────── */
/*
  GLASS SYSTEM STYLES:
  All hover transitions, card states, and glass renders injected here.
  Keyed to new glass system — matches global.css utility classes.
*/
const GLOBAL_CSS = `
  .aos-root * { box-sizing: border-box; margin: 0; padding: 0; }
  .aos-root { font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif; }

  .aos-scroll::-webkit-scrollbar { width: 4px; }
  .aos-scroll::-webkit-scrollbar-track { background: transparent; }
  .aos-scroll::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.18); border-radius: 2px; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
  }
  @keyframes glass-pulse {
    0%, 100% { border-color: rgba(139,92,246,0.14); }
    50%       { border-color: rgba(139,92,246,0.30); }
  }

  .aos-fade-up {
    opacity: 0;
    animation: fadeUp 0.48s cubic-bezier(0.16,1,0.3,1) forwards;
  }

  /* ── HERO CARD ───────────────────────────────────────── */
  /*
    FIXED: Was using T.card as opaque background.
    Now: glass surface with tinted gradient art area.
    Desktop subtly visible through the card body.
  */
  .hero-card {
    transition:
      transform 0.28s cubic-bezier(0.2,0.8,0.2,1),
      box-shadow 0.28s cubic-bezier(0.2,0.8,0.2,1),
      border-color 0.28s cubic-bezier(0.2,0.8,0.2,1),
      background 0.28s cubic-bezier(0.2,0.8,0.2,1);
  }
  .hero-card:hover {
    transform: translateY(-5px) scale(1.015) !important;
    box-shadow:
      0 28px 64px rgba(0,0,0,0.62),
      0 0 0 1px rgba(139,92,246,0.28),
      0 0 40px rgba(139,92,246,0.08),
      inset 0 1px 0 rgba(255,255,255,0.10) !important;
    border-color: rgba(139,92,246,0.28) !important;
  }

  .hero-play { opacity: 0; transition: opacity 0.22s; }
  .hero-card:hover .hero-play { opacity: 1; }

  /* ── ART AREA glass reflection ───────────────────────── */
  .hero-art::after {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 50%;
    background: linear-gradient(
      180deg,
      rgba(255,255,255,0.06) 0%,
      transparent 100%
    );
    pointer-events: none;
    z-index: 1;
  }

  /* ── TIMELINE ROW ────────────────────────────────────── */
  .tl-row { transition: background 0.16s; }
  .tl-row:hover {
    background: rgba(139,92,246,0.06) !important;
    border-radius: 9px;
  }
  .tl-launch { opacity: 0; transition: opacity 0.16s; }
  .tl-row:hover .tl-launch { opacity: 1; }

  /* ── COMMAND BAR ─────────────────────────────────────── */
  .cmd-btn { transition: all 0.2s; }
  .cmd-btn:hover {
    background: rgba(139,92,246,0.12) !important;
    border-color: rgba(139,92,246,0.32) !important;
    color: #a78bfa !important;
  }

  /* ── SECTION ACTIONS ─────────────────────────────────── */
  .sec-action-btn { transition: opacity 0.16s, color 0.16s, transform 0.16s; }
  .sec-action-btn:hover { opacity: 1 !important; color: #f0f2ff !important; transform: translateX(2px); }

  /* ── STAT CARD ───────────────────────────────────────── */
  .stat-card-inner {
    transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
  }
  .stat-card-inner:hover {
    background: rgba(255,255,255,0.04) !important;
    border-color: rgba(139,92,246,0.22) !important;
    box-shadow: 0 0 24px rgba(139,92,246,0.09) !important;
  }
`

function useGlobalStyle(css) {
  useEffect(() => {
    const id = 'aos-global-style'
    if (document.getElementById(id)) return
    const el = document.createElement('style')
    el.id = id
    el.textContent = css
    document.head.appendChild(el)
  }, [])
}

/* ─── ROOT ───────────────────────────────────────────────────── */
/*
  FIXED: Was solid T.bg (#070A12) — completely opaque, killed all
  desktop visibility and glass rendering from parent layers.
  
  Now: fully transparent container. Glass comes from the workspace-main
  and individual glass components. Desktop shows through all layers.
*/
export default function Home() {
  useGlobalStyle(GLOBAL_CSS)

  const games = useStore(state => state.games)
  const recentLaunches = useStore(state => state.recentLaunches)
  const launchItem = useStore(state => state.launchItem)
  const setActivePage = useStore(state => state.setActivePage)
  const [now] = useState(Date.now())

  const featured = useMemo(
    () => [...games].sort((a, b) => b.launchCount - a.launchCount).slice(0, 3),
    [games]
  )
  const recents = useMemo(() => recentLaunches.slice(0, 6), [recentLaunches])

  const todayItems = useMemo(() => recents.filter(i => now - (i.launchedAt || 0) < 86400000), [now, recents])
  const yesterItems = useMemo(() => recents.filter(i =>
    now - (i.launchedAt || 0) >= 86400000 &&
    now - (i.launchedAt || 0) < 172800000
  ), [now, recents])
  const launchRecent = useCallback((item) => launchItem(item, item.type), [launchItem])

  return (
    <div className="aos-root" style={{
      height: '100%',
      /* 
        CRITICAL FIX: Was T.bg = '#070A12' (fully opaque).
        Now transparent. Desktop + workspace-main glass shows through.
      */
      background: 'transparent',
      color: T.textPrimary,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div
        className="aos-scroll"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '32px 44px 48px',
          /* Transparent — glass from workspace-main bleeds through */
          background: 'transparent',
        }}
      >
        {/* 
          Ambient glow overlay — kept for cinematic depth.
          FIXED: opacity reduced slightly, uses blue tint not purple fog.
          This adds atmosphere without blocking desktop.
        */}
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          height: 320,
          background: 'radial-gradient(ellipse 58% 38% at 28% 0%, rgba(91,140,255,0.05) 0%, transparent 68%)',
          pointerEvents: 'none',
          zIndex: 0,
        }} />

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 300px',
          gap: 18,
          alignItems: 'start',
          position: 'relative',
          zIndex: 1,
          maxWidth: 1600,
          margin: '0 auto',
        }}>
          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

            {/* FEATURED GAMES */}
            <Section
              title="Top Games"
              icon={<Gamepad2 size={12} />}
              action="Explore"
              onAction={() => setActivePage('games')}
              delay={0}
            >
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 16,
              }}>
                {featured.map((game, i) => (
                  <HeroCard
                    key={game.id}
                    item={game}
                    rank={i + 1}
                    launchItem={launchItem}
                    delay={i * 70}
                  />
                ))}
              </div>
            </Section>

            {/* RECENT ACTIVITY */}
            {recents.length > 0 && (
              <Section
                title="Recent Activity"
                icon={<Clock size={12} />}
                delay={120}
              >
                <Timeline
                  todayItems={todayItems}
                  yesterItems={yesterItems}
                  now={now}
                  onLaunch={launchRecent}
                />
              </Section>
            )}
          </div>

          {/* RIGHT COLUMN — Stats */}
          <div style={{
            position: 'sticky',
            top: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            width: 300,
          }}>
            <div className="aos-fade-up" style={{ animationDelay: '40ms', width: '100%' }}>
              <StatsPanel />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── COMMAND BAR ────────────────────────────────────────────── */
/*
  FIXED: Was rgba(11,16,32,0.92) — nearly fully opaque, zero desktop visibility.
  
  Now: true glass command bar. Uses the glass-modal pattern:
    - Base: rgba(7,9,22,0.52) with light gradient on top
    - backdrop-filter: blur(36px) saturate(160%)
    - subtle top reflection shimmer
  Desktop is softly visible through the blurred glass.
*/
function CommandBar() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 20px',

      /* GLASS COMMAND BAR — replaces opaque rgba(11,16,32,0.92) */
      background: `
        linear-gradient(
          180deg,
          rgba(255,255,255,0.045) 0%,
          rgba(255,255,255,0.000) 100%
        ),
        rgba(7,9,22,0.52)
      `,
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      /* Edge glow for cinematic depth */
      boxShadow: `
        inset 0 -1px 0 rgba(255,255,255,0.03),
        0 1px 0 rgba(0,0,0,0.3),
        0 4px 32px rgba(0,0,0,0.28)
      `,

      backdropFilter:         'blur(36px) saturate(165%) brightness(1.07)',
      WebkitBackdropFilter:   'blur(36px) saturate(165%) brightness(1.07)',
      zIndex: 100,
      flexShrink: 0,
      position: 'relative',
    }}>
      {/* Top reflection line */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: '1px',
        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.14) 30%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0.14) 70%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* Brand mark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{
          width: 30, height: 30,
          borderRadius: 8,
          background: 'linear-gradient(135deg, #5b8cff 0%, #8B5CF6 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 18px rgba(139,92,246,0.32), inset 0 1px 0 rgba(255,255,255,0.2)',
        }}>
          <Zap size={14} color="#fff" strokeWidth={2.5} />
        </div>

        <span style={{
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.15em',
          background: 'linear-gradient(90deg, #f0f2ff 0%, #a0b4ff 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          ARCADE OS
        </span>
      </div>
    </div>
  )
}

/* ─── SECTION ────────────────────────────────────────────────── */
function Section({ title, icon, action, onAction, delay = 0, children }) {
  return (
    <div className="aos-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <SectionLabel title={title} icon={icon} />
        {action && (
          <button className="sec-action-btn" onClick={onAction} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'transparent', border: 'none',
            cursor: 'pointer', color: T.blue, fontSize: 11, opacity: 0.72,
          }}>
            {action} <ChevronRight size={11} />
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

function SectionLabel({ title, icon }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <div style={{
        width: 5, height: 5, borderRadius: '50%',
        background: T.purple, opacity: 0.75,
        boxShadow: '0 0 6px rgba(139,92,246,0.5)',
      }} />
      <span style={{ color: T.textMuted, lineHeight: 1, marginTop: 1 }}>{icon}</span>
      <span style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.13em',
        color: T.textMuted, textTransform: 'uppercase',
      }}>
        {title}
      </span>
    </div>
  )
}

/* ─── HERO CARD ──────────────────────────────────────────────── */
/*
  FIXED: Was using T.card = '#0D1226' as opaque background.
  
  Now: 3-layer glass card:
    Layer 1: Tinted gradient art area (still colored, but translucent)
    Layer 2: Glass info panel (truly translucent, desktop visible)
    Layer 3: Hover reflection overlay
  
  Cards look like smoked glass tiles floating over the desktop.
*/
const CARD_TINTS = [
  /* Purple-dominant */
  {
    art: 'linear-gradient(145deg, rgba(139,92,246,0.18) 0%, rgba(91,140,255,0.10) 100%)',
    glow: 'rgba(139,92,246,0.12)',
  },
  /* Blue-dominant */
  {
    art: 'linear-gradient(145deg, rgba(91,140,255,0.16) 0%, rgba(139,92,246,0.10) 100%)',
    glow: 'rgba(91,140,255,0.10)',
  },
  /* Deep blue-purple */
  {
    art: 'linear-gradient(145deg, rgba(91,140,255,0.12) 0%, rgba(139,92,246,0.18) 100%)',
    glow: 'rgba(139,92,246,0.10)',
  },
]

const HeroCard = React.memo(function HeroCard({ item, rank, launchItem, delay }) {
  const tint = CARD_TINTS[(rank - 1) % 3]
  const onLaunch = useCallback(() => launchItem(item, 'game'), [item, launchItem])

  return (
    <div
      className="hero-card aos-fade-up"
      style={{
        animationDelay: `${delay}ms`,
        borderRadius: 14,
        overflow: 'hidden',
        cursor: 'pointer',
        position: 'relative',

        /* 
          GLASS CARD — replaces opaque T.card background
          Base: dark blue tint at 32% opacity → desktop subtly visible
          Blur: propagates from workspace-main parent
        */
        background: `
          linear-gradient(
            145deg,
            rgba(255,255,255,0.055) 0%,
            rgba(255,255,255,0.010) 100%
          ),
          rgba(11,16,34,0.34)
        `,
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: `
          inset 0 1px 0 rgba(255,255,255,0.07),
          ${T.shadowLow},
          0 0 32px ${tint.glow}
        `,
        /* Note: backdrop-filter on parent (workspace-main) handles main blur.
           Cards get their translucency from low background opacity. */
      }}
    >
      {/* ── ART AREA ── */}
      {/*
        FIXED: Was same T.card opaque bg everywhere.
        Now: tinted acrylic gradient per-card with glass effect.
        Each card feels like a different smoked glass color.
      */}
      <div
        className="hero-art"
        style={{
          height: 106,
          position: 'relative',
          /* Tinted translucent art gradient — desktop shows through subtly */
          background: tint.art,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {item.image && (
          <img
            src={item.image}
            alt={item.name}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 12%',
              transform: 'scale(1.02)',
              zIndex: 0,
            }}
          />
        )}

        {/* Grid texture overlay */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.055,
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(255,255,255,1) 20px),
            repeating-linear-gradient(90deg, transparent, transparent 19px, rgba(255,255,255,1) 20px)
          `,
          zIndex: 0,
        }} />

        {/* Cinematic horizontal sheen */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '40%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 100%)',
          zIndex: 1,
          pointerEvents: 'none',
        }} />

        {!item.image && (
          <Gamepad2
            size={34}
            strokeWidth={1}
            color="rgba(255,255,255,0.22)"
            style={{ position: 'relative', zIndex: 2 }}
          />
        )}

        {/* Rank badge — glass pill */}
        <div style={{
          position: 'absolute', top: 9, left: 9, zIndex: 3,
          padding: '2px 8px',
          borderRadius: 20,
          fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
          background: 'rgba(0,0,0,0.38)',
          border: '1px solid rgba(255,255,255,0.10)',
          color: T.textMuted,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}>
          #{rank}
        </div>

        {/* Hover play overlay */}
        <div className="hero-play" style={{
          position: 'absolute', inset: 0, zIndex: 4,
          background: 'rgba(4,6,16,0.72)',
          backdropFilter: 'blur(2px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <button
            onClick={onLaunch}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 18px', borderRadius: 8,
              background: 'linear-gradient(135deg, #5b8cff 0%, #8B5CF6 100%)',
              border: 'none', color: '#fff', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', letterSpacing: '0.02em',
              boxShadow: '0 4px 16px rgba(139,92,246,0.38)',
            }}
          >
            <Play size={11} fill="#fff" /> Play
          </button>
        </div>
      </div>

      {/* ── INFO AREA ── */}
      {/*
        FIXED: Was inheriting opaque T.card background.
        Now: subtle glass continuation — slightly different tint from art area.
        Creates "two-tone smoked glass" premium look.
      */}
      <div style={{
        padding: '11px 13px 13px',
        /* Slightly darker than art area for contrast hierarchy */
        background: 'linear-gradient(180deg, rgba(7,9,22,0.12) 0%, rgba(7,9,22,0.22) 100%)',
        borderTop: '1px solid rgba(255,255,255,0.045)',
        position: 'relative',
      }}>
        {/* Reflection line at border */}
        <div style={{
          position: 'absolute',
          top: -1, left: '10%', right: '10%',
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)',
          pointerEvents: 'none',
        }} />

        <div style={{ fontSize: 12, fontWeight: 600, color: T.textPrimary }}>{item.name}</div>
        <div style={{ fontSize: 10, color: T.textMuted, marginTop: 3 }}>
          {item.launchCount} plays
        </div>
      </div>
    </div>
  )
})

/* ─── TIMELINE ───────────────────────────────────────────────── */
const Timeline = React.memo(function Timeline({ todayItems, yesterItems, now, onLaunch }) {
  return (
    <div>
      {todayItems.length > 0 && (
        <>
          <GroupLabel text="Today" />
          {todayItems.map((item, i) => (
            <TimelineRow
              key={`${item.id}-${item.launchedAt}`}
              item={item} now={now}
              onLaunch={() => onLaunch(item)}
              isLast={i === todayItems.length - 1 && yesterItems.length === 0}
            />
          ))}
        </>
      )}
      {yesterItems.length > 0 && (
        <>
          <GroupLabel text="Yesterday" />
          {yesterItems.map((item, i) => (
            <TimelineRow
              key={`${item.id}-${item.launchedAt}`}
              item={item} now={now}
              onLaunch={() => onLaunch(item)}
              isLast={i === yesterItems.length - 1}
              faded
            />
          ))}
        </>
      )}
    </div>
  )
})

function GroupLabel({ text }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 600, letterSpacing: '0.12em',
      textTransform: 'uppercase', color: 'rgba(154,163,178,0.40)',
      padding: '4px 0 8px 20px', marginTop: 4,
    }}>
      {text}
    </div>
  )
}

const TimelineRow = React.memo(function TimelineRow({ item, now, onLaunch, isLast, faded }) {
  const handleLaunch = useCallback(() => onLaunch(item), [item, onLaunch])
  const ago    = item.launchedAt ? Math.round((now - item.launchedAt) / 60000) : null
  const agoStr = ago === null ? '' : ago < 60 ? `${ago}m ago` : ago < 1440 ? `${Math.round(ago / 60)}h ago` : 'Yesterday'

  return (
    <div
      className="tl-row"
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '7px 8px 7px 0',
        borderRadius: 9,
        cursor: 'pointer',
        /* Transparent base — glass comes from section/workspace parent */
        background: 'transparent',
      }}
    >
      {/* Timeline dot + connector line */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        width: 20, flexShrink: 0, alignSelf: 'stretch', paddingTop: 5,
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: T.purple,
          opacity: faded ? 0.28 : 0.72,
          flexShrink: 0,
          boxShadow: faded ? 'none' : '0 0 6px rgba(139,92,246,0.45)',
        }} />
        {!isLast && (
          <div style={{
            flex: 1, width: 1,
            background: 'rgba(139,92,246,0.10)',
            marginTop: 4,
          }} />
        )}
      </div>

      {/* Item icon — glass pill */}
      <div style={{
        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
        /* Glass icon container — not opaque */
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: faded ? 0.48 : 1,
      }}>
        {item.type === 'game'
          ? <Gamepad2 size={13} color={T.purple} />
          : <Grid3X3 size={13} color={T.blue} />}
      </div>

      <div style={{ fontSize: 12, color: faded ? T.textMuted : T.textPrimary, flex: 1 }}>
        {item.name}
      </div>
      <div style={{ fontSize: 10, color: T.textMuted, whiteSpace: 'nowrap' }}>{agoStr}</div>

      <button className="tl-launch" onClick={handleLaunch} style={{
        fontSize: 10, padding: '4px 9px', borderRadius: 6, whiteSpace: 'nowrap',
        background: 'rgba(91,140,255,0.10)',
        border: '1px solid rgba(91,140,255,0.20)',
        color: T.blue, cursor: 'pointer', flexShrink: 0,
      }}>
        Launch
      </button>
    </div>
  )
})

/* ─── GLASS PANEL ────────────────────────────────────────────── */
/*
  UPDATED: Now uses the same glass system as global.css.
  Matches the unified glass utility pattern.
  Future pages can use className="glass-card" for the same look.
*/
export function GlassPanel({ delay = 0, className = '', style = {}, children }) {
  return (
    <div
      className={`aos-fade-up ${className}`}
      style={{
        animationDelay: `${delay}ms`,
        borderRadius: 14,
        padding: 14,
        position: 'relative',

        /* TRUE GLASS — unified with global.css glass-card */
        background: `
          linear-gradient(
            145deg,
            rgba(255,255,255,0.055) 0%,
            rgba(255,255,255,0.010) 100%
          ),
          rgba(11,16,34,0.32)
        `,
        backdropFilter:       'blur(28px) saturate(158%) brightness(1.07)',
        WebkitBackdropFilter: 'blur(28px) saturate(158%) brightness(1.07)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: `
          inset 0 1px 0 rgba(255,255,255,0.07),
          0 12px 48px rgba(0,0,0,0.52)
        `,
        ...style,
      }}
    >
      {/* Top reflection shimmer */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: '1px',
        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.16) 30%, rgba(255,255,255,0.24) 50%, rgba(255,255,255,0.16) 70%, transparent 100%)',
        borderRadius: '14px 14px 0 0',
        pointerEvents: 'none',
      }} />
      {children}
    </div>
  )
}

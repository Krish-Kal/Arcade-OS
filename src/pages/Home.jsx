// ARCade OS — Home Dashboard
// Drop-in replacement for your existing Home component.
// Requires: lucide-react  |  useStore  |  StatsPanel (kept as-is)

import React, { useState, useEffect, useRef } from 'react'
import {
  Play, Gamepad2, Grid3X3, TrendingUp, Clock,
  ChevronRight, Zap, Search, Settings, Power, Shield
} from 'lucide-react'
import { useStore } from '../store/useStore'
import StatsPanel from '../components/StatsPanel'
import GlobalSearchBar from '../components/GlobalSearchBar'

/* ─── DESIGN TOKENS ─────────────────────────────────────────── */
const T = {
  bg:          '#070A12',
  elevated:    '#0B1020',
  card:        '#0D1226',
  purple:      '#8B5CF6',
  blue:        '#60A5FA',
  textPrimary: '#E6E9F5',
  textMuted:   '#9AA3B2',
  border:      'rgba(255,255,255,0.06)',
  borderHover: 'rgba(139,92,246,0.3)',
  shadowLow:   '0 4px 20px rgba(0,0,0,0.4)',
  shadowHigh:  '0 20px 60px rgba(0,0,0,0.6)',
}

/* ─── GLOBAL STYLES (injected once) ─────────────────────────── */
const GLOBAL_CSS = `
  .aos-root * { box-sizing: border-box; margin: 0; padding: 0; }
  .aos-root { font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif; }

  .aos-scroll::-webkit-scrollbar { width: 4px; }
  .aos-scroll::-webkit-scrollbar-track { background: transparent; }
  .aos-scroll::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.2); border-radius: 2px; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
  }
  .aos-fade-up {
    opacity: 0;
    animation: fadeUp 0.45s ease forwards;
  }

  .hero-card { transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease; }
  .hero-card:hover {
    transform: translateY(-4px) scale(1.01) !important;
    box-shadow: 0 24px 56px rgba(0,0,0,0.7), 0 0 0 1px rgba(139,92,246,0.25) !important;
    border-color: rgba(139,92,246,0.3) !important;
  }
  .hero-play { opacity: 0; transition: opacity 0.2s; }
  .hero-card:hover .hero-play { opacity: 1; }

  .pill-btn { transition: all 0.18s ease; }
  .pill-btn:hover {
    background: linear-gradient(135deg, rgba(91,140,255,0.2), rgba(139,92,246,0.2)) !important;
    border-color: rgba(139,92,246,0.4) !important;
    color: #fff !important;
    transform: translateY(-1px);
  }

  .tl-row { transition: background 0.15s; }
  .tl-row:hover { background: rgba(139,92,246,0.07) !important; }
  .tl-launch { opacity: 0; transition: opacity 0.15s; }
  .tl-row:hover .tl-launch { opacity: 1; }

  .cmd-btn { transition: all 0.2s; }
  .cmd-btn:hover {
    background: rgba(139,92,246,0.15) !important;
    border-color: rgba(139,92,246,0.35) !important;
    color: #8B5CF6 !important;
  }

  .sec-action-btn { transition: opacity 0.15s, color 0.15s; }
  .sec-action-btn:hover { opacity: 1 !important; color: #fff !important; }

  .stat-card-inner { transition: background 0.2s, border-color 0.2s; }
  .stat-card-inner:hover { background: rgba(255,255,255,0.05) !important; border-color: rgba(139,92,246,0.2) !important; }
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
export default function Home() {
  useGlobalStyle(GLOBAL_CSS)

   const { games, apps, recentLaunches, launchItem, setActivePage } = useStore()
  const [now] = useState(Date.now())

  const featured    = [...games].sort((a, b) => b.launchCount - a.launchCount).slice(0, 3)
  const pinnedApps  = apps.filter(a => a.pinned)
  const recents     = recentLaunches.slice(0, 6)

  const todayItems = recents.filter(i => now - (i.launchedAt || 0) < 86400000)
  const yesterItems = recents.filter(i =>
    now - (i.launchedAt || 0) >= 86400000 &&
    now - (i.launchedAt || 0) < 172800000
  )
  return (
    <div className="aos-root" style={{
      height: '100%',
      background: T.bg,
      color: T.textPrimary,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <CommandBar />

            <div
        className="aos-scroll"
        style={{
          flex: 1,
          overflowY: 'auto',
                    /* 🔥 MORE 1440p BREATHING SPACE */
          padding: '32px 44px 48px',
        }}
      >
        {/* ambient glow */}
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 340,
          background: 'radial-gradient(ellipse 60% 40% at 30% 0%, rgba(139,92,246,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }} />

                <div style={{
          display: 'grid',

          /* 🔥 wider 1440 layout feel */
          gridTemplateColumns: '1fr 300px',
          gap: 18,

          alignItems: 'start',
          position: 'relative',
          zIndex: 1,
          maxWidth: 1600,
          margin: '0 auto',   // centers like real OS dashboard
        }}>

                    {/* LEFT */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 32   // 🔥 vertical breathing space upgraded
          }}>

            {/* FEATURED */}
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
                gap: 16   // 🔥 cleaner spacing between cards
              }}>
                {featured.map((game, i) => (
                  <HeroCard
                    key={game.id}
                    item={game}
                    rank={i + 1}
                    onLaunch={() => launchItem(game, 'game')}
                    delay={i * 70}
                  />
                ))}
              </div>
            </Section>

            {/* QUICK LAUNCH */}
            {pinnedApps.length > 0 && (
              <Section
                title="Quick Launch"
                icon={<Zap size={12} />}
                action="View all"
                onAction={() => setActivePage('apps')}
                delay={80}
              >
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 10   // 🔥 better spacing rhythm
                }}>
                  {pinnedApps.map(app => (
                    <PillButton
                      key={app.id}
                      item={app}
                      onLaunch={() => launchItem(app, 'app')}
                    />
                  ))}
                </div>
              </Section>
            )}

            {/* RECENT */}
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
                  onLaunch={(item) => launchItem(item, item.type)}
                />
              </Section>
            )}
          </div>

                    {/* RIGHT */}
          <div style={{
  position: 'sticky',
  top: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
  width: 300   // keeps layout aligned
}}>
  <div className="aos-fade-up" style={{
    animationDelay: '40ms',
    width: '100%'
  }}>
    <StatsPanel />
  </div>
</div>

        </div>
      </div>
    </div>
  )
}
/* ─── COMMAND BAR ────────────────────────────────────────────── */
function CommandBar() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 20px',
      background: 'rgba(11,16,32,0.92)',
      borderBottom: `1px solid ${T.border}`,
      backdropFilter: 'blur(20px)',
      zIndex: 100,
      flexShrink: 0,
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: 'linear-gradient(135deg, #5b8cff 0%, #8B5CF6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(139,92,246,0.35)',
        }}>
          <Zap size={14} color="#fff" strokeWidth={2.5} />
        </div>

        <span style={{
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.15em',
          background: 'linear-gradient(90deg, #fff 0%, #aab0ff 100%)',
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
            cursor: 'pointer', color: T.blue, fontSize: 11, opacity: 0.8,
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
        background: T.purple, opacity: 0.8,
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
const CARD_GRADIENTS = [
  'linear-gradient(145deg, rgba(139,92,246,0.22) 0%, rgba(59,130,246,0.1) 100%)',
  'linear-gradient(145deg, rgba(96,165,250,0.18) 0%, rgba(139,92,246,0.12) 100%)',
  'linear-gradient(145deg, rgba(91,140,255,0.14) 0%, rgba(139,92,246,0.2) 100%)',
]

function HeroCard({ item, rank, onLaunch, delay }) {
  return (
    <div
      className="hero-card aos-fade-up"
      style={{
        animationDelay: `${delay}ms`,
        borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
        background: T.card,
        border: `1px solid ${T.border}`,
        boxShadow: T.shadowLow,
        position: 'relative',
      }}
    >
      {/* Art area */}
      <div style={{
        height: 106, position: 'relative',
        background: CARD_GRADIENTS[(rank - 1) % 3],
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {/* subtle grid texture */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.06,
          backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 19px,rgba(255,255,255,1) 20px), repeating-linear-gradient(90deg,transparent,transparent 19px,rgba(255,255,255,1) 20px)',
        }} />

        <Gamepad2 size={36} strokeWidth={1} color="rgba(255,255,255,0.25)" style={{ position: 'relative', zIndex: 1 }} />

        {/* Rank badge */}
        <div style={{
          position: 'absolute', top: 9, left: 9, zIndex: 2,
          padding: '2px 8px', borderRadius: 20,
          fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
          background: 'rgba(0,0,0,0.55)', border: `1px solid rgba(255,255,255,0.1)`,
          color: T.textMuted,
        }}>
          #{rank}
        </div>

        {/* Hover play overlay */}
        <div className="hero-play" style={{
          position: 'absolute', inset: 0, zIndex: 3,
          background: 'rgba(7,10,18,0.78)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <button
            onClick={onLaunch}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 18px', borderRadius: 8,
              background: 'linear-gradient(135deg, #5b8cff, #8B5CF6)',
              border: 'none', color: '#fff', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', letterSpacing: '0.02em',
            }}
          >
            <Play size={11} fill="#fff" /> Play
          </button>
        </div>
      </div>

      
      {/* Info */}
      <div style={{ padding: '11px 13px 13px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: T.textPrimary }}>{item.name}</div>
        <div style={{ fontSize: 10, color: T.textMuted, marginTop: 3 }}>
          {item.launchCount} plays
        </div>
      </div>
    </div>
  )
}
/* ─── PILL BUTTON ────────────────────────────────────────────── */
function PillButton({ item, onLaunch }) {
  return (
    <button
      className="pill-btn"
      onClick={onLaunch}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 14px', borderRadius: 999, cursor: 'pointer',
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid rgba(255,255,255,0.08)`,
        color: T.textPrimary, fontSize: 11,
      }}
    >
      <div style={{
        width: 16, height: 16, borderRadius: 5, flexShrink: 0,
        background: 'rgba(139,92,246,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Grid3X3 size={9} color={T.purple} />
      </div>
      {item.name}
    </button>
  )
}
/* ─── TIMELINE ───────────────────────────────────────────────── */
function Timeline({ todayItems, yesterItems, now, onLaunch }) {
  return (
    <div>
      {todayItems.length > 0 && (
        <>
          <GroupLabel text="Today" />
          {todayItems.map((item, i) => (
            <TimelineRow key={`${item.id}-${item.launchedAt}`} item={item} now={now} onLaunch={() => onLaunch(item)} isLast={i === todayItems.length - 1 && yesterItems.length === 0} />
          ))}
        </>
      )}
      {yesterItems.length > 0 && (
        <>
          <GroupLabel text="Yesterday" />
          {yesterItems.map((item, i) => (
            <TimelineRow key={`${item.id}-${item.launchedAt}`} item={item} now={now} onLaunch={() => onLaunch(item)} isLast={i === yesterItems.length - 1} faded />
          ))}
        </>
      )}
    </div>
  )
}
function GroupLabel({ text }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 600, letterSpacing: '0.12em',
      textTransform: 'uppercase', color: 'rgba(154,163,178,0.45)',
      padding: '4px 0 8px 20px', marginTop: 4,
    }}>
      {text}
    </div>
  )
}
function TimelineRow({ item, now, onLaunch, isLast, faded }) {
  const ago    = item.launchedAt ? Math.round((now - item.launchedAt) / 60000) : null
  const agoStr = ago === null ? '' : ago < 60 ? `${ago}m ago` : ago < 1440 ? `${Math.round(ago / 60)}h ago` : 'Yesterday'

  return (
    <div className="tl-row" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px 7px 0', borderRadius: 9, cursor: 'pointer' }}>
      {/* dot + line */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0, alignSelf: 'stretch', paddingTop: 5 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.purple, opacity: faded ? 0.3 : 0.7, flexShrink: 0 }} />
        {!isLast && <div style={{ flex: 1, width: 1, background: 'rgba(139,92,246,0.12)', marginTop: 4 }} />}
      </div>

      {/* icon */}
      <div style={{
        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
        background: 'rgba(255,255,255,0.05)',
        border: `1px solid rgba(255,255,255,0.07)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: faded ? 0.55 : 1,
      }}>
        {item.type === 'game'
          ? <Gamepad2 size={13} color={T.purple} />
          : <Grid3X3 size={13} color={T.blue} />}
      </div>

      <div style={{ fontSize: 12, color: faded ? T.textMuted : T.textPrimary, flex: 1 }}>{item.name}</div>
      <div style={{ fontSize: 10, color: T.textMuted, whiteSpace: 'nowrap' }}>{agoStr}</div>

      <button className="tl-launch" onClick={onLaunch} style={{
        fontSize: 10, padding: '4px 9px', borderRadius: 6, whiteSpace: 'nowrap',
        background: 'rgba(96,165,250,0.12)', border: `1px solid rgba(96,165,250,0.22)`,
        color: T.blue, cursor: 'pointer', flexShrink: 0,
      }}>
        Launch
      </button>
    </div>
  )
}
/* ─── GLASS PANEL ────────────────────────────────────────────── */
function GlassPanel({ delay = 0, children }) {
  return (
    <div className="aos-fade-up" style={{
      animationDelay: `${delay}ms`,
      borderRadius: 14, padding: 14,
      background: 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))',
      border: `1px solid ${T.border}`,
      backdropFilter: 'blur(14px)',
      boxShadow: '0 10px 40px rgba(0,0,0,0.55)',
    }}>
      {children}
    </div>
  )
}
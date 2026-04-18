import React from 'react'
import {
  Home,
  Gamepad2,
  Grid3X3,
  Bot,
  Folder,
  Settings,
  ChevronLeft,
  ChevronRight,
  Pin
} from 'lucide-react'
import { useStore } from '../store/useStore'

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'games', label: 'Games', icon: Gamepad2 },
  { id: 'apps', label: 'Apps', icon: Grid3X3 },
  { id: 'aihub', label: 'AI Hub', icon: Bot },
  { id: 'files', label: 'Explorer', icon: Folder },
]

const BOTTOM_ITEMS = [
  { id: 'settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const {
    activePage,
    setActivePage,
    sidebarCollapsed,
    toggleSidebar,
    games,
    apps
  } = useStore()

  const width = sidebarCollapsed
    ? 'var(--sidebar-collapsed)'
    : 'var(--sidebar-width)'

  const pinnedGames = games.filter(g => g.pinned).slice(0, 3)
  const pinnedApps = apps.filter(a => a.pinned).slice(0, 2)

  return (
    <aside style={{
      width,
      minWidth: width,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',

      /* 🌌 PURE LUXURY PURPLE + DEEP NAVY GLASS */
      background: `
        radial-gradient(circle at 20% 10%, rgba(139,92,246,0.18), transparent 45%),
        radial-gradient(circle at 80% 0%, rgba(99,102,241,0.12), transparent 50%),
        radial-gradient(circle at 50% 100%, rgba(30,41,59,0.6), transparent 55%),
        linear-gradient(180deg, #070A12 0%, #0B1020 50%, #05070F 100%)
      `,

      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',

      borderRight: '1px solid rgba(255,255,255,0.06)',
      boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.03)',

      transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
      overflow: 'hidden',
      position: 'relative',
      zIndex: 10,
    }}>

      {/* soft luxury top glow line */}
      <div style={{
        height: 1,
        width: '100%',
        background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.45), rgba(99,102,241,0.35), transparent)',
      }} />

      {/* NAV */}
      <nav style={{
        flex: 1,
        padding: '14px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
      }}>
        {NAV_ITEMS.map(item => (
          <NavItem
            key={item.id}
            item={item}
            active={activePage === item.id}
            collapsed={sidebarCollapsed}
            onClick={() => setActivePage(item.id)}
          />
        ))}

        {/* PINNED SECTION */}
        {!sidebarCollapsed && (pinnedGames.length > 0 || pinnedApps.length > 0) && (
          <div style={{
            marginTop: 18,
            paddingTop: 12,
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 10px',
              marginBottom: 10,

              fontSize: 10,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.35)',
            }}>
              <Pin size={10} />
              <span>Pinned Vault</span>
            </div>

            {[...pinnedGames, ...pinnedApps].map(item => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 14,
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  color: 'rgba(255,255,255,0.7)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background =
                    'linear-gradient(90deg, rgba(139,92,246,0.12), rgba(99,102,241,0.08))'
                  e.currentTarget.style.transform = 'translateX(3px)'
                  e.currentTarget.style.boxShadow =
                    '0 8px 20px rgba(0,0,0,0.25)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.transform = 'translateX(0px)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: 10,

                  background: `
                    linear-gradient(135deg,
                      rgba(139,92,246,0.9),
                      rgba(99,102,241,0.75)
                    )
                  `,

                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',

                  fontSize: 12,
                  fontWeight: 600,
                  color: '#fff',

                  boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                }}>
                  {item.name[0]}
                </div>

                <span style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </nav>

      {/* BOTTOM */}
      <div style={{
        padding: '10px 10px 14px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.35))'
      }}>
        {BOTTOM_ITEMS.map(item => (
          <NavItem
            key={item.id}
            item={item}
            active={activePage === item.id}
            collapsed={sidebarCollapsed}
            onClick={() => setActivePage(item.id)}
          />
        ))}

        {/* collapse button */}
        <button
          onClick={toggleSidebar}
          style={{
            width: '100%',
            marginTop: 6,
            padding: '9px 10px',

            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            gap: 10,

            borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.06)',

            background:
              'linear-gradient(90deg, rgba(139,92,246,0.10), rgba(99,102,241,0.08))',

            color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
            transition: 'all 0.25s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background =
              'linear-gradient(90deg, rgba(139,92,246,0.18), rgba(99,102,241,0.14))'
            e.currentTarget.style.color = '#fff'
            e.currentTarget.style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background =
              'linear-gradient(90deg, rgba(139,92,246,0.10), rgba(99,102,241,0.08))'
            e.currentTarget.style.color = 'rgba(255,255,255,0.7)'
            e.currentTarget.style.transform = 'translateY(0px)'
          }}
        >
          {sidebarCollapsed ? (
            <ChevronRight size={14} />
          ) : (
            <>
              <ChevronLeft size={14} />
              <span style={{ fontSize: 12 }}>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}

/* =========================
   NAV ITEM - PREMIUM GLASS
========================= */
function NavItem({ item, active, collapsed, onClick }) {
  const Icon = item.icon

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        padding: '10px 10px',

        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: 10,

        borderRadius: 14,
        border: '1px solid transparent',

        background: active
          ? 'linear-gradient(90deg, rgba(139,92,246,0.18), rgba(99,102,241,0.12))'
          : 'transparent',

        color: active ? '#ffffff' : 'rgba(255,255,255,0.65)',

        transition: 'all 0.25s ease',
        position: 'relative',
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background =
            'linear-gradient(90deg, rgba(139,92,246,0.12), rgba(99,102,241,0.08))'
          e.currentTarget.style.color = '#fff'
        }
        e.currentTarget.style.transform = 'translateX(2px)'
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'rgba(255,255,255,0.65)'
        }
        e.currentTarget.style.transform = 'translateX(0px)'
      }}
      title={collapsed ? item.label : ''}
    >
      {/* soft active bar */}
      {active && (
        <div style={{
          position: 'absolute',
          left: 0,
          top: '22%',
          bottom: '22%',
          width: 3,
          borderRadius: 3,
          background: 'linear-gradient(180deg, #8b5cf6, #6366f1)',
          boxShadow: '0 0 12px rgba(139,92,246,0.35)',
        }} />
      )}

      <Icon size={16} strokeWidth={1.8} />

      {!collapsed && (
        <span style={{
          fontFamily: 'var(--font-body)',
          fontSize: 13.5,
          fontWeight: active ? 600 : 400,
          letterSpacing: '0.02em',
        }}>
          {item.label}
        </span>
      )}
    </button>
  )
}
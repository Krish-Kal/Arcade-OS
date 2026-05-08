// TitleBar - Custom frameless window titlebar
import React, { useState, useEffect } from 'react'
import { Maximize2, Minimize2, Minus, Square, X, Zap } from 'lucide-react'

const isElectron = typeof window !== 'undefined' && window.arcadeOS

export default function TitleBar() {

  const [isMaximized, setIsMaximized] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)


  useEffect(() => {
    if (!isElectron) return
    window.arcadeOS.window.isMaximized().then(setIsMaximized)
    window.arcadeOS.window.isFullscreen().then(setIsFullscreen)
    window.arcadeOS.window.onMaximized(setIsMaximized)
    window.arcadeOS.window.onFullscreen(setIsFullscreen)
  }, [])

  const handleMinimize = () => isElectron && window.arcadeOS.window.minimize()
  const handleMaximize = () => isElectron && window.arcadeOS.window.maximize()
  const handleFullscreen = () => isElectron && window.arcadeOS.window.toggleFullscreen()
  const handleClose = () => isElectron && window.arcadeOS.window.close()

  return (
    <div style={{
      height: 'var(--titlebar-height)',
      background: 'linear-gradient(180deg, rgba(5,7,16,0.78), rgba(5,7,16,0.36))',
      borderBottom: '1px solid rgba(255,255,255,0.045)',
      boxShadow: '0 10px 34px rgba(0,0,0,0.18)',
      backdropFilter: 'blur(24px) saturate(125%)',
      WebkitBackdropFilter: 'blur(24px) saturate(125%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 14px 0 16px',
      WebkitAppRegion: 'drag',
      flexShrink: 0,
      zIndex: 100,
      position: 'relative',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, WebkitAppRegion: 'no-drag' }}>
        <div style={{
          width: 26, height: 26,
          background: 'linear-gradient(135deg, rgba(91,140,255,0.95), rgba(139,92,246,0.9))',
          borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(91,140,255,0.22), inset 0 1px 0 rgba(255,255,255,0.22)',
        }}>
          <Zap size={13} color="#fff" fill="#fff" strokeWidth={2.4} />
        </div>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.16em',
          color: 'var(--text-primary)',
          textTransform: 'uppercase',
          textShadow: '0 0 18px rgba(91,140,255,0.28)',
        }}>
          Arcade OS
        </span>
        <span style={{
          width: 5,
          height: 5,
          borderRadius: 99,
          background: isFullscreen ? 'var(--accent-green)' : 'var(--accent-cyan)',
          boxShadow: isFullscreen ? '0 0 16px rgba(52,211,153,0.6)' : '0 0 14px rgba(91,140,255,0.45)',
          marginLeft: 4,
        }} />
      </div>
      
      {/* Drag area center */}
      <div style={{
        flex: 1,
        height: '100%',
        WebkitAppRegion: 'drag',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 24,
      }}>
        <div style={{
          height: 1,
          width: 'min(28vw, 420px)',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
          opacity: 0.8,
        }} />
      </div>

      {/* Window controls */}
      <div style={{
        display: 'flex',
        gap: 4,
        WebkitAppRegion: 'no-drag',
        padding: 3,
        borderRadius: 12,
        background: 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(255,255,255,0.055)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}>
        {[
          { onClick: handleMinimize, icon: <Minus size={12} />, hover: 'rgba(255,255,255,0.1)', title: 'Minimize' },
          { onClick: handleMaximize, icon: <Square size={10} />, hover: 'rgba(255,255,255,0.1)', title: isMaximized ? 'Restore' : 'Maximize' },
          { onClick: handleFullscreen, icon: isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />, hover: 'rgba(91,140,255,0.16)', title: isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen' },
          { onClick: handleClose, icon: <X size={12} />, hover: 'rgba(248,113,113,0.45)', title: 'Close' },
        ].map((btn, i) => (
          <button key={i} onClick={btn.onClick} title={btn.title} style={{
            width: 30, height: 28,
            background: 'transparent',
            border: 'none',
            borderRadius: 9,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)',
            transition: 'background var(--transition-fast), color var(--transition-fast), transform var(--transition-fast)',
            transform: 'translateZ(0)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = btn.hover; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            {btn.icon}
          </button>
        ))}
      </div>
    </div>
  )
}

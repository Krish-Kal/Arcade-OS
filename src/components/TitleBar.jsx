// TitleBar - Custom frameless window titlebar
import React, { useState, useEffect } from 'react'
import { Minus, Square, X, Zap } from 'lucide-react'

const isElectron = typeof window !== 'undefined' && window.arcadeOS

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    if (!isElectron) return
    window.arcadeOS.window.isMaximized().then(setIsMaximized)
    window.arcadeOS.window.onMaximized(setIsMaximized)
  }, [])

  const handleMinimize = () => isElectron && window.arcadeOS.window.minimize()
  const handleMaximize = () => isElectron && window.arcadeOS.window.maximize()
  const handleClose = () => isElectron && window.arcadeOS.window.close()

  return (
    <div style={{
      height: 'var(--titlebar-height)',
      background: 'var(--bg-void)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      WebkitAppRegion: 'drag',
      flexShrink: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, WebkitAppRegion: 'no-drag' }}>
        <div style={{
          width: 24, height: 24,
          background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))',
          borderRadius: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Zap size={13} color="#fff" fill="#fff" />
        </div>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.15em',
          color: 'var(--accent-cyan)',
          textTransform: 'uppercase',
        }}>
          Arcade OS
        </span>
      </div>

      {/* Drag area center */}
      <div style={{ flex: 1, height: '100%', WebkitAppRegion: 'drag' }} />

      {/* Window controls */}
      <div style={{ display: 'flex', gap: 2, WebkitAppRegion: 'no-drag' }}>
        {[
          { onClick: handleMinimize, icon: <Minus size={12} />, hover: '#ffffff20' },
          { onClick: handleMaximize, icon: <Square size={10} />, hover: '#ffffff20' },
          { onClick: handleClose, icon: <X size={12} />, hover: '#ef444480' },
        ].map((btn, i) => (
          <button key={i} onClick={btn.onClick} style={{
            width: 32, height: 32,
            background: 'transparent',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)',
            transition: 'background var(--transition-fast), color var(--transition-fast)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = btn.hover; e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            {btn.icon}
          </button>
        ))}
      </div>
    </div>
  )
}

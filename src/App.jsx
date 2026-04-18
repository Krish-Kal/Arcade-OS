 // Arcade OS - Root App Component
import React, { useEffect } from 'react'
import { useStore } from './store/useStore'
import TitleBar from './components/TitleBar'
import Sidebar from './components/Sidebar'
import NotificationStack from './components/NotificationStack'
import Home from './pages/Home'
import Games from './pages/Games'
import Apps from './pages/Apps'
import AIHub from './pages/AIHub'
import FileExplorer from './pages/FileExplorer'
import Settings from './pages/Settings'

const PAGES = { home: Home, games: Games, apps: Apps, aihub: AIHub, files: FileExplorer, settings: Settings }

// 🎮 FPS Counter Component
function FPSCounter() {
  const [fps, setFps] = React.useState(0)

  useEffect(() => {
    let frames = 0
    let last = performance.now()

    const loop = () => {
      frames++
      const now = performance.now()

      if (now >= last + 1000) {
        setFps(frames)
        frames = 0
        last = now
      }

      requestAnimationFrame(loop)
    }

    loop()
  }, [])

  return (
    <div style={{
      position: 'fixed',
      top: 14,
      right: 14,
      fontSize: 12,
      fontFamily: 'var(--font-mono)',
      color: 'var(--accent-cyan)',
      zIndex: 9999,
      opacity: 0.8,
      padding: '4px 8px',
borderRadius: 8,
background: 'rgba(0,0,0,0.25)',
backdropFilter: 'blur(8px)',
    }}>
      {fps} FPS
    </div>
  )
}

export default function App() {
const { activePage, settings } = useStore()
  const PageComponent = PAGES[activePage] || Home



  // 🎨 ACCENT COLOR SYSTEM (FIXED)
  useEffect(() => {
    const root = document.documentElement

    const colors = {
      cyan: '#00d4ff',
      purple: '#7c3aed',
      pink: '#ec4899',
      green: '#10b981',
      amber: '#f59e0b',
    }

    const selected = colors[settings.accentColor] || '#00d4ff'

    // Apply globally
    root.style.setProperty('--accent-cyan', selected)
    root.style.setProperty('--accent-main', selected)

  }, [settings.accentColor])

  // ⚡ ANIMATIONS TOGGLE
  useEffect(() => {
    const body = document.body

    if (!settings.animations) {
      body.classList.add('no-animations')
    } else {
      body.classList.remove('no-animations')
    }
  }, [settings.animations])

  // 📺 SCANLINES FIX (GLOBAL)
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--scanline-opacity',
      settings.scanlines ? '1' : '0'
    )
  }, [settings.scanlines])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'var(--bg-void)',
      overflow: 'hidden'
    }}>
      <TitleBar />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden',gap: 0,}}>
        <Sidebar />

        <main style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
          background: 'var(--bg-deep)',
          display: 'flex',
          justifyContent: 'center',
        }}>
          <div style={{
            width: '100%',
            maxWidth: 1500,
            height: '100%',
            overflow: 'hidden'
        }}>
  <PageComponent />
</div>
        </main>
      </div>

      <NotificationStack />

      {/* 🎮 FPS Toggle */}
      {settings.showFPS && <FPSCounter />}
    </div>
  )
} 
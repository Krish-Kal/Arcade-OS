import React, { useEffect } from 'react'
import { useStore } from './store/useStore'
import TitleBar from './components/TitleBar'
import Sidebar from './components/Sidebar'
import NotificationStack from './components/NotificationStack'
import AmbientCommandLayer from './components/AmbientCommandLayer'
import Home from './pages/Home'
import Games from './pages/Games'
import Apps from './pages/Apps'
import AIHub from './pages/AIHub'
import FileExplorer from './pages/FileExplorer/FileExplorer'
import Settings from './pages/Settings'

const PAGES = {
  home: Home,
  games: Games,
  apps: Apps,
  aihub: AIHub,
  files: FileExplorer,
  settings: Settings
}

// 🎮 OPTIONAL FPS Counter (kept reusable, not tied to settings anymore)
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
 const { activePage } = useStore()
  const PageComponent = PAGES[activePage] || Home
  return (
    <div className="app-shell">
      <div className="cinematic-backdrop" aria-hidden="true">
        <div className="ambient ambient-a" />
        <div className="ambient ambient-b" />
        <div className="ambient ambient-c" />
        <div className="depth-grid" />
        <div className="vignette" />
      </div>

      <TitleBar />

      <div className="workspace-frame">
        <Sidebar />

        <main className="workspace-main">
          <div key={activePage} className="page-surface">
            <PageComponent />
          </div>
        </main>
      </div>

      <AmbientCommandLayer />
      <NotificationStack />

      {/* If you ever want FPS back, just uncomment */}
      {/* <FPSCounter /> */}
    </div>
  )
}

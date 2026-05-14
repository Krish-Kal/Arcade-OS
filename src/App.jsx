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

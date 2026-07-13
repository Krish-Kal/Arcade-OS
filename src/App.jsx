import React, { Suspense, lazy } from 'react'
import { useStore } from './store/useStore'
import TitleBar from './components/TitleBar'
import Sidebar from './components/Sidebar'
import NotificationStack from './components/NotificationStack'
import AmbientCommandLayer from './components/AmbientCommandLayer'
import Home from './pages/Home'

const Games = lazy(() => import('./pages/Games'))
const Apps = lazy(() => import('./pages/Apps'))
const AIHub = lazy(() => import('./pages/AIHub'))
const FileExplorer = lazy(() => import('./pages/FileExplorer/FileExplorer'))
const Settings = lazy(() => import('./pages/Settings'))

const PAGES = {
  home: Home,
  games: Games,
  apps: Apps,
  aihub: AIHub,
  files: FileExplorer,
  settings: Settings
}


export default function App() {
 const activePage = useStore(state => state.activePage)
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
            <Suspense fallback={null}>
              <PageComponent />
            </Suspense>
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

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const isElectron = typeof window !== 'undefined' && window.arcadeOS

// Demo Data
const DEMO_GAMES = [
  { id: 'g1', name: 'Cyberpunk 2077', path: '/games/cyberpunk.exe', genre: 'RPG', launchCount: 42, pinned: true, addedAt: Date.now() - 86400000 * 5 },
  { id: 'g2', name: 'Elden Ring', path: '/games/eldenring.exe', genre: 'Action RPG', launchCount: 88, pinned: true, addedAt: Date.now() - 86400000 * 10 },
]

const DEMO_APPS = [
  { id: 'a1', name: 'Visual Studio Code', path: '/apps/code.exe', category: 'Dev Tools', launchCount: 120, pinned: true, addedAt: Date.now() - 86400000 * 30 },
]

export const useStore = create(
  persist(
    (set, get) => ({
      // ---------------- NAV ----------------
      activePage: 'home',
      setActivePage: (page) => set({ activePage: page }),

      sidebarCollapsed: false,
      toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      // ---------------- DATA ----------------
      games: DEMO_GAMES,
      apps: DEMO_APPS,
      recentLaunches: [],
      _hydrated: false,

      // ---------------- SETTINGS ----------------
      settings: {
        theme: 'dark',
        accentColor: 'cyan',
        layout: 'grid',
        showFPS: false,
        animations: true,
        scanlines: true,
      },

      updateSettings: (patch) => {
        set(s => ({
          settings: { ...s.settings, ...patch }
        }))
      },

      // ---------------- LIBRARY ----------------
      clearLibrary: () => {
        set({ games: [], apps: [], recentLaunches: [] })
        get().addNotification({ type: 'success', message: 'Library cleared' })
      },

      // ---------------- NOTIFICATIONS ----------------
      notifications: [],
      addNotification: (notif) => {
        const id = Date.now()
        set(s => ({ notifications: [...s.notifications, { id, ...notif }] }))

        setTimeout(() => {
          set(s => ({
            notifications: s.notifications.filter(n => n.id !== id)
          }))
        }, 4000)
      },

      // ---------------- AI CHAT (✅ ADDED FIX) ----------------
      chatMessages: [
        {
          id: 1,
          role: 'assistant',
          content: 'Welcome to Arcade OS AI Hub. How can I help you today?'
        }
      ],

      addChatMessage: (msg) => set(s => ({
        chatMessages: [
          ...s.chatMessages,
          { id: Date.now(), ...msg }
        ]
      })),

      clearChat: () => set({
        chatMessages: [
          {
            id: 1,
            role: 'assistant',
            content: 'Chat cleared. How can I help you?'
          }
        ]
      }),

      // ---------------- GAMES ----------------
      addGame: (game) => {
        const newGame = {
          id: `g${Date.now()}`,
          launchCount: 0,
          pinned: false,
          addedAt: Date.now(),
          ...game
        }

        set(s => ({ games: [...s.games, newGame] }))
        get().addNotification({ type: 'success', message: `${game.name} added!` })
      },

      removeGame: (id) => {
        set(s => ({ games: s.games.filter(g => g.id !== id) }))
      },

      updateGame: (id, patch) => {
        set(s => ({
          games: s.games.map(g => g.id === id ? { ...g, ...patch } : g)
        }))
      },

      // ---------------- APPS ----------------
      addApp: (app) => {
        const newApp = {
          id: `a${Date.now()}`,
          launchCount: 0,
          pinned: false,
          addedAt: Date.now(),
          ...app
        }

        set(s => ({ apps: [...s.apps, newApp] }))
        get().addNotification({ type: 'success', message: `${app.name} added!` })
      },

      removeApp: (id) => {
        set(s => ({ apps: s.apps.filter(a => a.id !== id) }))
      },

      updateApp: (id, patch) => {
        set(s => ({
          apps: s.apps.map(a => a.id === id ? { ...a, ...patch } : a)
        }))
      },

      // ---------------- PIN ----------------
      togglePin: (id, type) => {
        if (type === 'game') {
          set(s => ({
            games: s.games.map(g =>
              g.id === id ? { ...g, pinned: !g.pinned } : g
            )
          }))
        } else {
          set(s => ({
            apps: s.apps.map(a =>
              a.id === id ? { ...a, pinned: !a.pinned } : a
            )
          }))
        }
      },

      // ---------------- LAUNCH ----------------
      launchItem: async (item, type) => {
        const { addNotification } = get()
        const isHydrated = get()._hydrated

        if (type === 'game') {
          set(s => ({
            games: s.games.map(g =>
              g.id === item.id ? { ...g, launchCount: g.launchCount + 1 } : g
            )
          }))
        } else {
          set(s => ({
            apps: s.apps.map(a =>
              a.id === item.id ? { ...a, launchCount: a.launchCount + 1 } : a
            )
          }))
        }

        set(s => ({
          recentLaunches: [
            { ...item, type, launchedAt: Date.now() },
            ...s.recentLaunches.filter(r => r.id !== item.id).slice(0, 9)
          ]
        }))

        if (isElectron) {
          const result = await window.arcadeOS.launch.open(item.path)
          if (result.success) addNotification({ type: 'success', message: `Launched ${item.name}` })
          else addNotification({ type: 'error', message: result.error })
        } else {
          if (isHydrated) addNotification({ type: 'info', message: `[Demo] Launch: ${item.name}` })
        }
      },
    }),
    {
      name: 'arcade-os-storage',

      // ✅ FIX: DO NOT persist runtime UI state like notifications
      partialize: (state) => ({
        activePage: state.activePage,
        sidebarCollapsed: state.sidebarCollapsed,
        games: state.games,
        apps: state.apps,
        recentLaunches: state.recentLaunches,
        settings: state.settings,
        chatMessages: state.chatMessages
        // ❌ notifications intentionally excluded
        // ❌ _hydrated intentionally excluded (runtime-only flag)
      }),

      onFinishHydration: (state) => {
        state._hydrated = true
      }
    }
  )
)
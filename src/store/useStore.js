import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const isElectron = typeof window !== 'undefined' && window.arcadeOS

// ---------------- NAVIGATION SLICE ----------------
const createNavigationSlice = (set) => ({
  activePage: 'home',
  setActivePage: (page) => set({ activePage: page }),

  sidebarCollapsed: false,
  toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
})

// ---------------- NOTIFICATION SLICE ----------------
const createNotificationSlice = (set) => ({
  notifications: [],

  addNotification: (notif) => {
    const id = Date.now()

    set(s => ({
      notifications: [...s.notifications, { id, ...notif }]
    }))

    setTimeout(() => {
      set(s => ({
        notifications: s.notifications.filter(n => n.id !== id)
      }))
    }, 4000)
  },
})

// ---------------- CHAT SLICE ----------------
const createChatSlice = (set) => ({
  chatMessages: [
    {
      id: 1,
      role: 'assistant',
      content: 'Welcome to AI Hub. How can I help you today?'

    }
  ],

  addChatMessage: (msg) =>
    set(s => ({
      chatMessages: [...s.chatMessages, { id: Date.now(), ...msg }]
    })),

  clearChat: () =>
    set({
      chatMessages: [
        {
          id: 1,
          role: 'assistant',
          content: 'Chat cleared. How can I help you?'
        }
      ]
    }),
})

// ---------------- SETTINGS SLICE ----------------
const createSettingsSlice = (set) => ({
  settings: {
    theme: 'dark',
    accentColor: 'cyan',
    layout: 'grid',
    showFPS: false,
    animations: true,
    scanlines: true,
    aiApiKey: '',
    aiProvider: 'openai',
  },

  updateSettings: (patch) =>
    set(s => ({
      settings: { ...s.settings, ...patch }
    })),
})

// ---------------- AI COMMAND SLICE ----------------
const createAICommandSlice = (set) => ({
  aiCommandState: {
    listening: false,
    processing: false,
    response: 'Ready.',
    lastCommand: '',
  },
  commandHistory: [],

  setAICommandState: (patch) =>
    set(s => ({
      aiCommandState: { ...s.aiCommandState, ...patch }
    })),

  rememberCommand: (text, result) =>
    set(s => ({
      commandHistory: [
        { id: Date.now(), text, result, at: Date.now() },
        ...s.commandHistory
      ].slice(0, 20)
    })),
})

// ---------------- LIBRARY SLICE ----------------
const createLibrarySlice = (set, get) => ({
games: [],
apps: [],
  recentLaunches: [],

  // ---- CLEAR ----
  clearLibrary: () => {
    set({ games: [], apps: [], recentLaunches: [] })
    get().addNotification({ type: 'success', message: 'Library cleared' })
  },

  // ---- GAMES ----
  addGame: (game) => {
    const newGame = {
      id: `g${Date.now()}`,
      launchCount: 0,
      addedAt: Date.now(),
      ...game
    }

    set(s => ({ games: [...s.games, newGame] }))
    get().addNotification({ type: 'success', message: `${game.name} added!` })
  },

  removeGame: (id) =>
    set(s => ({ games: s.games.filter(g => g.id !== id) })),

  updateGame: (id, patch) =>
    set(s => ({
      games: s.games.map(g => g.id === id ? { ...g, ...patch } : g)
    })),

  // ---- APPS ----
  addApp: (app) => {
    const newApp = {
      id: `a${Date.now()}`,
      launchCount: 0,
      addedAt: Date.now(),
      ...app
    }

    set(s => ({ apps: [...s.apps, newApp] }))
    get().addNotification({ type: 'success', message: `${app.name} added!` })
  },

  removeApp: (id) =>
    set(s => ({ apps: s.apps.filter(a => a.id !== id) })),

  updateApp: (id, patch) =>
    set(s => ({
      apps: s.apps.map(a => a.id === id ? { ...a, ...patch } : a)
    })),

  // ---- LAUNCH ----
  launchItem: async (item, type) => {
    const { addNotification, _hydrated } = get()

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
      if (_hydrated) addNotification({ type: 'info', message: `[Demo] Launch: ${item.name}` })
    }
  },
})

// ---------------- SYSTEM SLICE ----------------
const createSystemSlice = (set) => ({
  _hydrated: false,
})

// ---------------- STORE ----------------
export const useStore = create(
  persist(
    (set, get) => ({
      ...createNavigationSlice(set),
      ...createNotificationSlice(set),
      ...createChatSlice(set),
      ...createSettingsSlice(set),
      ...createAICommandSlice(set),
      ...createLibrarySlice(set, get),
      ...createSystemSlice(set),
    }),
    {
      name: 'arcade-os-storage',

      partialize: (state) => ({
        activePage: state.activePage,
        sidebarCollapsed: state.sidebarCollapsed,
        games: state.games,
        apps: state.apps,
        recentLaunches: state.recentLaunches,
        settings: state.settings,
        chatMessages: state.chatMessages,
        aiCommandState: state.aiCommandState,
        commandHistory: state.commandHistory
        // notifications excluded intentionally
      }),

      onRehydrateStorage: () => (state) => {
  if (state) {
    state._hydrated = true
  }
},
    }
  )
)

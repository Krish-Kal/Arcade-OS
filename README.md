# ⚡ Arcade OS

A professional-grade **Electron + React + Vite** desktop gaming & app launcher with a retro-futuristic dark UI.

---

## Features

- **Game Library** — Grid/list view, genre filtering, search, pin favorites, launch counter
- **App Library** — Manage all your desktop apps with categories and quick launch
- **AI Hub** — Chat with GPT-4o Mini or Claude Haiku for game recommendations & tips
- **File Explorer** — Navigate your filesystem, auto-detect games/apps, one-click add
- **Stats Panel** — Live system info (CPU, RAM), usage stats, most-played
- **Persistent Storage** — All data saved to local JSON via Electron IPC
- **Custom Titlebar** — Frameless window with custom minimize/maximize/close

---

## Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Electron 31 |
| UI | React 18 + Vite 5 |
| State | Zustand |
| Styling | Pure CSS variables (no Tailwind needed) |
| Fonts | Orbitron · Rajdhani · JetBrains Mono |
| Icons | Lucide React |
| AI | OpenAI GPT-4o Mini / Anthropic Claude Haiku |

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Run in development (browser only)

```bash
npm run dev
```
Open http://localhost:5173 — works fully in browser with demo data.

### 3. Run as Electron desktop app

```bash
# Terminal 1
npm run dev

# Terminal 2 (once dev server is running)
npm run electron
```

Or use the combined start command:

```bash
npm run start
```

### 4. Build for production

```bash
npm run dist
```
Outputs installer to `dist-electron/`.

---

## AI Hub Setup

1. Go to **AI Hub** → click the **Settings** (gear) icon
2. Select your provider: **OpenAI** or **Anthropic**
3. Paste your API key:
   - OpenAI: get from https://platform.openai.com/api-keys
   - Anthropic: get from https://console.anthropic.com/
4. Click **SAVE**

The AI will automatically personalize responses based on your game library.

---

## Project Structure

```
arcade-os/
├── electron/
│   ├── main.js          # Electron main process, IPC handlers, file system
│   └── preload.js       # Context bridge API for renderer
├── src/
│   ├── components/
│   │   ├── TitleBar.jsx        # Custom frameless titlebar
│   │   ├── Sidebar.jsx         # Collapsible navigation sidebar
│   │   ├── GameCard.jsx        # Game item card (grid + list)
│   │   ├── AppCard.jsx         # App item card (grid + list)
│   │   ├── AddGameModal.jsx    # Add game form modal
│   │   ├── AddAppModal.jsx     # Add app form modal
│   │   ├── StatsPanel.jsx      # System + usage stats
│   │   └── NotificationStack.jsx # Toast notifications
|   |   |___ModifyGameModal.jsx
│   ├── pages/
│   │   ├── Home.jsx            # Dashboard with recents + stats
│   │   ├── Games.jsx           # Full game library
│   │   ├── Apps.jsx            # Full app library
│   │   ├── AIHub.jsx           # AI chat interface
│   │   ├── FileExplorer.jsx    # Local filesystem browser
│   │   └── Settings.jsx        # App settings
│   ├── store/
│   │   └── useStore.js         # Zustand global state
│   ├── utils/
│   │   ├── launcher.js         # Launch helpers
│   │   ├── getGames.js         # Game filtering/sorting
│   │   ├── getApps.js          # App filtering/sorting
│   │   ├── aiIntegration.js    # AI API wrappers
│   │   └── fileExplorer.js     # Filesystem helpers
│   ├── App.jsx                 # Root component
│   ├── main.jsx                # React entry point
│   └── index.css               # Global CSS variables + animations
├── index.html
├── package.json
└── vite.config.js
```

---

## Theme Customization

All colors are CSS variables in `src/index.css`:

```css
--accent-cyan: #00d4ff;    /* Primary accent */
--accent-purple: #7c3aed;  /* Secondary accent */
--bg-void: #030308;        /* Darkest background */
--bg-deep: #0a0a14;        /* Main background */
```

Change accent color in **Settings → Appearance** at runtime.

---

## Notes

- In **browser/demo mode** (no Electron), the app runs with sample data — no file system access or actual launching
- In **Electron mode**, all file operations use secure IPC via `contextBridge`
- API keys are stored locally in Electron's `userData` directory
- The scanline overlay is a pure CSS effect and has zero performance impact

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

## Notes

- In **browser/demo mode** (no Electron), the app runs with sample data — no file system access or actual launching
- In **Electron mode**, all file operations use secure IPC via `contextBridge`
- API keys are stored locally in Electron's `userData` directory
- The scanline overlay is a pure CSS effect and has zero performance impact

# Cignature

**Repo:** `Cignature` · **Short name:** Cigs  
**Status:** Frontend-only demo — no backend, no real processing, all actions are cosmetic.

---

## What this is

Cigs is a local Mac media utility UI — a frontend-only demo of the job pipeline interface. No real work happens. All job state is seeded and simulated. Every action fires a toast or fake progress tick.

---

## Stack

- React 19 + Vite 6
- Tauri 2 native shell (macOS, dark-only) — backend is still **simulated** (no real engine yet)
- Tailwind CSS 3 + shadcn/ui (Radix primitives)
- Framer Motion (subtle layout transitions only)
- Sonner (toasts)
- Runs on any modern Node — no version pin needed

---

## Start dev server

Browser (Vite only):
```bash
cd Cignature
./dev.sh
```

`dev.sh` runs `npm run dev` (Vite). Open `http://localhost:3000`.

Native window (Tauri shell around the Vite app):
```bash
cd frontend && npx tauri dev
```

---

## Structure

```
Cignature/
  frontend/
    index.html                Vite entry (root)
    vite.config.mjs           Vite config (JSX-in-.js loader, "@" → src alias)
    src-tauri/                Tauri 2 native shell (Rust) — window, bundle, icons
    src/
      App.js                  shell layout (sidebar + main + inspector + statusbar)
      context/CigsContext.js  all state, actions, seeded jobs
      data/seed.js            static data + pure helpers (no side effects)
      screens/                one file per nav destination
        MainScreen.js         job builder (source → HUD → target → quality → confirm)
        QueueScreen.js        all jobs grouped by state
        ProgressScreen.js     live pipeline view for selected/running job
        ResultScreen.js       outputs or error for completed/failed job
        SettingsScreen.js     preferences (visual only, no persistence)
        LogsScreen.js         filterable terminal-style log viewer
      components/
        Sidebar.js            icon nav with badges
        Titlebar.js           mac traffic lights (cosmetic) + screen title + status pill
        StatusBar.js          demo mode disclosure + job count + keyboard hints
        Inspector.js          context-aware right panel (changes per screen)
        Hud/                  radial command HUD (branch selector + live core)
        shared/               JobCard, StageRail, StatusPill, CommandSummary
      index.css               design tokens (dark-only palette, utilities, motion)
  dev.sh                      one-command dev server (Vite)
```

---

## Identity rules

- **Repo name:** Cignature
- **Product name:** Cigs (used in UI, code comments, context naming)
- No other names. Nothing else.

---

## Key design constraints

- Dark-only. No light mode. `setTheme("light")` toasts an explanation.
- Frontend-only. No backend folder, no server, no network calls.
- No auth, no billing, no teams, no persistence.
- Three seeded jobs on load: one running, one completed, one failed.
- All "would" language in toasts and logs — never claims real work happened.

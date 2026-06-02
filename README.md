# Cignature

**Repo:** `Cignature` · **Short name:** Cigs  
**Status:** Frontend-only demo — no backend, no real processing, all actions are cosmetic.

---

## What this is

Cigs is a local Mac media utility UI — a frontend-only demo of the job pipeline interface. No real work happens. All job state is seeded and simulated. Every action fires a toast or fake progress tick.

---

## Stack

- React 19 + react-scripts 5 (via craco)
- Tailwind CSS 3 + shadcn/ui (Radix primitives)
- Framer Motion (subtle layout transitions only)
- Sonner (toasts)
- **Node 18 required** — react-scripts 5 is incompatible with Node 19+

---

## Start dev server

```bash
cd Cignature
./dev.sh
```

`dev.sh` handles Node 18 switching automatically via nvm. Open `http://localhost:3000`.

Or manually:
```bash
export NVM_DIR="$HOME/.nvm"
source "$(brew --prefix nvm)/nvm.sh"
nvm use 18
cd frontend && npx craco start
```

---

## Structure

```
Cignature/
  frontend/
    src/
      App.js                  shell layout (sidebar + main + inspector + statusbar)
      context/CigsContext.js  all state, actions, seeded jobs
      data/seed.js            static data + pure helpers (no side effects)
      screens/                one file per nav destination
        MainScreen.js         job builder (source → hub → target → quality → confirm)
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
        CircularHub.js        branch selector (Audio / Complete / Video)
        shared/               JobCard, StageRail, StatusPill, CommandSummary
      index.css               design tokens (dark-only palette, utilities, motion)
  dev.sh                      one-command dev server (Node 18 safe)
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

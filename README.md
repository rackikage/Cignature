# Cignature

**Local Mac media utility. Dark. Fast. No config.**

Point it at a source. Pick a branch. Output lands on your Desktop as a ZIP.
If you can use GarageBand, you can use this.

---

## What It Is

Cigs is a native macOS app built on Tauri 2 + React 19 + Vite.
The hub covers everything a standard user needs — 80% of the surface handles 99% of jobs.
Zero learning curve. The interface explains itself.

**Current state:** UI is fully built and wired. The job engine (real file processing) is in progress — see `docs/NATIVE_APP_PLAN.md` for the phase roadmap. All pipeline output is clearly labelled as simulated until the engine lands.

---

## Stack

- **React 19 + Vite 6** — frontend
- **Tauri 2** — native macOS shell (`darwin` only)
- **Tailwind CSS 3 + shadcn/ui** — UI system (Radix primitives)
- **Framer Motion** — layout transitions only
- **Sonner** — toasts
- Node (any modern version), no pin needed

---

## Run It

**Browser (Vite only):**
```bash
cd Cignature
./dev.sh
```
Opens at `http://localhost:3000`

**Native macOS window (Tauri):**
```bash
cd frontend && npx tauri dev
```
Requires Rust via rustup. First build ~2 min. Incremental is fast.

---

## Structure

```
Cignature/
  frontend/
    index.html                  Vite entry
    vite.config.mjs             JSX-in-.js loader, @ → src alias
    src-tauri/                  Tauri 2 shell (Rust) — window, bundle, icons
    src/
      App.js                    Shell layout — sidebar, main, inspector, statusbar
      context/CigsContext.js    All state and actions
      data/seed.js              Static data, pure helpers
      screens/
        MainScreen.js           Job builder — source → HUD → target → quality → confirm
        QueueScreen.js          All jobs grouped by state
        ProgressScreen.js       Live pipeline view for selected job
        ResultScreen.js         Output or error for completed/failed job
        SettingsScreen.js       Preferences
        LogsScreen.js           Filterable terminal-style log viewer
      components/
        Sidebar.js              Icon nav with badges
        Titlebar.js             Traffic lights + screen title + status pill
        StatusBar.js            Job count + keyboard hints
        Inspector.js            Context-aware right panel
        Hud/                    Radial command HUD — the centrepiece
        shared/                 JobCard, StageRail, StatusPill, CommandSummary
      index.css                 Design tokens — dark palette, utilities, motion
  dev.sh                        One command dev server
  docs/
    DESIGN_OVERHAUL.md          Approved visual/UX brief (Dracula Command Deck)
    NATIVE_APP_PLAN.md          Phased engine roadmap (Phases 1–4+)
    HANDOFF.md                  Session handoff for continuing the build
```

---

## Design

- **Dark only.** No light mode. Not changing.
- **Palette:** Deep blue-violet surfaces. Violet = identity + primary action. Magenta = live/running. Green = success only. White text only — bold and italic where they mean something.
- **Default output:** Desktop · ZIP. Always. Configurable, never optional.
- **Hub:** The radial HUD is the centrepiece. Everything secondary is still and quiet.
- **Voice:** Terminal-confident. Short, sharp, self-explaining. No hand-holding.

---

## Identity

- **Repo:** `Cignature`
- **Product:** `Cigs`
- Nothing else. No aliases.

---

## Environment Notes

- Node 26, npm 11
- Rust 1.96 via rustup → `~/.cargo/bin` (source `$HOME/.cargo/env`)
- Tauri CLI 2.11.2 via `npx tauri`
- `frontend/.npmrc` → `legacy-peer-deps=true` (React 19 + shadcn peer conflict — keep it)
- Installed media bins: `ffmpeg`, `yt-dlp`, `whisper-cli`
- Missing: `demucs` (engine phase only — pip + torch)

---

## Updating Docs

All docs live in `docs/`. Keep them current — they are the source of truth for the build.

| File | Purpose | Update when |
|---|---|---|
| `docs/DESIGN_OVERHAUL.md` | Approved visual/UX brief — tokens, HUD spec, copy rules, verification checklist | Any design token, palette, component structure, or motion change |
| `docs/NATIVE_APP_PLAN.md` | Phased engine roadmap (Phases 1–4+) | A phase completes, scope changes, or new engine work is planned |
| `docs/HANDOFF.md` | Session handoff — current state, branch, next moves, env notes | End of every significant session before switching context |

**Rules:**
- `HANDOFF.md` must always reflect what's actually on the branch — not what was planned.
- If a locked decision changes (palette, font, HUD motion contract), update `DESIGN_OVERHAUL.md` before touching code.
- Don't add new doc files without a clear, permanent purpose. One file per concern.

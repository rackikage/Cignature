# Cigs — Native App Plan (demo → real Mac app)

## Context

Cigs today is a **frontend-only demo**: a polished React UI where every job is seeded
and every action is cosmetic (`CigsContext` fakes a backend, a 480 ms interval fakes
progress, state lives only in memory). It looks like the product but does no real work.

This document is the roadmap to turn it into a **real, lightweight, native macOS app**:
a Tauri 2 shell with a Rust engine that actually downloads, transcodes, transcribes, and
separates media — while keeping the existing React UI as the front end.

Decisions locked in:
- **Shell:** Tauri 2 + Rust (≈10–40 MB app; Rust is ideal for subprocess/file/stream work).
- **UI:** keep the current React UI; migrate its build CRA→Vite (Tauri's canonical setup)
  and bind it to the engine. No UI rewrite.
- **Pipelines:** all three targets are first-class (Original/Song, Transcript, Stems),
  but built **spine-first** so the hard contract is proven before ML/GPU lands.

## Machine prerequisites (audited 2026-06-02)

| Tool | Status | Needed for |
|------|--------|-----------|
| node 26, npm 11 | ✅ | Vite (note: react-scripts 5 **cannot** run on Node 26 — Vite fixes this) |
| Homebrew, Xcode CLT | ✅ | Rust linking, brew installs |
| ffmpeg, yt-dlp | ✅ installed | Original/Song slice — runnable now |
| whisper-cli (whisper.cpp) | ✅ installed | Transcript slice (still needs a GGML model file) |
| **rustc / cargo** | ❌ **missing** | **blocks the Tauri shell — install next** |
| demucs | ❌ missing | Stems slice (`pip install` torch+demucs, multi-GB) |

## Roadmap

### Phase 1 — Vite migration *(this branch; no Rust needed)*
Replace CRA/CRACO with Vite, keep the entire UI. Removes the Node-18 pin and the `ajv`
build hack. App runs on the installed Node 26.
- Add `vite` + `@vitejs/plugin-react`; drop `react-scripts`, `@craco/craco`, `ajv`.
- `frontend/index.html` at root; `vite.config.mjs` carries the `@`→`src` alias and a
  JSX-in-`.js` loader (`plugin-react` `include`).
- **Verify:** `npm run build` succeeds and `npm run dev` serves at :3000 unchanged.

### Phase 2 — Tauri 2 shell
Install Rust (rustup) + Tauri CLI; scaffold `frontend/src-tauri/`. Point Tauri at the
Vite dev server (dev) and the `build/` output (prod). App opens in a real macOS window.
- `Titlebar.js` becomes the real window chrome (decorations off + drag region).
- **Verify:** `cargo tauri dev` opens the native window rendering the current UI.

### Phase 3 — Engine contract (the seam)
Define the typed boundary between UI and Rust. This is the most important phase — it is
the contract the demo never had.
- **Commands (UI→engine):** `start_job`, `cancel_job`, `retry_job`, `remove_job`,
  `list_jobs`, `get_settings`, `update_setting`, `reveal_in_finder`.
- **Events (engine→UI):** `job://progress`, `job://stage`, `job://log`, `job://done`,
  `job://failed` — each keyed by a durable `jobId`.
- **State machine per job:** `pending → running → (completed | failed | cancelled)` with
  explicit per-stage transitions matching `STAGES` in `data/seed.js`.
- **Bind point:** `frontend/src/context/CigsContext.js` — its action functions
  (`startJob`, `cancelJob`, …) swap their `toast()`/interval fakes for `invoke()` calls;
  the fake ticker is replaced by a `listen()` subscription to `job://*`.

### Phase 4 — First real pipeline: Original/Song (yt-dlp + ffmpeg)
Narrowest happy path, no ML. Proves spawn → progress parse → cancel (child teardown) →
output write → persistence. Rust spawns `yt-dlp`, streams stdout to parse progress,
remuxes via `ffmpeg`, writes the output + a manifest, emits events.
- **Verify:** paste a real URL, watch real progress, cancel mid-run (process dies, temp
  cleaned), completed job survives an app restart.

### Phase 5 — Transcript (whisper.cpp), then Stems (demucs)
Layer the two ML stages onto the proven spine. Transcript shells `whisper-cli` (download
a GGML model on first use). Stems requires installing `demucs` (pip + torch) and handles
long runs, large WAVs, and careful cancel/cleanup.

### Phase 6 — Persistence, packaging, trust
SQLite (or JSON journal) for jobs/logs/outputs so state survives restart. Code-sign +
notarize the `.app`; produce a DMG. Binary discovery/bundling strategy for ffmpeg/yt-dlp.

## Key files

- `frontend/src/context/CigsContext.js` — the single bind point; fake backend lives here.
- `frontend/src/data/seed.js` — `STAGES`, `BRANCHES`, `ALL_TARGETS`, `buildOutputs()`;
  the stage model the Rust state machine must mirror.
- `frontend/src/App.js` — shell layout (Titlebar/Sidebar/main/Inspector/StatusBar).
- `frontend/src-tauri/` — *(Phase 2)* Rust engine, commands, events, `tauri.conf.json`.

## Guiding principle

Freeze the demo surface; build the **smallest real core** that runs one job end-to-end,
survives cancel, writes outputs, and reopens with state intact. Everything else is
layered on a proven contract — not bolted onto a polished illusion.

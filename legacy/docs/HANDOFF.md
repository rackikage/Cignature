# Cigs — Session Handoff (continue seamlessly)

You are **continuing an in-flight build of Cigs / Cignature**, not starting fresh. The previous
session had full momentum and context — match it. Don't re-explain React/Tauri/Vite, don't
re-describe the project back to the user, don't re-plan what's already planned. Move decisively.

---

## Get oriented (≈60 seconds)
```bash
# repo: https://github.com/rackikage/Cignature
cd <your local Cignature clone>            # or: git clone https://github.com/rackikage/Cignature.git
git checkout feat/native-shell && git pull
sed -n '1,80p' docs/DESIGN_OVERHAUL.md     # the APPROVED brief you're about to execute
sed -n '1,60p' docs/NATIVE_APP_PLAN.md     # the bigger phased roadmap

export PATH="$HOME/.cargo/bin:$PATH"        # rust/cargo/tauri (rustup install)
cd frontend && npm install                  # .npmrc pins legacy-peer-deps (React 19 + shadcn)
npx tauri dev                               # native macOS window + hot reload
#   (or `npm run dev` for web on :3000)
```

## What Cigs is (snapshot)
- Local Mac media utility. **Tauri 2 + Vite + React 19**, dark-only, `darwin`.
- Currently a **frontend-only demo**: `frontend/src/context/CigsContext.js` is a fake backend
  (in-memory state + a 480ms fake-progress ticker); every action is simulated. No real
  processing yet. The UI is polished and intentionally shaped.
- Branch **`feat/native-shell`** (pushed). Phases 1 (CRA→Vite) and 2 (Tauri shell) are DONE.

## ▶ DO THIS NEXT — the user said "smash it out"
Execute the **approved, self-contained brief**: **`docs/DESIGN_OVERHAUL.md`**. Nothing in it is
implemented yet (previous session was interrupted right at the start). Locked decisions:
- **Purple-lead Dracula** palette; **green = success only** (not the global accent).
- **Space Grotesk UI + JetBrains Mono** for data.
- **Rebuild MainScreen as a radial command-center HUD.**
- **HUD motion = idle drift + cursor-tracked + snap-on-select, combined, transform/opacity only**
  (the "zero-lag" contract the user insisted on).

Build order, the recurring green→state reclassification table, the HUD spec, per-screen changes,
copy guidelines, and the verification checklist are all in that file. **Keep every existing
`data-testid`** — they are the E2E contract.

### First moves (in order)
1. `git pull feat/native-shell`; read `docs/DESIGN_OVERHAUL.md` fully.
2. **Foundation first:** rewrite tokens in `frontend/src/index.css` → update `tailwind.config.js`
   (colors/fonts/gradients/keyframes) → swap fonts in `frontend/index.html`. Run `npm run build`
   to confirm the base compiles *before* touching components.
3. Reclassification sweep (the green→state table) across shared components + screens.
4. Build new `components/Hud/` + rebuild `MainScreen.js` **last** (the biggest piece).
5. `npm run build` + `npx tauri dev` walk → then rebuild the pinned app (snippet below).

### Definition of done ("gold")
- Green appears ONLY on success/ready/complete; running = magenta; primary actions = violet.
- Calm type: near-white key text, soft secondary, bold only on action/active/brand.
- The radial HUD reads as the centerpiece and stays buttery (no jank) with a job running AND
  with macOS Reduce-Motion on.
- Every screen/panel self-explains in one sharp line; nothing patronizing.
- `npm run build` passes; all `data-testid`s intact.

## State of the tree
- **Pushed & committed** on `feat/native-shell`:
  - chrome-dragon **app icon** (`frontend/src-tauri/icons/`, source `cigs-icon.svg`) — original art,
    not the user's reference image / not Rayquaza. Keep future art original.
  - this handoff + the design brief under `docs/`.
- Commits: `b97d35c` Tauri 2 shell (Phase 2) · `fc5e355` CRA→Vite (Phase 1) · `ec5c3e5` cleanup.
- Separately OPEN: **PR #2** on parent branch `fix/ui-cleanup` →
  https://github.com/rackikage/Cignature/pull/2 (UI cleanup; `feat/native-shell` is built on it).

## Deferred (after the overhaul)
1. **Dock pin** (asked, then deferred): `npx tauri build --debug --bundles app` → install
   `/Applications/Cigs.app` → `dockutil --add` → launch. `dockutil` IS installed. macOS Dock
   icons are **static** (no animation possible there); "live/synced" = rebuild on change, or use
   `tauri dev` for hot reload.
2. **Engine — Phases 3+4** (the real backend): see `docs/NATIVE_APP_PLAN.md`. First real pipeline =
   Original/Song (yt-dlp + ffmpeg, both installed). Bind point = the action fns in `CigsContext.js`.
3. "Make downloads work" is **out of scope** for the visual pass (belongs to the engine phase).

## Environment & gotchas (non-obvious)
- Node 26, npm 11. **Rust 1.96** via rustup → `~/.cargo/bin` (source `$HOME/.cargo/env`).
- **Tauri CLI 2.11.2** via `npx tauri` (npm, prebuilt). First `cargo build` done (~1m41s); incremental fast.
- `frontend/.npmrc` → `legacy-peer-deps=true` (React 19 vs shadcn/Radix peers) — keep it.
- **Vite JSX-in-`.js`** works via the esbuild `loader:jsx` + `@vitejs/plugin-react` in
  `frontend/vite.config.mjs`. New JSX files in `.js` are fine because of this.
- Installed media bins: `ffmpeg`, `yt-dlp`, `whisper-cli`. **Missing:** `demucs` (pip+torch, engine phase only).
- No SVG rasterizer (no rsvg/ImageMagick/sharp); `npx tauri icon <svg>` rasterizes (resvg). To eyeball a
  rendered icon, `Read` the generated `frontend/src-tauri/icons/icon.png`.

## Working style (the user)
Fast, terse, decisive, interrupts often, low patience for friction. **Don't over-ask, don't
patronize, don't re-explain basics.** Ask only high-leverage questions, and prefer `AskUserQuestion`
with a clear recommended default. Be honest about what's simulated vs real, but keep the vibe.
Keep generated artwork **original** (no copyrighted characters/reference reproductions).

## Paste-ready kickoff for the new chat
> Continue the Cigs build. Pull `feat/native-shell` from github.com/rackikage/Cignature, read
> `docs/HANDOFF.md` then `docs/DESIGN_OVERHAUL.md`, and implement that overhaul end-to-end
> ("smash it out"). It's approved — don't re-plan. Verify with a build + `npx tauri dev` window walk.

## Suggested skills for the next session
- None needed to implement — the brief is self-contained; just build it.
- After: run `verify`, then `/code-review` before pushing / opening a PR for `feat/native-shell`.

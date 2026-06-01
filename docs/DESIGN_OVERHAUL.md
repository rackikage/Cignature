# Cigs — Visual & UX Overhaul ("Dracula Command Deck")

## Context
Cigs runs as a Tauri 2 + Vite native macOS app (branch `feat/native-shell`). The UI is
coherent but generic: green (`--primary: 145`) is the global accent on *everything*
(nav, badges, progress, hub, StageRail, StatusPill, titlebar), there is no success/state
color story, type is Space Grotesk + IBM Plex Mono with bold scattered everywhere, and the
"hub" (CircularHub) is a small accent in Main's left column. This pass turns Cigs into a
**confident, Dracula-adjacent dark command deck** that reads like a power-user media hub:
one lead accent (violet) for identity/actions, a small coordinated rainbow for *state*,
near-white only for key text, calm surfaces, and a single high-energy signature — a
zero-lag radial HUD — as the home. Scope is **visual/UX only**; no engine/functional work
(downloads etc. stay simulated and honestly labeled).

Locked decisions: **Purple-lead palette** · **Space Grotesk UI + JetBrains Mono data** ·
**rebuild Main as a radial command center** · **HUD motion = idle drift + cursor-tracked +
snap-on-select, combined, transform-only**.

---

## 1. Direction (the opinion)
- **Deep, confident dark.** Blue-violet near-blacks, not gray wash. Surfaces step in
  lightness only (4%→14%); color lives in the accents, never the backgrounds.
- **Near-white earns it.** Only primary text / active job / primary action hit near-white
  or full-chroma accent. Everything secondary sits ~60% L, low chroma — readable, never glaring.
- **Color = meaning, never decoration.** Violet = identity + primary action + selected.
  The rest is a state code the user learns once. No random hues, no noise.
- **One thing moves.** The radial HUD carries all the energy; every other screen is still
  and quiet. Motion is purposeful and GPU-cheap.
- **Voice: terminal-confident.** Short, sharp, self-explaining copy for smart users. Where
  something is simulated, say so without breaking the vibe.

---

## 2. Tokens

### 2a. Color — rewrite the `:root, .dark` block in `frontend/src/index.css`
HSL triplet values (keep the `H S% L%` format the file already uses):

**Surfaces**
- `--void: 231 30% 4%` · `--background: 231 26% 6%` · `--card: 231 22% 9%`
- `--popover: 231 24% 10%` · `--secondary: 231 18% 14%` · `--muted: 231 16% 14%`
- `--surface-2: 231 18% 12%` · `--border: 231 14% 18%` · `--input: 231 14% 18%`

**Text**
- `--foreground: 233 28% 97%` (key/near-white) · `--muted-foreground: 233 14% 60%` (secondary, soft)
- `*-foreground` for card/popover/secondary = `233 28% 97%`

**Accent system (Dracula-tuned)**
- `--primary: 259 89% 75%` (violet) · `--primary-foreground: 231 40% 8%` · `--ring: 259 89% 75%`
- `--accent: 259 38% 22%` (muted violet *hover surface* for shadcn menus/select) · `--accent-foreground: 233 28% 97%`
- `--success: 141 70% 58%` · `--success-foreground: 231 40% 8%`  (green — "good"/ready/complete only)
- `--info: 190 92% 72%`     (cyan — links/info)
- `--live: 327 95% 73%`     (magenta — running / now-playing / live)
- `--warning: 31 100% 71%`  (amber)
- `--destructive: 0 100% 69%` · `--destructive-foreground: 233 28% 97%`  (red — failed/destructive)
- `--chart-1..5: 259 89% 75% / 190 92% 72% / 141 70% 58% / 327 95% 73% / 31 100% 71%`

**Gradients (new vars, used sparingly — primary CTA, hub ring, brand wordmark)**
- `--grad-primary: linear-gradient(135deg, hsl(259 89% 72%), hsl(327 95% 70%))`
- `--grad-hub: conic-gradient(from 0deg, hsl(259 89% 70% / .0), hsl(259 89% 70% / .9), hsl(327 95% 70% / .9), hsl(190 92% 72% / .9), hsl(259 89% 70% / .0))`

### 2b. Tailwind — `frontend/tailwind.config.js`
- Add `colors`: `success{DEFAULT,foreground}`, `info`, `live{DEFAULT,foreground}`, `warning{DEFAULT,foreground}` (mirror the vars, same pattern as `primary`).
- Add `fontFamily: { sans: ['"Space Grotesk"', ...system], mono: ['"JetBrains Mono"', ...mono] }`.
- Add `backgroundImage: { 'grad-primary': 'var(--grad-primary)', 'grad-hub': 'var(--grad-hub)' }`.
- Add keyframe `hub-drift { to { transform: rotate(360deg) } }` + `animation: { 'hub-drift': 'hub-drift 64s linear infinite' }`.

### 2c. Typography — `frontend/index.html` + `index.css`
- Swap Google Fonts link: keep **Space Grotesk** (400/500/600/700), replace IBM Plex Mono with
  **JetBrains Mono** (400/500/600). Update `--font-mono` to `"JetBrains Mono", ui-monospace, …`.
- **Scale (lean — 3 sizes, 2 weights):** display/screen-title `text-xl` (20px) /600; section-label
  `text-[11px] uppercase tracking-wider` /600 muted; body `text-sm` (13px) /500; meta `text-[11px]`;
  data/mono `text-[12px]`. **Weight 700 reserved** for: brand wordmark, primary action, active-job
  title, selected branch — nowhere else (sweep out stray `font-bold`).
- Mono (`.mono`) for: URLs, paths, filenames, counts/percentements, log lines, kbd, timestamps.

### 2d. Spacing/elevation
- 4px base. Card padding 16 (`p-4`), section gap 20–24, control height 36 (`h-9`). Bump card radius to
  `0.75rem`. Keep `.cigs-elev-1/2`; retune top-highlight to violet (`hsl(259 89% 75% / .05)`).
- Recolor scrollbar thumb hover to `hsl(var(--primary) / .5)`.

---

## 3. The recurring reclassification (apply everywhere)
Today nearly every accent is `primary` (green). Re-map by **meaning**:
| Old (green primary) | New role | Token |
|---|---|---|
| primary action / CTA / selected / active branch / active nav | identity | `primary` (violet) |
| running job, live progress bar, "now running" pulse | live | `live` (magenta) |
| completed / ready / success toast / done-stage check / tool "Ready" | success | `success` (green) |
| links, info hints, "would write" preview path | info | `info` (cyan) |
| warnings, pending emphasis, demo dot | warning | `warning` (amber) |
| failed / cancel / destructive | failure | `destructive` (red) |

Representative files where this swap recurs (pattern is identical — reclassify `primary`
usages by state): `components/shared/StatusPill.js` (**split running→live vs completed→success**,
the key fix), `shared/JobCard.js` (accent bar + progress bar by state), `shared/StageRail.js`
(done→success check, active→violet pulse, fail→red), `components/Sidebar.js` (active→violet,
badges: running→live, pending→amber), `components/Titlebar.js` (status pill running→live;
wordmark uses `bg-grad-primary` clip), `components/Inspector.js`, `screens/ProgressScreen.js`,
`screens/QueueScreen.js`, `screens/ResultScreen.js`, `screens/LogsScreen.js`,
`screens/SettingsScreen.js`.

---

## 4. The radial HUD (signature) — new `frontend/src/components/Hud/`
Replaces `CircularHub.js` (retire it + its import in Main). Files: `Hud.jsx`, `useHudPointer.js`.

**Structure (layers, outer→inner):**
1. `.hud-stage` — square pointer-capture area (carries the cursor-tilt via CSS vars).
2. `.hud-tilt` — wrapper, `transform: perspective(900px) rotateX(var(--hud-ry)) rotateY(var(--hud-rx))`.
3. `.hud-ring` — decorative conic `bg-grad-hub` ring + tick marks; `animation: hub-drift` (idle), `will-change: transform`.
4. `.hud-arc` — the **active indicator** arc/glow; `transition: transform .5s cubic-bezier(.2,.8,.2,1)`; rotates to the selected branch angle (**snap**).
5. Branch nodes (Audio/Complete/Video) — positioned static at fixed angles, upright, clickable (`onSelect`→`patchBuilder({branch})`). Selected node lifts + violet ring.
6. Center core — context-aware: if a job is running show its title + a mini progress ring (`live`); else show the current builder step / "Pick a branch". This is the "everything happens here" focal point.

**Motion = all three combined, transform/opacity only (zero-lag contract):**
- *Idle drift*: `.hud-ring` CSS `hub-drift` (64s).
- *Cursor-tracked*: `useHudPointer` listens to `pointermove` on `.hud-stage`, rAF-damped, sets `--hud-rx/--hud-ry` clamped to ±6°; `pointerleave` eases to 0.
- *Snap*: selecting rotates `.hud-arc` (+ counter-rotates nothing — nodes stay put) to the chosen angle.
- Guards: wrap idle drift + cursor tilt in `@media (prefers-reduced-motion: no-preference)`; never animate box-shadow/filter/layout in a loop; `will-change: transform` only on ring/tilt/arc.

---

## 5. Main rebuild — `frontend/src/screens/MainScreen.js` (radial command center)
Reuse all builder logic from `context/CigsContext.js` (`builder`, `patchBuilder`, `startJob`,
`addToQueue`, `resetBuilder`, `validateBuilder`) and `data/seed.js` (`BRANCHES`,
`targetsForBranch`, `QUALITIES`). Re-present, don't re-implement.

Layout (centered stage, `max-w-[1180px]`):
- **Center**: the `Hud`. Source entry (URL/file toggle + input) sits directly under/over the
  core as the "hit play" affordance. Branch selection happens on the ring.
- **Reveal**: once a branch is chosen, target + quality appear as a compact card docked beside
  the HUD (reuse current RadioGroup/quality grid, restyled) → then the primary **Start** (violet
  `bg-grad-primary`) + **Queue** actions. Keep the `framer-motion` reveal but quiet it.
- **Rails around the hub** (each a compact, self-explaining card that deep-links via `navigate`):
  - *Now running* (`live`) → Progress. Shows active job + mini progress; empty → "Nothing running".
  - *Queue* (amber count) → Queue. "N waiting".
  - *Recent* (success) → Result. Last completed.
- Keep every existing `data-testid`; add `hud`, `hud-branch-*` (carry over), `hud-core`, rail testids.

---

## 6. Per-screen specifics
- **Sidebar**: active = violet pill + left bar; running badge = `live`, pending badge = `warning`. Tooltips already good.
- **Titlebar**: "Cigs" wordmark = `bg-grad-primary bg-clip-text text-transparent` /700; global status pill running→`live` w/ pulse, idle→muted. Traffic lights → destructive/warning/success tokens.
- **StatusBar**: demo dot `warning`; copy → `Preview build — jobs are simulated, nothing on disk is touched.`; mono = JetBrains.
- **Progress**: progress bar `live` while running → `success` at 100%; StageRail per §3; inline honest note `Simulated pipeline — timings are mocked.`
- **Queue**: group headers carry role dots (Running=live, Pending=amber, Completed=success, Failed=red). Section copy one-liners.
- **Result**: completed accent=success, failed=red; action rows hover→violet. Keep toasts honest ("Would …").
- **Logs**: warn=amber, error=red, info=muted; level chips use role bg; mono=JetBrains.
- **Settings**: section icons + switches violet; "Ready" tool chip=success, "Update"=warning; subtitle `Preferences for the local pipeline — applied when the engine lands.`
- **Inspector**: same reclassification; sharpen panel-head labels + empty-state copy.

---

## 7. Copy pass (microcopy)
One sharp line per screen header + each Inspector panel; honest about simulation; smart-user
tone (no hand-holding). Add a short `subtitle` under each screen `<h1>`. Examples:
- Main: "Point Cigs at a source, pick a branch, send it." 
- Queue: "Everything in flight, grouped by state."
- Progress: "Live pipeline for the selected job."
- Logs: "Structured pipeline output. Filter by level or job."
Keep button verbs tight: Start / Queue / Retry / Re-run / Cancel / Remove.

---

## 8. Verification
1. `cd frontend && npm run build` — must pass (2k+ modules).
2. `npx tauri dev` (or `npm run dev`) — in the native window, walk every screen:
   - HUD: confirm idle drift + cursor tilt + snap all read, and stay smooth (no jank) while a job
     runs; toggle macOS Reduce Motion → drift/tilt stop, snap + app still work.
   - Confirm **green appears only** on success/ready/complete; running is magenta; actions violet.
   - Secondary text readable but soft; key text near-white; no stray bold.
3. `grep -rn "text-primary\|bg-primary\|border-primary" frontend/src` → audit each remaining hit is
   genuinely an *action/identity* use (not a mis-mapped state).
4. Confirm all prior `data-testid`s still resolve (E2E contract intact).

## Out of scope (track separately)
Real downloads / file I/O, persistence, and the job engine — these belong to the Tauri engine
phase (Phase 3+4) and stay simulated-but-honest here.

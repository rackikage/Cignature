# Cignature — AI Context & UI/UX Rules

Read this before touching anything. This is the source of truth.

---

## Identity
Repo: Cignature. Product: Cigs. Nothing else.
Stack: Tauri 2 + React 19 + Vite + Tailwind CSS 3 + shadcn/ui + Framer Motion.
Dark only. macOS first. No exceptions.

---

## What Cigs is
A local media processing hub. Point it at any URL, pick a branch,
output lands on Desktop. If you can use GarageBand, you can use this.
The hub covers 80% of the surface for 99% of users. Zero learning curve.
The interface explains itself. Any URL yt-dlp supports works — YouTube,
SoundCloud, TikTok, Instagram, Twitter/X, Vimeo, Bandcamp, any.

---

## Before writing a single line of code, read:
- docs/DESIGN_OVERHAUL.md — approved visual brief. Locked. Don't re-plan it.
- docs/NATIVE_APP_PLAN.md — engine roadmap.
- docs/HANDOFF.md — current state, active branch, next moves.
- frontend/src-tauri/src/engine.rs — full Rust engine.
- frontend/src/context/CigsContext.js — full React state.

---

## Output defaults
Desktop. ZIP. Always. Auto-set on first run — user never thinks about it.
Single file targets (Original/Song, Instrumental): raw file, no zip.
Multi-file targets (Complete, Stems): zip, named after the real title.

---

## Palette — memorise, apply everywhere, no exceptions
- Surfaces: deep blue-violet near-blacks. No gray wash.
- `--primary` violet → identity, primary actions, selected state
- `--live` magenta → running, in-progress, now-playing
- `--success` green → completed, ready, done. Green appears nowhere else.
- `--info` cyan → links, hints, preview paths
- `--warning` amber → pending, warnings, demo indicators
- `--destructive` red → failed, cancelled, destructive actions
- Text: white only. Bold and italic only where they carry meaning — never decoration.
- Gradients: primary CTA and hub ring only. Never on surfaces or cards.

---

## Design rules — hard constraints
- Dark only. No light mode. `setTheme("light")` toasts an explanation and does nothing.
- One thing moves — the radial HUD. Everything else is still and quiet.
- No colored side borders on cards. No icon bubbles. No emoji in UI.
- No placeholder states left in production.
- No stray `font-bold` — weight 700 reserved for: brand wordmark, primary action,
  active job title, selected branch. Audit and remove everything else.
- Every screen has one sharp subtitle line. No hand-holding. No re-explaining.
- Nothing soft, rounded, or playful. Slick. Precise. Serious.
- No gradients on surfaces. Gradient = primary CTA + hub ring only.
- Nothing should look or feel like a joke.

---

## The HUD
The centrepiece. A radial command deck. Carries all the energy.
Motion: idle drift + cursor-tracked tilt + snap-on-select.
Transform and opacity only — zero jank, zero layout thrash.
`will-change: transform` on ring/tilt/arc only.
Guards: wrap drift and tilt in `@media (prefers-reduced-motion: no-preference)`.
When job is running: center shows round progress ring, fills clockwise,
violet → magenta gradient. No text in center during active job — ring is the signal.
Idle: center empty or branch icon only.
Do not touch useHudPointer.js unless explicitly asked.

---

## Voice
Terminal-confident. Short, sharp, self-explaining.
Smart-user tone — no patronising, no re-explaining.
When something is simulated, say so once, quietly. Never break the vibe.

---

## Working style
Fast and decisive. No over-asking. No re-planning what's already approved.
Prefer a clear recommended default over an open question.
Honest about what's simulated vs real.

---

## Worker rules
- Branch: feat/engine. Do not work on main directly.
- Do not push — that's the owner's call.
- Never reference "ballcrush" — dead alias, gone.
- Never add light mode.
- Never add backend, auth, billing, or persistence.
- Never overbuild.
- All data-testid attributes are the E2E contract — do not remove them.
- Read all five docs above before writing code.

---

## Definition of done
- `npm run build` passes clean
- `cargo test` all passing
- All `data-testid`s intact
- Green appears only on success/ready/complete
- No stray bold outside the reserved list
- HUD smooth with a job running and with macOS Reduce Motion enabled
- Every screen subtitle is one sharp line
- Nothing looks or feels like a demo
- Real URL (any platform) produces a real file on Desktop
- Finder reveals it. System notification fires.

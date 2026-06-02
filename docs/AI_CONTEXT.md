# Cignature — AI Context & UI/UX Rules

Read this before touching anything.

## Identity
This is a serious, slick, native macOS media tool. Not a demo. Not a toy.
Repo: Cignature. Product: Cigs. Nothing else.

## Output defaults
Desktop. ZIP. Always. Configurable, never optional.
Auto-set on first run — the user should never have to think about it.

## The hub is the product
The radial HUD covers 80% of the surface for 99% of users.
If you can use GarageBand, you can use Cigs.
Nothing should require a manual.

## Palette — no exceptions
- Deep blue-violet surfaces
- Violet = identity + primary actions
- Magenta = live/running
- Green = success only
- Red = failed/destructive
- Amber = warning/pending
- Cyan = info/links
- White text only
- Bold and italic only where they carry meaning — not decoration

## Design rules — hard
- Dark only. No light mode. Not negotiable.
- Nothing soft, rounded, or playful. Slick and precise.
- One thing moves — the HUD. Everything else is still and quiet.
- No gradients on surfaces. Gradient = primary CTA + hub ring only.
- No colored side borders on cards. No icon bubbles. No emoji.
- Secondary text is readable but soft. Key text is near-white. No stray bold.
- Every screen explains itself in one line. No hand-holding copy.

## Voice
Terminal-confident. Short, sharp.
If something is simulated, say so once, quietly, and move on.
Never break the vibe. Nothing should look or feel like a joke.

## Stack
- Tauri 2 (Rust shell) + Vite 6 + React 19
- Node 18 required (dev.sh handles this)
- feat/engine is the active branch — do not work on main directly

## Current phase
Phase 4 committed (dab9b6e + 99d074d).
Real pipeline: yt-dlp + ffmpeg for Original/Song + cancel wired.
Outstanding: URL invoke broken in live GUI, Instrumental not wired,
Desktop default not clean, Finder reveal, native notifications, HUD progress ring.

## Worker rules
- Never reference "ballcrush" — dead alias
- Never add light mode
- Never add backend, auth, billing, or persistence
- Never overbuild
- Commit on feat/engine, do not push — that's the owner's call
- Read docs/NATIVE_APP_PLAN.md and docs/HANDOFF.md before writing code

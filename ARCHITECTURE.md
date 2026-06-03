# ARCHITECTURE

System shape, state model, UI blueprint, roadmap, and decision log. Read [`DOCTRINE.md`](./DOCTRINE.md) first — this document is downstream of it.

---

## System shape

```
┌────────────────────────────────────────────────────────────┐
│  Tauri 2 native window  (macOS, dark, fixed size)          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  React + Vite + Tailwind                             │  │
│  │  Single store (state/cigs.js)                        │  │
│  │  ── URL field, HUD, branch picker, primary CTA       │  │
│  │  ── Settings sheet, first-run screen, cancel confirm │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │  Tauri commands                      │
│                     ▼                                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Rust engine (src-tauri/src/engine/*)                │  │
│  │  ── job state machine                                │  │
│  │  ── fetch  (yt-dlp sidecar)                          │  │
│  │  ── audio  (ffmpeg sidecar)                          │  │
│  │  ── transcribe (whisper.cpp sidecar)                 │  │
│  │  ── separate  (demucs sidecar — see decision log)    │  │
│  │  ── pack   (zip)                                     │  │
│  │  ── models, history, settings, paths, url_canonical  │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

The frontend never speaks to the binaries directly. Every operation is a Tauri command that returns a typed result and emits typed events for progress.

---

## State model

A single store holds the entire app state:

```
{
  ready: 'first-run' | 'ready',       // gates the surface until models exist
  url: string,                         // raw input
  resolvedSource: SourcePreview | null,// title, platform, duration — once yt-dlp probes
  urlAvailability: 'unknown' | 'ok' | 'unavailable',
  selectedBranch: 'audio' | 'transcript' | 'vocals' | 'twin' | null,
  history: HistoryEntry[],             // capped, used only for dup signal
  duplicateMatch: HistoryEntry | null, // derived: matches resolvedSource?
  job: ActiveJob | null,               // exactly one at a time
  queue: QueuedJob[],                  // jobs the user kicked off while one was running
  settings: SettingsRecord,
  setupProgress: SetupProgress | null, // first-run download state
  cancelConfirm: boolean,
}
```

- **One active job at a time.** New starts append to `queue`. When `job` resolves, the head of `queue` becomes the new `job`.
- **`urlAvailability` is the only failure dimension exposed to the UI.** Anything else surfaces as no-op.
- **`history` is small** (capped ~50 entries, rotated by recency). It exists solely to derive `duplicateMatch`. It is not a list the user browses.

---

## Persistence

Two files in the app support directory (`~/Library/Application Support/Cignature/`):

- `history.json` — capped at 50 entries, rotated. Schema: `{ canonicalUrl, sourceTitle, branch, completedAt }`.
- `settings.json` — `{ outputFolder, whisperModelSize }`.

Models live under the same dir:

- `models/whisper/<size>.bin`
- `models/demucs/<variant>/...` (final shape depends on Demucs decision)

Everything else is in-memory and dies with the process.

---

## First-run

A blocking full-window screen on first launch (and after "Re-run first-run setup" in Settings). It downloads the Whisper model at the configured size and the Demucs weights. While it runs:

- Cannot be dismissed.
- Shows one progress bar per model, with total bytes and elapsed.
- Honest about slow connections — large Whisper tiers can take 10+ minutes.
- On completion, transitions to `ready: 'ready'` and reveals the main surface.

"Ready means ready" — once the user is on the main surface, every output is operational.

---

## Concurrency

Strictly one job at a time.

- Starting a new job while one runs appends to `queue`.
- The queue is visible only via the HUD's idle-vs-running state — there is no queue panel.
- Cancel mid-job (with confirm) discards partial outputs and pulls the next queued job, if any.

---

## Completion

When a job reaches `done`:

1. HUD center flashes a brief check (~500ms).
2. Tauri shell opens Finder with the output file selected.
3. HUD returns to idle.
4. History entry written. Next queued job, if any, starts.

No notification. No sound. No in-app result surface.

---

## Cancel

Mid-job cancel invokes a small confirm modal (the destructive accent color is permitted here). On confirm:

- Engine sends SIGTERM to the active sidecar.
- Partial output files are deleted.
- Job state machine transitions to `cancelled`.
- No history entry written. Next queued job, if any, starts.

---

## Duplicate signal

On URL paste (or resolve), the engine canonicalizes the URL — strips tracking params, normalizes host — and looks for a match in `history`. If found, the UI shows a single muted line under the source preview:

> *You already made `<Output>` from this on `<date>`.*

Informational only. Does not block. Cyan `--info` accent.

URL canonicalization rules live in `src-tauri/src/url_canonical.rs`. Title fuzzy matching is deliberately not in v1.

---

## Failure surface

Only `urlAvailability: 'unavailable'` reaches the UI, rendered as a single muted line where source preview would be:

> URL not available.

Every other engine error is logged to the system log file and dropped on the floor as far as the UI is concerned. The doctrine on this is non-negotiable — if a path can fail in a way the user could care about, it is an engine bug to be fixed, not a UI to be designed.

---

## UI Blueprint

### Window

- Fixed size. Target ~960×640, finalized after Phase 3 (HUD).
- Non-resizable. Close = quit.
- macOS traffic lights only. No custom titlebar widgets.

### Single surface (vertical layout, top to bottom)

1. **URL field** — always present, single full-width input. On window focus, if the clipboard holds a URL and the field is empty, prefill silently.
2. **HUD** — radial command deck. The centerpiece. The only thing that moves.
   - Idle: center empty. Idle drift + cursor tilt. Branch arc visible around the perimeter.
   - Running: center is a violet→magenta progress ring filling clockwise. No text inside the ring.
   - Done: brief check ~500ms, then idle.
3. **Branch picker** — four positions on the HUD arc: Audio Only, Transcript, Vocals Only, Audio Twin Pack. One selected at a time. Selected branch label is brand-bold.
4. **Source preview line** — once URL resolves: title, platform, duration. Quiet, muted. If unavailable, replaced by the "URL not available" line.
5. **Anti-duplicate inline note** — below source preview when applicable.
6. **Primary CTA** — single button, "Make it" (or final wording, locked in Phase 9). Enabled only when URL is valid + branch selected + not currently running. Gradient is permitted here and on the HUD ring only.

### Overlays

- **Settings sheet** — invoked via a small affordance in the corner or via `⌘,`. Four fields: output folder, Whisper model size, Clear history, Re-run first-run setup.
- **First-run setup** — full-window blocking state.
- **Cancel confirm** — small modal, destructive accent.

### What does not exist on the surface

No sidebar. No inspector. No statusbar. No tabs. No menu drawer. No banner. No badges. No tooltips outside Settings. No empty-state hand-holding. No demo banner.

---

## HUD states (visual reference)

| State    | Center                  | Ring                       | Branch arc | Motion                        |
| -------- | ----------------------- | -------------------------- | ---------- | ----------------------------- |
| Idle     | empty                   | static outline             | visible    | idle drift + cursor tilt      |
| Running  | empty                   | violet→magenta fill        | dimmed     | ring fill only (no drift)     |
| Done     | brief check ~500ms      | full ring, fades            | dimmed     | check pop, then idle return   |
| Cancelled | empty                  | static outline             | visible    | snap back to idle             |
| URL bad  | empty                   | static outline             | visible    | idle (no fail animation)      |

---

## Repo structure

```
Cignature/
  README.md
  DOCTRINE.md
  ARCHITECTURE.md
  TOOLS.md
  legacy/                         (deleted at end of Phase 9)
  frontend/
    index.html
    package.json
    vite.config.mjs
    tailwind.config.js
    src/
      main.jsx
      App.jsx
      state/
        cigs.js                   (single store)
      surfaces/
        Hud/
        UrlField/
        BranchPicker/
        SourcePreview/
        HistoryNote/
        PrimaryCta/
        SettingsSheet/
        FirstRunScreen/
        CancelConfirm/
      shared/
        ProgressRing.jsx
        StatusPill.jsx
      tauri/
        commands.js
      styles/
        tokens.css
        index.css
    src-tauri/
      Cargo.toml
      tauri.conf.json
      src/
        main.rs
        commands.rs
        engine/
          mod.rs
          job.rs
          fetch.rs
          audio.rs
          transcribe.rs
          separate.rs
          pack.rs
        models.rs
        history.rs
        settings.rs
        paths.rs
        url_canonical.rs
```

No `screens/` directory. No `components/ui/`. No `hooks/`. No `context/`. The surface is small enough that flat `surfaces/` is the right shape.

---

## Roadmap

The implementation is sequenced so that every phase ends with something testable end-to-end on a real URL.

| Phase | Goal                                                                                                                       |
| ----- | -------------------------------------------------------------------------------------------------------------------------- |
| **0** | Nuke. Move v1 into `legacy/`. Repo root is `README.md` and `legacy/` only. **Done.**                                       |
| **1** | Doctrine. Author this document, `DOCTRINE.md`, and `TOOLS.md`. No code.                                                    |
| **2** | Shell + tokens. Scaffold Tauri fixed window, dark token system, React + Vite + Tailwind. Single empty surface that renders.|
| **3** | HUD. Radial deck with idle drift, cursor tilt, four-position branch arc, progress ring component. Pure visual. Lock window dimensions. |
| **4** | Engine skeleton. Rust job state machine, Tauri command bridge, mocked operations end-to-end. UI binds to state.            |
| **5** | Audio Only e2e. Bundle yt-dlp + ffmpeg. URL → `.mp3`/`.wav` on Desktop. Auto-reveal in Finder. Cancel-with-confirm.        |
| **6** | Transcript e2e. Bundle whisper.cpp. First-run setup screen (blocking model download). URL → `.txt` on Desktop.             |
| **7** | Vocals Only + Audio Twin Pack e2e. Integrate Demucs (per Decision D-001). URL → vocal stem or zipped pack on Desktop.      |
| **8** | History + anti-dup signal. Canonical URL keying. Settings sheet. Persisted across restart.                                 |
| **9** | Polish. Final motion pass. Copy pass. Window dimensions finalized. Fresh-machine gate. Delete `legacy/`.                   |

Verification per phase is end-to-end on a real URL, not unit-test theater.

---

## Decision log (append-only)

Decisions made about the system that aren't obvious from the doctrine and that future contributors should not re-litigate. New decisions append at the bottom with a new `D-NNN` ID.

### D-001 — Demucs distribution (pending)

**Status:** Open. Resolution required before Phase 7.

The problem: stock Demucs is Python + Torch. Bundling it adds >1GB and a Python sidecar runtime, which contradicts the "feels like one binary" doctrine and inflates app size dramatically.

Options under consideration:

1. **Python sidecar.** Bundle a pinned Python + Demucs install via Tauri sidecar. Largest install, simplest path, well-trodden.
2. **ONNX-exported Demucs + Rust inference** (tract or onnxruntime). Mid-size install, mid-complexity. Quality should match within tolerance.
3. **`demucs.cpp` / Rust port** if one of acceptable quality exists. Smallest install, highest engineering risk.
4. **Different separator** (Spleeter or similar). Lower quality, lighter. Compromises the Vocals Only and Audio Twin Pack outputs.

Recommended path pending evaluation: option 2 (ONNX + onnxruntime), with option 1 as fallback if quality regresses.

### D-002 — yt-dlp distribution (resolved)

**Status:** Resolved. Bundle a pinned yt-dlp binary, with a background self-update check on app launch.

Rationale: "ready means ready" — requiring `brew install yt-dlp` breaks first-run. Pinning a version we tested against is the only way to keep the failure surface at one line.

### D-003 — Apple Silicon only for v1 (resolved)

**Status:** Resolved. v1 ships Apple Silicon only.

Rationale: Whisper.cpp Metal acceleration is the headline performance feature on M-series. Universal binaries with both Metal and CPU-only paths double the build complexity for a small marginal user base. v1 doctrine prioritizes one strong surface; v2 of v2 can revisit.

### D-004 — Source match key (resolved)

**Status:** Resolved. Canonical URL only (strip tracking params, normalize host). No title fuzzy matching in v1.

Rationale: False positives on a passive informational note are worse than missed matches. The dup signal is a courtesy, not a guardrail.

### D-005 — History rotation policy (pending)

**Status:** Open. Resolution required during Phase 8.

Options: rotate by recency (last 50 jobs regardless of source), or by distinct URL (last 50 distinct sources). Recency is simpler and likely correct, but distinct-URL produces a more useful dup signal for a power user.

Recommended path pending Phase 8 testing: by recency.

### D-006 — Window dimensions (resolved)

**Status:** Resolved during Phase 3. **960×720, non-resizable.**

Rationale: the HUD frame is 360×360 with a 56px label-overflow padding on each side (FRAME_SIZE = 472), leaving room above for the URL field and below for the primary CTA without crowding. 640px tall (the original Phase 2 guess) put the top branch-arc label on top of the URL field. 720px gives ~40px of gap above and below the HUD frame inside `justify-between`, which feels deliberate without looking empty. Phase 9 copy pass may revisit, but the doctrine commits to fixed dimensions and this is the value.

### D-007 — Reveal-in-Finder API (pending)

**Status:** Open. Verified during Phase 5.

Path A: `tauri-plugin-shell` `open` with selection. Path B: shell out to AppleScript via `Command::new("osascript")`. Whichever ships in Tauri 2 stable as a reliable API wins.

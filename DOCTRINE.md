# DOCTRINE

The source of truth. Read before writing anything — code, docs, copy, fixes.

If a feature, screen, file, or sentence conflicts with this document, the feature is wrong.

---

## What Cigs is

A local Mac utility. Paste a URL. Pick one of four outputs. The file lands on Desktop. Nothing else.

The vocabulary is the four outputs. Everything else — the URL field, the HUD, the Finder reveal — exists to serve that single decision.

---

## Who it is for

A person who already knows what they want and doesn't want to learn anything to get it.

They paste a YouTube link because they need the audio for a project, or a transcript for notes, or vocals for a remix. They expect the file in seconds, in a place they can find it, with a name that makes sense. They are not browsing a feature list. They are not training on a workflow. They are mid-task.

If we have to teach them anything beyond "paste the URL, pick the thing," we have lost.

---

## The problem we solve

Pulling media out of the web today means stitching together five tools: a URL grabber, an audio extractor, a transcription model, a stem separator, a zip utility. Each of those is a different web service, a different command line, a different ad-laden site, a different login, a different output convention.

Cigs collapses that into one window. Paste, pick, done. Locally. Without a login.

---

## What "good" looks like

- Open the app. Paste a URL. Click the output. Wait. Finder opens to the file. Close the app.
- The user never sees the words yt-dlp, ffmpeg, whisper, demucs.
- The user never sees a log.
- The user never sees a failure other than "this URL isn't available."
- The user never wonders where the file went.
- The user never thinks about settings on the way to a job.

---

## The four outputs (locked)

| Output             | Format                                | Packaging                                  |
| ------------------ | ------------------------------------- | ------------------------------------------ |
| Audio Only         | `.mp3` or `.wav`                      | Single file on Desktop                     |
| Transcript         | `.txt`                                | Single file on Desktop                     |
| Vocals Only        | Vocal stem audio                      | Single file on Desktop                     |
| Audio Twin Pack    | Vocal stem + instrumental stem        | `.zip` on Desktop, named after the source  |

These are the entire output vocabulary. New outputs are not added in v1. The set is closed.

---

## Non-goals (the explicit NOT list)

The discipline of this product is what we refuse. None of these belong in v1.

- Local file input. No drag-drop, no file picker. URL only.
- Batch. No paste-list-of-URLs, no folder mode.
- Multi-job parallelism. One job at a time.
- Library / archive surface. History exists only as a duplicate signal, not as a list.
- Logs UI. Diagnostics live in a system log file the user never sees.
- System notifications. Auto-reveal in Finder is the only completion signal.
- Completion sounds.
- AI layer. No natural language, no chat, no assistant mode.
- Per-job output options at a confirm step. The four outputs are the configuration.
- Auth. Billing. Sync. Teams. Sharing. Copy-link of result.
- Menubar mode. Dock-only mode. Window resize.
- Theme switching. Light mode.
- Cross-platform. macOS only.
- Demo mode. Simulation mode. Placeholder mode.

---

## UX rules (hard constraints)

These are not preferences. They are constraints.

- **Single surface.** One window, one screen. No sidebar, no inspector, no statusbar, no titlebar chrome beyond macOS traffic lights. Settings and first-run setup are overlays, not destinations.
- **Fixed window.** Non-resizable. The layout never breaks because the dimensions never change.
- **One thing moves.** The HUD. Everything else is still and quiet. Idle drift and cursor tilt are wrapped in `prefers-reduced-motion: no-preference`.
- **Ring is the signal.** During a running job, the HUD center is a violet→magenta progress ring filling clockwise. No text in the center. No spinner anywhere else.
- **Dark only.** No light mode toggle exists. The token system has one palette.
- **Desktop default.** Output folder is Desktop on first launch. The user can change it once in Settings and forget it.
- **ZIP only when multi-file.** Audio Twin Pack zips because it produces two files. The other three outputs never zip.
- **Auto-reveal in Finder.** A finished job opens Finder with the output selected. That is the completion event. There is no notification, no sound, no in-app result screen.
- **Anti-duplicate signal, not a block.** When a pasted URL matches a previous job, a quiet inline note appears: *"You already made `<Output>` from this on `<date>`."* It does not prevent a new job. It does not require dismissal.
- **Cancel with confirm.** Mid-job cancel is allowed, with a small confirm. Partial outputs are discarded.

---

## The failure rule

There is exactly one user-visible failure: **"This URL isn't available."**

Geoblocked, age-gated, private, deleted, unsupported source — all collapse to that one line. The engine may log the subtype for our own debugging. The user sees one sentence.

Every other failure mode — a model crash, an ffmpeg error, a disk-full event, a missing binary — is an engine bug, not a user error. We design and test against them. We do not surface them. If one happens in the wild, the diagnostic lands in a system log file the user never opens, and we fix it.

This is the most opinionated rule in the doctrine. It governs every error path in the engine. If you find yourself reaching for a toast, a red error card, or a retry button, the engine is wrong and the engine is what you fix.

---

## Voice

Terminal-confident. Short. Sharp. Self-explaining. A smart user is reading; do not patronize them, do not re-explain, do not pad.

- Every screen has one subtitle line. One.
- Buttons are verbs. "Make it." "Cancel." "Reveal."
- Errors are nouns or short clauses. "URL not available."
- Confirmations are quiet. "You already made Transcript from this on May 14."
- No emoji. No marketing language. No celebration text. The Finder window opening is the celebration.

If a sentence sounds like a help doc, cut it. If a label needs a tooltip, the label is wrong.

---

## Palette

Deep blue-violet near-blacks for surfaces. White for text. Five accent roles, each with one job and only one job:

- **`--primary` violet** — identity, primary CTA, selected branch
- **`--live` magenta** — running, in-progress
- **`--success` green** — completed, ready, done. Green appears nowhere else.
- **`--info` cyan** — links, hints, the anti-duplicate inline note
- **`--destructive` red** — destructive confirm (cancel mid-job). The "URL not available" line is *not* red; it is muted text.

Gradients exist in two places only: the primary CTA and the HUD ring. Never on surfaces, never on cards, never on text.

---

## Bold and italic

Bold weight is reserved. It appears on: the brand wordmark, the primary CTA label, the selected branch label, and the running job's source title. Nowhere else.

Italic carries meaning only — never decoration.

Audit any new screen against this. Stray bold is a bug.

---

## Working style (for contributors)

- The doctrine is decided. Do not re-plan what is settled. Read first, then act.
- Prefer one strong surface over two weaker ones. Prefer the cut over the addition.
- When a question is borderline, default to the rule that produces less UI.
- Test on a real URL, on Desktop, with Finder revealed, every time. Unit tests do not verify a product.
- Never push without explicit instruction. Commits are fine; pushes are the owner's call.
- All `data-testid` attributes are the E2E contract — they don't change.

---

## Definition of done (for any change)

- The four outputs work end-to-end on a real URL.
- The HUD is the only thing that moves.
- The HUD is smooth at 60fps with macOS Reduce Motion on.
- Green appears only on success/ready/complete.
- No stray bold outside the reserved list.
- No new screens. No new top-level surfaces.
- No new user-visible failure modes.
- `npm run build` clean. `cargo test` clean.
- Finder reveals the output. Auto.

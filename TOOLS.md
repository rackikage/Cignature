# TOOLS

The four binaries Cigs orchestrates. Read [`DOCTRINE.md`](./DOCTRINE.md) and [`ARCHITECTURE.md`](./ARCHITECTURE.md) first.

These names — yt-dlp, ffmpeg, whisper.cpp, demucs — **never appear in the UI**. They are internal pipeline stages. The user sees only the four outputs (Audio Only, Transcript, Vocals Only, Audio Twin Pack). This document is for engineers, not users.

---

## Why this document exists separately

The doctrine forbids exposing tool names to users. But the engineer building the engine needs a single page that documents the inputs, outputs, bundling story, and risk profile of each binary. That's this file.

If you ever feel the urge to surface yt-dlp's CLI output, demucs's model variant, or whisper's chosen language in the UI — reread the doctrine.

---

## yt-dlp

**Purpose.** Fetch the source media (audio or video) from a URL.

**Inputs.** A canonicalized URL. A target file path. A format hint (best audio).

**Outputs.** A media file on disk. Source metadata (title, platform, duration) extracted via `--print` flags.

**Used by.** All four outputs depend on it. It is the only path media enters the engine.

**Bundling.** Pin a tested yt-dlp binary, ship it as a Tauri sidecar. Background self-update check on app launch (resolved as Decision D-002). The user never installs anything.

**Failure mapping.** Any non-zero exit from yt-dlp — geoblocked, age-gated, private, deleted, unsupported, network-down — collapses to a single user-visible string: *"URL not available."* The engine logs the underlying reason to the system log file for our own debugging; the user sees one line.

**Risks.**
- Sites break yt-dlp regularly. We need the self-update path live by Phase 5, not Phase 9.
- Cookies for age-restricted content are out of scope for v1. Those URLs surface as unavailable.
- Some sources (DRM, paywalls) cannot be supported. Same line.

---

## ffmpeg

**Purpose.** Format conversion (to mp3 or wav), audio extraction from video sources, and final packaging cleanup.

**Inputs.** Media file from yt-dlp. Target format and codec.

**Outputs.** A normalized audio file ready for the rest of the pipeline.

**Used by.** All four outputs.

**Bundling.** Pin a tested ffmpeg binary, ship as a Tauri sidecar. Static build preferred — no Homebrew dependency at runtime.

**Failure mapping.** ffmpeg errors are engine bugs, not user failures. If ffmpeg fails on a real-world source, we fix the engine. The user sees nothing.

**Risks.**
- Static binary build size is meaningful (~50–80MB). Acceptable.
- Codec licensing is permissive for our use (LGPL build, no AAC encoder needed — we ship mp3 via libmp3lame, wav PCM).

---

## whisper.cpp

**Purpose.** Local automatic speech recognition. Produces the `.txt` transcript for the Transcript output.

**Inputs.** Normalized audio file from ffmpeg. Model file. Language hint (auto-detect by default).

**Outputs.** A `.txt` file with the transcript.

**Used by.** Transcript only.

**Bundling.** whisper.cpp main binary, shipped as a Tauri sidecar. Apple Silicon Metal build only (Decision D-003).

**Model storage.** Model file lives at `~/Library/Application Support/Cignature/models/whisper/<size>.bin`. Downloaded during first-run setup or after a Settings model-size change.

**Model sizes (Settings option).**

| Size   | Approximate download | Quality                  | Speed         |
| ------ | -------------------- | ------------------------ | ------------- |
| tiny   | ~75 MB               | acceptable for clean audio | very fast    |
| small  | ~466 MB              | good for most cases      | fast          |
| medium | ~1.5 GB              | strong                   | moderate      |
| large  | ~2.9 GB              | best                     | slow          |

Settings UX must surface the download size at the moment of change, before committing.

**Failure mapping.** Whisper failures are engine bugs. The user does not see "transcript failed." If we can't reliably transcribe a real audio file, we fix the engine.

**Risks.**
- Large model is large. The Settings UX has to be honest about disk usage and download time.
- Auto language detection is good enough for English-dominant content. A non-English source might produce a transcript in the source language — which is correct behavior, not a failure.

---

## Demucs

**Purpose.** Source separation. Splits audio into vocal and instrumental stems. Powers Vocals Only and Audio Twin Pack.

**Inputs.** Normalized audio file from ffmpeg.

**Outputs.** One or two stem files. Vocals Only emits the vocal stem. Audio Twin Pack emits vocal + instrumental stems, then `pack` zips them.

**Used by.** Vocals Only, Audio Twin Pack.

**Bundling.** **Open — see Decision D-001 in `ARCHITECTURE.md`.** Three live options: Python sidecar, ONNX + Rust inference, Rust port if one exists at quality. Decision required before Phase 7.

**Model storage.** Whichever distribution wins, weights live under `~/Library/Application Support/Cignature/models/demucs/...`. Downloaded during first-run setup.

**Failure mapping.** Same rule as everything else. Demucs failure = engine bug. Never surfaced.

**Risks.**
- Biggest distribution risk in the project. If we pick Python sidecar, the install footprint balloons.
- Stem quality at very long durations can degrade — chunked processing required, internal to the engine.
- GPU acceleration on Apple Silicon is real (mps), but we should benchmark before committing to it for v1.

---

## Pipeline mapping (engineer reference)

| Output            | Pipeline                                                                            |
| ----------------- | ----------------------------------------------------------------------------------- |
| Audio Only        | `fetch` → `audio` (mp3 or wav) → reveal                                             |
| Transcript        | `fetch` → `audio` (wav for whisper) → `transcribe` → `.txt` → reveal                |
| Vocals Only       | `fetch` → `audio` (wav) → `separate` (vocal stem) → reveal                          |
| Audio Twin Pack   | `fetch` → `audio` (wav) → `separate` (vocal + instrumental) → `pack` (zip) → reveal |

Engine module map: `engine/fetch.rs`, `engine/audio.rs`, `engine/transcribe.rs`, `engine/separate.rs`, `engine/pack.rs`.

Each stage emits progress events the HUD ring consumes. Stage boundaries are not user-visible — the ring fills smoothly across the full job, weighted by expected stage duration.

---

## What is NOT a tool here

- Tauri is the shell, not a tool in this sense. It is the runtime everything else lives in.
- The HUD is a UI component, not a tool.
- The history file and settings file are persistence, not tools.

Tools, in this document, mean external binaries that produce media artifacts. The four above are the complete set. Adding a fifth requires updating the doctrine first.

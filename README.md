# Cignature

Repo: `Cignature` · Product: **Cigs**

Local Mac utility. Paste a URL, pick what you want from it, the file lands on Desktop.

Four outputs, no escape hatches:

- **Audio Only** — mp3 or wav
- **Transcript** — `.txt`
- **Vocals Only** — isolated vocal stem
- **Audio Twin Pack** — vocals + instrumental, zipped

Dark only. macOS only. Offline-first. No accounts, no batch, no library, no AI layer.

---

## Doctrine first

Before touching code, read in this order:

1. [`DOCTRINE.md`](./DOCTRINE.md) — what Cigs is, what it isn't, voice, constraints.
2. [`ARCHITECTURE.md`](./ARCHITECTURE.md) — system shape, state model, UI blueprint, roadmap, decision log.
3. [`TOOLS.md`](./TOOLS.md) — internal pipelines: yt-dlp, ffmpeg, whisper.cpp, demucs.

These docs are the source of truth. The code follows from them, not the other way around.

---

## Status

Pre-implementation. The previous frontend and engine live under [`legacy/`](./legacy) as migration reference only — they will be deleted at the end of the v2 build.

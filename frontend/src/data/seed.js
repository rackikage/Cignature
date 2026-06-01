// Cigs — static seed data + pure helpers.
// NOTE: This is a FRONT-END-ONLY demo. Nothing here performs real work.
// All job state is seeded/simulated; all actions are cosmetic (toasts + fake progress).

export const STAGES = [
  { key: "resolve", label: "Resolving URL" },
  { key: "download", label: "Downloading media" },
  { key: "convert", label: "Converting audio" },
  { key: "transcribe", label: "Transcribing speech" },
  { key: "separate", label: "Separating stems" },
  { key: "package", label: "Packaging output" },
];

export const BRANCHES = [
  { key: "Audio", sub: "Sound only" },
  { key: "Complete", sub: "Audio + video" },
  { key: "Video", sub: "Picture + sound" },
];

export const ALL_TARGETS = [
  { key: "Original / Song", sub: "Untouched source render" },
  { key: "Vocals", sub: "Isolated vocal track" },
  { key: "Instrumental", sub: "Music without vocals" },
  { key: "Transcript", sub: "Speech to text" },
  { key: "Stems", sub: "Vocals / drums / bass / other" },
];

export const QUALITIES = [
  { key: "Fast", sub: "Speed over fidelity" },
  { key: "Medium", sub: "Balanced" },
  { key: "High", sub: "Max fidelity" },
];

// Decision-tree branching: target options depend on the chosen branch.
export function targetsForBranch(branch) {
  if (branch === "Video") {
    return ALL_TARGETS.filter((t) => ["Original / Song", "Transcript"].includes(t.key));
  }
  // Audio + Complete expose every target.
  return ALL_TARGETS;
}

export const STAGE_SPAN = 100 / STAGES.length;
export const stageIndexFromProgress = (p) =>
  Math.max(0, Math.min(STAGES.length - 1, Math.floor(p / STAGE_SPAN)));

let _seq = 0;
export const uid = (prefix = "id") =>
  `${prefix}_${Date.now().toString(36)}${(_seq++).toString(36)}${Math.floor(
    Math.random() * 1e4
  ).toString(36)}`;

export function buildOutputs(job) {
  const base = (job.title || "output").replace(/\.[^.]+$/, "").trim() || "output";
  const out = [];
  const t = job.target || "";
  if (t.includes("Transcript")) {
    out.push({ name: `${base}.srt`, kind: "transcript", size: "18 KB" });
    out.push({ name: `${base}.txt`, kind: "transcript", size: "12 KB" });
  }
  if (t.includes("Stems")) {
    ["vocals", "drums", "bass", "other"].forEach((s) =>
      out.push({ name: `${base}.${s}.wav`, kind: "stem", size: "41 MB" })
    );
  }
  if (t === "Vocals") out.push({ name: `${base}.vocals.wav`, kind: "audio", size: "38 MB" });
  if (t === "Instrumental") out.push({ name: `${base}.instrumental.wav`, kind: "audio", size: "44 MB" });
  if (t.includes("Original")) {
    out.push({
      name: job.branch === "Video" ? `${base}.mp4` : `${base}.m4a`,
      kind: "media",
      size: job.branch === "Video" ? "212 MB" : "7.4 MB",
    });
  }
  out.push({ name: `${base}.zip`, kind: "archive", size: "—" });
  return out;
}

const T = (mins) => Date.now() - mins * 60 * 1000;

// Exactly three seeded jobs on first load: one running, one completed, one failed.
export const SEED_JOBS = [
  {
    id: "job_seed_run",
    title: "Interview — Deep Work Habits",
    sourceType: "url",
    source: "https://youtu.be/9bZkp7q19f0",
    branch: "Audio",
    target: "Transcript",
    quality: "High",
    state: "running",
    progress: 58,
    stageIndex: 3,
    holdAt: 64, // demo: hold near transcribing so a live job is always visible
    createdAt: T(6),
  },
  {
    id: "job_seed_done",
    title: "session_master_v3.wav",
    sourceType: "file",
    source: "~/Music/sessions/session_master_v3.wav",
    branch: "Complete",
    target: "Stems",
    quality: "Medium",
    state: "completed",
    progress: 100,
    stageIndex: 5,
    createdAt: T(52),
    completedAt: T(38),
    outputs: buildOutputs({ title: "session_master_v3.wav", target: "Stems", branch: "Complete" }),
  },
  {
    id: "job_seed_fail",
    title: "Live Set — Warehouse B2",
    sourceType: "url",
    source: "https://vimeo.com/849213771",
    branch: "Video",
    target: "Original / Song",
    quality: "Fast",
    state: "failed",
    progress: 12,
    stageIndex: 0,
    error: "Resolver returned 403 — source requires authentication",
    createdAt: T(74),
    failedAt: T(71),
  },
];

export const SEED_LOGS = [
  { id: "l1", ts: T(6), level: "info", jobId: "job_seed_run", msg: "URL parsed — host youtu.be" },
  { id: "l2", ts: T(6), level: "info", jobId: "job_seed_run", msg: "Audio branch selected" },
  { id: "l3", ts: T(5), level: "info", jobId: "job_seed_run", msg: "Would invoke local pipeline · whisper.cpp (High)" },
  { id: "l4", ts: T(4), level: "warn", jobId: "job_seed_run", msg: "Sample rate mismatch — would resample to 16 kHz" },
  { id: "l5", ts: T(38), level: "info", jobId: "job_seed_done", msg: "Separated 4 stems via demucs" },
  { id: "l6", ts: T(38), level: "info", jobId: "job_seed_done", msg: "Packaging final export — would write output" },
  { id: "l7", ts: T(72), level: "info", jobId: "job_seed_fail", msg: "Resolving https://vimeo.com/849213771" },
  { id: "l8", ts: T(71), level: "error", jobId: "job_seed_fail", msg: "Resolver returned 403 — authentication required" },
  { id: "l9", ts: T(71), level: "error", jobId: "job_seed_fail", msg: "Pipeline halted before download stage" },
  { id: "l10", ts: T(90), level: "info", jobId: null, msg: "Local tool check — ffmpeg, yt-dlp, whisper.cpp, demucs detected" },
];

export const DEFAULT_SETTINGS = {
  // Output
  outputLocation: "~/Cigs/Output",
  namingStyle: "{title}_{target}",
  overwrite: "Keep both (suffix)",
  // Export packaging
  packageFormat: "ZIP",
  includeManifest: true,
  autoZip: true,
  // Processing defaults
  defaultQuality: "High",
  defaultOutputType: "Transcript",
  transcriptFormat: "SRT",
  audioFormat: "WAV",
  // Behavior
  confirmDestructive: true,
  // Experimental (off by default)
  expGpuAccel: false,
  expDiarization: false,
  expLosslessStems: false,
};

export const NAMING_STYLES = ["{title}", "{title}-{quality}", "{date}_{title}", "{title}_{target}"];
export const TRANSCRIPT_FORMATS = ["SRT", "VTT", "TXT", "JSON"];
export const AUDIO_FORMATS = ["WAV", "FLAC", "M4A", "MP3"];
export const OVERWRITE_MODES = ["Skip existing", "Overwrite", "Keep both (suffix)"];
export const PACKAGE_FORMATS = ["ZIP", "Folder", "ZIP + Folder"];
export const OUTPUT_TYPES = ALL_TARGETS.map((t) => t.key);

export const EXPERIMENTAL = [
  { key: "expGpuAccel", label: "GPU acceleration", hint: "Offload separation to Metal where available" },
  { key: "expDiarization", label: "Speaker diarization", hint: "Label distinct speakers in transcripts" },
  { key: "expLosslessStems", label: "Lossless stems", hint: "Emit 24-bit stems instead of 16-bit" },
];

export const LOCAL_TOOLS = [
  { name: "yt-dlp", version: "2024.08.06", status: "ready" },
  { name: "ffmpeg", version: "6.1.1", status: "ready" },
  { name: "whisper.cpp", version: "1.6.2", status: "ready" },
  { name: "demucs", version: "4.0.1", status: "update" },
];

// ---- formatting helpers ----
export const pad2 = (n) => String(n).padStart(2, "0");
export function fmtClock(ts) {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}
export function fmtAgo(ts) {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
export function truncate(str, n = 42) {
  if (!str) return "";
  return str.length > n ? str.slice(0, n - 1) + "…" : str;
}

// Build a sample output filename from current settings (used by Settings inspector preview).
export function previewFilename(settings, sample = { title: "Interview — Deep Work Habits", target: "Transcript", quality: "High" }) {
  const date = new Date().toISOString().slice(0, 10);
  const slug = (sample.title || "output").replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "");
  const ext = settings.transcriptFormat ? settings.transcriptFormat.toLowerCase() : "srt";
  const name = (settings.namingStyle || "{title}")
    .replace("{title}", slug)
    .replace("{quality}", (sample.quality || "High").toLowerCase())
    .replace("{date}", date)
    .replace("{target}", (sample.target || "Transcript").toLowerCase());
  return `${name}.${ext}`;
}

//! Cigs engine — the UI⇄Rust seam (Phase 3) + the first real pipeline (Phase 4).
//!
//! The frontend issues `start_job` and the engine drives a real job through a
//! state machine, emitting events keyed by a durable `jobId`. The stage model
//! mirrors `STAGES` in `frontend/src/data/seed.js` — keep the two in sync.
//!
//! REAL today:
//!   * the command/event plumbing + per-job cancel registry (watch channel)
//!   * `resolve` — a real `yt-dlp` metadata probe (title/duration)
//!   * **Original / Song** — a real pipeline: `yt-dlp` download (streamed
//!     progress) → `ffmpeg` remux/transcode (streamed progress) → file written
//!     to the Desktop. Cancel sends SIGTERM to the child and cleans the temp dir.
//!
//! STILL SIMULATED (honest logs say so): Transcript / Stems / Vocals /
//! Instrumental — they walk the same spine and Phase 5 swaps in
//! `whisper`/`demucs`.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use regex::Regex;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::sync::watch;

/// Stage keys + labels — mirrors `STAGES` in `data/seed.js`.
const STAGES: [(&str, &str); 6] = [
    ("resolve", "Resolving URL"),
    ("download", "Downloading media"),
    ("convert", "Converting audio"),
    ("transcribe", "Transcribing speech"),
    ("separate", "Separating stems"),
    ("package", "Packaging output"),
];

// Progress band boundaries (0..100) for the real Original/Song pipeline.
const RESOLVE_END: f64 = 14.0;
const DL_START: f64 = 14.0;
const DL_END: f64 = 70.0;
const CV_START: f64 = 70.0;
const CV_END: f64 = 98.0;

/// Job request from the UI. Fields arrive camelCase from JS.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JobRequest {
    pub job_id: String,
    /// The UI's working title — used as the output base for file sources or
    /// when a URL probe yields no title.
    #[serde(default)]
    pub title: String,
    pub source: String,
    #[serde(default)]
    pub source_type: String,
    pub branch: String,
    pub target: String,
    #[serde(default)]
    pub quality: String,
}

/// Per-job cancellation, held in Tauri-managed state. A `watch` channel lets
/// the runner both cheaply poll (`*rx.borrow()`) and `await` a cancel signal
/// inside `tokio::select!` while a subprocess streams.
#[derive(Default)]
pub struct JobRegistry {
    cancels: Mutex<HashMap<String, watch::Sender<bool>>>,
}

impl JobRegistry {
    fn register(&self, id: &str) -> watch::Receiver<bool> {
        let (tx, rx) = watch::channel(false);
        self.cancels.lock().unwrap().insert(id.to_string(), tx);
        rx
    }

    fn finish(&self, id: &str) {
        self.cancels.lock().unwrap().remove(id);
    }

    /// Signal a running job to stop. Returns false if no such job is live.
    pub fn cancel(&self, id: &str) -> bool {
        match self.cancels.lock().unwrap().get(id) {
            Some(tx) => {
                let _ = tx.send(true);
                true
            }
            None => false,
        }
    }
}

// ---- event payloads (serialized camelCase to match the JS listeners) ----

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProgressPayload {
    job_id: String,
    progress: f64,
    stage_index: usize,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct StagePayload {
    job_id: String,
    stage_index: usize,
    stage: String,
    label: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct LogPayload {
    job_id: String,
    level: String,
    message: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct OutputItem {
    name: String,
    kind: String,
    size: String,
    /// Absolute path on disk — present only for real outputs (Phase 4+).
    #[serde(skip_serializing_if = "Option::is_none")]
    path: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DonePayload {
    job_id: String,
    title: String,
    outputs: Vec<OutputItem>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct FailedPayload {
    job_id: String,
    error: String,
}

fn emit_stage(app: &AppHandle, job_id: &str, i: usize) {
    let (stage, label) = STAGES[i];
    let _ = app.emit(
        "job://stage",
        StagePayload {
            job_id: job_id.to_string(),
            stage_index: i,
            stage: stage.to_string(),
            label: label.to_string(),
        },
    );
}

fn emit_progress(app: &AppHandle, job_id: &str, progress: f64, stage_index: usize) {
    let _ = app.emit(
        "job://progress",
        ProgressPayload {
            job_id: job_id.to_string(),
            progress: progress.clamp(0.0, 100.0),
            stage_index,
        },
    );
}

fn emit_log(app: &AppHandle, job_id: &str, level: &str, message: impl Into<String>) {
    let _ = app.emit(
        "job://log",
        LogPayload {
            job_id: job_id.to_string(),
            level: level.to_string(),
            message: message.into(),
        },
    );
}

fn emit_done(app: &AppHandle, job_id: &str, title: &str, outputs: Vec<OutputItem>) {
    let _ = app.emit(
        "job://done",
        DonePayload {
            job_id: job_id.to_string(),
            title: title.to_string(),
            outputs,
        },
    );
}

fn emit_failed(app: &AppHandle, job_id: &str, error: impl Into<String>) {
    let _ = app.emit(
        "job://failed",
        FailedPayload {
            job_id: job_id.to_string(),
            error: error.into(),
        },
    );
}

// ---- binary discovery (PATH for now; Phase 6 handles bundling) ----

fn ytdlp_bin() -> PathBuf {
    which::which("yt-dlp").unwrap_or_else(|_| "yt-dlp".into())
}

fn ffmpeg_bin() -> PathBuf {
    which::which("ffmpeg").unwrap_or_else(|_| "ffmpeg".into())
}

/// Outcome of stage 0 — distinguishes cancel from failure so the runner can
/// emit the right terminal event.
enum ProbeOutcome {
    Ok((Option<String>, Option<f64>)),
    Failed(String),
    Cancelled,
}

/// Real `yt-dlp` metadata probe — no download, just the JSON dump.
/// Cancellable via the watcher; bounded by a 30s timeout so a hung yt-dlp
/// can't pin a job forever at stage 0.
async fn probe_metadata(source: &str, cancel: &mut watch::Receiver<bool>) -> ProbeOutcome {
    use tokio::io::AsyncReadExt;
    let mut cmd = tokio::process::Command::new(ytdlp_bin());
    cmd.args(["--no-warnings", "--dump-single-json", "--skip-download", source])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);
    let mut child = match cmd.spawn() {
        Ok(c) => c,
        Err(e) => return ProbeOutcome::Failed(format!("spawn failed: {e}")),
    };
    let mut stdout = child.stdout.take().expect("stdout piped");
    let mut stderr = child.stderr.take().expect("stderr piped");

    // Drain stdout+stderr concurrently; resolves when yt-dlp closes both pipes
    // (i.e. has effectively exited). The borrow split below (stdout/stderr
    // were `take()`d) leaves `&mut child` free for terminate_child() in the
    // cancel/timeout arms.
    let read_both = async move {
        let mut o = Vec::new();
        let mut e = Vec::new();
        let _ = tokio::join!(stdout.read_to_end(&mut o), stderr.read_to_end(&mut e));
        (o, e)
    };
    tokio::pin!(read_both);
    let timeout = tokio::time::sleep(Duration::from_secs(30));
    tokio::pin!(timeout);

    let (out_buf, err_buf) = tokio::select! {
        biased;
        _ = wait_for_cancel(cancel) => {
            terminate_child(&mut child).await;
            return ProbeOutcome::Cancelled;
        }
        _ = &mut timeout => {
            terminate_child(&mut child).await;
            return ProbeOutcome::Failed("Resolve timed out after 30s".into());
        }
        bufs = &mut read_both => bufs,
    };

    let status = match child.wait().await {
        Ok(s) => s,
        Err(e) => return ProbeOutcome::Failed(e.to_string()),
    };
    if !status.success() {
        let stderr_str = String::from_utf8_lossy(&err_buf);
        let first = stderr_str.lines().next().unwrap_or("yt-dlp failed").trim();
        return ProbeOutcome::Failed(first.to_string());
    }
    let json: serde_json::Value = match serde_json::from_slice(&out_buf) {
        Ok(j) => j,
        Err(e) => return ProbeOutcome::Failed(format!("parse: {e}")),
    };
    let title = json.get("title").and_then(|v| v.as_str()).map(String::from);
    let duration = json.get("duration").and_then(|v| v.as_f64());
    ProbeOutcome::Ok((title, duration))
}

fn fmt_dur(secs: f64) -> String {
    let s = secs.max(0.0) as u64;
    let (h, m, sec) = (s / 3600, (s % 3600) / 60, s % 60);
    if h > 0 {
        format!("{h}:{m:02}:{sec:02}")
    } else {
        format!("{m}:{sec:02}")
    }
}

fn lerp(a: f64, b: f64, t: f64) -> f64 {
    a + (b - a) * t.clamp(0.0, 1.0)
}

fn human_size(bytes: u64) -> String {
    const UNITS: [&str; 5] = ["B", "KB", "MB", "GB", "TB"];
    let mut b = bytes as f64;
    let mut i = 0;
    while b >= 1024.0 && i < UNITS.len() - 1 {
        b /= 1024.0;
        i += 1;
    }
    if i == 0 {
        format!("{bytes} {}", UNITS[0])
    } else {
        format!("{b:.1} {}", UNITS[i])
    }
}

/// Parse an ffmpeg `-progress` `out_time=HH:MM:SS.micro` value to seconds.
fn parse_ffmpeg_time(s: &str) -> Option<f64> {
    let mut parts = s.split(':');
    let h: f64 = parts.next()?.parse().ok()?;
    let m: f64 = parts.next()?.parse().ok()?;
    let sec: f64 = parts.next()?.parse().ok()?;
    Some(h * 3600.0 + m * 60.0 + sec)
}

/// Strip a trailing extension, mirroring the JS `buildOutputs` base logic.
fn output_base(title: &str) -> String {
    let stripped = match title.rfind('.') {
        Some(i) if i > 0 && i < title.len() - 1 => &title[..i],
        _ => title,
    };
    let trimmed = stripped.trim();
    if trimmed.is_empty() {
        "output".to_string()
    } else {
        trimmed.to_string()
    }
}

/// Make a title safe to use as a filesystem filename.
fn sanitize_filename(s: &str) -> String {
    let mut out: String = s
        .chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' | '\0' => '-',
            c if (c as u32) < 0x20 => '-',
            c => c,
        })
        .collect();
    out = out.trim().trim_matches('.').trim().to_string();
    if out.is_empty() {
        out = "output".to_string();
    }
    if out.chars().count() > 180 {
        out = out.chars().take(180).collect::<String>().trim().to_string();
    }
    out
}

/// First regular file inside `dir` (yt-dlp writes exactly one `source.<ext>`).
fn first_file_in(dir: &Path) -> Option<PathBuf> {
    std::fs::read_dir(dir)
        .ok()?
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .find(|p| p.is_file())
}

/// A collision-free `dir/base.ext`, suffixing " (n)" as needed.
fn unique_path(dir: &Path, base: &str, ext: &str) -> PathBuf {
    let mut p = dir.join(format!("{base}.{ext}"));
    let mut n = 2;
    while p.exists() {
        p = dir.join(format!("{base} ({n}).{ext}"));
        n += 1;
    }
    p
}

/// Mirror of `buildOutputs(job)` in `data/seed.js` (used for the still-simulated
/// targets; the real Original/Song path builds its own output list).
fn build_outputs(req: &JobRequest, title: &str) -> Vec<OutputItem> {
    let base = output_base(title);
    let t = req.target.as_str();
    let mut out = Vec::new();
    let item = |name: String, kind: &str, size: &str| OutputItem {
        name,
        kind: kind.to_string(),
        size: size.to_string(),
        path: None,
    };

    if t.contains("Transcript") {
        out.push(item(format!("{base}.srt"), "transcript", "18 KB"));
        out.push(item(format!("{base}.txt"), "transcript", "12 KB"));
    }
    if t.contains("Stems") {
        for s in ["vocals", "drums", "bass", "other"] {
            out.push(item(format!("{base}.{s}.wav"), "stem", "41 MB"));
        }
    }
    if t == "Vocals" {
        out.push(item(format!("{base}.vocals.wav"), "audio", "38 MB"));
    }
    if t == "Instrumental" {
        out.push(item(format!("{base}.instrumental.wav"), "audio", "44 MB"));
    }
    if t.contains("Original") {
        let (name, size) = if req.branch == "Video" {
            (format!("{base}.mp4"), "212 MB")
        } else {
            (format!("{base}.m4a"), "7.4 MB")
        };
        out.push(item(name, "media", size));
    }
    out.push(item(format!("{base}.zip"), "archive", "—"));
    out
}

const STAGE_SPAN: f64 = 100.0 / STAGES.len() as f64;

/// Outcome of a streamed subprocess.
enum RunError {
    Cancelled,
    Failed(String),
}

/// Resolve once the job is cancelled; otherwise pends forever (level-triggered,
/// safe to drop/recreate inside `select!` because the flag is a latch).
async fn wait_for_cancel(rx: &mut watch::Receiver<bool>) {
    if *rx.borrow() {
        return;
    }
    while rx.changed().await.is_ok() {
        if *rx.borrow() {
            return;
        }
    }
    std::future::pending::<()>().await
}

/// SIGTERM the child, give it a 2s grace, then SIGKILL if still alive.
async fn terminate_child(child: &mut tokio::process::Child) {
    #[cfg(unix)]
    if let Some(pid) = child.id() {
        unsafe {
            libc::kill(pid as i32, libc::SIGTERM);
        }
    }
    if tokio::time::timeout(Duration::from_secs(2), child.wait())
        .await
        .is_err()
    {
        let _ = child.start_kill();
        let _ = child.wait().await;
    }
}

/// Spawn `cmd`, stream stdout line-by-line into `on_line`, and race every read
/// against the cancel signal. On cancel the child is terminated and
/// `RunError::Cancelled` returned. On non-zero exit the last stderr line is the
/// error message.
async fn run_with_progress(
    cmd: &mut tokio::process::Command,
    cancel: &mut watch::Receiver<bool>,
    mut on_line: impl FnMut(&str),
) -> Result<(), RunError> {
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());
    cmd.kill_on_drop(true);

    let mut child = cmd
        .spawn()
        .map_err(|e| RunError::Failed(format!("spawn failed: {e}")))?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| RunError::Failed("no stdout".into()))?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| RunError::Failed("no stderr".into()))?;
    let mut out_lines = BufReader::new(stdout).lines();

    // Drain stderr into a capped buffer for error reporting.
    let err_buf = Arc::new(Mutex::new(String::new()));
    let eb = err_buf.clone();
    let err_task = tokio::spawn(async move {
        let mut el = BufReader::new(stderr).lines();
        while let Ok(Some(l)) = el.next_line().await {
            let mut g = eb.lock().unwrap();
            if g.len() < 8192 {
                g.push_str(&l);
                g.push('\n');
            }
        }
    });

    loop {
        tokio::select! {
            line = out_lines.next_line() => {
                match line {
                    Ok(Some(l)) => on_line(&l),
                    Ok(None) => break,
                    Err(e) => {
                        terminate_child(&mut child).await;
                        let _ = err_task.await;
                        return Err(RunError::Failed(format!("read error: {e}")));
                    }
                }
            }
            _ = wait_for_cancel(cancel) => {
                terminate_child(&mut child).await;
                let _ = err_task.await;
                return Err(RunError::Cancelled);
            }
        }
    }

    let status = child
        .wait()
        .await
        .map_err(|e| RunError::Failed(e.to_string()))?;
    let _ = err_task.await;
    if !status.success() {
        let g = err_buf.lock().unwrap();
        let last = g
            .lines()
            .rev()
            .find(|l| !l.trim().is_empty())
            .unwrap_or("process failed")
            .to_string();
        return Err(RunError::Failed(last));
    }
    Ok(())
}

/// Auto-remove a temp dir on every exit path (success, failure, cancel).
struct TempGuard(PathBuf);
impl Drop for TempGuard {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}

/// REAL Original/Song pipeline: yt-dlp download → ffmpeg remux/transcode →
/// file on the Desktop. Returns the produced output list (one media file).
async fn run_original_song(
    app: &AppHandle,
    req: &JobRequest,
    title: &str,
    duration: Option<f64>,
    cancel: &mut watch::Receiver<bool>,
) -> Result<Vec<OutputItem>, RunError> {
    let job_id = &req.job_id;
    let is_video = req.branch == "Video";

    let temp = std::env::temp_dir().join(format!("cigs-{job_id}"));
    std::fs::create_dir_all(&temp).map_err(|e| RunError::Failed(format!("temp dir: {e}")))?;
    let _guard = TempGuard(temp.clone());

    // ---- stage 1: download (yt-dlp, real streamed progress) ----
    emit_stage(app, job_id, 1);
    emit_log(app, job_id, "info", "Downloading source media (yt-dlp)");
    let out_tpl = temp.join("source.%(ext)s");
    let fmt = if is_video { "best[ext=mp4]/best" } else { "bestaudio/best" };
    let mut dl = tokio::process::Command::new(ytdlp_bin());
    dl.arg("--newline")
        .arg("--no-playlist")
        .arg("--no-warnings")
        .arg("--no-part")
        .arg("-f")
        .arg(fmt)
        .arg("-o")
        .arg(&out_tpl)
        .arg(&req.source);

    let pct_re = Regex::new(r"\[download\]\s+([0-9.]+)%").unwrap();
    {
        let app = app.clone();
        let job_id = job_id.clone();
        run_with_progress(&mut dl, cancel, move |line| {
            if let Some(c) = pct_re.captures(line) {
                if let Ok(pct) = c[1].parse::<f64>() {
                    emit_progress(&app, &job_id, lerp(DL_START, DL_END, pct / 100.0), 1);
                }
            }
        })
        .await?;
    }
    if *cancel.borrow() {
        return Err(RunError::Cancelled);
    }
    let input =
        first_file_in(&temp).ok_or_else(|| RunError::Failed("download produced no file".into()))?;
    emit_progress(app, job_id, DL_END, 1);

    // ---- stage 2: convert/remux (ffmpeg, real streamed progress) ----
    emit_stage(app, job_id, 2);
    let base = sanitize_filename(&output_base(title));
    let ext = if is_video { "mp4" } else { "m4a" };
    let dest_dir = dirs::desktop_dir()
        .or_else(dirs::home_dir)
        .ok_or_else(|| RunError::Failed("no Desktop directory".into()))?;
    let out_path = unique_path(&dest_dir, &base, ext);
    emit_log(
        app,
        job_id,
        "info",
        if is_video {
            "Remuxing to MP4 (ffmpeg)"
        } else {
            "Transcoding to M4A · AAC 256k (ffmpeg)"
        },
    );

    let mut ff = tokio::process::Command::new(ffmpeg_bin());
    ff.arg("-y")
        .arg("-hide_banner")
        .arg("-loglevel")
        .arg("error")
        .arg("-nostats")
        .arg("-i")
        .arg(&input);
    if is_video {
        ff.arg("-c").arg("copy").arg("-movflags").arg("+faststart");
    } else {
        ff.arg("-vn")
            .arg("-c:a")
            .arg("aac")
            .arg("-b:a")
            .arg("256k")
            .arg("-movflags")
            .arg("+faststart");
    }
    ff.arg("-progress").arg("pipe:1").arg(&out_path);

    let dur = duration.unwrap_or(0.0);
    {
        let app = app.clone();
        let job_id = job_id.clone();
        run_with_progress(&mut ff, cancel, move |line| {
            if let Some(v) = line.strip_prefix("out_time=") {
                if dur > 0.0 {
                    if let Some(sec) = parse_ffmpeg_time(v.trim()) {
                        emit_progress(&app, &job_id, lerp(CV_START, CV_END, sec / dur), 2);
                    }
                }
            }
        })
        .await?;
    }
    if *cancel.borrow() {
        let _ = std::fs::remove_file(&out_path);
        return Err(RunError::Cancelled);
    }

    emit_progress(app, job_id, CV_END, 2);
    let size = std::fs::metadata(&out_path)
        .map(|m| human_size(m.len()))
        .unwrap_or_else(|_| "—".into());
    let fname = out_path
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| format!("{base}.{ext}"));
    emit_log(
        app,
        job_id,
        "info",
        format!("Saved {fname} ({size}) to {}", dest_dir.display()),
    );

    Ok(vec![OutputItem {
        name: fname,
        kind: if is_video { "media".into() } else { "audio".into() },
        size,
        path: Some(out_path.to_string_lossy().to_string()),
    }])
    // _guard drops here → temp dir removed
}

/// Drive one job through the state machine, emitting events as it goes.
async fn run_job(app: AppHandle, req: JobRequest, mut cancel: watch::Receiver<bool>) {
    let job_id = req.job_id.clone();

    // ---- stage 0: resolve (REAL metadata probe for URL sources) ----
    emit_stage(&app, &job_id, 0);
    emit_log(
        &app,
        &job_id,
        "info",
        format!("{} · {} · {} preset", req.branch, req.target, req.quality),
    );
    let mut effective_title = req.title.clone();
    let mut duration_secs: Option<f64> = None;

    if req.source_type == "file" {
        emit_log(&app, &job_id, "info", "Local file source — skipping URL resolve");
    } else {
        emit_log(&app, &job_id, "info", format!("Resolving {}", req.source));
        match probe_metadata(&req.source, &mut cancel).await {
            ProbeOutcome::Ok((title, duration)) => {
                if let Some(t) = &title {
                    emit_log(&app, &job_id, "info", format!("Resolved: {t}"));
                    effective_title = t.clone();
                }
                if let Some(d) = duration {
                    emit_log(&app, &job_id, "info", format!("Duration {}", fmt_dur(d)));
                    duration_secs = Some(d);
                }
            }
            ProbeOutcome::Cancelled => {
                emit_failed(&app, &job_id, "Cancelled");
                return;
            }
            ProbeOutcome::Failed(e) => {
                emit_failed(&app, &job_id, format!("Resolve failed — {e}"));
                return;
            }
        }
    }
    if *cancel.borrow() {
        emit_failed(&app, &job_id, "Cancelled");
        return;
    }
    emit_progress(&app, &job_id, RESOLVE_END, 0);

    // ---- Phase 4: Original/Song runs for real; other targets stay simulated ----
    if req.target.contains("Original") {
        match run_original_song(&app, &req, &effective_title, duration_secs, &mut cancel).await {
            Ok(outputs) => emit_done(&app, &job_id, &effective_title, outputs),
            Err(RunError::Cancelled) => emit_failed(&app, &job_id, "Cancelled"),
            Err(RunError::Failed(e)) => emit_failed(&app, &job_id, e),
        }
        return;
    }

    // ---- simulated walk: Transcript / Stems / Vocals / Instrumental ----
    let total = STAGES.len();
    for i in 1..total {
        if *cancel.borrow() {
            emit_failed(&app, &job_id, "Cancelled");
            return;
        }
        emit_stage(&app, &job_id, i);
        let start = i as f64 * STAGE_SPAN;
        let end = (i + 1) as f64 * STAGE_SPAN;
        for s in 1..=6 {
            if *cancel.borrow() {
                emit_failed(&app, &job_id, "Cancelled");
                return;
            }
            tokio::time::sleep(Duration::from_millis(180)).await;
            let p = start + (end - start) * (s as f64 / 6.0);
            emit_progress(&app, &job_id, p, i);
        }
    }
    emit_log(
        &app,
        &job_id,
        "info",
        "Simulated pipeline complete — Transcript/Stems gain real engines in Phase 5",
    );
    let outputs = build_outputs(&req, &effective_title);
    emit_done(&app, &job_id, &effective_title, outputs);
}

/// UI→engine: start a job. Returns the `jobId` immediately and drives the work
/// on a background task; progress arrives via `job://*` events.
#[tauri::command]
pub fn start_job(
    app: AppHandle,
    registry: State<'_, JobRegistry>,
    req: JobRequest,
) -> Result<String, String> {
    let job_id = req.job_id.clone();
    if job_id.trim().is_empty() {
        return Err("missing jobId".into());
    }
    let cancel = registry.register(&job_id);
    let id_for_cleanup = job_id.clone();

    tauri::async_runtime::spawn(async move {
        run_job(app.clone(), req, cancel).await;
        app.state::<JobRegistry>().finish(&id_for_cleanup);
    });

    Ok(job_id)
}

/// UI→engine: cancel a running job. Returns true if a live job was signalled.
#[tauri::command]
pub fn cancel_job(registry: State<'_, JobRegistry>, job_id: String) -> bool {
    registry.cancel(&job_id)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn req(target: &str, branch: &str) -> JobRequest {
        JobRequest {
            job_id: "j".into(),
            title: String::new(),
            source: "https://x".into(),
            source_type: "url".into(),
            branch: branch.into(),
            target: target.into(),
            quality: "High".into(),
        }
    }

    fn names(out: &[OutputItem]) -> Vec<&str> {
        out.iter().map(|o| o.name.as_str()).collect()
    }

    #[test]
    fn output_base_strips_extension_and_falls_back() {
        assert_eq!(output_base("session_master_v3.wav"), "session_master_v3");
        assert_eq!(output_base("PSY - GANGNAM STYLE"), "PSY - GANGNAM STYLE");
        assert_eq!(output_base("  "), "output");
        assert_eq!(output_base(""), "output");
    }

    #[test]
    fn transcript_outputs_match_js() {
        let out = build_outputs(&req("Transcript", "Audio"), "Clip");
        assert_eq!(names(&out), vec!["Clip.srt", "Clip.txt", "Clip.zip"]);
    }

    #[test]
    fn stems_outputs_match_js() {
        let out = build_outputs(&req("Stems", "Complete"), "Mix");
        assert_eq!(
            names(&out),
            vec![
                "Mix.vocals.wav",
                "Mix.drums.wav",
                "Mix.bass.wav",
                "Mix.other.wav",
                "Mix.zip",
            ]
        );
    }

    #[test]
    fn original_extension_depends_on_branch() {
        let video = build_outputs(&req("Original / Song", "Video"), "Show");
        assert!(names(&video).contains(&"Show.mp4"));
        let audio = build_outputs(&req("Original / Song", "Audio"), "Show");
        assert!(names(&audio).contains(&"Show.m4a"));
    }

    #[test]
    fn duration_formats_like_clock() {
        assert_eq!(fmt_dur(252.0), "4:12");
        assert_eq!(fmt_dur(3661.0), "1:01:01");
        assert_eq!(fmt_dur(0.0), "0:00");
    }

    #[test]
    fn sanitize_filename_strips_path_chars() {
        assert_eq!(sanitize_filename("AC/DC: Live"), "AC-DC- Live");
        assert_eq!(sanitize_filename("  ...  "), "output");
        assert_eq!(sanitize_filename("normal title"), "normal title");
    }

    #[test]
    fn ffmpeg_time_parses_to_seconds() {
        assert_eq!(parse_ffmpeg_time("00:00:12.500000"), Some(12.5));
        assert_eq!(parse_ffmpeg_time("01:02:03.000000"), Some(3723.0));
        assert_eq!(parse_ffmpeg_time("N/A"), None);
    }

    #[test]
    fn human_size_scales() {
        assert_eq!(human_size(512), "512 B");
        assert_eq!(human_size(1536), "1.5 KB");
        assert_eq!(human_size(7_340_032), "7.0 MB");
    }
}

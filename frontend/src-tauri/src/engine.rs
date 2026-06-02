//! Cigs engine — the UI⇄Rust seam (Phase 3).
//!
//! This is the contract the demo never had: the frontend issues `start_job`
//! and the engine drives a real job through a state machine, emitting events
//! keyed by a durable `jobId`. The stage model mirrors `STAGES` in
//! `frontend/src/data/seed.js` — keep the two in sync.
//!
//! What is REAL today: the command/event plumbing, the per-job cancel
//! registry, the state machine, and the `resolve` stage (a real `yt-dlp`
//! metadata probe for URL sources). What is still SIMULATED: the
//! download/convert/transcribe/separate work — Phase 4 swaps the simulated
//! walk for real `yt-dlp`/`ffmpeg`/`whisper`/`demucs` subprocesses on this
//! same spine. Logs say so honestly.

use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, State};

/// Stage keys + labels — mirrors `STAGES` in `data/seed.js`.
const STAGES: [(&str, &str); 6] = [
    ("resolve", "Resolving URL"),
    ("download", "Downloading media"),
    ("convert", "Converting audio"),
    ("transcribe", "Transcribing speech"),
    ("separate", "Separating stems"),
    ("package", "Packaging output"),
];

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

/// Per-job cancellation flags, held in Tauri-managed state so future commands
/// (`cancel_job`) can stop a running task.
#[derive(Default)]
pub struct JobRegistry {
    cancels: Mutex<HashMap<String, Arc<AtomicBool>>>,
}

impl JobRegistry {
    fn register(&self, id: &str) -> Arc<AtomicBool> {
        let flag = Arc::new(AtomicBool::new(false));
        self.cancels
            .lock()
            .unwrap()
            .insert(id.to_string(), flag.clone());
        flag
    }

    fn finish(&self, id: &str) {
        self.cancels.lock().unwrap().remove(id);
    }

    /// Signal a running job to stop. Returns false if no such job is live.
    #[allow(dead_code)] // wired by the upcoming `cancel_job` command
    pub fn cancel(&self, id: &str) -> bool {
        match self.cancels.lock().unwrap().get(id) {
            Some(flag) => {
                flag.store(true, Ordering::SeqCst);
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

/// Real `yt-dlp` metadata probe — no download, just the JSON dump.
/// Returns (title, duration_seconds) when available.
async fn probe_metadata(source: &str) -> anyhow::Result<(Option<String>, Option<f64>)> {
    let bin = which::which("yt-dlp").unwrap_or_else(|_| "yt-dlp".into());
    let output = tokio::process::Command::new(bin)
        .args(["--no-warnings", "--dump-single-json", "--skip-download", source])
        .output()
        .await?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let first = stderr.lines().next().unwrap_or("yt-dlp failed").trim();
        anyhow::bail!("{}", first);
    }
    let json: serde_json::Value = serde_json::from_slice(&output.stdout)?;
    let title = json
        .get("title")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let duration = json.get("duration").and_then(|v| v.as_f64());
    Ok((title, duration))
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

/// Mirror of `buildOutputs(job)` in `data/seed.js`.
fn build_outputs(req: &JobRequest, title: &str) -> Vec<OutputItem> {
    let base = output_base(title);
    let t = req.target.as_str();
    let mut out = Vec::new();
    let item = |name: String, kind: &str, size: &str| OutputItem {
        name,
        kind: kind.to_string(),
        size: size.to_string(),
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

/// Drive one job through the state machine, emitting events as it goes.
async fn run_job(app: AppHandle, req: JobRequest, cancel: Arc<AtomicBool>) {
    let job_id = req.job_id.clone();
    let cancelled = || cancel.load(Ordering::SeqCst);
    let bail_cancel = |app: &AppHandle| {
        emit_failed(app, &job_id, "Cancelled by user");
    };

    // ---- stage 0: resolve (REAL metadata probe for URL sources) ----
    emit_stage(&app, &job_id, 0);
    emit_log(
        &app,
        &job_id,
        "info",
        format!("{} · {} · {} preset", req.branch, req.target, req.quality),
    );
    let mut effective_title = req.title.clone();

    if req.source_type == "file" {
        emit_log(&app, &job_id, "info", "Local file source — skipping URL resolve");
    } else {
        emit_log(&app, &job_id, "info", format!("Resolving {}", req.source));
        match probe_metadata(&req.source).await {
            Ok((title, duration)) => {
                if let Some(t) = &title {
                    emit_log(&app, &job_id, "info", format!("Resolved: {t}"));
                    effective_title = t.clone();
                }
                if let Some(d) = duration {
                    emit_log(&app, &job_id, "info", format!("Duration {}", fmt_dur(d)));
                }
            }
            Err(e) => {
                emit_failed(&app, &job_id, format!("Resolve failed — {e}"));
                return;
            }
        }
    }
    if cancelled() {
        bail_cancel(&app);
        return;
    }
    emit_progress(&app, &job_id, STAGE_SPAN, 0);

    // ---- stages 1..=5: SIMULATED walk (Phase 4 wires the real subprocesses) ----
    let total = STAGES.len();
    for i in 1..total {
        if cancelled() {
            bail_cancel(&app);
            return;
        }
        emit_stage(&app, &job_id, i);
        let start = i as f64 * STAGE_SPAN;
        let end = (i + 1) as f64 * STAGE_SPAN;
        let steps = 6;
        for s in 1..=steps {
            if cancelled() {
                bail_cancel(&app);
                return;
            }
            tokio::time::sleep(Duration::from_millis(180)).await;
            let p = start + (end - start) * (s as f64 / steps as f64);
            emit_progress(&app, &job_id, p, i);
        }
    }

    emit_log(
        &app,
        &job_id,
        "info",
        "Simulated pipeline complete — real download/convert/transcribe/separate land in Phase 4",
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
}

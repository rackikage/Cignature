use std::path::{Path, PathBuf};
use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

use super::job::CancelToken;

/// Run demucs --two-stems=vocals on `src`. Writes both vocals.mp3 and
/// no_vocals.mp3 into a subtree under `out_dir`. Returns (vocals, instrumental).
/// Progress comes from demucs stderr lines like " 23%|..." — best-effort parse.
pub async fn split_vocals<F>(
    src: &Path,
    out_dir: &Path,
    mut on_progress: F,
    cancel: &CancelToken,
) -> Result<(PathBuf, PathBuf), SeparateError>
where
    F: FnMut(f32),
{
    let py = which::which("python3").map_err(|_| SeparateError::Internal("python3 missing".into()))?;

    tokio::fs::create_dir_all(out_dir)
        .await
        .map_err(|e| SeparateError::Internal(format!("mkdir: {e}")))?;

    let out_str = out_dir.to_str().ok_or(SeparateError::Internal("path".into()))?.to_string();

    let mut child = Command::new(&py)
        .args([
            "-u",
            "-m",
            "demucs",
            "--two-stems=vocals",
            "-n",
            "htdemucs",
            "--mp3",
            "-o",
            &out_str,
        ])
        .arg(src)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .env("PYTHONUNBUFFERED", "1")
        .spawn()
        .map_err(|e| SeparateError::Internal(format!("spawn demucs: {e}")))?;

    cancel.bind(&child).map_err(|_| SeparateError::Cancelled)?;

    // demucs prints a tqdm bar to stderr; sample a percent number if we
    // can find one. Otherwise progress stays at whatever we last set.
    let stderr = child.stderr.take().ok_or(SeparateError::Internal("no stderr".into()))?;
    let mut reader = BufReader::new(stderr).lines();

    while let Some(line) = reader
        .next_line()
        .await
        .map_err(|e| SeparateError::Internal(format!("read demucs: {e}")))?
    {
        if cancel.is_cancelled() {
            let _ = child.start_kill();
            return Err(SeparateError::Cancelled);
        }
        if let Some(p) = parse_tqdm_percent(&line) {
            on_progress((p / 100.0).clamp(0.0, 1.0));
        }
    }

    let status = child
        .wait()
        .await
        .map_err(|e| SeparateError::Internal(format!("wait demucs: {e}")))?;

    if cancel.is_cancelled() {
        return Err(SeparateError::Cancelled);
    }

    if !status.success() {
        return Err(SeparateError::Internal(format!("demucs exit {}", status)));
    }

    // demucs writes to <out_dir>/htdemucs/<src_stem>/{vocals,no_vocals}.mp3
    let stem = src
        .file_stem()
        .and_then(|s| s.to_str())
        .ok_or(SeparateError::Internal("src stem".into()))?;
    let stems_dir = out_dir.join("htdemucs").join(stem);
    let vocals = stems_dir.join("vocals.mp3");
    let no_vocals = stems_dir.join("no_vocals.mp3");

    if !vocals.exists() || !no_vocals.exists() {
        return Err(SeparateError::Internal("demucs output missing".into()));
    }

    on_progress(1.0);
    Ok((vocals, no_vocals))
}

fn parse_tqdm_percent(s: &str) -> Option<f32> {
    // tqdm format examples:
    //  " 23%|##        | 230/1000 ..."
    //  " 100%|##########| 1000/1000 ..."
    let trimmed = s.trim_start();
    let pct_end = trimmed.find('%')?;
    let pct_str = &trimmed[..pct_end];
    pct_str.trim().parse::<f32>().ok()
}

#[derive(Debug)]
pub enum SeparateError {
    Internal(String),
    Cancelled,
}

pub fn is_demucs_available() -> bool {
    if let Ok(py) = which::which("python3") {
        let out = std::process::Command::new(py)
            .args(["-c", "import demucs"])
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status();
        return matches!(out, Ok(s) if s.success());
    }
    false
}

use std::path::{Path, PathBuf};
use std::process::Stdio;
use tokio::process::Command;

use super::job::CancelToken;

/// whisper-cli on a 16k mono wav, writing the transcript to `target` (.txt).
/// Doctrine: any whisper failure is an engine bug, never user-facing.
pub async fn run_whisper(
    wav: &Path,
    target: &Path,
    cancel: &CancelToken,
) -> Result<PathBuf, TranscribeError> {
    let whisper = which::which("whisper-cli")
        .map_err(|_| TranscribeError::Internal("whisper-cli missing".into()))?;

    // whisper-cli writes <input>.txt next to the input when -otxt is set;
    // we then move it to the desktop target.
    let mut child = Command::new(&whisper)
        .args([
            "-otxt",
            "-nt", // no timestamps
            "-l",
            "auto",
            "-f",
        ])
        .arg(wav)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| TranscribeError::Internal(format!("spawn whisper: {e}")))?;

    cancel.bind(&child).map_err(|_| TranscribeError::Cancelled)?;

    let status = child
        .wait()
        .await
        .map_err(|e| TranscribeError::Internal(format!("wait whisper: {e}")))?;

    if cancel.is_cancelled() {
        return Err(TranscribeError::Cancelled);
    }

    if !status.success() {
        return Err(TranscribeError::Internal(format!("whisper exit {}", status)));
    }

    // whisper-cli writes <wav>.txt next to the wav
    let produced = wav.with_extension("wav.txt");
    let alt = wav.with_extension("txt");
    let src = if produced.exists() {
        produced
    } else if alt.exists() {
        alt
    } else {
        return Err(TranscribeError::Internal("whisper produced no .txt".into()));
    };

    tokio::fs::rename(&src, target)
        .await
        .map_err(|e| TranscribeError::Internal(format!("move txt: {e}")))?;

    Ok(target.to_path_buf())
}

#[derive(Debug)]
pub enum TranscribeError {
    Internal(String),
    Cancelled,
}

use std::path::{Path, PathBuf};
use std::process::Stdio;
use tokio::process::Command;

use super::job::CancelToken;

/// Transcode the downloaded source to a clean mp3 at `out_path`.
/// Uses libmp3lame, 192k. Doctrine: any ffmpeg failure is an engine bug
/// that the user never sees — caller maps to Internal.
pub async fn to_mp3(
    src: &Path,
    out_path: &Path,
    cancel: &CancelToken,
) -> Result<PathBuf, AudioError> {
    let ff = which::which("ffmpeg").map_err(|_| AudioError::Internal("ffmpeg missing".into()))?;

    let mut child = Command::new(&ff)
        .args([
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
        ])
        .arg(src)
        .args(["-vn", "-codec:a", "libmp3lame", "-b:a", "192k"])
        .arg(out_path)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| AudioError::Internal(format!("spawn ffmpeg: {e}")))?;

    cancel.bind(&child).map_err(|_| AudioError::Cancelled)?;

    let status = child
        .wait()
        .await
        .map_err(|e| AudioError::Internal(format!("wait ffmpeg: {e}")))?;

    if cancel.is_cancelled() {
        return Err(AudioError::Cancelled);
    }

    if !status.success() {
        return Err(AudioError::Internal(format!("ffmpeg exit {}", status)));
    }

    Ok(out_path.to_path_buf())
}

/// Decode the source to 16kHz mono wav, suitable for whisper-cli.
pub async fn to_wav_16k_mono(
    src: &Path,
    out_path: &Path,
    cancel: &CancelToken,
) -> Result<PathBuf, AudioError> {
    let ff = which::which("ffmpeg").map_err(|_| AudioError::Internal("ffmpeg missing".into()))?;

    let mut child = Command::new(&ff)
        .args([
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
        ])
        .arg(src)
        .args([
            "-vn",
            "-ac",
            "1",
            "-ar",
            "16000",
            "-c:a",
            "pcm_s16le",
        ])
        .arg(out_path)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| AudioError::Internal(format!("spawn ffmpeg: {e}")))?;

    cancel.bind(&child).map_err(|_| AudioError::Cancelled)?;

    let status = child
        .wait()
        .await
        .map_err(|e| AudioError::Internal(format!("wait ffmpeg: {e}")))?;

    if cancel.is_cancelled() {
        return Err(AudioError::Cancelled);
    }

    if !status.success() {
        return Err(AudioError::Internal(format!("ffmpeg exit {}", status)));
    }

    Ok(out_path.to_path_buf())
}

#[derive(Debug)]
pub enum AudioError {
    Internal(String),
    Cancelled,
}

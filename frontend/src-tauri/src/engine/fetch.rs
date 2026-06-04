use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

use super::job::SourceProbe;

/// yt-dlp probe — returns metadata, or a categorised reason for failure.
/// The frontend maps the reason to a directive user-friendly line.
pub async fn probe(url: &str) -> Result<SourceProbe, UnavailableReason> {
    let yt = match which::which("yt-dlp") {
        Ok(p) => p,
        Err(_) => return Err(UnavailableReason::ToolMissing),
    };

    let trimmed = url.trim();
    if !is_plausible_url(trimmed) {
        return Err(UnavailableReason::Unsupported);
    }

    let output = match Command::new(&yt)
        .args([
            "--dump-single-json",
            "--no-warnings",
            "--no-playlist",
            "--skip-download",
            trimmed,
        ])
        .stderr(Stdio::piped())
        .stdout(Stdio::piped())
        .output()
        .await
    {
        Ok(o) => o,
        Err(_) => return Err(UnavailableReason::Network),
    };

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(classify_yt_dlp_stderr(&stderr));
    }

    let parsed: YtDlpJson = match serde_json::from_slice(&output.stdout) {
        Ok(p) => p,
        Err(_) => return Err(UnavailableReason::Unsupported),
    };

    Ok(SourceProbe {
        title: parsed.title.unwrap_or_else(|| "Untitled".to_string()),
        platform: parsed.extractor_key.or(parsed.extractor).unwrap_or_default(),
        duration_sec: parsed.duration,
    })
}

fn is_plausible_url(s: &str) -> bool {
    s.starts_with("http://") || s.starts_with("https://") || s.starts_with("www.")
}

fn classify_yt_dlp_stderr(s: &str) -> UnavailableReason {
    let l = s.to_ascii_lowercase();
    if l.contains("private video") || l.contains("sign in") || l.contains("login required")
        || l.contains("members-only") || l.contains("age-restricted")
    {
        UnavailableReason::Private
    } else if l.contains("video unavailable") || l.contains("removed") || l.contains("not found")
        || l.contains("does not exist") || l.contains("http error 404")
    {
        UnavailableReason::NotFound
    } else if l.contains("unable to download") || l.contains("network is unreachable")
        || l.contains("name or service not known") || l.contains("temporary failure")
        || l.contains("getaddrinfo") || l.contains("ssl") || l.contains("connection")
    {
        UnavailableReason::Network
    } else if l.contains("unsupported url") || l.contains("no suitable extractor") {
        UnavailableReason::Unsupported
    } else {
        UnavailableReason::Unsupported
    }
}

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum UnavailableReason {
    Private,
    NotFound,
    Network,
    ToolMissing,
    Unsupported,
    ProcessingFailed,
}

#[derive(Deserialize)]
struct YtDlpJson {
    title: Option<String>,
    extractor_key: Option<String>,
    extractor: Option<String>,
    duration: Option<f64>,
}

/// Download bestaudio into `out_dir`, emitting progress 0.0..1.0 to `on_progress`.
/// Returns the absolute path of the downloaded media file.
pub async fn download_audio<F>(
    url: &str,
    out_dir: &Path,
    mut on_progress: F,
    cancel: &super::job::CancelToken,
) -> Result<PathBuf, FetchError>
where
    F: FnMut(f32),
{
    let yt = which::which("yt-dlp").map_err(|_| FetchError::Internal("yt-dlp missing".into()))?;

    tokio::fs::create_dir_all(out_dir)
        .await
        .map_err(|e| FetchError::Internal(format!("mkdir: {e}")))?;

    let template = out_dir.join("source.%(ext)s");
    let template_str = template
        .to_str()
        .ok_or_else(|| FetchError::Internal("path".into()))?
        .to_string();

    let mut child = Command::new(&yt)
        .args([
            "-f",
            "bestaudio/best",
            "--no-playlist",
            "--no-warnings",
            "--newline",
            "--progress-template",
            "PROGRESS:%(progress._percent_str)s",
            "-o",
            &template_str,
            url,
        ])
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| FetchError::Internal(format!("spawn: {e}")))?;

    cancel.bind(&child).map_err(|_| FetchError::Cancelled)?;

    let stdout = child.stdout.take().ok_or(FetchError::Internal("no stdout".into()))?;
    let mut reader = BufReader::new(stdout).lines();

    while let Some(line) = reader
        .next_line()
        .await
        .map_err(|e| FetchError::Internal(format!("read: {e}")))?
    {
        if cancel.is_cancelled() {
            let _ = child.start_kill();
            return Err(FetchError::Cancelled);
        }
        if let Some(rest) = line.strip_prefix("PROGRESS:") {
            if let Some(pct) = parse_percent(rest.trim()) {
                on_progress((pct / 100.0).clamp(0.0, 1.0));
            }
        }
    }

    let status = child
        .wait()
        .await
        .map_err(|e| FetchError::Internal(format!("wait: {e}")))?;

    if cancel.is_cancelled() {
        return Err(FetchError::Cancelled);
    }

    if !status.success() {
        return Err(FetchError::Unavailable);
    }

    // find the file yt-dlp produced (source.<ext>)
    let mut entries = tokio::fs::read_dir(out_dir)
        .await
        .map_err(|e| FetchError::Internal(format!("readdir: {e}")))?;

    while let Some(entry) = entries
        .next_entry()
        .await
        .map_err(|e| FetchError::Internal(format!("next: {e}")))?
    {
        let p = entry.path();
        if p.file_stem().and_then(|s| s.to_str()) == Some("source") {
            on_progress(1.0);
            return Ok(p);
        }
    }

    Err(FetchError::Internal("no output file".into()))
}

fn parse_percent(s: &str) -> Option<f32> {
    let cleaned = s.trim_end_matches('%').trim();
    cleaned.parse::<f32>().ok()
}

#[derive(Debug)]
pub enum FetchError {
    Unavailable,
    Cancelled,
    Internal(String),
}
